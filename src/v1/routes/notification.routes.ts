import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";

import { authenticateToken } from "../../middlewares/auth";
const router = Router();

router.get(
  "/notifications/:userId",
  authenticateToken,
  notificationController.getNotifications
);

router.put(
  "/notifications/:id/read",
  authenticateToken,
  notificationController.markNotificationRead
);

router.put(
  "/notifications/user/:userId/read-all",
  authenticateToken,
  notificationController.markAllNotificationRead
);
router.get(
  "/notifications/settings/:userId",
  authenticateToken,
  notificationController.getNotificationSettings
);

router.get(
  "/notifications/user/:userId/unread-count",
  authenticateToken,
  notificationController.updateNotificationSettings
);

export default router;

// import express from "express";
// import { PrismaClient } from "@prisma/client";
// import notificationService from "../services/notification";

// const router = express.Router();
// const prisma = new PrismaClient();

// // Get user notifications
// router.get("/notifications/:userId", async (req, res) => {
//   try {
//     const userId = parseInt(req.params.userId);
//     const page = parseInt(req.query.page as string) || 1;
//     const pageSize = parseInt(req.query.pageSize as string) || 50;
//     const skip = (page - 1) * pageSize;

//     // Get unread notifications (all of them, no pagination)
//     const unreadNotifications = await prisma.notifications.findMany({
//       where: { user_id: userId, read: false },
//       orderBy: { created_at: "desc" },
//     });

//     // Get read notifications with pagination
//     const readNotifications = await prisma.notifications.findMany({
//       where: { user_id: userId, read: true },
//       orderBy: { created_at: "desc" },
//       skip: page === 1 ? 0 : skip - unreadNotifications.length, // Adjust skip for first page
//       take: pageSize,
//     });

//     // Get total count for pagination
//     const totalRead = await prisma.notifications.count({
//       where: { user_id: userId, read: true },
//     });

//     const notifications = [...unreadNotifications, ...readNotifications];
//     const unreadCount = unreadNotifications.length;
//     const totalCount = unreadCount + totalRead;

//     res.json({
//       success: true,
//       data: {
//         notifications,
//         unreadCount,
//         pagination: {
//           page,
//           pageSize,
//           totalCount,
//           totalPages: Math.ceil(totalCount / pageSize),
//           hasMore: notifications.length === pageSize,
//         },
//       },
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

// // Mark notification as read
// router.put("/notifications/:id/read", async (req, res) => {
//   try {
//     await notificationService.markAsRead(parseInt(req.params.id));
//     res.json({ success: true });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

// // Mark all as read
// router.put("/notifications/user/:userId/read-all", async (req, res) => {
//   try {
//     const userId = parseInt(req.params.userId);

//     await prisma.notifications.updateMany({
//       where: { user_id: userId, read: false },
//       data: { read: true },
//     });

//     res.json({ success: true });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

// // Get notification settings
// router.get("/notifications/settings/:userId", async (req, res) => {
//   try {
//     const userId = parseInt(req.params.userId);

//     let settings = await prisma.notification_settings.findFirst({
//       where: { agent_id: userId },
//     });

//     if (!settings) {
//       settings = await prisma.notification_settings.create({
//         data: {
//           agent_id: userId,
//           email_notifications: true,
//           sla_warnings: true,
//           new_ticket_alerts: true,
//           escalation_alerts: true,
//           customer_feedback_alerts: true,
//           warning_threshold_percent: 80,
//         },
//       });
//     }

//     res.json({
//       success: true,
//       data: settings,
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

// // Update notification settings
// // router.put('/settings/:userId', async (req, res) => {
// //   try {
// //     const userId = parseInt(req.params.userId);

// //     const settings = await prisma.notification_settings.upsert({
// //       where: { agent_id: Number(userId) },
// //       update: {
// //         ...req.body,
// //         updated_at: new Date()
// //       },
// //       create: {
// //         agent_id: userId,
// //         ...req.body
// //       }
// //     });

// //     res.json({
// //       success: true,
// //       data: settings
// //     });
// //   } catch (error: any) {
// //     res.status(500).json({
// //       success: false,
// //       error: error.message
// //     });
// //   }
// // });

// // Get unread count
// router.get("/notifications/user/:userId/unread-count", async (req, res) => {
//   try {
//     const userId = parseInt(req.params.userId);
//     const count = await notificationService.getUnreadCount(userId);
//     res.json({
//       success: true,
//       data: { count },
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

// export default router;
