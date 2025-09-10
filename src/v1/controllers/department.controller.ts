import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
import { validationResult } from "express-validator";
const prisma = new PrismaClient();

const serializeDepartment = (
  department: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: department.id,
  department_name: department.department_name,
  is_active: Boolean(department.is_active),
  ...(includeCreatedAt && { created_at: department.created_at }),
  ...(includeUpdatedAt && { updated_at: department.updated_at }),
});

export const departmentController = {
  async createDepartment(req: Request, res: Response): Promise<void> {
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
      const { department_name, is_active } = req.body;

      const department = await prisma.department.create({
        data: {
          department_name,
          is_active: is_active === true || is_active === "true" ? "Y" : "N",
        },
        select: {
          id: true,
          department_name: true,
          is_active: true,
          created_at: true,
        },
      });

      res.status(201).send({
        success: true,
        message: "Department created successfully",
        data: serializeDepartment(department, true, false),
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  },

  async getDepartmentById(req: Request, res: Response): Promise<void> {
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
      const department = await prisma.department.findUnique({ where: { id } });
      if (!department) {
        res
          .status(404)
          .send({ success: false, message: "Department not found" });
        return;
      }
      res.status(200).send({
        success: true,
        message: "Department found successfully",
        data: serializeDepartment(department, true, true),
      });
    } catch (error: any) {
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  },

  async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { created_at, updated_at, ...departmentData } = req.body;

      if (departmentData.is_active !== undefined) {
        departmentData.is_active =
          departmentData.is_active === true ||
          departmentData.is_active === "true"
            ? "Y"
            : "N";
      }

      const department = await prisma.department.update({
        where: { id: Number(req.params.id) },
        data: {
          ...departmentData,
          created_at: created_at ? new Date(created_at) : undefined,
          updated_at: updated_at ? new Date(updated_at) : new Date(),
        },
      });

      res.status(200).send({
        success: true,
        message: "Department updated successfully",
        data: serializeDepartment(department, false, true),
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },

  async deleteDepartment(req: Request, res: Response): Promise<void> {
    // try {
    //   await prisma.department.delete({
    //     where: { id: Number(req.params.id) },
    //   });
    //   res.status(200).send({
    //     success: true,
    //     message: "Department deleted successfully",
    //   });
    // } catch (error) {
    //   console.log("Error in department deletion", error);

    //   res.status(500).send({
    //     success: false,
    //     message: "Internal Server Error",
    //   });
    // }

    try {
      const { id, ids } = req.body;
      if (id && !isNaN(Number(id))) {
        const department = await prisma.department.findUnique({
          where: { id: Number(id) },
        });
        if (!department) {
          res.error("Department not found", 404);
          return;
        }
        await prisma.department.delete({ where: { id: Number(id) } });
        res.success(`Department with id ${id} deleted successfully`, 200);
        return;
      }
      if (Array.isArray(ids) && ids.length > 0) {
        const deleteDepartment = await prisma.department.deleteMany({
          where: { id: { in: ids } },
        });
        if (deleteDepartment.count === 0) {
          res.error("No matching department found for deletion", 404);
          return;
        }
        res.success(
          `${deleteDepartment.count} department deleted successfully`,
          200
        );
        return;
      }
      res.error(
        "Please provide a valid 'id' or 'ids[]' in the request body",
        400
      );
    } catch (error: any) {
      res.error(error.message, 500);
    }
  },

  async getAllDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchLower = (search as string).toLowerCase();
      const filters: any = search
        ? {
            department_name: {
              contains: searchLower,
            },
          }
        : {};
      const { data, pagination } = await paginate({
        model: prisma.department,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
      });
      res.status(200).send({
        success: true,
        message: "Department  retrieved successfully",
        data: data.map((department: any) =>
          serializeDepartment(department, true, true)
        ),
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
