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
exports.notificationController = void 0;
const client_1 = require("@prisma/client");
const notification_1 = __importDefault(require("../services/notification"));
const prisma = new client_1.PrismaClient();
// Get user notifications
exports.notificationController = {
    getNotifications(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.userId);
                const page = parseInt(req.query.page) || 1;
                const filter = req.query.filter;
                const pageSize = parseInt(req.query.pageSize) || 50;
                const skip = (page - 1) * pageSize;
                // Get unread notifications (all of them, no pagination)
                const unreadNotifications = yield prisma.notifications.findMany({
                    where: { user_id: userId, read: false },
                    orderBy: { created_at: "desc" },
                });
                // Get read notifications with pagination
                const readNotifications = yield prisma.notifications.findMany({
                    where: { user_id: userId, read: true },
                    orderBy: { created_at: "desc" },
                    skip: page === 1 ? 0 : skip - unreadNotifications.length, // Adjust skip for first page
                    take: pageSize,
                });
                // Get total count for pagination
                const totalRead = yield prisma.notifications.count({
                    where: { user_id: userId, read: true },
                });
                let notifications = [...unreadNotifications, ...readNotifications];
                let unreadCount = unreadNotifications.length;
                let totalCount = unreadCount + totalRead;
                if (filter === "unread") {
                    notifications = [...unreadNotifications];
                    unreadCount = unreadNotifications.length;
                    totalCount = unreadNotifications.length;
                }
                else if (filter === "read") {
                    notifications = [...readNotifications];
                    unreadCount = unreadNotifications.length;
                    totalCount = totalRead;
                }
                else {
                    notifications = [...unreadNotifications, ...readNotifications];
                    unreadCount = unreadNotifications.length;
                    totalCount = unreadCount + totalRead;
                }
                res.json({
                    success: true,
                    data: {
                        notifications,
                        unreadCount,
                        pagination: {
                            page,
                            pageSize,
                            totalCount,
                            totalPages: Math.ceil(totalCount / pageSize),
                            hasMore: notifications.length === pageSize,
                        },
                    },
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
    },
    // Mark notification as read
    markNotificationRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield notification_1.default.markAsRead(parseInt(req.params.id));
                res.json({ success: true });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
    },
    // Mark all as read
    markAllNotificationRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.userId);
                yield prisma.notifications.updateMany({
                    where: { user_id: userId, read: false },
                    data: { read: true },
                });
                res.json({ success: true });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
    },
    // Get notification settings
    getNotificationSettings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.userId);
                let settings = yield prisma.notification_settings.findFirst({
                    where: { agent_id: userId },
                });
                if (!settings) {
                    settings = yield prisma.notification_settings.create({
                        data: {
                            agent_id: userId,
                            email_notifications: true,
                            sla_warnings: true,
                            new_ticket_alerts: true,
                            escalation_alerts: true,
                            customer_feedback_alerts: true,
                            warning_threshold_percent: 80,
                        },
                    });
                }
                res.json({
                    success: true,
                    data: settings,
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
    },
    // Update notification settings
    // router.put('/settings/:userId', async (req, res) => {
    //   try {
    //     const userId = parseInt(req.params.userId);
    //     const settings = await prisma.notification_settings.upsert({
    //       where: { agent_id: Number(userId) },
    //       update: {
    //         ...req.body,
    //         updated_at: new Date()
    //       },
    //       create: {
    //         agent_id: userId,
    //         ...req.body
    //       }
    //     });
    //     res.json({
    //       success: true,
    //       data: settings
    //     });
    //   } catch (error: any) {
    //     res.status(500).json({
    //       success: false,
    //       error: error.message
    //     });
    //   }
    // });
    // Get unread count
    updateNotificationSettings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.userId);
                const count = yield notification_1.default.getUnreadCount(userId);
                res.json({
                    success: true,
                    data: { count },
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
    },
};
