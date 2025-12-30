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
exports.BusinessHoursAwareSLAMonitoringService = void 0;
// services/BusinessHoursAwareSLAMonitoringService.ts
// services/BusinessHoursAwareSLAMonitoringService.ts
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
const BussinessHoursSLACalculation_1 = require("./BussinessHoursSLACalculation");
const prisma = new client_1.PrismaClient();
class BusinessHoursAwareSLAMonitoringService {
    // 1. Start monitoring
    static startMonitoring() {
        // All tickets every 5 minutes
        node_cron_1.default.schedule("*/5 * * * *", () => this.monitorAllActiveTickets());
        // Business‐hours only every 2 minutes
        node_cron_1.default.schedule("*/2 * * * *", () => __awaiter(this, void 0, void 0, function* () {
            if (yield this.isCurrentlyBusinessHours()) {
                yield this.monitorBusinessHoursSLAs();
            }
        }));
        // Critical tickets every minute in business hours
        node_cron_1.default.schedule("* * * * *", () => __awaiter(this, void 0, void 0, function* () {
            if (yield this.isCurrentlyBusinessHours()) {
                yield this.monitorCriticalTickets();
            }
        }));
        // Clear notification cache hourly
        node_cron_1.default.schedule("0 * * * *", () => this.sentNotifications.clear());
        console.log("✅ Business‐hours‐aware SLA monitoring started");
    }
    // 2. Check business hours
    static isCurrentlyBusinessHours() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const configs = yield prisma.sla_configurations.findMany({
                where: { business_hours_only: true, is_active: true },
                select: {
                    business_start_time: true,
                    business_end_time: true,
                    include_weekends: true,
                },
            });
            return configs.some((cfg) => BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.isWithinBusinessHours(now, {
                business_start_time: cfg.business_start_time,
                business_end_time: cfg.business_end_time,
                include_weekends: cfg.include_weekends,
            }));
        });
    }
    // 3. Monitor business‐hours SLAs
    static monitorBusinessHoursSLAs() {
        return __awaiter(this, void 0, void 0, function* () {
            const tickets = yield prisma.tickets.findMany({
                where: {
                    status: { notIn: ["Closed", "Resolved"] },
                    sla_status: { notIn: ["Breached", "Met"] },
                    sla_priority: { business_hours_only: true, is_active: true },
                },
                include: {
                    ticket_sla_history: { where: { status: "Pending" } },
                    sla_priority: true,
                    agents_user: { select: { email: true } },
                },
            });
            for (const t of tickets)
                yield this.checkTicketSLAStatus(t);
        });
    }
    // 4. Monitor all active tickets
    static monitorAllActiveTickets() {
        return __awaiter(this, void 0, void 0, function* () {
            const tickets = yield prisma.tickets.findMany({
                where: {
                    status: { notIn: ["Closed", "Resolved"] },
                    sla_status: { notIn: ["Breached", "Met"] },
                },
                include: {
                    ticket_sla_history: { where: { status: "Pending" } },
                    sla_priority: true,
                    agents_user: { select: { email: true } },
                },
            });
            for (const t of tickets)
                yield this.checkTicketSLAStatus(t);
        });
    }
    // 5. Monitor critical tickets
    static monitorCriticalTickets() {
        return __awaiter(this, void 0, void 0, function* () {
            const tickets = yield prisma.tickets.findMany({
                where: {
                    priority: 1,
                    status: { notIn: ["Closed", "Resolved"] },
                    sla_status: { notIn: ["Breached", "Met"] },
                },
                include: {
                    ticket_sla_history: { where: { status: "Pending" } },
                    sla_priority: true,
                    agents_user: { select: { email: true } },
                },
            });
            for (const t of tickets)
                yield this.checkTicketSLAStatus(t, true);
        });
    }
    // 6. Business‐hours check wrapper
    static checkBusinessHoursSLAStatus(ticket) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const pr = ticket.sla_priority;
            if (pr.business_hours_only &&
                !BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.isWithinBusinessHours(now, {
                    business_start_time: pr.business_start_time,
                    business_end_time: pr.business_end_time,
                    include_weekends: pr.include_weekends,
                })) {
                return;
            }
            yield this.checkTicketSLAStatus(ticket);
        });
    }
    // 7. Main SLA check
    static checkTicketSLAStatus(ticket_1) {
        return __awaiter(this, arguments, void 0, function* (ticket, isCritical = false) {
            const now = new Date();
            const pr = ticket.sla_priority;
            const bhConfig = {
                business_start_time: pr.business_start_time,
                business_end_time: pr.business_end_time,
                include_weekends: pr.include_weekends,
            };
            if (pr.business_hours_only &&
                !isCritical &&
                !BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.isWithinBusinessHours(now, bhConfig)) {
                return;
            }
            for (const sla of ticket.ticket_sla_history) {
                const delta = sla.target_time.getTime() - now.getTime();
                const key = `${ticket.id}-${sla.sla_type}-${sla.status}`;
                // Breach
                if (delta <= 0 && sla.status === "Pending") {
                    // Update history
                    yield prisma.sla_history.update({
                        where: { id: sla.id },
                        data: {
                            status: "Breached",
                            time_to_breach: Math.abs(delta),
                            actual_time: now,
                        },
                    });
                    // Update ticket
                    yield prisma.tickets.update({
                        where: { id: ticket.id },
                        data: { sla_status: "Breached" },
                    });
                    console.log("Sent tonification for key:1", this.sentNotifications, key);
                    if (!this.sentNotifications.has(key)) {
                        this.sentNotifications.add(key);
                        // Add system comment
                        yield prisma.ticket_comments.create({
                            data: {
                                ticket_id: ticket.id,
                                user_id: null,
                                comment_text: `🚨 ${sla.sla_type.toUpperCase()} SLA breached.`,
                                comment_type: "System",
                                is_internal: true,
                            },
                        });
                        this.sendNotification({
                            ticket_id: ticket.id,
                            userId: ticket.assigned_agent_id,
                            title: `SLA Breached for ticket ${ticket.ticket_number}`,
                            message: `The ${sla.sla_type} SLA has been breached.`,
                            type: "sla_warning",
                        });
                        // Email section (integrate with your email service)
                        // await EmailService.sendEmail({
                        //   to: ticket.agents_user.email,
                        //   subject: `🚨 SLA Breach: Ticket ${ticket.ticket_number}`,
                        //   body: `The ${sla.sla_type} SLA has been breached by ${Math.abs(delta)} minutes.`,
                        //   priority: "Critical",
                        //   businessHoursOnly: pr.business_hours_only,
                        // });
                    }
                }
                // Due‐soon alert
                else if (delta > 0 && sla.status === "Pending" && !isCritical) {
                    const threshold = pr.business_hours_only
                        ? sla.sla_type === "Response"
                            ? 60 * 60 * 1000
                            : 2 * 60 * 60 * 1000
                        : pr.sla_priority.priority == "Critical"
                            ? 30 * 60 * 1000
                            : pr.sla_priority.priority == "High"
                                ? 60 * 60 * 1000
                                : 120 * 60 * 1000;
                    // console.log(
                    //   "Sent @@@@@@@@@@@@ nification for key:",
                    //   this.sentNotifications,
                    //   key
                    // );
                    if (delta <= threshold && !this.sentNotifications.has(key)) {
                        this.sentNotifications.add(key);
                        // Add system comment
                        yield prisma.ticket_comments.create({
                            data: {
                                ticket_id: ticket.id,
                                user_id: null,
                                comment_text: `⚠️ ${sla.sla_type.toUpperCase()} SLA due in ${Math.ceil(delta / 60000)} minutes`,
                                comment_type: "System",
                                is_internal: true,
                            },
                        });
                        this.sendNotification({
                            ticket_id: ticket.id,
                            userId: ticket.assigned_agent_id,
                            title: `SLA Warning - ${ticket.ticket_number}`,
                            message: `The ${sla.sla_type} SLA is due in ${Math.ceil(delta / 60000)} minutes.`,
                            type: "sla_warning",
                        });
                        // Email section (integrate with your email service)
                        // await EmailService.sendEmail({
                        //   to: ticket.agents_user.email,
                        //   subject: `⚠️ SLA Warning: Ticket ${ticket.ticket_number}`,
                        //   body: `The ${sla.sla_type} SLA is due in ${Math.ceil(delta / 60000)} minutes.`,
                        //   priority: "Warning",
                        //   businessHoursOnly: pr.business_hours_only,
                        // });
                    }
                }
            }
        });
    }
    // 8. Send SLA notifications (fixed) - COMPLETELY FIXED
    static sendSLANotifications(notifications) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const notification of notifications) {
                try {
                    // **FIX: Only handle breach notifications**
                    if (notification.newlyBreached.length > 0) {
                        const urgency = "Critical";
                        const breachDetails = notification.newlyBreached
                            .map((b) => {
                            const timeSpentText = b.businessHoursOnly
                                ? `actual business hours: ${b.actualTimeSpent}h`
                                : `overdue by ${b.overdue} minutes`;
                            return `${b.slaType.toUpperCase()} SLA breached (${timeSpentText})`;
                        })
                            .join(", ");
                        let commentText = `🚨 SLA BREACH DETECTED: ${breachDetails}`;
                        if (notification.businessHoursOnly) {
                            commentText += ` [Business hours: ${notification.businessConfig.business_start_time}-${notification.businessConfig.business_end_time}]`;
                        }
                        // **FIX: Always create comment for breach - remove duplicate check that was preventing comments**
                        try {
                            yield prisma.ticket_comments.create({
                                data: {
                                    ticket_id: notification.ticketId,
                                    user_id: null,
                                    comment_text: commentText,
                                    comment_type: "System",
                                    is_internal: true,
                                },
                            });
                            console.log(`💬 Created breach comment for ticket ${notification.ticketNumber}`);
                        }
                        catch (commentError) {
                            console.error(`❌ Error creating breach comment for ticket ${notification.ticketId}:`, commentError);
                        }
                        // Send email notifications
                        const recipients = [];
                        if (notification.agentEmail)
                            recipients.push(notification.agentEmail);
                        if ((recipients === null || recipients === void 0 ? void 0 : recipients.length) > 0) {
                            for (const email of recipients) {
                                try {
                                    yield this.sendEmailNotification({
                                        to: email,
                                        subject: `🚨 URGENT SLA BREACH - Ticket ${notification.ticketNumber}`,
                                        message: commentText,
                                        priority: notification.priority,
                                        urgency,
                                        businessHoursOnly: notification.businessHoursOnly,
                                    });
                                }
                                catch (emailError) {
                                    console.error(`❌ Error sending email notification:`, emailError);
                                }
                            }
                        }
                        console.log(`📧 Sent ${urgency} SLA notification for ticket ${notification.ticketNumber}`);
                    }
                }
                catch (error) {
                    console.error(`❌ Error sending notification for ticket ${notification.ticketId}:`, error);
                }
            }
        });
    }
    // 9. Email notification helper with business hours context
    static sendEmailNotification(emailData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const businessHoursNote = emailData.businessHoursOnly
                    ? " [Business hours SLA]"
                    : " [24/7 SLA]";
                console.log(`📧 [${emailData.urgency.toUpperCase()}] Sending to ${emailData.to}:`);
                console.log(`   Subject: ${emailData.subject}${businessHoursNote}`);
                console.log(`   Message: ${emailData.message}`);
                // Integrate with your email service
                // await EmailService.sendSLAAlert({
                //   to: emailData.to,
                //   subject: emailData.subject,
                //   body: emailData.message,
                //   priority: emailData.urgency,
                //   businessHours: emailData.businessHoursOnly
                // });
            }
            catch (error) {
                console.error("❌ Error sending email notification:", error);
            }
        });
    }
    // 9. Email notification helper with business hours context
    static sendNotification(emailData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield prisma.notifications.create({
                    data: {
                        user_id: emailData.userId,
                        type: emailData.type,
                        title: emailData.title,
                        message: emailData.message,
                        ticket_id: emailData.ticket_id,
                        read: false,
                        sent_via: "in_app",
                    },
                });
            }
            catch (error) {
                console.error("❌ Error sending email notification:", error);
            }
        });
    }
    // 10. Get SLA dashboard data with business hours context - FIXED
    static getSLADashboardData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                const isBusinessHours = yield this.isCurrentlyBusinessHours();
                const [totalTickets, breachedTickets, withinSLATickets, businessHoursTickets, pendingSLAs,] = yield Promise.all([
                    prisma.tickets.count({
                        where: { status: { notIn: ["Closed", "Resolved"] } },
                    }),
                    prisma.tickets.count({
                        where: {
                            status: { notIn: ["Closed", "Resolved"] },
                            sla_status: "Breached",
                        },
                    }),
                    prisma.tickets.count({
                        where: {
                            status: { notIn: ["Closed", "Resolved"] },
                            sla_status: "Within",
                        },
                    }),
                    prisma.tickets.count({
                        where: {
                            status: { notIn: ["Closed", "Resolved"] },
                            sla_priority: { business_hours_only: true },
                        },
                    }),
                    prisma.sla_history.count({
                        where: {
                            status: "Pending",
                            ticket_sla_history: {
                                status: { notIn: ["Closed", "Resolved"] },
                            },
                        },
                    }),
                ]);
                return {
                    timestamp: now,
                    isBusinessHours,
                    totalActiveTickets: totalTickets,
                    breachedSLAs: breachedTickets,
                    withinSLAs: withinSLATickets,
                    businessHoursTickets,
                    pendingSLAs,
                    complianceRate: totalTickets > 0
                        ? ((totalTickets - breachedTickets) / totalTickets) * 100
                        : 100,
                    businessHoursStatus: isBusinessHours ? "Active" : "Inactive",
                };
            }
            catch (error) {
                console.error("❌ Error getting SLA dashboard data:", error);
                return null;
            }
        });
    }
    // **FIXED: Method to mark SLA as Met when resolved**
    // static async markSLAasMet(
    //   ticketId: number,
    //   slaType: "Response" | "Resolution"
    // ) {
    //   try {
    //     await prisma.sla_history.updateMany({
    //       where: {
    //         ticket_id: ticketId,
    //         sla_type: slaType,
    //         status: { in: ["Pending", "Breached"] },
    //       },
    //       data: {
    //         status: "Met",
    //         actual_time: new Date(),
    //       },
    //     });
    //     // Check if all SLAs are now met or breached (no pending ones)
    //     const pendingSLAs = await prisma.sla_history.count({
    //       where: {
    //         ticket_id: ticketId,
    //         status: "Pending",
    //       },
    //     });
    //     if (pendingSLAs === 0) {
    //       // Check if any SLAs are still breached
    //       const breachedSLAs = await prisma.sla_history.count({
    //         where: {
    //           ticket_id: ticketId,
    //           status: "Breached",
    //         },
    //       });
    //       // Only mark as "Met" if no SLAs are breached
    //       const finalStatus = breachedSLAs > 0 ? "Breached" : "Met";
    //       await prisma.tickets.update({
    //         where: { id: ticketId },
    //         data: { sla_status: finalStatus },
    //       });
    //       console.log(
    //         `✅ Updated ticket ${ticketId} SLA status to: ${finalStatus}`
    //       );
    //     }
    //     console.log(`✅ Marked ${slaType} SLA as Met for ticket ${ticketId}`);
    //   } catch (error) {
    //     console.error(`❌ Error marking SLA as met:`, error);
    //   }
    // }
    // 11. Pause SLA for specific ticket
    static pauseTicketSLA(ticketId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.tickets.update({
                    where: { id: ticketId },
                    data: { sla_status: "Paused" },
                });
                yield prisma.ticket_comments.create({
                    data: {
                        ticket_id: ticketId,
                        user_id: null,
                        comment_text: `⏸️ SLA PAUSED: ${reason || "Waiting for customer response"}`,
                        comment_type: "System",
                        is_internal: true,
                    },
                });
                console.log(`⏸️ Paused SLA for ticket ${ticketId}: ${reason}`);
            }
            catch (error) {
                console.error(`❌ Error pausing SLA for ticket ${ticketId}:`, error);
            }
        });
    }
    // 12. Resume SLA for specific ticket
    static resumeTicketSLA(ticketId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ticket = yield prisma.tickets.findUnique({
                    where: { id: ticketId },
                    include: {
                        ticket_sla_history: { where: { status: "Pending" } },
                        sla_priority: true,
                    },
                });
                if (!ticket || !ticket.sla_priority)
                    return;
                // Find the last pause comment to calculate pause duration
                const lastPauseComment = yield prisma.ticket_comments.findFirst({
                    where: {
                        ticket_id: ticketId,
                        comment_text: { contains: "SLA PAUSED" },
                    },
                    orderBy: { created_at: "desc" },
                });
                if (lastPauseComment && ticket.ticket_sla_history.length > 0) {
                    const now = new Date();
                    const pauseDuration = now.getTime() - lastPauseComment.created_at.getTime();
                    // Extend all pending SLA deadlines by pause duration
                    for (const sla of ticket.ticket_sla_history) {
                        const newDeadline = new Date(sla.target_time.getTime() + pauseDuration);
                        yield prisma.sla_history.update({
                            where: { id: sla.id },
                            data: { target_time: newDeadline },
                        });
                    }
                    // Update main ticket deadline
                    if (ticket.sla_deadline) {
                        yield prisma.tickets.update({
                            where: { id: ticketId },
                            data: {
                                sla_deadline: new Date(ticket.sla_deadline.getTime() + pauseDuration),
                                sla_status: "Within",
                            },
                        });
                    }
                    yield prisma.ticket_comments.create({
                        data: {
                            ticket_id: ticketId,
                            user_id: null,
                            comment_text: `▶️ SLA RESUMED: Extended deadlines by ${Math.floor(pauseDuration / (1000 * 60))} minutes. ${reason || ""}`,
                            comment_type: "System",
                            is_internal: true,
                        },
                    });
                    console.log(`▶️ Resumed SLA for ticket ${ticketId}, extended by ${Math.floor(pauseDuration / (1000 * 60))} minutes`);
                }
            }
            catch (error) {
                console.error(`❌ Error resuming SLA for ticket ${ticketId}:`, error);
            }
        });
    }
    // 13. Force SLA status check for specific ticket (useful for testing)
    static forceCheckTicket(ticketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ticket = yield prisma.tickets.findUnique({
                    where: { id: ticketId },
                    include: {
                        ticket_sla_history: { where: { status: "Pending" } },
                        sla_priority: true,
                        customers: { select: { email: true } },
                        agents_user: { select: { email: true } },
                    },
                });
                if (!ticket) {
                    console.log(`❌ Ticket ${ticketId} not found`);
                    return;
                }
                console.log(`🔍 Force checking SLA status for ticket ${ticket.ticket_number}`);
                const slaUpdate = yield this.checkTicketSLAStatus(ticket, true);
                // if (slaUpdate && slaUpdate.needsNotification) {
                //   await this.sendSLANotifications([slaUpdate]);
                // }
                return slaUpdate;
            }
            catch (error) {
                console.error(`❌ Error force checking ticket ${ticketId}:`, error);
            }
        });
    }
}
exports.BusinessHoursAwareSLAMonitoringService = BusinessHoursAwareSLAMonitoringService;
// Prevent duplicate notifications per SLA event
BusinessHoursAwareSLAMonitoringService.sentNotifications = new Set();
