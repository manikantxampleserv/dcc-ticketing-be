import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();
const serializeAgents = (
  agent: any,
  includeCreatedAt = false,
  includeUpdatedAt = false
) => ({
  id: agent.id,
  first_name: agent.first_name,
  last_name: agent.last_name,
  role: agent.role,
  department: agent.department,
  hire_date: agent.hire_date,
  avatar: agent.avatar,
  email: agent.email,
  phone: agent.phone,
  user_id: agent.user_id,
  is_active: agent.is_active,
  ...(includeCreatedAt && { created_at: agent.created_at }),
  ...(includeUpdatedAt && { updated_at: agent.updated_at }),

  users: agent.users
    ? {
        id: agent.users.id,
        email: agent.users.email,
        first_name: agent.users.first_name,
        last_name: agent.users.last_name,
      }
    : undefined,
  support_ticket_responses: agent.support_ticket_responses
    ? agent.support_ticket_responses.map((response: any) => ({
        id: response.id,
        ticket_id: response.ticket_id,
        agent_id: response.agent_id,
      }))
    : undefined,
  tickets: agent.tickets
    ? agent.tickets.map((ticket: any) => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
      }))
    : undefined,
});

export const agentsController = {
  async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.status(400).json({ success: false, error: firstError.msg });
        return;
      }

      const {
        role,
        department,
        hire_date,
        avatar,
        user_id,
        first_name,
        last_name,
        email,
        phone,
        is_active,
      } = req.body;

      const agent = await prisma.agents.create({
        data: {
          role,
          department,
          hire_date,
          avatar,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          is_active,
          created_at: new Date(),
        },
        include: {
          users: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Agent created successfully",
        data: serializeAgents(agent, true, false),
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal Server Error",
      });
    }
  },

  async getAgentById(req: Request, res: Response): Promise<void> {
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
        data: serializeAgents(customer, true, true),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Internal Server Error",
      });
    }
  },

  async updateAgent(req: Request, res: Response): Promise<void> {
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
        data: serializeAgents(updatedCustomer, true, true),
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

  async deleteAgent(req: Request, res: Response): Promise<void> {
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

  async getAllAgents(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);

      const { data, pagination } = await paginate({
        model: prisma.agents,
        page: page_num,
        limit: limit_num,
        orderBy: { id: "desc" },
        include: {
          users: true,
          agent_performance: true,
          tickets: true,
          support_ticket_responses: true,
          ticket_history: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Agents retrieved successfully",
        data: data.map((agent: any) => serializeAgents(agent, true, true)),
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
