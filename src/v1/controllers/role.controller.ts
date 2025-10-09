import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "../../utils/pagination";
import { validationResult } from "express-validator";
const prisma = new PrismaClient();

const serializeRole = (
  role: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: role.id,
  name: role.name,
  is_active: Boolean(role.is_active),
  ...(includeCreatedAt && { created_at: role.created_at }),
  ...(includeUpdatedAt && { updated_at: role.updated_at }),
});

export const roleController = {
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.status(400).json({
          success: false,
          error: firstError.msg,
        });
        return;
      }
      const { name, is_active } = req.body;

      const role = await prisma.role.create({
        data: {
          name,
          is_active: is_active === true || is_active === "true" ? "Y" : "N",
        },
      });

      res.status(201).send({
        success: true,
        message: "Role created successfully",
        data: serializeRole(role, true, false),
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  },

  async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.status(400).json({
          success: false,
          error: firstError.msg,
        });
        return;
      }
      const id = Number(req.params.id);
      const role = await prisma.role.findUnique({ where: { id } });
      if (!role) {
        res.status(404).send({ success: false, message: "Roles not found" });
        return;
      }
      res.status(200).send({
        success: true,
        message: "Roles found successfully",
        data: serializeRole(role, true, true),
      });
    } catch (error: any) {
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  },

  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { created_at, updated_at, ...roleData } = req.body;

      if (roleData.is_active !== undefined) {
        roleData.is_active =
          roleData.is_active === true || roleData.is_active === "true"
            ? "Y"
            : "N";
      }

      const role = await prisma.role.update({
        where: { id: Number(req.params.id) },
        data: {
          ...roleData,
          created_at: created_at ? new Date(created_at) : undefined,
          updated_at: updated_at ? new Date(updated_at) : new Date(),
        },
      });

      res.status(200).send({
        success: true,
        message: "Role updated successfully",
        data: serializeRole(role, false, true),
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },

  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      await prisma.role.delete({
        where: { id: Number(req.params.id) },
      });
      res.status(200).send({
        success: true,
        message: "Role deleted successfully",
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Internal Server Error",
      });
    }
  },

  async getAllRole(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchLower = (search as string).toLowerCase();
      const filters: any = search
        ? {
            name: {
              contains: searchLower,
            },
          }
        : {};
      const { data, pagination } = await paginate({
        model: prisma.role,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
      });
      res.status(200).send({
        success: true,
        message: "Role  retrieved successfully",
        data: data.map((role: any) => serializeRole(role, true, true)),
        pagination,
      });
    } catch (error: any) {
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  },
};
