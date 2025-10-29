import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "../../utils/pagination";

const prisma = new PrismaClient();

const serializeNotificationSetting = (
  setting: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: setting.id,
  agent_id: setting.agent_id,
  email_notifications: setting.email_notifications,
  sla_warnings: setting.sla_warnings,
  new_ticket_alerts: setting.new_ticket_alerts,
  escalation_alerts: setting.escalation_alerts,
  customer_feedback_alerts: setting.customer_feedback_alerts,
  agent_user: setting.user_notification_setting,
  warning_threshold_percent: setting.warning_threshold_percent,
  ...(includeCreatedAt && { created_at: setting.created_at }),
  ...(includeUpdatedAt && { updated_at: setting.updated_at }),
});

export const notificationSettingController = {
  async createNotificationSetting(req: Request, res: Response): Promise<void> {
    try {
      const {
        id,
        email_notifications,
        sla_warnings,
        new_ticket_alerts,
        escalation_alerts,
        customer_feedback_alerts,
        warning_threshold_percent,
      } = req.body;
      const agent_id = (req.user as any).id;
      console.log("agent_id", id, req.user);
      let NotificationSetting = null;

      const isPresent = await prisma.notification_settings.findFirst({
        where: { id: Number(id) } as any,
      });
      if (isPresent) {
        NotificationSetting = await prisma.notification_settings.update({
          where: { id: Number(id) } as any,
          data: {
            agent_id: Number(agent_id),
            email_notifications,
            sla_warnings,
            new_ticket_alerts,
            escalation_alerts,
            customer_feedback_alerts,
            warning_threshold_percent,
            created_at: new Date(),
            updated_at: new Date(),
          },
          include: {
            user_notification_setting: true,
          },
        });
      } else {
        NotificationSetting = await prisma.notification_settings.create({
          data: {
            agent_id: Number(agent_id),
            email_notifications,
            sla_warnings,
            new_ticket_alerts,
            escalation_alerts,
            customer_feedback_alerts,
            warning_threshold_percent,
            created_at: new Date(),
            // updated_at: new Date(),
          },
          include: {
            user_notification_setting: true,
          },
        });
      }

      res.success(
        "Notification setting created successfully",
        serializeNotificationSetting(NotificationSetting),
        201
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async getNotificationSettingById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const NotificationSetting = await prisma.notification_settings.findUnique(
        {
          where: { id },
          include: {
            user_notification_setting: true,
          },
        }
      );

      if (!NotificationSetting) {
        res.error("Notification setting not found", 404);
        return;
      }

      res.success(
        "Notification setting retrieved successfully",
        serializeNotificationSetting(NotificationSetting, true, true),
        200
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },

  // async updateNotificationSetting(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { created_at, updated_at, ...NotificationSettingData } = req.body;

  //     const NotificationSetting = await prisma.notification_settings.update({
  //       where: { id: Number(req.params.id) },
  //       data: {
  //         ...NotificationSettingData,
  //         created_at: created_at ? new Date(created_at) : new Date(),
  //         updated_at: updated_at ? new Date(updated_at) : new Date(),
  //       },
  //     });

  //     res.success(
  //       "Notification setting updated successfully",
  //       serializeNotificationSetting(NotificationSetting),
  //       200
  //     );
  //   } catch (error: any) {
  //     console.error(error);
  //     res.error(error.message);
  //   }
  // },

  async updateNotificationSetting(req: Request, res: Response): Promise<void> {
    try {
      const { id, created_at, updated_at, ...NotificationSettingData } =
        req.body;

      const NotificationSetting = await prisma.notification_settings.update({
        where: { id: Number(req.params.id) },
        data: {
          ...NotificationSettingData,
          updated_at: new Date(),
        },
        include: {
          user_notification_setting: true,
        },
      });

      res.success(
        "Notification setting updated successfully",
        serializeNotificationSetting(NotificationSetting),
        200
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async deleteNotificationSetting(req: Request, res: Response): Promise<void> {
    try {
      await prisma.notification_settings.delete({
        where: { id: Number(req.params.id) },
      });

      res.success("Notification setting deleted successfully", null, 200);
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },
  async upsertNotificationSetting(req: Request, res: Response): Promise<void> {
    try {
      const {
        id,
        email_notifications,
        sla_warnings,
        new_ticket_alerts,
        escalation_alerts,
        customer_feedback_alerts,
        warning_threshold_percent,
      } = req.body;
      const agent_id = (req.user as any)?.id;

      const NotificationSetting = await prisma.notification_settings.upsert({
        where: { id: id ?? 0 },
        update: {
          agent_id: Number(agent_id),
          email_notifications,
          sla_warnings,
          new_ticket_alerts,
          escalation_alerts,
          customer_feedback_alerts,
          warning_threshold_percent,
          created_at: new Date(),
          // updated_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          agent_id: Number(agent_id),
          email_notifications,
          sla_warnings,
          new_ticket_alerts,
          escalation_alerts,
          customer_feedback_alerts,
          warning_threshold_percent,
          created_at: new Date(),
          // updated_at: new Date(),
        },
      });

      res.success(
        id
          ? "Notification setting updated successfully"
          : "Notification setting created successfully",
        serializeNotificationSetting(NotificationSetting, true, true),
        id ? 200 : 201
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async getAllNotificationSetting(req: Request, res: Response): Promise<void> {
    try {
      // const { page = "1", limit = "10", search = "" } = req.query;
      console.log("agent_id ???????????????", req.user?.id);
      const agent_id = req.user ? (req.user as any)?.id : null;
      // const page_num = parseInt(page as string, 10);
      // const limit_num = parseInt(limit as string, 10);
      // const searchLower = (search as string).toLowerCase();
      // const filters: any = search
      //   ? {
      //       OR: [
      //         {
      //           setting_key: {
      //             contains: searchLower,
      //           },
      //         },
      //         {
      //           description: {
      //             contains: searchLower,
      //           },
      //         },
      //       ],
      //     }
      //   : {};
      console.log("agent_id", agent_id);
      const { data, pagination } = await paginate({
        model: prisma.notification_settings,
        // filters,
        filters: { agent_id: Number(agent_id) },
        include: { user_notification_setting: true },
        // page: page_num,
        // limit: limit_num,
        orderBy: { id: "desc" },
      });

      res.success(
        "Notification settings retrieved successfully",
        data.map((setting: any) =>
          serializeNotificationSetting(setting, true, true)
        ),
        200
        // pagination
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },
};
