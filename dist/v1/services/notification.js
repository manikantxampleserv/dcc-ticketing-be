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
// services/notificationService.ts
const client_1 = require("@prisma/client");
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma = new client_1.PrismaClient();
// Email configuration
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
class NotificationService {
    constructor() {
        this.io = null;
    }
    setSocketIO(io) {
        this.io = io;
    }
    /**
     * Send notification to users
     */
    notify(type, userIds, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Get users with notification settings
                const users = yield prisma.users.findMany({
                    where: { id: { in: userIds } },
                    include: { user_notification_setting: true },
                });
                // Filter users who want this notification
                const eligibleUsers = users.filter((user) => {
                    var _a;
                    const settings = (_a = user.user_notification_setting) === null || _a === void 0 ? void 0 : _a[0];
                    if (type === "new_ticket" && !settings.new_ticket_alerts)
                        return false;
                    if (type === "sla_warning" && !settings.sla_warnings)
                        return false;
                    // if (!settings?.email_notifications) return false;
                    return true;
                });
                console.log("eligibleUsers", users, eligibleUsers);
                // Create and send notifications
                for (const user of eligibleUsers) {
                    const notification = yield this.createNotification(user.id, type, data);
                    // Send via Socket.IO
                    // this.sendSocketNotification(user.id, notification);
                    // Send email
                    if ((_b = (_a = user.user_notification_setting) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.email_notifications) {
                        this.sendEmail(user, type, data);
                    }
                }
            }
            catch (error) {
                console.error("❌ Notification error:", error);
            }
        });
    }
    /**
     * Create notification in database
     */
    createNotification(userId, type, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = this.getContent(type, data);
            return yield prisma.notifications.create({
                data: {
                    user_id: userId,
                    type,
                    title: content.title,
                    message: content.message,
                    ticket_id: data.ticketId,
                    read: false,
                    sent_via: "in_app",
                },
            });
        });
    }
    /**
     * Send via Socket.IO
     */
    // private sendSocketNotification(userId: number, notification: any) {
    //   if (!this.io) return;
    //   this.io.to(`user_${userId}`).emit("notification", {
    //     id: notification.id,
    //     type: notification.type,
    //     title: notification.title,
    //     message: notification.message,
    //     ticket_id: notification.ticket_id,
    //     created_at: notification.created_at,
    //   });
    //   const room_clients = this.io.sockets.adapter.rooms.get(`user_${userId}`);
    //   console.log(
    //     `👥 Clients in room user_${userId}:`,
    //     room_clients ? room_clients.size : 0
    //   );
    //   console.log(`📱 Socket notification sent to user ${userId}`);
    // }
    /**
     * Send email
     */
    sendEmail(user, type, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const content = this.getEmailContent(type, data, user);
                yield transporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to: user.email,
                    subject: content.subject,
                    html: content.html,
                });
                console.log(`📧 Email sent to ${user.email}`);
            }
            catch (error) {
                console.error("❌ Email error:", error);
            }
        });
    }
    /**
     * Get notification content
     */
    getContent(type, data) {
        const templates = {
            new_ticket: {
                title: `New Ticket #${data.ticketNumber}`,
                message: `New ticket from ${data.customerName}: ${data.subject}`,
            },
            ticket_assigned: {
                title: `Ticket Assigned #${data.ticketNumber}`,
                message: `Ticket "${data.subject}" has been assigned to you`,
            },
            sla_warning: {
                title: `⚠️ SLA Warning - #${data.ticketNumber}`,
                message: `Ticket at ${data.percentUsed}% SLA. ${data.timeRemaining} remaining`,
            },
        };
        return (templates[type] || {
            title: "Notification",
            message: "You have a new notification",
        });
    }
    /**
     * Get email content
     */
    getEmailContent(type, data, user) {
        const baseUrl = process.env.APP_URL;
        if (type === "new_ticket" || type === "ticket_assigned") {
            return {
                subject: `🎫 ${type === "new_ticket" ? "New" : "Assigned"} Ticket #${data.ticketNumber}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h2>🎫 ${type === "new_ticket" ? "New Ticket Created" : "Ticket Assigned"}</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Hi ${user.first_name || user.name},</p>
              <p>${type === "new_ticket"
                    ? "A new ticket has been created"
                    : "A ticket has been assigned to you"}:</p>
              <ul>
                <li><strong>Ticket:</strong> #${data.ticketNumber}</li>
                <li><strong>Subject:</strong> ${data.subject}</li>
                <li><strong>Customer:</strong> ${data.customerName}</li>
                <li><strong>Priority:</strong> ${data.priority}</li>
              </ul>
              <a href="${baseUrl}/tickets/${data.ticketId}" 
                 style="display: inline-block; background: #007bff; color: white; 
                        padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                View Ticket
              </a>
            </div>
          </div>
        `,
            };
        }
        if (type === "sla_warning") {
            return {
                subject: `⚠️ SLA Warning - Ticket #${data.ticketNumber}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff9800; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h2>⚠️ SLA Warning Alert</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #ff9800; background: #fff3cd;">
              <p>Hi ${user.first_name || user.name},</p>
              <p><strong>Ticket #${data.ticketNumber} is approaching SLA breach!</strong></p>
              <ul>
                <li><strong>Subject:</strong> ${data.subject}</li>
                <li><strong>SLA Usage:</strong> ${data.percentUsed}%</li>
                <li><strong>Time Remaining:</strong> ${data.timeRemaining}</li>
              </ul>
              <p style="color: #d32f2f;"><strong>⚠️ Action Required: Please respond immediately</strong></p>
              <a href="${baseUrl}/tickets/${data.ticketId}" 
                 style="display: inline-block; background: #ff9800; color: white; 
                        padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                View Ticket Now
              </a>
            </div>
          </div>
        `,
            };
        }
        return { subject: "Notification", html: "<p>New notification</p>" };
    }
    markAsRead(notificationId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.notifications.update({
                where: { id: notificationId },
                data: { read: true },
            });
        });
    }
    getUnreadCount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma.notifications.count({
                where: { user_id: userId, read: false },
            });
        });
    }
}
exports.default = new NotificationService();
