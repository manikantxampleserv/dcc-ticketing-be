import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();

const serializeSlaConfig = (
  sla: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: Number(sla.id),
  priority: sla.priority,
  response_time_hours: sla.response_time_hours,
  resolution_time_hours: sla.resolution_time_hours,
  business_hours_only: sla.business_hours_only,
  business_start_time: sla.business_start_time,
  business_end_time: sla.business_end_time,
  include_weekends: sla.include_weekends,
  is_active: sla.is_active,
  ...(includeCreatedAt && { created_at: sla.created_at }),
  ...(includeUpdatedAt && { updated_at: sla.updated_at }),
});

export const SLAcontroller = {
  async createOrUpdate(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.error(firstError.msg, 400);
        return;
      }

      const {
        id,
        priority,
        response_time_hours,
        resolution_time_hours,
        business_hours_only,
        business_start_time,
        business_end_time,
        include_weekends,
        is_active,
      } = req.body;

      let slaConfig;

      if (id) {
        const existing = await prisma.sla_configurations.findUnique({
          where: { id: Number(id) },
        });

        if (!existing) {
          res.error("SLA configuration not found", 404);
          return;
        }

        slaConfig = await prisma.sla_configurations.update({
          where: { id: Number(id) },
          data: {
            priority,
            response_time_hours,
            resolution_time_hours,
            business_hours_only,
            business_start_time,
            business_end_time,
            include_weekends,
            is_active,
            updated_at: new Date(),
          },
        });

        res.success(
          "SLA configuration updated successfully",
          serializeSlaConfig(slaConfig, true, false),
          200
        );
        return;
      }

      slaConfig = await prisma.sla_configurations.create({
        data: {
          priority,
          response_time_hours,
          resolution_time_hours,
          business_hours_only: business_hours_only ?? false,
          business_start_time: business_start_time ?? "09:00:00",
          business_end_time: business_end_time ?? "17:00:00",
          include_weekends: include_weekends ?? false,
          is_active: is_active ?? true,
        },
      });

      res.success(
        "SLA configuration created successfully",
        serializeSlaConfig(slaConfig, true, true),
        201
      );
      return;
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
      return;
    }
  },

  async getSLAbyId(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const slaConfig = await prisma.sla_configurations.findUnique({
        where: { id },
      });

      if (!slaConfig) {
        res.error("SLA configuration not found", 404);
      }

      res.success(
        "SLA configuration fetched successfully",
        serializeSlaConfig(slaConfig, true, true),
        200
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async deleteSLA(req: Request, res: Response): Promise<void> {
    try {
      await prisma.sla_configurations.delete({
        where: { id: Number(req.params.id) },
      });
      res.success("SLA configuration deleted successfully");
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async getAllSLA(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchLower = (search as string).toLowerCase();

      const filters: any = search
        ? { priority: { contains: searchLower } }
        : {};

      const { data, pagination } = await paginate({
        model: prisma.sla_configurations,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
      });

      res.success(
        "SLA configurations retrieved successfully",
        data.map((sla: any) => serializeSlaConfig(sla, true, true)),
        200,
        pagination
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },
};
