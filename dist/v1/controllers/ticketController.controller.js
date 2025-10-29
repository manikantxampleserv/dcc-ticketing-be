"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketController = void 0;
const client_1 = require("@prisma/client");
const BussinessHoursSLACalculation_1 = require("../../utils/BussinessHoursSLACalculation");
const GenerateTicket_1 = require("../../utils/GenerateTicket");
const sendEmailComment_1 = __importDefault(require("../../types/sendEmailComment"));
const blackbaze_1 = require("../../utils/blackbaze");
const pagination_1 = require("../../utils/pagination");
const notification_1 = __importDefault(require("../services/notification"));
const prisma = new client_1.PrismaClient();
const serializeTicket = (ticket, includeDates = false) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    return (Object.assign(Object.assign({ id: Number(ticket.id), ticket_number: ticket.ticket_number, customer_id: ticket.customer_id, customer_name: ticket.customer_name, customer_email: ticket.customer_email, assigned_agent_id: ticket.assigned_agent_id, category_id: ticket.category_id, subject: ticket.subject, description: ticket.description, priority: ticket.priority, status: ticket.status, source: ticket.source, sla_deadline: ticket.sla_deadline, sla_status: ticket.sla_status, first_response_at: ticket.first_response_at, resolved_at: ticket.resolved_at, closed_at: ticket.closed_at, assigned_by: ticket.assigned_by, is_merged: ticket.is_merged, reopen_count: ticket.reopen_count, time_spent_minutes: ticket.time_spent_minutes, last_reopened_at: ticket.last_reopened_at, customer_satisfaction_rating: ticket.customer_satisfaction_rating, customer_feedback: ticket.customer_feedback, tags: ticket.tags, email_thread_id: ticket.email_thread_id, original_email_message_id: ticket.original_email_message_id, merged_into_ticket_id: ticket.merged_into_ticket_id, attachment_urls: (ticket === null || ticket === void 0 ? void 0 : ticket.attachment_urls) || "", ticket_attachments: ticket.ticket_attachments
            ? ticket.ticket_attachments.map((att) => ({
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
            : [], ticket_comments: ticket.ticket_comments, start_timer_at: ticket.start_timer_at }, (includeDates && {
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
    })), { parent_ticket: ticket === null || ticket === void 0 ? void 0 : ticket.tickets, child_tickets: ticket === null || ticket === void 0 ? void 0 : ticket.other_tickets, categories: ticket === null || ticket === void 0 ? void 0 : ticket.categories, ticket_sla_history: ticket === null || ticket === void 0 ? void 0 : ticket.ticket_sla_history, users: ticket.users
            ? {
                id: (_a = ticket.users) === null || _a === void 0 ? void 0 : _a.id,
                first_name: (_b = ticket.users) === null || _b === void 0 ? void 0 : _b.first_name,
                last_name: (_c = ticket.users) === null || _c === void 0 ? void 0 : _c.last_name,
                username: (_d = ticket.users) === null || _d === void 0 ? void 0 : _d.username,
                avatar: (_e = ticket.users) === null || _e === void 0 ? void 0 : _e.avatar,
                email: (_f = ticket.users) === null || _f === void 0 ? void 0 : _f.email,
            }
            : undefined, cc_of_ticket: ticket.cc_of_ticket
            ? (_g = ticket.cc_of_ticket) === null || _g === void 0 ? void 0 : _g.map((val) => ({
                id: val.user_of_ticket_cc.id,
                first_name: val.user_of_ticket_cc.first_name,
                last_name: val.user_of_ticket_cc.last_name,
                email: val.user_of_ticket_cc.email,
                phone: val.user_of_ticket_cc.phone,
                avatar: val.user_of_ticket_cc.avatar,
            }))
            : undefined, customers: ticket.customers
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
            : undefined, agents_user: ticket.agents_user
            ? {
                id: (_h = ticket.agents_user) === null || _h === void 0 ? void 0 : _h.id,
                avatar: (_j = ticket.agents_user) === null || _j === void 0 ? void 0 : _j.avatar,
                first_name: (_k = ticket.agents_user) === null || _k === void 0 ? void 0 : _k.first_name,
                last_name: (_l = ticket.agents_user) === null || _l === void 0 ? void 0 : _l.last_name,
                username: (_m = ticket.agents_user) === null || _m === void 0 ? void 0 : _m.username,
                email: (_o = ticket.agents_user) === null || _o === void 0 ? void 0 : _o.email,
            }
            : undefined, sla_priority: ticket.sla_priority
            ? {
                id: (_p = ticket.sla_priority) === null || _p === void 0 ? void 0 : _p.id,
                priority: (_q = ticket.sla_priority) === null || _q === void 0 ? void 0 : _q.priority,
                response_time_hours: (_r = ticket.sla_priority) === null || _r === void 0 ? void 0 : _r.response_time_hours,
                resolution_time_hours: (_s = ticket.sla_priority) === null || _s === void 0 ? void 0 : _s.resolution_time_hours,
            }
            : undefined }));
};
// Helper functions for SLA (outside the controller)
const getDefaultResponseTime = (priority) => {
    const defaults = { 1: 1, 2: 4, 3: 8, 4: 24 };
    return defaults[priority] || 24;
};
const getDefaultResolutionTime = (priority) => {
    const defaults = { 1: 4, 2: 24, 3: 72, 4: 168 };
    return defaults[priority] || 168;
};
const getDefaultEscalationTime = (priority) => {
    const defaults = { 1: 2, 2: 12, 3: 36, 4: 84 };
    return defaults[priority] || 84;
};
const createSLAHistoryEntries = (ticketId, slaConfig, createdAt) => __awaiter(void 0, void 0, void 0, function* () {
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
    const responseDeadline = BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.calculateSLADeadline(createdAt, slaConfig.response_time_hours, businessConfig);
    const resolutionDeadline = BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.calculateSLADeadline(createdAt, slaConfig.resolution_time_hours, businessConfig);
    // Calculate escalation deadline (50% of resolution time)
    const escalationHours = slaConfig.resolution_time_hours * 0.5;
    const escalationDeadline = BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.calculateSLADeadline(createdAt, escalationHours, businessConfig);
    // Create SLA history entries with consistent naming
    yield prisma.sla_history.createMany({
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
    yield prisma.tickets.update({
        where: { id: ticketId },
        data: {
            sla_deadline: resolutionDeadline,
            sla_status: "Within",
        },
    });
    console.log(`✅ Generated business-hours-aware SLA history for ticket ${ticketId}:`, {
        response: responseDeadline,
        resolution: resolutionDeadline,
        escalation: escalationDeadline,
        businessHoursOnly: businessConfig.business_hours_only,
        includeWeekends: businessConfig.include_weekends,
    });
});
const generateSLAHistory = (ticketId, priority, 
// customerTier: string,
createdAt) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get SLA configuration
        const slaConfig = yield prisma.sla_configurations.findFirst({
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
        yield createSLAHistoryEntries(ticketId, slaConfig, createdAt);
        // }
    }
    catch (error) {
        console.error(`Error generating SLA history for ticket ${ticketId}:`, error);
        throw error;
    }
});
exports.ticketController = {
    createTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { customer_id, assigned_agent_id, category_id, subject, description, priority, status, source, sla_deadline, sla_status, first_response_at, resolved_at, closed_at, is_merged, reopen_count, time_spent_minutes, last_reopened_at, customer_satisfaction_rating, customer_feedback, tags, merged_into_ticket_id, } = req.body;
                const assigned_by = Number((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id);
                const ticket_number = `TCKT-${Date.now()}`;
                let avatarUrl = null;
                if (req.file) {
                    const fileName = `${ticket_number}/${Date.now()}_${req.file.originalname}`;
                    avatarUrl = yield (0, blackbaze_1.uploadFile)(req.file.buffer, fileName, req.file.mimetype);
                }
                const attachment_urls = JSON.stringify([avatarUrl]);
                const tickets = yield prisma.tickets.create({
                    data: {
                        ticket_number,
                        customer_id,
                        assigned_agent_id,
                        category_id,
                        subject,
                        description,
                        priority: priority !== null && priority !== void 0 ? priority : "Medium",
                        status: status !== null && status !== void 0 ? status : "Open",
                        source: source !== null && source !== void 0 ? source : "Email",
                        sla_deadline,
                        sla_status: sla_status !== null && sla_status !== void 0 ? sla_status : "Within",
                        first_response_at,
                        resolved_at,
                        closed_at,
                        assigned_by,
                        attachment_urls,
                        is_merged: is_merged !== null && is_merged !== void 0 ? is_merged : false,
                        reopen_count: reopen_count !== null && reopen_count !== void 0 ? reopen_count : 0,
                        time_spent_minutes: time_spent_minutes !== null && time_spent_minutes !== void 0 ? time_spent_minutes : 0,
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
                const ticket = yield prisma.tickets.update({
                    where: { id: tickets.id },
                    data: {
                        ticket_number: (0, GenerateTicket_1.generateTicketNumber)(tickets.id),
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
                yield notification_1.default.notify("new_ticket", [Number(assigned_agent_id)], {
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticket_number,
                    subject: ticket.subject,
                    priority: "Medium",
                    customerName: ticket.customer_name ||
                        ((_b = ticket === null || ticket === void 0 ? void 0 : ticket.customers) === null || _b === void 0 ? void 0 : _b.first_name) + " " + ((_c = ticket === null || ticket === void 0 ? void 0 : ticket.customers) === null || _c === void 0 ? void 0 : _c.last_name),
                });
                try {
                    yield generateSLAHistory(ticket.id, priority, ticket.created_at || new Date());
                }
                catch (slaError) {
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
                res.success("Ticket created successfully", serializeTicket(ticket, true), 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    updateTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const id = Number(req.params.id);
                const reason = req.body.reason || "";
                const userId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
                const existing = yield prisma.tickets.findUnique({ where: { id } });
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
                const dataToUpdate = {};
                for (const field of allowedFields) {
                    if (req.body[field] !== undefined) {
                        dataToUpdate[field] = req.body[field];
                    }
                }
                // 3) Handle time tracking logic
                const prevStatus = existing === null || existing === void 0 ? void 0 : existing.status;
                const newStatus = (_b = req === null || req === void 0 ? void 0 : req.body) === null || _b === void 0 ? void 0 : _b.status;
                if (prevStatus !== "In Progress" && newStatus === "In Progress") {
                    // Started work: record start time
                    dataToUpdate.start_timer_at = new Date();
                }
                else if (prevStatus === "In Progress" && newStatus !== "In Progress") {
                    // Paused/resolved/closed: compute elapsed and accumulate
                    if (existing === null || existing === void 0 ? void 0 : existing.start_timer_at) {
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
                const commentText = newStatus === "Closed"
                    ? `Ticket is closed , Remarks : "${reason}".`
                    : newStatus === "Resolved"
                        ? `Ticket is resolved , Remarks : "${reason}".`
                        : "";
                let ticket = {};
                if (newStatus !== "Closed" && newStatus !== "Resolved") {
                    ticket = yield prisma.tickets.update({
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
                }
                else {
                    const [updatedTicket, comment] = yield prisma.$transaction([
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
                    yield exports.ticketController.handleSLACompletion(id, req.body.status);
                    yield sendEmailComment_1.default.sendCommentEmailToCustomer(updatedTicket, comment, []);
                    ticket = updatedTicket;
                }
                res.success("Ticket updated successfully", serializeTicket(ticket, true), 200);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    // Handle SLA completion when resolved/closed
    handleSLACompletion(ticketId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                // Mark resolution SLA as completed (monitoring service will check if it was breached)
                yield prisma.sla_history.updateMany({
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
                console.log(`✅ Marked resolution SLA as completed for ticket ${ticketId}`);
            }
            catch (error) {
                console.error(`❌ Error handling SLA completion:`, error);
            }
        });
    },
    // Handle specific SLA updates during ticket changes
    handleSpecificSLAUpdates(ticketId, existingTicket, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Handle first response
                if (!existingTicket.first_response_at &&
                    updateData.status === "In Progress") {
                    yield prisma.tickets.update({
                        where: { id: ticketId },
                        data: { first_response_at: new Date() },
                    });
                    // Mark first response SLA as met
                    yield prisma.sla_history.updateMany({
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
                    console.log(`✅ Marked first response SLA as met for ticket ${ticketId}`);
                }
                // Handle priority changes (recalculate SLA deadlines)
                // if (updateData.priority && updateData.priority !== existingTicket.priority) {
                //   await this.recalculateSLAForPriorityChange(ticketId, updateData.priority, existingTicket);
                // }
            }
            catch (error) {
                console.error(`❌ Error handling specific SLA updates:`, error);
            }
        });
    },
    actionsTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const ticketId = Number(req.params.id);
            const userId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
            const action = req.body.action;
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
            const existing = yield prisma.tickets.findUnique({
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
            const dataToUpdate = {};
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
            }
            else if (action === "Allocate") {
                const agentId = Number(req.body.assigned_agent_id);
                const existingAgent = yield prisma.users.findUnique({
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
                message = `Ticket allocated to agent  ${(existingAgent === null || existingAgent === void 0 ? void 0 : existingAgent.first_name) + " " + (existingAgent === null || existingAgent === void 0 ? void 0 : existingAgent.last_name)} successfully `;
                commentText = `Ticket allocated to agent  ${(existingAgent === null || existingAgent === void 0 ? void 0 : existingAgent.first_name) + " " + (existingAgent === null || existingAgent === void 0 ? void 0 : existingAgent.last_name)}. Reason: ${reason}`;
                dataToUpdate.status = dataToUpdate.status || "In Progress";
                dataToUpdate.assigned_by = userId;
            }
            else if (action === "Merge") {
                const parentId = Number(req.body.merged_into_ticket_id);
                commentText = `Ticket merged into parent ticket number ${existing.ticket_number}, subject: "${existing.subject}"`;
                dataToUpdate.is_merged = true;
                dataToUpdate.merged_into_ticket_id = parentId;
                dataToUpdate.status = "Merged";
            }
            try {
                // Execute update and comment creation atomically
                const [updatedTicket, comment] = yield prisma.$transaction([
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
                    yield notification_1.default.notify("new_ticket", [Number(updatedTicket === null || updatedTicket === void 0 ? void 0 : updatedTicket.assigned_agent_id)], {
                        ticketId: updatedTicket.id,
                        ticketNumber: updatedTicket.ticket_number,
                        subject: updatedTicket.subject,
                        priority: "Medium",
                        customerName: updatedTicket.customer_name ||
                            ((_b = updatedTicket === null || updatedTicket === void 0 ? void 0 : updatedTicket.customers) === null || _b === void 0 ? void 0 : _b.first_name) +
                                " " +
                                ((_c = updatedTicket === null || updatedTicket === void 0 ? void 0 : updatedTicket.customers) === null || _c === void 0 ? void 0 : _c.last_name),
                    });
                    yield sendEmailComment_1.default.sendCommentEmailToCustomer(updatedTicket, comment, [
                        agentDetails === null || agentDetails === void 0 ? void 0 : agentDetails.email,
                    ]);
                }
                else {
                    yield sendEmailComment_1.default.sendCommentEmailToCustomer(updatedTicket, comment, []);
                }
                res.status(200).json({
                    success: true,
                    message: message,
                    data: serializeTicket(updatedTicket, true),
                });
            }
            catch (err) {
                console.error("actionsTicket error:", err);
                if (err.code === "P2025") {
                    res.status(404).json({ success: false, message: "Ticket not found." });
                }
                else {
                    res
                        .status(500)
                        .json({ success: false, message: "An unexpected error occurred." });
                }
            }
        });
    },
    mergeTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const ticketId = Number(req.params.id);
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const parentId = Number(req.body.parent_id);
            const existing = yield prisma.tickets.findUnique({
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
                const [updatedTicket, comment] = yield prisma.$transaction([
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
                            comment_text: `Ticket merged into parent ticket number ${existing === null || existing === void 0 ? void 0 : existing.ticket_number}, subject: "${existing === null || existing === void 0 ? void 0 : existing.subject}".`,
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
                yield sendEmailComment_1.default.sendCommentEmailToCustomer(updatedTicket, comment, []);
                // 4) Send success response
                res.status(200).json({
                    success: true,
                    message: "Ticket merged successfully.",
                    data: serializeTicket(updatedTicket, true),
                });
            }
            catch (err) {
                console.error("mergeTicket error:", err);
                // Distinguish Prisma not found error
                if (err.code === "P2025") {
                    res.status(404).json({ success: false, message: "Ticket not found." });
                }
                else {
                    res.status(500).json({
                        success: false,
                        message: "An unexpected error occurred while merging the ticket.",
                    });
                }
            }
        });
    },
    addCCTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const ticketId = Number(req.params.id);
                const currentUserId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
                const toAdd = req.body.add_user_id || [];
                const toDelete = req.body.delete_user_ids || [];
                if (!Array.isArray(toAdd) && !Array.isArray(toDelete)) {
                    return res.error("add_user_id or delete_user_ids must be arrays.", 400);
                }
                const existing = yield prisma.tickets.findUnique({
                    where: { id: ticketId },
                    include: { cc_of_ticket: true },
                });
                if (!existing) {
                    return res.error("Ticket not found", 404);
                }
                const txOps = [];
                // Deletions
                if (toDelete.length > 0) {
                    txOps.push(prisma.cc_of_ticket.deleteMany({
                        where: {
                            ticket_id: ticketId,
                            user_id: { in: toDelete },
                        },
                    }));
                    // Add comments for each removal
                    toDelete.forEach((uid) => {
                        txOps.push(prisma.ticket_comments.create({
                            data: {
                                ticket_id: ticketId,
                                user_id: currentUserId,
                                comment_text: `User ID ${uid} removed from CC of this ticket.`,
                                comment_type: "System",
                                is_internal: true,
                            },
                        }));
                    });
                }
                // Additions
                if (toAdd.length > 0) {
                    // Prevent duplicates
                    const existingCCIds = existing.cc_of_ticket.map((cc) => cc.user_id);
                    const newAdds = toAdd.filter((uid) => !existingCCIds.includes(uid));
                    newAdds.forEach((uid) => {
                        txOps.push(prisma.cc_of_ticket.create({
                            data: {
                                ticket_id: ticketId,
                                user_id: uid,
                                created_by: currentUserId,
                            },
                        }));
                        txOps.push(prisma.ticket_comments.create({
                            data: {
                                ticket_id: ticketId,
                                user_id: currentUserId,
                                comment_text: `User ID ${uid} added to CC of this ticket.`,
                                comment_type: "System",
                                is_internal: true,
                            },
                        }));
                    });
                }
                // Run all operations in one transaction
                yield prisma.$transaction(txOps);
                // Reload ticket
                const finalTicket = yield prisma.tickets.findUnique({
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
                yield sendEmailComment_1.default.sendCommentEmailToCustomer(finalTicket, null, []);
                res.success("Ticket updated successfully", serializeTicket(finalTicket, true), 200);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    getTicketById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = Number(req.params.id);
                const ticket = yield prisma.tickets.findUnique({
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
                if (!ticket)
                    res.error("Ticket not found", 404);
                res.success("Ticket fetched successfully", serializeTicket(ticket, true), 200);
            }
            catch (error) {
                console.log("Error : ", error);
                res.error(error.message);
            }
        });
    },
    deleteTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, ids } = req.body;
                if (id && !isNaN(Number(id))) {
                    const ticket = yield prisma.tickets.findUnique({
                        where: { id: Number(id) },
                    });
                    if (!ticket) {
                        res.error("Ticket not found", 404);
                        return;
                    }
                    yield prisma.tickets.delete({ where: { id: Number(id) } });
                    res.success(`Ticket with id ${id} deleted successfully`, 200);
                    return;
                }
                if (Array.isArray(ids) && ids.length > 0) {
                    const deletedTickets = yield prisma.tickets.deleteMany({
                        where: { id: { in: ids } },
                    });
                    if (deletedTickets.count === 0) {
                        res.error("No matching tickets found for deletion", 404);
                        return;
                    }
                    res.success(`${deletedTickets.count} tickets deleted successfully`, 200);
                    return;
                }
                res.error("Please provide a valid 'id' or 'ids[]' in the request body", 400);
            }
            catch (error) {
                res.error(error.message, 500);
            }
        });
    },
    getAllTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "", status = "", priority = "", } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const searchTerm = search.toLowerCase().trim();
                const statusFilter = status.trim();
                const priorityFilter = priority.trim();
                // Build filters object
                const filters = {};
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
                const { data, pagination } = yield (0, pagination_1.paginate)({
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
                res.success("Tickets fetched successfully", data.map((ticket) => serializeTicket(ticket, true)), 200, pagination);
            }
            catch (error) {
                console.log("Error : ", error);
                res.error(error.message);
            }
        });
    },
    // Create a new comment
    createComment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { ticket_id, comment_text, comment_type = "public", is_internal = false, mentioned_users, } = req.body;
                // const user_id = null;
                const user_id = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id; // Assuming you have user auth middleware
                let imageUrl = null;
                if (req.file) {
                    const fileName = `ticket-${ticket_id}-comment/${Date.now()}_${req.file.originalname}`;
                    imageUrl = yield (0, blackbaze_1.uploadFile)(req.file.buffer, fileName, req.file.mimetype);
                    // imageUrl = await uploadToBackblaze(
                    //   req.file.buffer,
                    //   req.file.originalname,
                    //   req.file.mimetype,
                    //   "TicketComments",
                    //   `ticket-${ticket_id}-comment`
                    // );
                }
                // Validate ticket exists
                const ticket = yield prisma.tickets.findUnique({
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
                let additionalEmails = [];
                const new_is_internal = is_internal == "true" ? true : false;
                let validatedMentionedUsers = [];
                const mentionedUser = mentioned_users && JSON.parse(mentioned_users);
                if ((mentionedUser === null || mentionedUser === void 0 ? void 0 : mentionedUser.length) > 0) {
                    try {
                        const userIds = mentionedUser === null || mentionedUser === void 0 ? void 0 : mentionedUser.map((userId) => Number(userId)).filter(Boolean);
                        if (userIds.length > 0) {
                            const existingUsers = yield prisma.users.findMany({
                                where: {
                                    id: { in: userIds },
                                },
                                select: { id: true, email: true },
                            });
                            additionalEmails = existingUsers === null || existingUsers === void 0 ? void 0 : existingUsers.map((user) => user.email);
                            validatedMentionedUsers = existingUsers.map((user) => user.id);
                            if (validatedMentionedUsers.length !== userIds.length) {
                                console.warn("⚠️ Some mentioned users were not found");
                            }
                        }
                    }
                    catch (mentionError) {
                        console.error("❌ Error validating mentioned users:", mentionError);
                        // Continue without failing the entire request
                    }
                }
                const attachment_urls = JSON.stringify([imageUrl]);
                // Create comment
                const comment = yield prisma.ticket_comments.create({
                    data: {
                        ticket_id: Number(ticket_id),
                        user_id: user_id ? Number(user_id) : undefined,
                        comment_text,
                        comment_type,
                        is_internal: new_is_internal,
                        mentioned_users: validatedMentionedUsers.length > 0
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
                    yield sendEmailComment_1.default.sendCommentEmailToCustomer(serializeTicket(ticket), Object.assign(Object.assign({}, comment), { imageUrl: imageUrl ? imageUrl : null }), additionalEmails);
                }
                // const countComment = await prisma.ticket_comments.count()
                // After successfully creating the comment and before ticket update
                const isAssignedAgent = (ticket === null || ticket === void 0 ? void 0 : ticket.assigned_agent_id) && ((_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b.id) === ticket.assigned_agent_id;
                const isFirstAgentResponse = !ticket.first_response_at &&
                    isAssignedAgent &&
                    comment.comment_type === "public" &&
                    !new_is_internal;
                if (isFirstAgentResponse && ((_c = ticket.ticket_sla_history) === null || _c === void 0 ? void 0 : _c.length)) {
                    const responseSLA = ticket.ticket_sla_history.find((sla) => sla.sla_type === "Response" && sla.status === "Pending");
                    if (responseSLA) {
                        let statusToUpdate = "Met";
                        const commentDate = new Date(comment.created_at);
                        const slaTargetDate = new Date(responseSLA.target_time);
                        // Determine if the response met the SLA deadline
                        if (commentDate <= slaTargetDate) {
                            statusToUpdate = "Met";
                        }
                        else {
                            statusToUpdate = "Breached"; // or whatever logic your app uses
                        }
                        yield prisma.sla_history.update({
                            where: { id: responseSLA.id },
                            data: {
                                status: statusToUpdate,
                                actual_time: commentDate,
                            },
                        });
                        // Also update the ticket's first_response_at timestamp
                        yield prisma.tickets.update({
                            where: { id: ticket.id },
                            data: { first_response_at: commentDate },
                        });
                    }
                }
                res.success("Comment created successfully", comment, 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
};
