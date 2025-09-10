import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();

const serializeCustomer = (
  customer: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: customer.id,
  company_id: customer.company_id,
  first_name: customer.first_name,
  last_name: customer.last_name,
  email: customer.email,
  phone: customer.phone,
  job_title: customer.job_title,
  is_active: customer.is_active,
  ...(includeCreatedAt && { created_at: customer.created_at }),
  ...(includeUpdatedAt && { updated_at: customer.updated_at }),

  companies: customer.companies
    ? {
        id: customer.companies.id,
        company_name: customer.companies.company_name,
        domain: customer.companies.domain,
      }
    : undefined,
  support_ticket_responses: customer.support_ticket_responses
    ? customer.support_ticket_responses.map((response: any) => ({
        id: response.id,
        ticket_id: response.ticket_id,
        agent_id: response.agent_id,
      }))
    : undefined,
  tickets: customer.tickets
    ? customer.tickets.map((ticket: any) => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
      }))
    : undefined,
});

export const customerController = {
  async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.status(400).json({ success: false, error: firstError.msg });
        return;
      }

      const {
        company_id,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        is_active,
      } = req.body;

      const customer = await prisma.customers.create({
        data: {
          company_id,
          first_name,
          last_name,
          email,
          phone,
          job_title,
          is_active,
          created_at: new Date(),
        },
        include: {
          companies: true,
          support_ticket_responses: true,
          tickets: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: serializeCustomer(customer, true, false),
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal Server Error",
      });
    }
  },

  async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.status(400).json({ success: false, error: firstError.msg });
        return;
      }

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: "Invalid customer ID" });
        return;
      }

      const customer = await prisma.customers.findUnique({
        where: { id },
        include: {
          companies: true,
          support_ticket_responses: true,
          tickets: true,
        },
      });

      if (!customer) {
        res.status(404).json({ success: false, message: "Customer not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Customer retrieved successfully",
        data: serializeCustomer(customer, true, true),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Internal Server Error",
      });
    }
  },

  async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.status(400).json({ success: false, error: firstError.msg });
        return;
      }

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: "Invalid customer ID" });
        return;
      }

      const { created_at, updated_at, ...updateData } = req.body;

      const updatedCustomer = await prisma.customers.update({
        where: { id },
        data: {
          ...updateData,
          updated_at: new Date(),
        },
        include: {
          companies: true,
          support_ticket_responses: true,
          tickets: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Customer updated successfully",
        data: serializeCustomer(updatedCustomer, true, true),
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === "P2025") {
        res.status(404).json({ success: false, message: "Customer not found" });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || "Internal Server Error",
        });
      }
    }
  },

  async deleteCustomer(req: Request, res: Response): Promise<void> {
    // try {
    //   const id = Number(req.params.id);
    //   if (isNaN(id)) {
    //     res.status(400).json({ success: false, error: "Invalid customer ID" });
    //     return;
    //   }

    //   await prisma.customers.delete({ where: { id } });

    //   res.status(200).json({
    //     success: true,
    //     message: "Customer deleted successfully",
    //   });
    // } catch (error: any) {
    //   console.error(error);
    //   if (error.code === "P2025") {
    //     res.status(404).json({ success: false, message: "Customer not found" });
    //   } else {
    //     res
    //       .status(500)
    //       .json({ success: false, error: "Internal Server Error" });
    //   }
    // }

    try {
      const { id, ids } = req.body;

      if (id && !isNaN(Number(id))) {
        const customer = await prisma.customers.findUnique({
          where: { id: Number(id) },
        });

        if (!customer) {
          res.error("Customer not found", 404);
          return;
        }

        await prisma.customers.delete({ where: { id: Number(id) } });
        res.success(`Customer with ID ${id} deleted successfully`, 200);
        return;
      }

      if (Array.isArray(ids) && ids.length > 0) {
        const deletedCustomer = await prisma.customers.deleteMany({
          where: { id: { in: ids } },
        });

        if (deletedCustomer.count === 0) {
          res.error("No customers found for deletion", 404);
          return;
        }
        res.success(
          `${deletedCustomer.count} customers deleted successfully`,
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

  async getAllCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);

      const { data, pagination } = await paginate({
        model: prisma.customers,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
        include: {
          companies: true,
          support_ticket_responses: true,
          tickets: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Customers retrieved successfully",
        data: data.map((customer: any) =>
          serializeCustomer(customer, true, true)
        ),
        pagination,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal Server Error",
      });
    }
  },
};
