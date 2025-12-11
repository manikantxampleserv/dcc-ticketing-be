import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "../../utils/pagination";
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
  is_active: company.is_active ? "Y" : "N",
  ...(includeCreatedAt && { created_at: company.created_at }),
  ...(includeUpdatedAt && { updated_at: company.updated_at }),
  customers: company.customers
    ? {
        id: company.customers.id,
        first_name: company.customers.first_name,
        last_name: company.customers.domain,
      }
    : undefined,
});

export const companyController = {
  async createCompany(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.error(firstError.msg, 400);

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
        include: {
          customers: true,
        },
      });

      res.success(
        "Company created successfully",
        serializeCompany(company),
        201
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async getCompanyById(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.error(firstError.msg, 400);

        return;
      }
      const id = Number(req.params.id);
      const company = await prisma.companies.findUnique({ where: { id } });

      if (!company) {
        res.error("Company not found", 404);
        return;
      }
      res.success(
        "Company fetched successfully",
        serializeCompany(company),
        200
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const { created_at, updated_at, ...companyData } = req.body;

      if ("id" in companyData) {
        delete companyData.id;
      }

      if (companyData.is_active !== undefined) {
        companyData.is_active =
          companyData.is_active === true || companyData.is_active === "true";
      }

      const company = await prisma.companies.update({
        where: { id: Number(req.params.id) },
        data: {
          ...companyData,
          created_at: created_at ? new Date(created_at) : new Date(),
          updated_at: updated_at ? new Date(updated_at) : new Date(),
        },
      });
      res.success(
        "Category updated successfully",
        serializeCompany(company),
        200
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const { ids } = req.body;

      // ---- Bulk Delete ----
      if (Array.isArray(ids) && ids.length > 0) {
        try {
          const deletedCompany = await prisma.companies.deleteMany({
            where: { id: { in: ids.map(Number) } },
          });

          if (deletedCompany.count === 0) {
            res.error("No companies found for deletion", 404);
            return;
          }

          res.success(
            `${deletedCompany.count} companies deleted successfully`,
            200
          );
          return;
        } catch (err: any) {
          // Prisma FK constraint
          if (err.code === "P2003") {
            res.error(
              "Cannot delete one or more companies because they are linked with customers, tickets, or users.",
              400
            );
            return;
          }
          res.error(err.message, 500);
          return;
        }
      }

      // ---- Single Delete ----
      if (id && !isNaN(Number(id))) {
        try {
          const company = await prisma.companies.findUnique({
            where: { id: Number(id) },
          });

          if (!company) {
            res.error("Company not found", 404);
            return;
          }

          await prisma.companies.delete({
            where: { id: Number(id) },
          });

          res.success(`Company with ID ${id} deleted successfully`, 200);
          return;
        } catch (err: any) {
          if (err.code === "P2003") {
            res.error(
              "Cannot delete this company because it is linked with customers, tickets, or users.",
              400
            );
            return;
          }
          res.error(err.message, 500);
          return;
        }
      }

      res.error(
        "Please provide a valid 'id' or 'ids[]' in the request body",
        400
      );
      return;
    } catch (error: any) {
      res.error(error.message, 500);
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
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
        include: {
          customers: true,
        },
      });
      res.success(
        "Company retrieved successfully",
        data.map((company: any) => serializeCompany(company, true, true)),
        200,
        pagination
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },
};
