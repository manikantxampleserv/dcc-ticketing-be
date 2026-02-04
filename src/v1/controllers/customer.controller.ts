import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "../../utils/pagination";
import { validationResult } from "express-validator";
import { connect } from "http2";

const prisma = new PrismaClient();

const serializeCustomer = (
  customer: any,
  includeCreatedAt = false,
  includeUpdatedAt = false,
) => ({
  id: customer.id,
  company_id: customer.company_id,
  first_name: customer.first_name,
  last_name: customer.last_name,
  email: customer.email,
  phone: customer.phone,
  is_active: customer.is_active,
  job_title: customer.job_title,
  support_type: customer?.support_type,
  l1_support_hours: customer?.l1_support_hours,
  l1_support_used_hours: customer?.l1_support_used_hours,
  server_hosted_on: customer?.server_hosted_on,
  signed_waiver_form: customer?.signed_waiver_form,
  customer_support_type: customer?.customer_support_type,
  l1_support_applicable: customer?.l1_support_applicable,
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
  // customer_support_type: customer.customer_support_type
  //   ? customer.customer_support_type.map((type: any) => ({
  //       id: type.id,
  //       category_name: type.category_name,
  //     }))
  //   : undefined,
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
        support_type,
        l1_support_hours,
        l1_support_used_hours,
        l1_support_applicable,
        server_hosted_on,
        signed_waiver_form,
        is_active,
      } = req.body;

      const customer = await prisma.customers.create({
        data: {
          company_id,
          first_name,
          last_name,
          email,
          phone,
          support_type: Number(support_type),
          l1_support_hours: l1_support_hours?.toString(),
          l1_support_used_hours: l1_support_used_hours?.toString(),
          l1_support_applicable: l1_support_applicable?.toString(),
          server_hosted_on: server_hosted_on?.toString(),
          signed_waiver_form: signed_waiver_form?.toString(),
          job_title,
          is_active,
          created_at: new Date(),
        },
        include: {
          companies: true,
          support_ticket_responses: true,
          tickets: true,
          customer_support_type: true,
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
          customer_support_type: true,
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

      // ❌ remove fields that should not be updated directly
      const {
        created_at,
        updated_at,
        company_id,
        support_type,
        l1_support_hours,
        l1_support_used_hours,
        l1_support_applicable,
        server_hosted_on,
        signed_waiver_form,
        ...updateData
      } = req.body;

      // ✅ build prisma update data safely
      const prismaData: any = {
        ...updateData,
        // support_type: Number(support_type),
        customer_support_type: support_type
          ? { connect: { id: Number(support_type) } }
          : undefined,
        l1_support_hours: l1_support_hours?.toString(),
        l1_support_used_hours: l1_support_used_hours?.toString(),
        server_hosted_on: server_hosted_on?.toString(),
        signed_waiver_form: signed_waiver_form?.toString(),
        l1_support_applicable: l1_support_applicable?.toString(),
        updated_at: new Date(),
      };

      // ✅ conditionally connect company
      if (company_id) {
        prismaData.companies = {
          connect: { id: Number(company_id) },
        };
      }

      const updatedCustomer = await prisma.customers.update({
        where: { id },
        data: prismaData,
        include: {
          companies: true,
          support_ticket_responses: true,
          tickets: true,
          customer_support_type: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Customer updated successfully",
        data: serializeCustomer(updatedCustomer, true, true),
      });
    } catch (error: any) {
      console.error("Customer Error : ", error);

      if (error.code === "P2025") {
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
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
          200,
        );
        return;
      }
      res.error(
        "Please provide a valid 'id' or 'ids[]' in the request body",
        400,
      );
    } catch (error: any) {
      res.error(error.message, 500);
    }
  },

  async getAllCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchTerm = (search as string).toLowerCase().trim();

      // Base filter object
      let filters: any = {};

      if (searchTerm) {
        // If there’s a space, assume “first last”
        const parts = searchTerm.split(/\s+/);
        if (parts.length >= 2) {
          // Use first part for first_name and last part for last_name
          const [firstPart, ...rest] = parts;
          const lastPart = rest.join(" ");
          filters.AND = [
            { first_name: { contains: firstPart } },
            { last_name: { contains: lastPart } },
          ];
        } else {
          // Single term: OR across all fields
          filters.OR = [
            { email: { contains: searchTerm } },
            { first_name: { contains: searchTerm } },
            { last_name: { contains: searchTerm } },
            { job_title: { contains: searchTerm } },
            { phone: { contains: searchTerm } },
          ];
        }
      }
      const { data, pagination } = await paginate({
        model: prisma.customers,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
        include: {
          companies: true,
          support_ticket_responses: true,
          tickets: true,
          customer_support_type: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Customers retrieved successfully",
        data: data.map((customer: any) =>
          serializeCustomer(customer, true, true),
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
  async getAllCustomerOption(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchTerm = (search as string).toLowerCase().trim();

      // Base filter object
      let filters: any = {};

      if (searchTerm) {
        // If there’s a space, assume “first last”
        const parts = searchTerm.split(/\s+/);
        if (parts.length >= 2) {
          // Use first part for first_name and last part for last_name
          const [firstPart, ...rest] = parts;
          const lastPart = rest.join(" ");
          filters.AND = [
            { first_name: { contains: firstPart } },
            { last_name: { contains: lastPart } },
          ];
        } else {
          // Single term: OR across all fields
          filters.OR = [
            { email: { contains: searchTerm } },
            { first_name: { contains: searchTerm } },
            { last_name: { contains: searchTerm } },
            // { job_title: { contains: searchTerm } },
            // { phone: { contains: searchTerm } },
          ];
        }
      }
      const { data, pagination } = await paginate({
        model: prisma.customers,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
        select: {
          id: true,
          company_id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          is_active: true,
        },
        // include: {
        //   companies: true,
        //   support_ticket_responses: true,
        //   tickets: true,
        //   customer_support_type: true,
        // },
      });

      res.status(200).json({
        success: true,
        message: "Customers retrieved successfully",
        data: data.map((customer: any) =>
          serializeCustomer(customer, true, true),
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
