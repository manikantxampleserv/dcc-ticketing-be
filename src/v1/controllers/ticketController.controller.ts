import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
import { validationResult } from "express-validator";
import EmailService from "types/sendEmailComment";
import { uploadToBackblaze } from "utils/backBlaze";
import { uploadFile } from "utils/blackbaze";

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
  email_thread_id: ticket.email_thread_id,
  original_email_message_id: ticket.original_email_message_id,
  merged_into_ticket_id: ticket.merged_into_ticket_id,
  ticket_comments: ticket.ticket_comments,
  ...(includeDates && {
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
  }),
  users: ticket.users
    ? {
        id: ticket.users?.id,
        first_name: ticket.users?.first_name,
        last_name: ticket.users?.last_name,
        username: ticket.users?.username,
        email: ticket.users?.email,
      }
    : undefined,
  customers: ticket.customers
    ? {
        id: ticket.customers.id,
        company_id: ticket.customers.company_id,
        first_name: ticket.customers.first_name,
        last_name: ticket.customers.last_name,
        email: ticket.customers.email,
        phone: ticket.customers.phone,
        companies: ticket.customers.companies
          ? {
              id: ticket.customers.companies.id,
              company_name: ticket.customers.companies.company_name,
            }
          : undefined,
      }
    : undefined,
  agents_user: ticket.agents_user
    ? {
        id: ticket.agents_user?.id,
        first_name: ticket.agents_user?.first_name,
        last_name: ticket.agents_user?.last_name,
        username: ticket.agents_user?.username,
        email: ticket.agents_user?.email,
      }
    : undefined,
});

