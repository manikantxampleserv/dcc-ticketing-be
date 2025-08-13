import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
import { validationResult } from "express-validator";
const prisma = new PrismaClient();

const serializeCompany = (
  company: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: company.id,
  company_name: company.company_name,
  domain: company.domain,
  contact_email: company.contact_email,
  contact_phone: company.contact_phone,
  address: company.address,
  is_active: company.is_active,
  ...(includeCreatedAt && { created_at: company.created_at }),
  ...(includeUpdatedAt && { updated_at: company.updated_at }),
});

export const companyController = {
  async createCompany(req: Request, res: Response): Promise<void> {
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

      const {
        company_name,
        domain,
        contact_email,
        contact_phone,
        address,
        is_active,
      } = req.body;

      const company = await prisma.companies.create({
        data: {
          company_name,
          domain,
          contact_email,
          contact_phone,
          address,
          is_active,
        },
      });

      res.status(201).send({
        success: true,
        message: "Company created successfully",
        data: serializeCompany(company, true, false),
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  },

  async getCompanyById(req: Request, res: Response): Promise<void> {
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
      const company = await prisma.companies.findUnique({ where: { id } });

      if (!company) {
        res.status(404).send({ success: false, message: "Company not found" });
        return;
      }
      res.status(200).send({
        success: true,
        message: "Company found successfully",
        data: serializeCompany(company),
      });
    } catch (error: any) {
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  },

  async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const { created_at, updated_at, ...companyData } = req.body;

      const company = await prisma.companies.update({
        where: { id: Number(req.params.id) },
        data: {
          ...companyData,
          created_at: created_at ? new Date(created_at) : new Date(),
          updated_at: updated_at ? new Date(updated_at) : new Date(),
        },
      });
      res.status(200).send({
        success: true,
        message: "Company updated successfully",
        data: serializeCompany(company),
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },

  async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      await prisma.companies.delete({
        where: { id: Number(req.params.id) },
      });
      res.status(200).send({
        success: true,
        message: "Company deleted successfully",
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Internal Server Error",
      });
    }
  },

  async getAllCompany(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchLower = (search as string).toLowerCase();
      const filters: any = search
        ? {
            company_name: {
              contains: searchLower,
            },
          }
        : {};
      const { data, pagination } = await paginate({
        model: prisma.companies,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
      });
      res.status(200).send({
        success: true,
        message: "Companies retrieved successfully",
        data: data.map((customer: any) =>
          serializeCompany(customer, true, true)
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
