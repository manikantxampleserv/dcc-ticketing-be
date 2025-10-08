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
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.dashboardController = {
    getTicketStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.query.user_id ? Number(req.query.user_id) : null;
                let filter = {};
                if (userId) {
                    if (isNaN(userId)) {
                        res.error("Invalid user_id", 400);
                        return;
                    }
                    const user = yield prisma.users.findUnique({
                        where: { id: userId },
                        include: { user_role: true },
                    });
                    if (!user) {
                        res.error("User not found", 404);
                        return;
                    }
                    const isAdmin = user.user_role.name === "Admin";
                    filter = isAdmin ? {} : { assigned_agent_id: user.id };
                }
                // Count all tickets
                const totalTickets = yield prisma.tickets.count({
                    where: filter,
                });
                // Count open tickets
                const openTickets = yield prisma.tickets.count({
                    where: Object.assign(Object.assign({}, filter), { status: "Open" }),
                });
                const progressTickets = yield prisma.tickets.count({
                    where: Object.assign(Object.assign({}, filter), { status: "In Progress" }),
                });
                const breachedTickets = yield prisma.tickets.count({
                    where: Object.assign(Object.assign({}, filter), { sla_status: "Breached" }),
                });
                // Count resolved today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const resolvedToday = yield prisma.tickets.count({
                    where: Object.assign(Object.assign({}, filter), { status: "Resolved" }),
                });
                res.success("Ticket status fetched successfully", {
                    totalTickets,
                    openTickets,
                    resolvedToday,
                    progressTickets,
                    breachedTickets,
                });
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
};
