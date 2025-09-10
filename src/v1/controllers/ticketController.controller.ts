import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
import { validationResult } from "express-validator";

const prisma = new PrismaClient();

const serializeTicket = (ticket: any, includeDates = false) => ({
  id: Number(ticket.id),
  ticket_number: ticket.ticket_number,
  customer_id: ticket.customer_id,
  assigned_agent_id: ticket.assigned_agent_id,
  category_id: ticket.category_id,
  subject: ticket.subject,
  description: ticket.description,
  priority: ticket.priority,
  status: ticket.status,
  source: ticket.source,
  sla_deadline: ticket.sla_deadline,
  sla_status: ticket.sla_status,
  first_response_at: ticket.first_response_at,
  resolved_at: ticket.resolved_at,
  closed_at: ticket.closed_at,
  assigned_by: ticket.assigned_by,
  is_merged: ticket.is_merged,
  reopen_count: ticket.reopen_count,
  time_spent_minutes: ticket.time_spent_minutes,
  last_reopened_at: ticket.last_reopened_at,
  customer_satisfaction_rating: ticket.customer_satisfaction_rating,
  customer_feedback: ticket.customer_feedback,
  tags: ticket.tags,
  merged_into_ticket_id: ticket.merged_into_ticket_id,
  ...(includeDates && {
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
  }),
  users: ticket.users
    ? {
        username: ticket.username,
        email: ticket.email,
      }
    : undefined,
  customers: ticket.customers
    ? {
        id: ticket.id,
        company_id: ticket.company_id,
        first_name: ticket.first_name,
        last_name: ticket.last_name,
      }
    : undefined,
  agents: ticket.agents
    ? {
        id: ticket.id,
        first_name: ticket.first_name,
        last_name: ticket.last_name,
      }
    : undefined,
});

export const ticketController = {
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const {
        ticket_number,
        customer_id,
        assigned_agent_id,
        category_id,
        subject,
        description,
        priority,
        status,
        source,
        sla_deadline,
        sla_status,
        first_response_at,
        resolved_at,
        closed_at,
        assigned_by,
        is_merged,
        reopen_count,
        time_spent_minutes,
        last_reopened_at,
        customer_satisfaction_rating,
        customer_feedback,
        tags,
        merged_into_ticket_id,
      } = req.body;

      const ticket = await prisma.tickets.create({
        data: {
          ticket_number,
          customer_id,
          assigned_agent_id,
          category_id,
          subject,
          description,
          priority: priority ?? "Medium",
          status: status ?? "Open",
          source: source ?? "Email",
          sla_deadline,
          sla_status: sla_status ?? "Within",
          first_response_at,
          resolved_at,
          closed_at,
          assigned_by,
          is_merged: is_merged ?? false,
          reopen_count: reopen_count ?? 0,
          time_spent_minutes: time_spent_minutes ?? 0,
          last_reopened_at,
          customer_satisfaction_rating,
          customer_feedback,
          tags,
          merged_into_ticket_id,
        },
        include: {
          users: true,
          customers: true,
          agents: true,
        },
      });

      res.success(
        "Ticket created successfully",
        serializeTicket(ticket, true),
        201
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async updateTicket(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.tickets.findUnique({ where: { id } });
      if (!existing) {
        res.error("Ticket not found", 404);
      }
      const {
        ticket_number,
        customer_id,
        assigned_agent_id,
        category_id,
        subject,
        description,
        priority,
        status,
        source,
        sla_deadline,
        sla_status,
        first_response_at,
        resolved_at,
        closed_at,
        assigned_by,
        is_merged,
        reopen_count,
        time_spent_minutes,
        last_reopened_at,
        customer_satisfaction_rating,
        customer_feedback,
        tags,
        merged_into_ticket_id,
      } = req.body;

      const ticket = await prisma.tickets.update({
        where: { id },
        data: {
          ticket_number,
          customer_id,
          assigned_agent_id,
          category_id,
          subject,
          description,
          priority,
          status,
          source,
          sla_deadline,
          sla_status,
          first_response_at,
          resolved_at,
          closed_at,
          assigned_by,
          is_merged,
          reopen_count,
          time_spent_minutes,
          last_reopened_at,
          customer_satisfaction_rating,
          customer_feedback,
          tags,
          merged_into_ticket_id,
          updated_at: new Date(),
        },
        include: {
          users: true,
          customers: true,
          agents: true,
        },
      });

      res.success(
        "Ticket updated successfully",
        serializeTicket(ticket, true),
        200
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },

  async getTicketById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const ticket = await prisma.tickets.findUnique({
        where: { id },
        include: {
          agents: true,
          users: true,
          categories: true,
          customers: true,
        },
      });
      if (!ticket) res.error("Ticket not found", 404);

      res.success(
        "Ticket fetched successfully",
        serializeTicket(ticket, true),
        200
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async deleteTicket(req: Request, res: Response): Promise<void> {
    try {
      const { id, ids } = req.body;

      if (id && !isNaN(Number(id))) {
        const ticket = await prisma.tickets.findUnique({
          where: { id: Number(id) },
        });

        if (!ticket) {
          res.error("Ticket not found", 404);
          return;
        }

        await prisma.tickets.delete({ where: { id: Number(id) } });
        res.success(`Ticket with id ${id} deleted successfully`, 200);
        return;
      }

      if (Array.isArray(ids) && ids.length > 0) {
        const deletedTickets = await prisma.tickets.deleteMany({
          where: { id: { in: ids } },
        });

        if (deletedTickets.count === 0) {
          res.error("No matching tickets found for deletion", 404);
          return;
        }

        res.success(
          `${deletedTickets.count} tickets deleted successfully`,
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

  async getAllTicket(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchLower = (search as string).toLowerCase();

      const filters: any = search
        ? {
            subject: {
              contains: searchLower,
            },
            ticket_number: {
              contains: searchLower,
            },
            status: {
              contains: searchLower,
            },
          }
        : {};

      const { data, pagination } = await paginate({
        model: prisma.tickets,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { created_at: "desc" },
        include: {
          users: true,
          customers: true,
          agents: true,
        },
      });

      res.success(
        "Tickets fetched successfully",
        data.map((ticket: any) => serializeTicket(ticket, true)),
        200,
        pagination
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },
};