export const ticketController = {
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const {
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
        is_merged,
        reopen_count,
        time_spent_minutes,
        last_reopened_at,
        customer_satisfaction_rating,
        customer_feedback,
        tags,
        merged_into_ticket_id,
      } = req.body;

      const assigned_by = Number(req?.user?.id);
      const ticket_number = `TCKT-${Date.now()}`;

      let avatarUrl = null;
      if (req.file) {
        const fileName = `${ticket_number}/${Date.now()}_${
          req.file.originalname
        }`;
        avatarUrl = await uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype
        );
      }
      const attachment_urls = JSON.stringify([avatarUrl]);

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
          attachment_urls,
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
          agents_user: true,
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
      // const {
      //   ticket_number,
      //   customer_id,
      //   assigned_agent_id,
      //   category_id,
      //   subject,
      //   description,
      //   priority,
      //   status,
      //   source,
      //   sla_deadline,
      //   sla_status,
      //   first_response_at,
      //   resolved_at,
      //   closed_at,
      //   assigned_by,
      //   is_merged,
      //   reopen_count,
      //   time_spent_minutes,
      //   last_reopened_at,
      //   customer_satisfaction_rating,
      //   customer_feedback,
      //   tags,
      //   merged_into_ticket_id,
      // } = req.body;
      // Step 2: Extract and sanitize only defined fields from req.body
      const allowedFields = [
        "ticket_number",
        "customer_id",
        "assigned_agent_id",
        "category_id",
        "subject",
        "description",
        "priority",
        "status",
        "source",
        "sla_deadline",
        "sla_status",
        "first_response_at",
        "resolved_at",
        "closed_at",
        "assigned_by",
        "is_merged",
        "reopen_count",
        "time_spent_minutes",
        "last_reopened_at",
        "customer_satisfaction_rating",
        "customer_feedback",
        "tags",
        "merged_into_ticket_id",
      ];

      const dataToUpdate: Record<string, any> = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          dataToUpdate[field] = req.body[field];
        }
      }

      // Always update updated_at
      dataToUpdate.updated_at = new Date();

      const ticket = await prisma.tickets.update({
        where: { id },
        data: dataToUpdate,
        // data: {
        //   ticket_number,
        //   customer_id,
        //   assigned_agent_id,
        //   category_id,
        //   subject,
        //   description,
        //   priority,
        //   status,
        //   source,
        //   sla_deadline,
        //   sla_status,
        //   first_response_at,
        //   resolved_at,
        //   closed_at,
        //   assigned_by,
        //   is_merged,
        //   reopen_count,
        //   time_spent_minutes,
        //   last_reopened_at,
        //   customer_satisfaction_rating,
        //   customer_feedback,
        //   tags,
        //   merged_into_ticket_id,
        //   updated_at: new Date(),
        // },
        include: {
          users: true,
          customers: true,
          agents_user: true,
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
          agents_user: true,
          users: true,
          categories: true,
          ticket_comments: {
            select: {
              id: true,
              ticket_id: true,
              user_id: true,
              comment_text: true,
              customer_id: true,
              comment_type: true,
              is_internal: true,
              mentioned_users: true,
              attachment_urls: true,
              email_message_id: true,
              created_at: true,
              updated_at: true,
              ticket_comment_users: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                  avatar: true,
                },
              },
              ticket_comment_customers: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },

            orderBy: { created_at: "desc" },
          },
          customers: {
            select: {
              id: true,
              company_id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
              companies: { select: { id: true, company_name: true } },
            },
          },
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
          agents_user: true,
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
  // Create a new comment
  async createComment(req: any, res: Response): Promise<void> {
    try {
      const {
        ticket_id,
        comment_text,
        comment_type = "public",
        is_internal = false,
        mentioned_users,
      } = req.body;
      // const user_id = null;
      const user_id = req?.user?.id; // Assuming you have user auth middleware

      let imageUrl = null;
      console.log("File  ;: ", req.file);
      if (req.file) {
        const fileName = `ticket-${ticket_id}-comment/${Date.now()}_${
          req.file.originalname
        }`;
        imageUrl = await uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype
        );

        // imageUrl = await uploadToBackblaze(
        //   req.file.buffer,
        //   req.file.originalname,
        //   req.file.mimetype,
        //   "TicketComments",
        //   `ticket-${ticket_id}-comment`
        // );
      }
      console.log("Image URL:", imageUrl, req.file);

      // Validate ticket exists
      const ticket = await prisma.tickets.findUnique({
        where: { id: Number(ticket_id) },
        select: {
          email_thread_id: true,
          subject: true,
          ticket_number: true,
          id: true,
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          original_email_message_id: true,
          status: true,
          priority: true,
          description: true,
          created_at: true,
          source: true,
          customers: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      if (!ticket) {
        res.error("Ticket not found", 404);
        return;
      }
      let additionalEmails: any[] = [];
      const new_is_internal = is_internal == "true" ? true : false;
      // ✅ FIXED: Validate mentioned users properly
      let validatedMentionedUsers: number[] = [];
      const mentionedUser = mentioned_users && JSON.parse(mentioned_users);
      if (mentionedUser?.length > 0) {
        try {
          const userIds = mentionedUser
            ?.map((userId: any) => Number(userId))
            .filter(Boolean);

          if (userIds.length > 0) {
            const existingUsers = await prisma.users.findMany({
              where: {
                id: { in: userIds },
              },
              select: { id: true, email: true },
            });
            additionalEmails = existingUsers?.map((user) => user.email);
            validatedMentionedUsers = existingUsers.map((user) => user.id);

            if (validatedMentionedUsers.length !== userIds.length) {
              console.warn("⚠️ Some mentioned users were not found");
            }
          }
        } catch (mentionError) {
          console.error("❌ Error validating mentioned users:", mentionError);
          // Continue without failing the entire request
        }
      }
      // Create comment
      const comment = await prisma.ticket_comments.create({
        data: {
          ticket_id: Number(ticket_id),
          user_id: user_id ? Number(user_id) : undefined,
          comment_text,
          comment_type,
          is_internal: new_is_internal,
          mentioned_users:
            validatedMentionedUsers.length > 0
              ? JSON.stringify(validatedMentionedUsers)
              : null,
          attachment_urls: imageUrl ? imageUrl : "",
        },
        include: {
          ticket_comment_users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      // Send email to customer if it's a public comment
      // ✅ Send email to customer if it's a public comment
      if (!new_is_internal && comment_type === "public") {
        console.log("Sending email to customer...");
        await EmailService.sendCommentEmailToCustomer(
          ticket,
          { ...comment, imageUrl: imageUrl ? imageUrl : null },
          additionalEmails
        );
      }

      // Update ticket's updated_at timestamp
      await prisma.tickets.update({
        where: { id: Number(ticket_id) },
        data: { updated_at: new Date() },
      });

      res.success("Comment created successfully", comment, 201);
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },
};
