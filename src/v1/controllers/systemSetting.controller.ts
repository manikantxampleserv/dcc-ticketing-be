import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";

const prisma = new PrismaClient();

const serializeSystemSetting = (
  setting: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: setting.id,
  setting_key: setting.setting_key,
  setting_value: setting.setting_value,
  description: setting.description,
  data_type: setting.data_type,
  ...(includeCreatedAt && { created_at: setting.created_at }),
  ...(includeUpdatedAt && { updated_at: setting.updated_at }),
});

export const systemSettingController = {
  async createSystemSetting(req: Request, res: Response): Promise<void> {
    try {
      const { setting_key, setting_value, description, data_type } = req.body;

      const systemSetting = await prisma.system_settings.create({
        data: {
          setting_key,
          setting_value,
          description,
          data_type,
        },
      });

      res.success(
        "System setting created successfully",
        serializeSystemSetting(systemSetting),
        201
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async getSystemSettingById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const systemSetting = await prisma.system_settings.findUnique({
        where: { id },
      });

      if (!systemSetting) {
        res.error("System setting not found", 404);
        return;
      }

      res.success(
        "System setting retrieved successfully",
        serializeSystemSetting(systemSetting, true, true),
        200
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async updateSystemSetting(req: Request, res: Response): Promise<void> {
    try {
      const { created_at, updated_at, ...systemSettingData } = req.body;

      const systemSetting = await prisma.system_settings.update({
        where: { id: Number(req.params.id) },
        data: {
          ...systemSettingData,
          created_at: created_at ? new Date(created_at) : new Date(),
          updated_at: updated_at ? new Date(updated_at) : new Date(),
        },
      });

      res.success(
        "System setting updated successfully",
        serializeSystemSetting(systemSetting),
        200
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async deleteSystemSetting(req: Request, res: Response): Promise<void> {
    try {
      await prisma.system_settings.delete({
        where: { id: Number(req.params.id) },
      });

      res.success("System setting deleted successfully", null, 200);
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async getAllSystemSetting(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);

      const filters: any = search
        ? {
            OR: [
              {
                setting_key: {
                  contains: search as string,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: search as string,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {};

      const { data, pagination } = await paginate({
        model: prisma.system_settings,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
      });

      res.success(
        "System settings retrieved successfully",
        data.map((setting: any) => serializeSystemSetting(setting, true, true)),
        200,
        pagination
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },
};
