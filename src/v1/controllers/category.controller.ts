import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "../../utils/pagination";
import { param, validationResult } from "express-validator";
const prisma = new PrismaClient();

const serializeCategory = (category: any) => ({
  id: category.id,
  category_name: category.category_name,
  description: category.description,
  isActive: category.is_active,
  created_at: category.created_at,
});

export const categoryController = {
  // Create category
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.error(firstError.msg, 400);
        return;
      }

      const { category_name, description, is_active, created_at } = req.body;

      if (!category_name) {
        res.error("Category name is required", 400);
        return;
      }

      const category = await prisma.categories.create({
        data: {
          category_name,
          description,
          is_active: is_active ?? true,
          created_at: created_at ? new Date(created_at) : new Date(),
        },
      });

      res.success(
        "Category created successfully",
        serializeCategory(category),
        201
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  // Get category by ID
  async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const category = await prisma.categories.findUnique({
        where: { id },
      });

      if (!category) {
        res.error("Category not found", 404);
      }

      res.success("Category fetched successfully", serializeCategory(category));
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  // Update category
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { created_at, ...rest } = req.body;

      if ("id" in rest) {
        delete rest.id;
      }

      if ("name" in rest) {
        rest.category_name = rest.name;
        delete rest.name;
      }

      const category = await prisma.categories.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          created_at: created_at ? new Date(created_at) : new Date(),
        },
      });

      res.success("Category updated successfully", serializeCategory(category));
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  // Delete category
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const bodyIds: unknown = req.body?.ids;
      const ids = Array.isArray(bodyIds)
        ? bodyIds.map(Number).filter((n) => Number.isFinite(n))
        : [];
      const paramId = req.params.id ? Number(req.params.id) : null;

      // Bulk delete
      if (ids.length > 0) {
        const deleted = await prisma.categories.deleteMany({
          where: { id: { in: ids } },
        });

        return void res.status(200).json({
          success: true,
          message: `${deleted.count} categor${
            deleted.count === 1 ? "y" : "ies"
          } deleted successfully`,
          deleted_count: deleted.count,
        });
      }

      // Single delete
      if (paramId && Number.isFinite(paramId)) {
        const category = await prisma.categories.findUnique({
          where: { id: paramId },
          select: { id: true },
        });

        if (!category) {
          return void res
            .status(404)
            .json({ success: false, error: "Category not found" });
        }

        await prisma.categories.delete({ where: { id: paramId } });

        return void res.status(200).json({
          success: true,
          message: "Category deleted successfully",
          deleted_id: paramId,
        });
      }

      return void res.status(400).json({
        success: false,
        error:
          "Invalid id provided. Provide path param :id or body { ids: number[] }",
      });
    } catch (err: any) {
      // If you didn't switch to SetNull yet and FK fails, Prisma throws P2003
      if (err?.code === "P2003") {
        return void res.status(400).json({
          success: false,
          error:
            "Cannot delete category because it is linked with one or more tickets. Either unlink tickets ",
        });
      }

      console.error(err);
      return void res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  // Get all categories
  async getAllCategories(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const filters = search
        ? { category_name: { contains: (search as string).toLowerCase() } }
        : {};

      const { data, pagination } = await paginate({
        model: prisma.categories,
        filters,
        page: pageNum,
        limit: limitNum,
        orderBy: { id: "desc" },
      });

      res.success(
        "Categories retrieved successfully",
        data.map(serializeCategory),
        200,
        pagination
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },
};
