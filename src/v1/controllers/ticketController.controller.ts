import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { BusinessHoursSLACalculator } from "../../utils/BussinessHoursSLACalculation";
import { generateTicketNumber } from "../../utils/GenerateTicket";
import EmailService from "../../types/sendEmailComment";
import { uploadFile } from "../../utils/blackbaze";
import { paginate } from "../../utils/pagination";

const prisma = new PrismaClient();

const serializeTicket = (ticket: any, includeDates = false) => ({
  id: Number(ticket.id),
  ticket_number: ticket.ticket_number,
  customer_id: ticket.customer_id,
  customer_name: ticket.customer_name,
  customer_email: ticket.customer_email,
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
  attachment_urls: ticket?.attachment_urls || "",
  ticket_attachments: ticket.ticket_attachments
    ? ticket.ticket_attachments.map((att: any) => ({
        id: att.id,
        ticket_id: att.ticket_id,
        response_id: att.response_id,
        file_name: att.file_name,
        original_file_name: att.original_file_name,
        file_path: att.file_path,
        file_size: att.file_size ? Number(att.file_size) : null, // ✅ BigInt to Number
        content_type: att.content_type,
        file_hash: att.file_hash,
        uploaded_by: att.uploaded_by,
        uploaded_by_type: att.uploaded_by_type,
        is_public: att.is_public,
        virus_scanned: att.virus_scanned,
        scan_result: att.scan_result,
        created_at: att.created_at,
        users: att.users
          ? {
              id: att.users.id,
              first_name: att.users.first_name,
              last_name: att.users.last_name,
              email: att.users.email,
            }
          : undefined,
      }))
    : [],
  ticket_comments: ticket.ticket_comments,
  start_timer_at: ticket.start_timer_at,
  ...(includeDates && {
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
  }),
  parent_ticket: ticket?.tickets,
  child_tickets: ticket?.other_tickets,
  categories: ticket?.categories,
  ticket_sla_history: ticket?.ticket_sla_history,
  users: ticket.users
    ? {
        id: ticket.users?.id,
        first_name: ticket.users?.first_name,
        last_name: ticket.users?.last_name,
        username: ticket.users?.username,
        avatar: ticket.users?.avatar,
        email: ticket.users?.email,
      }
    : undefined,
  cc_of_ticket: ticket.cc_of_ticket
    ? ticket.cc_of_ticket?.map((val: any) => ({
        id: val.user_of_ticket_cc.id,
        first_name: val.user_of_ticket_cc.first_name,
        last_name: val.user_of_ticket_cc.last_name,
        email: val.user_of_ticket_cc.email,
        phone: val.user_of_ticket_cc.phone,
        avatar: val.user_of_ticket_cc.avatar,
      }))
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
        avatar: ticket.agents_user?.avatar,
        first_name: ticket.agents_user?.first_name,
        last_name: ticket.agents_user?.last_name,
        username: ticket.agents_user?.username,
        email: ticket.agents_user?.email,
      }
    : undefined,
  sla_priority: ticket.sla_priority
    ? {
        id: ticket.sla_priority?.id,
        priority: ticket.sla_priority?.priority,
        response_time_hours: ticket.sla_priority?.response_time_hours,
        resolution_time_hours: ticket.sla_priority?.resolution_time_hours,
      }
    : undefined,
});

// Helper functions for SLA (outside the controller)
const getDefaultResponseTime = (priority: number): number => {
  const defaults: { [key: number]: number } = { 1: 1, 2: 4, 3: 8, 4: 24 };
  return defaults[priority] || 24;
};

const getDefaultResolutionTime = (priority: number): number => {
  const defaults: { [key: number]: number } = { 1: 4, 2: 24, 3: 72, 4: 168 };
  return defaults[priority] || 168;
};

const getDefaultEscalationTime = (priority: number): number => {
  const defaults: { [key: number]: number } = { 1: 2, 2: 12, 3: 36, 4: 84 };
  return defaults[priority] || 84;
};

