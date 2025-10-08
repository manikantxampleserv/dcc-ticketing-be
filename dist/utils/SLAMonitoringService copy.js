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
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
const BussinessHoursSLACalculation_1 = require("./BussinessHoursSLACalculation");
const prisma = new client_1.PrismaClient();
class BusinessHoursAwareSLAMonitoringService {
    // 1. Start monitoring with business hours consideration
    static startMonitoring() {
        // Main monitoring every 5 minutes
        node_cron_1.default.schedule("*/5 * * * *", () => __awaiter(this, void 0, void 0, function* () {
            console.log("🔍 Running business-hours-aware SLA monitoring...");
            yield this.monitorAllActiveTickets();
        }));
        // More frequent monitoring during business hours (every 2 minutes)
        node_cron_1.default.schedule("*/2 * * * *", () => __awaiter(this, void 0, void 0, function* () {
            if (yield this.isCurrentlyBusinessHours()) {
                console.log("🔍 Running frequent business-hours SLA check...");
                yield this.monitorBusinessHoursSLAs();
            }
        }));
        // Critical tickets monitoring (every minute during business hours)
        node_cron_1.default.schedule("* * * * *", () => __awaiter(this, void 0, void 0, function* () {
            if (yield this.isCurrentlyBusinessHours()) {
                yield this.monitorCriticalTickets();
            }
        }));
        console.log("✅ Business-hours-aware SLA monitoring service started");
    }
    // 2. Check if current time is business hours for any active SLA config
    static isCurrentlyBusinessHours() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const businessConfigs = yield prisma.sla_configurations.findMany({
                where: {
                    business_hours_only: true,
                    is_active: true,
                },
                select: {
                    business_start_time: true,
                    business_end_time: true,
                    include_weekends: true,
                },
            });
            // If any config has business hours active now, return true
            for (const config of businessConfigs) {
                if (BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.isWithinBusinessHours(now, {
                    business_start_time: config.business_start_time,
                    business_end_time: config.business_end_time,
                    include_weekends: config.include_weekends,
                })) {
                    return true;
                }
            }
            return false;
        });
    }
    // 3. Monitor tickets with business hours SLA configurations
    static monitorBusinessHoursSLAs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const businessHoursTickets = yield prisma.tickets.findMany({
                    where: {
                        status: { notIn: ["Closed", "Resolved"] },
                        sla_priority: {
                            business_hours_only: true,
                            is_active: true,
                        },
                    },
                    include: {
                        ticket_sla_history: { where: { status: "Pending" } }, // Keep your naming
                        sla_priority: true,
                        customers: {
                            select: { email: true, first_name: true, last_name: true },
                        },
                        agents_user: {
                            select: { email: true, first_name: true, last_name: true },
                        },
                    },
                });
                for (const ticket of businessHoursTickets) {
                    yield this.checkBusinessHoursSLAStatus(ticket);
                }
                console.log(`🕐 Monitored ${businessHoursTickets.length} business hours tickets`);
            }
            catch (error) {
                console.error("❌ Error monitoring business hours SLAs:", error);
            }
        });
    }
    // 4. Monitor all active tickets
    static monitorAllActiveTickets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const activeTickets = yield prisma.tickets.findMany({
                    where: {
                        status: { notIn: ["Closed", "Resolved"] },
                    },
                    include: {
                        ticket_sla_history: { where: { status: "Pending" } }, // Keep your naming
                        sla_priority: true,
                        customers: {
                            select: { email: true, first_name: true, last_name: true },
                        },
                        agents_user: {
                            select: { email: true, first_name: true, last_name: true },
                        },
                    },
                });
                const notifications = [];
                for (const ticket of activeTickets) {
                    const slaUpdate = yield this.checkTicketSLAStatus(ticket);
                    if (slaUpdate && slaUpdate.needsNotification) {
                        notifications.push(slaUpdate);
                    }
                }
                if (notifications.length > 0) {
                    yield this.sendSLANotifications(notifications);
                }
                console.log(`✅ Monitored ${activeTickets.length} tickets, ${notifications.length} notifications sent`);
            }
            catch (error) {
                console.error("❌ Error in SLA monitoring:", error);
            }
        });
    }
    // 5. Monitor only critical priority tickets more frequently
    static monitorCriticalTickets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const criticalTickets = yield prisma.tickets.findMany({
                    where: {
                        priority: 1, // Keep your existing priority system
                        status: { notIn: ["Closed", "Resolved"] },
                    },
                    include: {
                        ticket_sla_history: { where: { status: "Pending" } }, // Keep your naming
                        sla_priority: true,
                        agents_user: {
                            select: { email: true, first_name: true, last_name: true },
                        },
                    },
                });
                for (const ticket of criticalTickets) {
                    yield this.checkTicketSLAStatus(ticket, true);
                }
                console.log(`🚨 Monitored ${criticalTickets.length} critical tickets`);
            }
            catch (error) {
                console.error("❌ Error monitoring critical tickets:", error);
            }
        });
    }
    // 6. Check SLA status for business hours tickets
    static checkBusinessHoursSLAStatus(ticket) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const slaConfig = ticket.sla_priority;
            if (!slaConfig)
                return;
            const businessConfig = {
                business_start_time: slaConfig.business_start_time,
                business_end_time: slaConfig.business_end_time,
                include_weekends: slaConfig.include_weekends,
            };
            // Only check during business hours for business hours SLAs
            if (slaConfig.business_hours_only) {
                const isBusinessHours = BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.isWithinBusinessHours(now, businessConfig);
                if (!isBusinessHours) {
                    console.log(`⏰ Skipping ticket ${ticket.ticket_number} - outside business hours`);
                    return;
                }
            }
            return yield this.checkTicketSLAStatus(ticket);
        });
    }
    // 7. Check individual ticket SLA status (main function)
    static checkTicketSLAStatus(ticket_1) {
        return __awaiter(this, arguments, void 0, function* (ticket, isCriticalCheck = false) {
            var _a, _b, _c, _d;
            const now = new Date();
            const slaConfig = ticket.sla_priority;
            let hasBreaches = false;
            let hasDueSoon = false;
            let newlyBreached = [];
            let dueSoonAlerts = [];
            if (!slaConfig) {
                return { needsNotification: false };
            }
            const businessConfig = {
                business_start_time: slaConfig.business_start_time,
                business_end_time: slaConfig.business_end_time,
                include_weekends: slaConfig.include_weekends,
            };
            // For business hours SLAs, only monitor during business hours (except critical checks)
            if (slaConfig.business_hours_only && !isCriticalCheck) {
                const isBusinessHours = BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.isWithinBusinessHours(now, businessConfig);
                if (!isBusinessHours) {
                    console.log(`⏰ Skipping ticket ${ticket.ticket_number} - outside business hours`);
                    return { needsNotification: false };
                }
            }
            for (const sla of ticket.ticket_sla_history) {
                // Keep your table name
                const timeToDeadline = sla.target_time.getTime() - now.getTime();
                const minutesToDeadline = Math.floor(timeToDeadline / (1000 * 60));
                // Check for breaches
                if (timeToDeadline <= 0 && sla.status === "Pending") {
                    // Keep your status
                    hasBreaches = true;
                    // Calculate actual time spent (business hours aware)
                    let actualTimeSpent = 0;
                    if (slaConfig.business_hours_only) {
                        actualTimeSpent =
                            BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.calculateBusinessHoursBetween(ticket.created_at, now, businessConfig);
                    }
                    else {
                        actualTimeSpent =
                            (now.getTime() - ticket.created_at.getTime()) / (1000 * 60 * 60);
                    }
                    newlyBreached.push({
                        slaType: sla.sla_type,
                        deadline: sla.target_time,
                        overdue: Math.abs(minutesToDeadline),
                        actualTimeSpent: Math.round(actualTimeSpent * 100) / 100,
                        businessHoursOnly: slaConfig.business_hours_only,
                    });
                    // Mark as breached - keep your naming convention
                    yield prisma.sla_history.update({
                        // Use your actual SLA history table name
                        where: { id: sla.id },
                        data: {
                            status: "Breached", // Keep your status naming
                            time_to_breach: Math.abs(minutesToDeadline),
                        },
                    });
                    yield this.sendSLANotifications([
                        {
                            needsNotification: newlyBreached.length > 0 ||
                                (dueSoonAlerts.length > 0 && !isCriticalCheck),
                            notification: newlyBreached,
                            customerEmail: (_a = ticket.customers) === null || _a === void 0 ? void 0 : _a.email,
                            agentEmail: (_b = ticket.agents_user) === null || _b === void 0 ? void 0 : _b.email,
                            businessHoursOnly: slaConfig.business_hours_only,
                            businessConfig: businessConfig,
                            ticketId: ticket.id,
                            ticketNumber: ticket.ticket_number,
                            priority: slaConfig.priority,
                            previousStatus: ticket.sla_status,
                            currentStatus: "Breached",
                        },
                    ]);
                    console.log(`🚨 SLA BREACH: Ticket ${ticket.ticket_number} - ${sla.sla_type} SLA breached`);
                }
                // Check for due soon alerts
                else if (timeToDeadline > 0) {
                    let shouldAlert = true;
                    if (slaConfig.business_hours_only && !isCriticalCheck) {
                        shouldAlert = BussinessHoursSLACalculation_1.BusinessHoursSLACalculator.isWithinBusinessHours(now, businessConfig);
                    }
                    if (shouldAlert) {
                        // Different alert thresholds based on business hours
                        let alertThreshold = 30 * 60 * 1000; // 30 minutes default
                        if (slaConfig.business_hours_only) {
                            if (sla.sla_type === "Response" || sla.sla_type === "Response") {
                                alertThreshold = 60 * 60 * 1000; // 1 hour for response
                            }
                            //  else {
                            //   alertThreshold = 2 * 60 * 60 * 1000; // 2 hours for resolution/escalation
                            // }
                        }
                        else {
                            if (slaConfig.priority === 1 || slaConfig.priority === "Critical") {
                                alertThreshold = 60 * 60 * 1000; // 1 hour for critical
                            }
                        }
                        if (timeToDeadline <= alertThreshold) {
                            hasDueSoon = true;
                            dueSoonAlerts.push({
                                slaType: sla.sla_type,
                                deadline: sla.target_time,
                                minutesRemaining: minutesToDeadline,
                                businessHoursOnly: slaConfig.business_hours_only,
                            });
                        }
                    }
                }
            }
            // Update main ticket SLA status
            let newSLAStatus = ticket.sla_status;
            if (hasBreaches) {
                newSLAStatus = "Breached";
            }
            //  else if (hasDueSoon) {
            //   newSLAStatus = "Due Soon";
            // }
            if (ticket.sla_status !== newSLAStatus) {
                yield prisma.tickets.update({
                    where: { id: ticket.id },
                    data: { sla_status: newSLAStatus },
                });
                console.log(`📊 Updated SLA status for ticket ${ticket.ticket_number}: ${ticket.sla_status} → ${newSLAStatus}`);
            }
            return {
                ticketId: ticket.id,
                ticketNumber: ticket.ticket_number,
                priority: slaConfig.priority,
                previousStatus: ticket.sla_status,
                currentStatus: newSLAStatus,
                needsNotification: newlyBreached.length > 0 ||
                    (dueSoonAlerts.length > 0 && !isCriticalCheck),
                newlyBreached,
                dueSoonAlerts,
                customerEmail: (_c = ticket.customers) === null || _c === void 0 ? void 0 : _c.email,
                agentEmail: (_d = ticket.agents_user) === null || _d === void 0 ? void 0 : _d.email,
                businessHoursOnly: slaConfig.business_hours_only,
                businessConfig: businessConfig,
            };
        });
    }
    // 8. Send SLA notifications (enhanced for business hours)
    static sendSLANotifications(notifications) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const notification of notifications) {
                try {
                    let commentText = "";
                    let urgency = "normal";
                    if (notification.newlyBreached.length > 0) {
                        urgency = "Critical"; // Keep your urgency naming
                        const breachDetails = notification.newlyBreached
                            .map((b) => {
                            const timeSpentText = b.businessHoursOnly
                                ? `actual business hours: ${b.actualTimeSpent}h`
                                : `overdue by ${b.overdue} minutes`;
                            return `${b.slaType.toUpperCase()} SLA breached (${timeSpentText})`;
                        })
                            .join(", ");
                        commentText = `🚨 SLA BREACH DETECTED: ${breachDetails}`;
                        if (notification.businessHoursOnly) {
                            commentText += ` [Business hours: ${notification.businessConfig.business_start_time}-${notification.businessConfig.business_end_time}]`;
                        }
                    }
                    else if (notification.dueSoonAlerts.length > 0) {
                        urgency = "warning";
                        const alertDetails = notification.dueSoonAlerts
                            .map((d) => `${d.slaType.toUpperCase()} SLA due in ${d.minutesRemaining} minutes${d.businessHoursOnly ? " (business hours)" : ""}`)
                            .join(", ");
                        commentText = `⚠️ SLA WARNING: ${alertDetails}`;
                    }
                    // Create system comment
                    yield prisma.ticket_comments.create({
                        data: {
                            ticket_id: notification.ticketId,
                            user_id: null,
                            comment_text: commentText,
                            comment_type: "System",
                            is_internal: true,
                        },
                    });
                    // Send email notifications
                    const recipients = [];
                    if (notification.agentEmail)
                        recipients.push(notification.agentEmail);
                    if (urgency === "Critical") {
                        // recipients.push("supervisor@company.com");
                    }
                    for (const email of recipients) {
                        yield this.sendEmailNotification({
                            to: email,
                            subject: `${urgency === "Critical" ? "🚨 URGENT" : "⚠️"} SLA Alert - Ticket ${notification.ticketNumber}`,
                            message: commentText,
                            priority: notification.priority,
                            urgency,
                            businessHoursOnly: notification.businessHoursOnly,
                        });
                    }
                    console.log(`📧 Sent ${urgency} SLA notification for ticket ${notification.ticketNumber} (business hours: ${notification.businessHoursOnly})`);
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
    // 10. Get SLA dashboard data with business hours context
    static getSLADashboardData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                const isBusinessHours = yield this.isCurrentlyBusinessHours();
                const [totalTickets, breachedTickets, dueSoonTickets, businessHoursTickets, pendingSLAs,] = yield Promise.all([
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
                            sla_status: "Due Soon",
                        },
                    }),
                    prisma.tickets.count({
                        where: {
                            status: { notIn: ["Closed", "Resolved"] },
                            sla_priority: { business_hours_only: true },
                        },
                    }),
                    // Count of pending SLA entries using your table name
                    prisma.sla_history.count({
                        // Use your actual table name here
                        where: {
                            status: "Pending", // Keep your status naming
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
                    dueSoonSLAs: dueSoonTickets,
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
                        ticket_sla_history: { where: { status: "Pending" } }, // Use your table name
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
                            // Use your actual table name
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
                        ticket_sla_history: { where: { status: "Pending" } }, // Use your table name
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
                if (slaUpdate && slaUpdate.needsNotification) {
                    yield this.sendSLANotifications([slaUpdate]);
                }
                return slaUpdate;
            }
            catch (error) {
                console.error(`❌ Error force checking ticket ${ticketId}:`, error);
            }
        });
    }
}
exports.BusinessHoursAwareSLAMonitoringService = BusinessHoursAwareSLAMonitoringService;
