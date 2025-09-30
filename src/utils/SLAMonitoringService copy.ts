// services/BusinessHoursAwareSLAMonitoringService.ts
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { BusinessHoursSLACalculator } from "./BussinessHoursSLACalculation";

const prisma = new PrismaClient();

export class BusinessHoursAwareSLAMonitoringService {
  // 1. Start monitoring with business hours consideration
  static startMonitoring() {
    // Main monitoring every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      console.log("🔍 Running business-hours-aware SLA monitoring...");
      await this.monitorAllActiveTickets();
    });

    // More frequent monitoring during business hours (every 2 minutes)
    cron.schedule("*/2 * * * *", async () => {
      if (await this.isCurrentlyBusinessHours()) {
        console.log("🔍 Running frequent business-hours SLA check...");
        await this.monitorBusinessHoursSLAs();
      }
    });

    // Critical tickets monitoring (every minute during business hours)
    cron.schedule("* * * * *", async () => {
      if (await this.isCurrentlyBusinessHours()) {
        await this.monitorCriticalTickets();
      }
    });

    console.log("✅ Business-hours-aware SLA monitoring service started");
  }

  // 2. Check if current time is business hours for any active SLA config
  static async isCurrentlyBusinessHours(): Promise<boolean> {
    const now = new Date();

    const businessConfigs = await prisma.sla_configurations.findMany({
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
      if (
        BusinessHoursSLACalculator.isWithinBusinessHours(now, {
          business_start_time: config.business_start_time!,
          business_end_time: config.business_end_time!,
          include_weekends: config.include_weekends!,
        })
      ) {
        return true;
      }
    }

    return false;
  }

  // 3. Monitor tickets with business hours SLA configurations
  static async monitorBusinessHoursSLAs() {
    try {
      const businessHoursTickets = await prisma.tickets.findMany({
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
        await this.checkBusinessHoursSLAStatus(ticket);
      }

      console.log(
        `🕐 Monitored ${businessHoursTickets.length} business hours tickets`
      );
    } catch (error) {
      console.error("❌ Error monitoring business hours SLAs:", error);
    }
  }

  // 4. Monitor all active tickets
  static async monitorAllActiveTickets() {
    try {
      const activeTickets = await prisma.tickets.findMany({
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
        const slaUpdate = await this.checkTicketSLAStatus(ticket);
        if (slaUpdate && slaUpdate.needsNotification) {
          notifications.push(slaUpdate);
        }
      }

      if (notifications.length > 0) {
        await this.sendSLANotifications(notifications);
      }

      console.log(
        `✅ Monitored ${activeTickets.length} tickets, ${notifications.length} notifications sent`
      );
    } catch (error) {
      console.error("❌ Error in SLA monitoring:", error);
    }
  }

  // 5. Monitor only critical priority tickets more frequently
  static async monitorCriticalTickets() {
    try {
      const criticalTickets = await prisma.tickets.findMany({
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
        await this.checkTicketSLAStatus(ticket, true);
      }

      console.log(`🚨 Monitored ${criticalTickets.length} critical tickets`);
    } catch (error) {
      console.error("❌ Error monitoring critical tickets:", error);
    }
  }

  // 6. Check SLA status for business hours tickets
  static async checkBusinessHoursSLAStatus(ticket: any) {
    const now = new Date();
    const slaConfig = ticket.sla_priority;

    if (!slaConfig) return;

    const businessConfig = {
      business_start_time: slaConfig.business_start_time,
      business_end_time: slaConfig.business_end_time,
      include_weekends: slaConfig.include_weekends,
    };

    // Only check during business hours for business hours SLAs
    if (slaConfig.business_hours_only) {
      const isBusinessHours = BusinessHoursSLACalculator.isWithinBusinessHours(
        now,
        businessConfig
      );

      if (!isBusinessHours) {
        console.log(
          `⏰ Skipping ticket ${ticket.ticket_number} - outside business hours`
        );
        return;
      }
    }

    return await this.checkTicketSLAStatus(ticket);
  }

  // 7. Check individual ticket SLA status (main function)
  static async checkTicketSLAStatus(ticket: any, isCriticalCheck = false) {
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
      const isBusinessHours = BusinessHoursSLACalculator.isWithinBusinessHours(
        now,
        businessConfig
      );
      if (!isBusinessHours) {
        console.log(
          `⏰ Skipping ticket ${ticket.ticket_number} - outside business hours`
        );
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
            BusinessHoursSLACalculator.calculateBusinessHoursBetween(
              ticket.created_at,
              now,
              businessConfig
            );
        } else {
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
        await prisma.sla_history.update({
          // Use your actual SLA history table name
          where: { id: sla.id },
          data: {
            status: "Breached", // Keep your status naming
            time_to_breach: Math.abs(minutesToDeadline),
          },
        });
        await this.sendSLANotifications([
          {
            needsNotification:
              newlyBreached.length > 0 ||
              (dueSoonAlerts.length > 0 && !isCriticalCheck),
            notification: newlyBreached,
            customerEmail: ticket.customers?.email,
            agentEmail: ticket.agents_user?.email,
            businessHoursOnly: slaConfig.business_hours_only,
            businessConfig: businessConfig,
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            priority: slaConfig.priority,
            previousStatus: ticket.sla_status,
            currentStatus: "Breached",
          },
        ]);
        console.log(
          `🚨 SLA BREACH: Ticket ${ticket.ticket_number} - ${sla.sla_type} SLA breached`
        );
      }
      // Check for due soon alerts
      else if (timeToDeadline > 0) {
        let shouldAlert = true;

        if (slaConfig.business_hours_only && !isCriticalCheck) {
          shouldAlert = BusinessHoursSLACalculator.isWithinBusinessHours(
            now,
            businessConfig
          );
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
          } else {
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
      await prisma.tickets.update({
        where: { id: ticket.id },
        data: { sla_status: newSLAStatus },
      });

      console.log(
        `📊 Updated SLA status for ticket ${ticket.ticket_number}: ${ticket.sla_status} → ${newSLAStatus}`
      );
    }

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      priority: slaConfig.priority,
      previousStatus: ticket.sla_status,
      currentStatus: newSLAStatus,
      needsNotification:
        newlyBreached.length > 0 ||
        (dueSoonAlerts.length > 0 && !isCriticalCheck),
      newlyBreached,
      dueSoonAlerts,
      customerEmail: ticket.customers?.email,
      agentEmail: ticket.agents_user?.email,
      businessHoursOnly: slaConfig.business_hours_only,
      businessConfig: businessConfig,
    };
  }

  // 8. Send SLA notifications (enhanced for business hours)
  static async sendSLANotifications(notifications: any[]) {
    for (const notification of notifications) {
      try {
        let commentText = "";
        let urgency = "normal";

        if (notification.newlyBreached.length > 0) {
          urgency = "Critical"; // Keep your urgency naming
          const breachDetails = notification.newlyBreached
            .map((b: any) => {
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
        } else if (notification.dueSoonAlerts.length > 0) {
          urgency = "warning";
          const alertDetails = notification.dueSoonAlerts
            .map(
              (d: any) =>
                `${d.slaType.toUpperCase()} SLA due in ${
                  d.minutesRemaining
                } minutes${d.businessHoursOnly ? " (business hours)" : ""}`
            )
            .join(", ");

          commentText = `⚠️ SLA WARNING: ${alertDetails}`;
        }

        // Create system comment
        await prisma.ticket_comments.create({
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
        if (notification.agentEmail) recipients.push(notification.agentEmail);

        if (urgency === "Critical") {
          // recipients.push("supervisor@company.com");
        }

        for (const email of recipients) {
          await this.sendEmailNotification({
            to: email,
            subject: `${
              urgency === "Critical" ? "🚨 URGENT" : "⚠️"
            } SLA Alert - Ticket ${notification.ticketNumber}`,
            message: commentText,
            priority: notification.priority,
            urgency,
            businessHoursOnly: notification.businessHoursOnly,
          });
        }

        console.log(
          `📧 Sent ${urgency} SLA notification for ticket ${notification.ticketNumber} (business hours: ${notification.businessHoursOnly})`
        );
      } catch (error) {
        console.error(
          `❌ Error sending notification for ticket ${notification.ticketId}:`,
          error
        );
      }
    }
  }

  // 9. Email notification helper with business hours context
  static async sendEmailNotification(emailData: any) {
    try {
      const businessHoursNote = emailData.businessHoursOnly
        ? " [Business hours SLA]"
        : " [24/7 SLA]";

      console.log(
        `📧 [${emailData.urgency.toUpperCase()}] Sending to ${emailData.to}:`
      );
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
    } catch (error) {
      console.error("❌ Error sending email notification:", error);
    }
  }

  // 10. Get SLA dashboard data with business hours context
  static async getSLADashboardData() {
    try {
      const now = new Date();
      const isBusinessHours = await this.isCurrentlyBusinessHours();

      const [
        totalTickets,
        breachedTickets,
        dueSoonTickets,
        businessHoursTickets,
        pendingSLAs,
      ] = await Promise.all([
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
        complianceRate:
          totalTickets > 0
            ? ((totalTickets - breachedTickets) / totalTickets) * 100
            : 100,
        businessHoursStatus: isBusinessHours ? "Active" : "Inactive",
      };
    } catch (error) {
      console.error("❌ Error getting SLA dashboard data:", error);
      return null;
    }
  }

  // 11. Pause SLA for specific ticket
  static async pauseTicketSLA(ticketId: number, reason?: string) {
    try {
      await prisma.tickets.update({
        where: { id: ticketId },
        data: { sla_status: "Paused" },
      });

      await prisma.ticket_comments.create({
        data: {
          ticket_id: ticketId,
          user_id: null,
          comment_text: `⏸️ SLA PAUSED: ${
            reason || "Waiting for customer response"
          }`,
          comment_type: "System",
          is_internal: true,
        },
      });

      console.log(`⏸️ Paused SLA for ticket ${ticketId}: ${reason}`);
    } catch (error) {
      console.error(`❌ Error pausing SLA for ticket ${ticketId}:`, error);
    }
  }

  // 12. Resume SLA for specific ticket
  static async resumeTicketSLA(ticketId: number, reason?: string) {
    try {
      const ticket = await prisma.tickets.findUnique({
        where: { id: ticketId },
        include: {
          ticket_sla_history: { where: { status: "Pending" } }, // Use your table name
          sla_priority: true,
        },
      });

      if (!ticket || !ticket.sla_priority) return;

      // Find the last pause comment to calculate pause duration
      const lastPauseComment = await prisma.ticket_comments.findFirst({
        where: {
          ticket_id: ticketId,
          comment_text: { contains: "SLA PAUSED" },
        },
        orderBy: { created_at: "desc" },
      });

      if (lastPauseComment && ticket.ticket_sla_history.length > 0) {
        const now = new Date();
        const pauseDuration =
          now.getTime() - lastPauseComment.created_at.getTime();

        // Extend all pending SLA deadlines by pause duration
        for (const sla of ticket.ticket_sla_history) {
          const newDeadline = new Date(
            sla.target_time.getTime() + pauseDuration
          );

          await prisma.sla_history.update({
            // Use your actual table name
            where: { id: sla.id },
            data: { target_time: newDeadline },
          });
        }

        // Update main ticket deadline
        if (ticket.sla_deadline) {
          await prisma.tickets.update({
            where: { id: ticketId },
            data: {
              sla_deadline: new Date(
                ticket.sla_deadline.getTime() + pauseDuration
              ),
              sla_status: "Within",
            },
          });
        }

        await prisma.ticket_comments.create({
          data: {
            ticket_id: ticketId,
            user_id: null,
            comment_text: `▶️ SLA RESUMED: Extended deadlines by ${Math.floor(
              pauseDuration / (1000 * 60)
            )} minutes. ${reason || ""}`,
            comment_type: "System",
            is_internal: true,
          },
        });

        console.log(
          `▶️ Resumed SLA for ticket ${ticketId}, extended by ${Math.floor(
            pauseDuration / (1000 * 60)
          )} minutes`
        );
      }
    } catch (error) {
      console.error(`❌ Error resuming SLA for ticket ${ticketId}:`, error);
    }
  }

  // 13. Force SLA status check for specific ticket (useful for testing)
  static async forceCheckTicket(ticketId: number) {
    try {
      const ticket = await prisma.tickets.findUnique({
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

      console.log(
        `🔍 Force checking SLA status for ticket ${ticket.ticket_number}`
      );

      const slaUpdate = await this.checkTicketSLAStatus(ticket, true);

      if (slaUpdate && slaUpdate.needsNotification) {
        await this.sendSLANotifications([slaUpdate]);
      }

      return slaUpdate;
    } catch (error) {
      console.error(`❌ Error force checking ticket ${ticketId}:`, error);
    }
  }
}
