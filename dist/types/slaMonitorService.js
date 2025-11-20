"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// services/slaMonitor.ts
const client_1 = require("@prisma/client");
const notification_1 = __importDefault(require("../v1/services/notification"));
const prisma = new client_1.PrismaClient();
class SLAMonitor {
    constructor() {
        this.intervalId = null;
    }
    start(intervalMinutes = 3) {
        console.log(`🔍 SLA Monitor starting (every ${intervalMinutes}min)`);
        this.check(); // Run immediately
        this.intervalId = setInterval(() => this.check(), intervalMinutes * 60 * 1000);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            console.log("⏹️ SLA Monitor stopped");
        }
    }
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tickets = yield prisma.tickets.findMany({
                    where: {
                        status: { notIn: ["Closed", "Resolved"] },
                        sla_deadline: { not: null },
                    },
                    include: {
                        agents_user: { include: { user_notification_setting: true } },
                        sla_priority: true,
                    },
                });
                for (const ticket of tickets) {
                    yield this.checkTicket(ticket);
                }
                console.log(`✅ Checked ${tickets.length} tickets`);
            }
            catch (error) {
                console.error("❌ SLA check error:", error);
            }
        });
    }
    checkTicket(ticket) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const now = new Date();
            const deadline = new Date(ticket.sla_deadline);
            const totalTime = deadline.getTime() - new Date(ticket.created_at).getTime();
            const elapsed = now.getTime() - new Date(ticket.created_at).getTime();
            const remaining = deadline.getTime() - now.getTime();
            const percentUsed = Math.min(100, (elapsed / totalTime) * 100);
            const threshold = ((_b = (_a = ticket.assigned_agent) === null || _a === void 0 ? void 0 : _a.user_notification_setting) === null || _b === void 0 ? void 0 : _b.warning_threshold_percent) || 80;
            // Check if warning should be sent
            if (percentUsed >= threshold &&
                percentUsed < 100 &&
                ticket.sla_status !== "Warning") {
                yield this.sendWarning(ticket, percentUsed, remaining);
                yield prisma.tickets.update({
                    where: { id: ticket.id },
                    data: { sla_status: "Warning" },
                });
            }
            // Check if breached
            else if (remaining <= 0 && ticket.sla_status !== "Breached") {
                yield prisma.tickets.update({
                    where: { id: ticket.id },
                    data: { sla_status: "Breached" },
                });
            }
        });
    }
    sendWarning(ticket, percentUsed, remaining) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const userIds = [];
            // Notify assigned agent
            if (ticket.assigned_agent_id) {
                userIds.push(ticket.assigned_agent_id);
            }
            // Notify supervisors for high priority
            if (((_a = ticket.sla_priority) === null || _a === void 0 ? void 0 : _a.priority) === "High" ||
                ((_b = ticket.sla_priority) === null || _b === void 0 ? void 0 : _b.priority) === "Urgent" ||
                ((_c = ticket.sla_priority) === null || _c === void 0 ? void 0 : _c.priority) === "Critical") {
                const supervisors = yield prisma.users.findMany({
                // where: { role: { in: ["SUPERVISOR", "ADMIN"] } },
                });
                userIds.push(...supervisors.map((s) => s.id));
            }
            if (userIds.length > 0) {
                yield notification_1.default.notify("sla_warning", userIds, {
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticket_number,
                    subject: ticket.subject,
                    priority: ((_d = ticket.sla_priority) === null || _d === void 0 ? void 0 : _d.priority) || "Medium",
                    percentUsed: Math.round(percentUsed),
                    timeRemaining: this.formatTime(remaining),
                    customerName: ticket.customer_name || ticket.customer_email,
                });
            }
        });
    }
    formatTime(ms) {
        if (ms <= 0)
            return "0m";
        const minutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d ${hours % 24}h`;
        if (hours > 0)
            return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    }
}
exports.default = new SLAMonitor();