const createSLAHistoryEntries = async (
  ticketId: number,
  slaConfig: any,
  createdAt: Date
): Promise<void> => {
  // Extract business hours configuration from SLA config
  const businessConfig = {
    business_hours_only: slaConfig.business_hours_only || false,
    business_start_time: slaConfig.business_start_time || "09:00:00",
    business_end_time: slaConfig.business_end_time || "17:00:00",
    include_weekends: slaConfig.include_weekends || true,
  };

  console.log(`📊 Creating SLA entries for ticket ${ticketId} with config:`, {
    priority: slaConfig.priority,
    businessHoursOnly: businessConfig.business_hours_only,
    includeWeekends: businessConfig.include_weekends,
    businessHours: `${businessConfig.business_start_time}-${businessConfig.business_end_time}`,
  });

  // FIXED: Use BusinessHoursSLACalculator instead of simple time addition
  const responseDeadline = BusinessHoursSLACalculator.calculateSLADeadline(
    createdAt,
    slaConfig.response_time_hours,
    businessConfig
  );

  const resolutionDeadline = BusinessHoursSLACalculator.calculateSLADeadline(
    createdAt,
    slaConfig.resolution_time_hours,
    businessConfig
  );

  // Calculate escalation deadline (50% of resolution time)
  const escalationHours = slaConfig.resolution_time_hours * 0.5;
  const escalationDeadline = BusinessHoursSLACalculator.calculateSLADeadline(
    createdAt,
    escalationHours,
    businessConfig
  );

  // Create SLA history entries with consistent naming
  await prisma.sla_history.createMany({
    data: [
      {
        ticket_id: ticketId,
        sla_type: "Response", // lowercase for consistency
        target_time: responseDeadline,
        status: "Pending", // lowercase for consistency
      },
      {
        ticket_id: ticketId,
        sla_type: "Resolution", // lowercase for consistency
        target_time: resolutionDeadline,
        status: "Pending", // lowercase for consistency
      },
      // {
      //   ticket_id: ticketId,
      //   sla_type: "escalation", // Re-added escalation tracking
      //   target_time: escalationDeadline,
      //   status: "pending",
      // },
    ],
  });

  // Update main ticket with SLA deadline
  await prisma.tickets.update({
    where: { id: ticketId },
    data: {
      sla_deadline: resolutionDeadline,
      sla_status: "Within",
    },
  });

  console.log(
    `✅ Generated business-hours-aware SLA history for ticket ${ticketId}:`,
    {
      response: responseDeadline,
      resolution: resolutionDeadline,
      escalation: escalationDeadline,
      businessHoursOnly: businessConfig.business_hours_only,
      includeWeekends: businessConfig.include_weekends,
    }
  );
};

const generateSLAHistory = async (
  ticketId: number,
  priority: number,
  // customerTier: string,
  createdAt: Date
): Promise<void> => {
  try {
    // Get SLA configuration
    const slaConfig = await prisma.sla_configurations.findFirst({
      where: {
        id: Number(priority),
        // customer_tier: customerTier,
        // is_active: true,
      },
    });

    // if (!slaConfig) {
    //   // Create default configuration if none exists
    //   console.warn(
    //     `No SLA configuration found for priority ${priority} . Creating default.`
    //   );

    //   const defaultConfig = await prisma.sla_configurations.create({
    //     data: {
    //       priority_level: priority,
    //       // customer_tier: customerTier,
    //       response_time_hours: getDefaultResponseTime(priority),
    //       resolution_time_hours: getDefaultResolutionTime(priority),
    //       escalation_time_hours: getDefaultEscalationTime(priority),
    //       is_active: true,
    //     },
    //   });

    //   await createSLAHistoryEntries(ticketId, defaultConfig, createdAt);
    // } else {
    await createSLAHistoryEntries(ticketId, slaConfig, createdAt);
    // }
  } catch (error) {
    console.error(
      `Error generating SLA history for ticket ${ticketId}:`,
      error
    );
    throw error;
  }
};

