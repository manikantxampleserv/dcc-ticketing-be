import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
const prisma = new PrismaClient();

const serializeCategory = (category: any) => ({
  id: category.id,
  name: category.category_name,
  description: category.description,
  isActive: category.is_active,
  created_at: category.created_at,
});

export const categoryController = {
  // Create category
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category_name, description, is_active, created_at } = req.body;

      const category = await prisma.categories.create({
        data: {
          category_name,
          description,
          is_active: is_active ?? true,
          created_at: created_at ? new Date(created_at) : new Date(),
        },
      });

      res.status(201).json(serializeCategory(category));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get category by ID
  async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      console.log("getCategoryById handler running");
      console.log("Requested ID:", req.params.id, typeof req.params.id);

      const id = Number(req.params.id);
      const category = await prisma.categories.findUnique({
        where: { id },
      });

      if (!category) {
        res.status(404).json({ error: "Category not found" });
        console.log("Sent custom 404 response");
        return;
      }

      res.status(200).send({
        success: true,
        message: "Category Fetched Successfully",
        data: serializeCategory(category),
      });
    } catch (error: any) {
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  },

  // Update category
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { created_at, ...rest } = req.body;

      const category = await prisma.categories.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          created_at: created_at ? new Date(created_at) : new Date(),
        },
      });

      res.status(200).send({
        success: true,
        message: "Category Updated Successfully",
        data: serializeCategory(category),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete category
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      await prisma.categories.delete({
        where: { id: Number(req.params.id) },
      });
      res.status(200).send({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error: any) {
      res.status(500).send({ success: false, error: error.message });
    }
  },

  // Get all categories
  async getAllCategories(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);

      const { data, pagination } = await paginate({
        model: prisma.categories,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
      });

      res.status(200).send({
        success: true,
        message: "Categories retrieved successfully",
        data: data.map(serializeCategory),
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
