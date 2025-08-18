import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
const prisma = new PrismaClient();

const serializeEmailConfiguration = (
  email: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: email.id,
  smtp_server: email.smtp_server,
  smtp_port: Number(email.smtp_port),
  username: email.username,
  password: email.password,
  enable_tls: Boolean(email.enable_tls),
  from_email: email.from_email,
  from_name: email.from_name,
  auto_reply_enabled: Boolean(email.auto_reply_enabled),
  is_active: email.is_active,
  ...(includeCreatedAt && { created_at: email.created_at }),
  ...(includeUpdatedAt && { updated_at: email.updated_at }),
});

export const emailConfigurationController = {
  async createEmailConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const {
        smtp_server,
        smtp_port,
        username,
        password,
        enable_tls,
        from_email,
        from_name,
        is_active,
        auto_reply_enabled,
        auto_reply_message,
      } = req.body;

      const emailConfiguration = await prisma.email_configurations.create({
        data: {
          smtp_server,
          smtp_port,
          username,
          password,
          enable_tls,
          from_email,
          from_name,
          is_active,
          auto_reply_enabled,
          auto_reply_message,
        },
      });

      res.success(
        "Email Configuration created successfully",
        serializeEmailConfiguration(emailConfiguration),
        201
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async getEmailConfigurationById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const emailConfiguration = await prisma.email_configurations.findUnique({
        where: { id },
      });

      if (!emailConfiguration) {
        res.error("Email Configuration not found", 404);
        return;
      }
      res.success(
        "Email Configuration retrieved successfully",
        serializeEmailConfiguration(emailConfiguration),
        200
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async updateEmailConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { created_at, updated_at, ...emailConfigurationData } = req.body;
      const emailConfiguration = await prisma.email_configurations.update({
        where: { id: Number(req.params.id) },
        data: {
          ...emailConfigurationData,
          created_at: created_at ? new Date(created_at) : new Date(),
          updated_at: updated_at ? new Date(updated_at) : new Date(),
        },
      });
      res.success(
        "Email Configuration updated successfully",
        serializeEmailConfiguration(emailConfiguration),
        200
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async deleteEmailConfiguration(req: Request, res: Response): Promise<void> {
    try {
      await prisma.email_configurations.delete({
        where: { id: Number(req.params.id) },
      });
      res.success("Email Configuration deleted successfully", null, 200);
    } catch (error: any) {
      console.error(error);
    }
  },

  async getAllEmailConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchLower = (search as string).toLowerCase();
      const filters: any = search
        ? {
            username: {
              contains: searchLower,
            },
          }
        : {};
      const { data, pagination } = await paginate({
        model: prisma.email_configurations,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
      });
      res.success(
        "Email Configurations retrieved successfully",
        data.map((email: any) =>
          serializeEmailConfiguration(email, true, true)
        ),
        200,
        pagination
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },
};
