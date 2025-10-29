// v1/routes/notificationRoutes.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "../../utils/pagination";
import notificationService from "../services/notification";

const prisma = new PrismaClient();

// Get user notifications
export const notificationController = {
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const page = parseInt(req.query.page as string) || 1;
      const filter = req.query.filter as string;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const skip = (page - 1) * pageSize;

      // Get unread notifications (all of them, no pagination)
      const unreadNotifications = await prisma.notifications.findMany({
        where: { user_id: userId, read: false },
        orderBy: { created_at: "desc" },
      });

      // Get read notifications with pagination
      const readNotifications = await prisma.notifications.findMany({
        where: { user_id: userId, read: true },
        orderBy: { created_at: "desc" },
        skip: page === 1 ? 0 : skip - unreadNotifications.length, // Adjust skip for first page
        take: pageSize,
      });

      // Get total count for pagination
      const totalRead = await prisma.notifications.count({
        where: { user_id: userId, read: true },
      });
      let notifications = [...unreadNotifications, ...readNotifications];
      let unreadCount = unreadNotifications.length;
      let totalCount = unreadCount + totalRead;

      if (filter === "unread") {
        notifications = [...unreadNotifications];
        unreadCount = unreadNotifications.length;
        totalCount = unreadNotifications.length;
      } else if (filter === "read") {
        notifications = [...readNotifications];
        unreadCount = unreadNotifications.length;
        totalCount = totalRead;
      } else {
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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Mark notification as read
  async markNotificationRead(req: Request, res: Response): Promise<void> {
    try {
      await notificationService.markAsRead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Mark all as read
  async markAllNotificationRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      await prisma.notifications.updateMany({
        where: { user_id: userId, read: false },
        data: { read: true },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Get notification settings
  async getNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      let settings = await prisma.notification_settings.findFirst({
        where: { agent_id: userId },
      });

      if (!settings) {
        settings = await prisma.notification_settings.create({
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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
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
  async updateNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const count = await notificationService.getUnreadCount(userId);
      res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};