export const ticketController = {
  async createTicket(req: any, res: Response): Promise<void> {
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

      const tickets = await prisma.tickets.create({
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
          other_tickets: true,
          customers: true,
          tickets: true,
          categories: true,
          agents_user: true,
          sla_priority: true,
        },
      });
      const ticket = await prisma.tickets.update({
        where: { id: tickets.id },
        data: {
          ticket_number: generateTicketNumber(tickets.id),
        },
        include: {
          users: true,
          other_tickets: true,
          customers: {
            include: {
              companies: true,
            },
          },
          tickets: true,
          categories: true,
          agents_user: true,
          sla_priority: true,
          ticket_sla_history: true,
          //   sla_history: {
          //     orderBy: { created_at: "desc" },
          //   },
        },
      });
      try {
        await generateSLAHistory(
          ticket.id,
          priority,
          ticket.created_at || new Date()
        );
      } catch (slaError) {
        console.error("Error generating SLA history:", slaError);
      }

      // const emailIds = await EmailService.sendTicketCreationEmailToCustomer(
      //   ticket,
      //   ticket?.agents_user?.email
      // );
      // const completeTicket = await prisma.tickets.update({
      //   where: { id: ticket.id },
      //   data: {
      //     original_email_message_id: emailIds?.messageId || emailIds?.threadId,
      //     email_thread_id: emailIds?.messageId || emailIds?.threadId,
      //   },
      //   include: {
      //     users: true,
      //     other_tickets: true,
      //     customers: {
      //       include: {
      //         companies: true,
      //       },
      //     },
      //     tickets: true,
      //     categories: true,
      //     agents_user: true,
      //     sla_priority: true,
      //     ticket_sla_history: true,
      //     //   sla_history: {
      //     //     orderBy: { created_at: "desc" },
      //     //   },
      //   },
      // });
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

  async updateTicket(req: any, res: Response): Promise<any> {
    try {
      const id = Number(req.params.id);
      const reason = req.body.reason || "";
      const userId = Number(req.user?.id);

      const existing = await prisma.tickets.findUnique({ where: { id } });
      if (!existing) {
        return res.error("Ticket not found", 404);
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
      // 3) Handle time tracking logic
      const prevStatus = existing?.status;
      const newStatus = req?.body?.status as string | undefined;

      if (prevStatus !== "In Progress" && newStatus === "In Progress") {
        // Started work: record start time
        dataToUpdate.start_timer_at = new Date();
      } else if (prevStatus === "In Progress" && newStatus !== "In Progress") {
        // Paused/resolved/closed: compute elapsed and accumulate
        if (existing?.start_timer_at) {
          const now = new Date();
          const elapsedMs = now.getTime() - existing.start_timer_at.getTime();
          const elapsedSec = Math.floor(elapsedMs / 1000);

          dataToUpdate.time_spent_minutes =
            (existing.time_spent_minutes || 0) + elapsedSec;
          dataToUpdate.start_timer_at = null;
        }
      }
      // Always update updated_at
      dataToUpdate.updated_at = new Date();
      const commentText =
        newStatus === "Closed"
          ? `Ticket is closed , Remarks : "${reason}".`
          : newStatus === "Resolved"
          ? `Ticket is resolved , Remarks : "${reason}".`
          : "";
      let ticket = {};
      if (newStatus !== "Closed" && newStatus !== "Resolved") {
        ticket = await prisma.tickets.update({
          where: { id },
          data: dataToUpdate,
          include: {
            users: true,
            customers: true,
            other_tickets: true,
            tickets: true,
            categories: true,
            agents_user: true,
            sla_priority: true,
          },
        });
        // Handle specific SLA events
        // await this.handleSpecificSLAUpdates(id, existing, req.body);
      } else {
        const [updatedTicket, comment] = await prisma.$transaction([
          prisma.tickets.update({
            where: { id },
            data: dataToUpdate,
            include: {
              users: true,
              customers: true,
              other_tickets: true,
              tickets: true,
              categories: true,
              agents_user: true,
              ticket_sla_history: true,
              sla_priority: true,
            },
          }),
          prisma.ticket_comments.create({
            data: {
              ticket_id: id,
              user_id: userId,
              comment_text: commentText,
              comment_type: "System",
              is_internal: true,
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
          }),
        ]);
        // Mark resolution SLA as completed (monitoring service will determine if breached)
        await ticketController.handleSLACompletion(id, req.body.status);

        await EmailService.sendCommentEmailToCustomer(
          updatedTicket,
          comment,
          []
        );
        ticket = updatedTicket;
      }

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
  // Handle SLA completion when resolved/closed
  async handleSLACompletion(ticketId: number, status: string) {
    try {
      const now = new Date();

      // Mark resolution SLA as completed (monitoring service will check if it was breached)
      await prisma.sla_history.updateMany({
        where: {
          ticket_id: ticketId,
          sla_type: "Resolution",
          status: "Pending",
        },
        data: {
          status: "Met",
          actual_time: now,
        },
      });

      console.log(
        `✅ Marked resolution SLA as completed for ticket ${ticketId}`
      );
    } catch (error) {
      console.error(`❌ Error handling SLA completion:`, error);
    }
  },

  // Handle specific SLA updates during ticket changes
  async handleSpecificSLAUpdates(
    ticketId: number,
    existingTicket: any,
    updateData: any
  ) {
    try {
      // Handle first response
      if (
        !existingTicket.first_response_at &&
        updateData.status === "In Progress"
      ) {
        await prisma.tickets.update({
          where: { id: ticketId },
          data: { first_response_at: new Date() },
        });

        // Mark first response SLA as met
        await prisma.sla_history.updateMany({
          where: {
            ticket_id: ticketId,
            sla_type: "response",
            status: "pending",
          },
          data: {
            status: "met",
            actual_time: new Date(),
          },
        });

        console.log(
          `✅ Marked first response SLA as met for ticket ${ticketId}`
        );
      }

      // Handle priority changes (recalculate SLA deadlines)
      // if (updateData.priority && updateData.priority !== existingTicket.priority) {
      //   await this.recalculateSLAForPriorityChange(ticketId, updateData.priority, existingTicket);
      // }
    } catch (error) {
      console.error(`❌ Error handling specific SLA updates:`, error);
    }
  },
  async actionsTicket(req: any, res: Response): Promise<void> {
    const ticketId = Number(req.params.id);
    const userId = Number(req.user?.id);
    const action = req.body.action as
      | "ReOpen"
      | "Allocate"
      | "Merge"
      | undefined;
    console.log("req. body : ", req.body);
    const reason = (req.body.reason || "").trim();

    if (!userId) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required." });
      return;
    }

    if (isNaN(ticketId)) {
      res.status(400).json({ success: false, message: "Invalid ticket ID." });
      return;
    }

    const existing = await prisma.tickets.findUnique({
      where: { id: ticketId },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }

    // Build updatable fields from any body
    const allowedFields = new Set([
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
    ]);

    const dataToUpdate: Record<string, any> = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.has(key) && value !== undefined) {
        dataToUpdate[key] = value;
      }
    }
    dataToUpdate.updated_at = new Date();
    let agentDetails = null;

    // Determine system comment text
    let commentText = "Ticket updated.";
    let message = "Ticket updated.";
    if (action === "ReOpen") {
      commentText = `Ticket reopened. Reason: ${reason}`;
      message = `Ticket reopened successfully. `;
      dataToUpdate.status = "Open";
      dataToUpdate.reopen_count = (existing.reopen_count || 0) + 1;
      dataToUpdate.last_reopened_at = new Date();
    } else if (action === "Allocate") {
      const agentId = Number(req.body.assigned_agent_id);
      const existingAgent = await prisma.users.findUnique({
        where: { id: Number(req.body.assigned_agent_id) },
      });
      agentDetails = existingAgent;
      if (!existingAgent) {
        res.status(404).json({
          success: false,
          message: `Agent with id ${req.body.assigned_agent_id} not found.`,
        });
        return;
      }
      message = `Ticket allocated to agent  ${
        existingAgent?.first_name + " " + existingAgent?.last_name
      } successfully `;
      commentText = `Ticket allocated to agent  ${
        existingAgent?.first_name + " " + existingAgent?.last_name
      }. Reason: ${reason}`;
      dataToUpdate.status = dataToUpdate.status || "In Progress";
      dataToUpdate.assigned_by = userId;
    } else if (action === "Merge") {
      const parentId = Number(req.body.merged_into_ticket_id);
      commentText = `Ticket merged into parent ticket number ${existing.ticket_number}, subject: "${existing.subject}"`;
      dataToUpdate.is_merged = true;
      dataToUpdate.merged_into_ticket_id = parentId;
      dataToUpdate.status = "Merged";
    }
    try {
      // Execute update and comment creation atomically
      const [updatedTicket, comment] = await prisma.$transaction([
        prisma.tickets.update({
          where: { id: ticketId },
          data: dataToUpdate,
          include: {
            users: true,
            customers: true,
            agents_user: true,
            sla_priority: true,
            ticket_sla_history: true,
          },
        }),
        prisma.ticket_comments.create({
          data: {
            ticket_id: ticketId,
            user_id: userId,
            comment_text: commentText,
            comment_type: "System",
            is_internal: true,
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
        }),
      ]);

      // Notify customer via email
      if (action === "Allocate") {
        await EmailService.sendCommentEmailToCustomer(updatedTicket, comment, [
          agentDetails?.email,
        ]);
      } else {
        await EmailService.sendCommentEmailToCustomer(
          updatedTicket,
          comment,
          []
        );
      }

      res.status(200).json({
        success: true,
        message: message,
        data: serializeTicket(updatedTicket, true),
      });
    } catch (err: any) {
      console.error("actionsTicket error:", err);
      if (err.code === "P2025") {
        res.status(404).json({ success: false, message: "Ticket not found." });
      } else {
        res
          .status(500)
          .json({ success: false, message: "An unexpected error occurred." });
      }
    }
  },

  async mergeTicket(req: any, res: Response): Promise<any> {
    const ticketId = Number(req.params.id);
    const userId = req.user?.id;
    const parentId = Number(req.body.parent_id);
    const existing = await prisma.tickets.findUnique({
      where: { id: Number(parentId) },
    });
    if (!existing) {
      return res.error("Parent Ticket not found", 404);
    }
    if (isNaN(parentId)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid parent ticket ID." });
      return;
    }

    try {
      // Start transaction so update + comment + email send atomically
      const [updatedTicket, comment] = await prisma.$transaction([
        // 1) Mark this ticket as merged
        prisma.tickets.update({
          where: { id: ticketId },
          data: {
            merged_into_ticket_id: parentId,
            is_merged: true,
            status: "Merged",
            updated_at: new Date(),
            // Optionally increment a merge count or similar
          },
          include: {
            users: true,
            customers: true,
            agents_user: true,
            ticket_sla_history: true,
            sla_priority: true,
          },
        }),

        // 2) Create an internal merge comment
        prisma.ticket_comments.create({
          data: {
            ticket_id: ticketId,
            user_id: Number(userId),
            comment_text: `Ticket merged into parent ticket number ${existing?.ticket_number}, subject: "${existing?.subject}".`,
            comment_type: "System",
            is_internal: true,
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
        }),
      ]);

      // 3) Notify customer via email (outside transaction)
      await EmailService.sendCommentEmailToCustomer(updatedTicket, comment, []);

      // 4) Send success response
      res.status(200).json({
        success: true,
        message: "Ticket merged successfully.",
        data: serializeTicket(updatedTicket, true),
      });
    } catch (err: any) {
      console.error("mergeTicket error:", err);
      // Distinguish Prisma not found error
      if (err.code === "P2025") {
        res.status(404).json({ success: false, message: "Ticket not found." });
      } else {
        res.status(500).json({
          success: false,
          message: "An unexpected error occurred while merging the ticket.",
        });
      }
    }
  },
  async addCCTicket(req: any, res: Response): Promise<any> {
    try {
      const ticketId = Number(req.params.id);
      const currentUserId = Number(req.user?.id);
      const toAdd: number[] = req.body.add_user_id || [];
      const toDelete: number[] = req.body.delete_user_ids || [];

      if (!Array.isArray(toAdd) && !Array.isArray(toDelete)) {
        return res.error("add_user_id or delete_user_ids must be arrays.", 400);
      }

      const existing = await prisma.tickets.findUnique({
        where: { id: ticketId },
        include: { cc_of_ticket: true },
      });
      if (!existing) {
        return res.error("Ticket not found", 404);
      }

      const txOps: any[] = [];

      // Deletions
      if (toDelete.length > 0) {
        txOps.push(
          prisma.cc_of_ticket.deleteMany({
            where: {
              ticket_id: ticketId,
              user_id: { in: toDelete },
            },
          })
        );
        // Add comments for each removal
        toDelete.forEach((uid) => {
          txOps.push(
            prisma.ticket_comments.create({
              data: {
                ticket_id: ticketId,
                user_id: currentUserId,
                comment_text: `User ID ${uid} removed from CC of this ticket.`,
                comment_type: "System",
                is_internal: true,
              },
            })
          );
        });
      }

      // Additions
      if (toAdd.length > 0) {
        // Prevent duplicates
        const existingCCIds = existing.cc_of_ticket.map((cc) => cc.user_id);
        const newAdds = toAdd.filter((uid) => !existingCCIds.includes(uid));
        newAdds.forEach((uid) => {
          txOps.push(
            prisma.cc_of_ticket.create({
              data: {
                ticket_id: ticketId,
                user_id: uid,
                created_by: currentUserId,
              },
            })
          );
          txOps.push(
            prisma.ticket_comments.create({
              data: {
                ticket_id: ticketId,
                user_id: currentUserId,
                comment_text: `User ID ${uid} added to CC of this ticket.`,
                comment_type: "System",
                is_internal: true,
              },
            })
          );
        });
      }

      // Run all operations in one transaction
      await prisma.$transaction(txOps);

      // Reload ticket
      const finalTicket = await prisma.tickets.findUnique({
        where: { id: ticketId },
        include: {
          cc_of_ticket: {
            include: {
              user_of_ticket_cc: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
          customers: true,
        },
      });

      // Notify customers
      await EmailService.sendCommentEmailToCustomer(finalTicket, null, []);

      res.success(
        "Ticket updated successfully",
        serializeTicket(finalTicket, true),
        200
      );
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },
  async getTicketById(req: any, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const ticket = await prisma.tickets.findUnique({
        where: { id },
        include: {
          agents_user: true,
          users: true,
          tickets: true,
          categories: true,
          other_tickets: true,
          ticket_sla_history: true,
          ticket_attachments: true,
          sla_priority: true,
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
          cc_of_ticket: {
            include: {
              user_of_ticket_cc: true,
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
      console.log("Error : ", error);
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
      const {
        page = "1",
        limit = "10",
        search = "",
        status = "",
        priority = "",
      } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchTerm = (search as string).toLowerCase().trim();
      const statusFilter = (status as string).trim();
      const priorityFilter = (priority as string).trim();
      // Build filters object
      const filters: any = {};

      // Add search filters using OR condition
      if (searchTerm) {
        filters.OR = [
          {
            subject: {
              contains: searchTerm,
              // mode: "insensitive",
            },
          },
          {
            customer_name: {
              contains: searchTerm,
              // mode: "insensitive",
            },
          },
          {
            customer_email: {
              contains: searchTerm,
              // mode: "insensitive",
            },
          },
          {
            ticket_number: {
              contains: searchTerm,
              // mode: "insensitive",
            },
          },
          {
            description: {
              contains: searchTerm,
              // mode: "insensitive",
            },
          },
          {
            sla_priority: {
              priority: {
                contains: searchTerm,
                // mode: "insensitive",
              },
            },
          },
          {
            agents_user: {
              OR: [
                {
                  first_name: {
                    contains: searchTerm,
                    // mode: "insensitive",
                  },
                },
                {
                  last_name: {
                    contains: searchTerm,
                    // mode: "insensitive",
                  },
                },
              ],
            },
          },
          {
            customers: {
              OR: [
                {
                  first_name: {
                    contains: searchTerm,
                    // mode: "insensitive",
                  },
                },
                {
                  last_name: {
                    contains: searchTerm,
                    // mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: searchTerm,
                    // mode: "insensitive",
                  },
                },
              ],
            },
          },
        ];
      }

      // Add status filter
      if (statusFilter && statusFilter !== "all") {
        filters.status = {
          equals: statusFilter,
          // mode: "insensitive",
        };
      }
      if (priorityFilter) {
        filters.sla_priority = {
          priority: {
            equals: priorityFilter,
            // mode: "insensitive",
          },
        };
      }

      const { data, pagination } = await paginate({
        model: prisma.tickets,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { created_at: "desc" },
        include: {
          users: true,
          tickets: true,
          categories: true,
          other_tickets: true,
          customers: true,
          agents_user: true,
          ticket_sla_history: true,
          sla_priority: true,
        },
      });

      res.success(
        "Tickets fetched successfully",
        data.map((ticket: any) => serializeTicket(ticket, true)),
        200,
        pagination
      );
    } catch (error: any) {
      console.log("Error : ", error);
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
      // Validate ticket exists
      const ticket = await prisma.tickets.findUnique({
        where: { id: Number(ticket_id) },
        select: {
          email_thread_id: true,
          ticket_comments: true,
          assigned_agent_id: true,
          first_response_at: true,
          ticket_sla_history: true,
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
          agents_user: true,
          customers: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          cc_of_ticket: {
            include: {
              user_of_ticket_cc: true,
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
            additionalEmails = existingUsers?.map((user: any) => user.email);
            validatedMentionedUsers = existingUsers.map((user: any) => user.id);

            if (validatedMentionedUsers.length !== userIds.length) {
              console.warn("⚠️ Some mentioned users were not found");
            }
          }
        } catch (mentionError) {
          console.error("❌ Error validating mentioned users:", mentionError);
          // Continue without failing the entire request
        }
      }
      const attachment_urls = JSON.stringify([imageUrl]);
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
          attachment_urls,
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

      // ✅ Send email to customer if it's a public comment
      if (!new_is_internal) {
        console.log("Sending email to customer...");
        await EmailService.sendCommentEmailToCustomer(
          serializeTicket(ticket),
          { ...comment, imageUrl: imageUrl ? imageUrl : null },
          additionalEmails
        );
      }
      // const countComment = await prisma.ticket_comments.count()
      // After successfully creating the comment and before ticket update
      const isAssignedAgent =
        ticket?.assigned_agent_id && req?.user?.id === ticket.assigned_agent_id;
      const isFirstAgentResponse =
        !ticket.first_response_at &&
        isAssignedAgent &&
        comment.comment_type === "public" &&
        !new_is_internal;

      if (isFirstAgentResponse && ticket.ticket_sla_history?.length) {
        const responseSLA = ticket.ticket_sla_history.find(
          (sla: any) => sla.sla_type === "Response" && sla.status === "Pending"
        );
        if (responseSLA) {
          let statusToUpdate = "Met";
          const commentDate = new Date(comment.created_at);
          const slaTargetDate = new Date(responseSLA.target_time);

          // Determine if the response met the SLA deadline
          if (commentDate <= slaTargetDate) {
            statusToUpdate = "Met";
          } else {
            statusToUpdate = "Breached"; // or whatever logic your app uses
          }

          await prisma.sla_history.update({
            where: { id: responseSLA.id },
            data: {
              status: statusToUpdate,
              actual_time: commentDate,
            },
          });

          // Also update the ticket's first_response_at timestamp
          await prisma.tickets.update({
            where: { id: ticket.id },
            data: { first_response_at: commentDate },
          });
        }
      }
      res.success("Comment created successfully", comment, 201);
    } catch (error: any) {
      console.error(error);
      res.error(error.message);
    }
  },
};
