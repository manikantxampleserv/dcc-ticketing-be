// services/BusinessHoursAwareSLAMonitoringService.ts
// services/BusinessHoursAwareSLAMonitoringService.ts
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { BusinessHoursSLACalculator } from "./BussinessHoursSLACalculation";

const prisma = new PrismaClient();

export class BusinessHoursAwareSLAMonitoringService {
  // Prevent duplicate notifications per SLA event
  private static sentNotifications = new Set<string>();

  // 1. Start monitoring
  static startMonitoring() {
    // All tickets every 5 minutes
    cron.schedule("*/5 * * * *", () => this.monitorAllActiveTickets());

    // Business‐hours only every 2 minutes
    cron.schedule("*/2 * * * *", async () => {
      if (await this.isCurrentlyBusinessHours()) {
        await this.monitorBusinessHoursSLAs();
      }
    });

    // Critical tickets every minute in business hours
    cron.schedule("* * * * *", async () => {
      if (await this.isCurrentlyBusinessHours()) {
        await this.monitorCriticalTickets();
      }
    });

    // Clear notification cache hourly
    cron.schedule("0 * * * *", () => this.sentNotifications.clear());

    console.log("✅ Business‐hours‐aware SLA monitoring started");
  }

  // 2. Check business hours
  static async isCurrentlyBusinessHours(): Promise<boolean> {
    const now = new Date();
    const configs = await prisma.sla_configurations.findMany({
      where: { business_hours_only: true, is_active: true },
      select: {
        business_start_time: true,
        business_end_time: true,
        include_weekends: true,
      },
    });
    return configs.some((cfg) =>
      BusinessHoursSLACalculator.isWithinBusinessHours(now, {
        business_start_time: cfg.business_start_time!,
        business_end_time: cfg.business_end_time!,
        include_weekends: cfg.include_weekends!,
      })
    );
  }

  // 3. Monitor business‐hours SLAs
  static async monitorBusinessHoursSLAs() {
    const tickets = await prisma.tickets.findMany({
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
    for (const t of tickets) await this.checkTicketSLAStatus(t);
  }

  // 4. Monitor all active tickets
  static async monitorAllActiveTickets() {
    const tickets = await prisma.tickets.findMany({
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
    for (const t of tickets) await this.checkTicketSLAStatus(t);
  }

  // 5. Monitor critical tickets
  static async monitorCriticalTickets() {
    const tickets = await prisma.tickets.findMany({
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
    for (const t of tickets) await this.checkTicketSLAStatus(t, true);
  }

  // 6. Business‐hours check wrapper
  static async checkBusinessHoursSLAStatus(ticket: any) {
    const now = new Date();
    const pr = ticket.sla_priority;
    if (
      pr.business_hours_only &&
      !BusinessHoursSLACalculator.isWithinBusinessHours(now, {
        business_start_time: pr.business_start_time!,
        business_end_time: pr.business_end_time!,
        include_weekends: pr.include_weekends!,
      })
    ) {
      return;
    }
    await this.checkTicketSLAStatus(ticket);
  }

  // 7. Main SLA check
  static async checkTicketSLAStatus(ticket: any, isCritical = false) {
    const now = new Date();
    const pr = ticket.sla_priority;
    const bhConfig = {
      business_start_time: pr.business_start_time!,
      business_end_time: pr.business_end_time!,
      include_weekends: pr.include_weekends!,
    };

    if (
      pr.business_hours_only &&
      !isCritical &&
      !BusinessHoursSLACalculator.isWithinBusinessHours(now, bhConfig)
    ) {
      return;
    }

    for (const sla of ticket.ticket_sla_history) {
      const delta = sla.target_time.getTime() - now.getTime();
      const key = `${ticket.id}-${sla.sla_type}-${sla.status}`;

      // Breach
      if (delta <= 0 && sla.status === "Pending") {
        // Update history
        await prisma.sla_history.update({
          where: { id: sla.id },
          data: {
            status: "Breached",
            time_to_breach: Math.abs(delta),
            actual_time: now,
          },
        });
        // Update ticket
        await prisma.tickets.update({
          where: { id: ticket.id },
          data: { sla_status: "Breached" },
        });

        if (!this.sentNotifications.has(key)) {
          this.sentNotifications.add(key);

          // Add system comment
          await prisma.ticket_comments.create({
            data: {
              ticket_id: ticket.id,
              user_id: null,
              comment_text: `🚨 ${sla.sla_type.toUpperCase()} SLA breached.`,
              comment_type: "System",
              is_internal: true,
            },
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
        const threshold = pr.business_hours_only!
          ? sla.sla_type === "Response"
            ? 60 * 60 * 1000
            : 2 * 60 * 60 * 1000
          : pr.sla_priority.priority == "Critical"
          ? 30 * 60 * 1000
          : pr.sla_priority.priority == "High"
          ? 60 * 60 * 1000
          : 120 * 60 * 1000;

        if (delta <= threshold && !this.sentNotifications.has(key)) {
          this.sentNotifications.add(key);

          // Add system comment
          await prisma.ticket_comments.create({
            data: {
              ticket_id: ticket.id,
              user_id: null,
              comment_text: `⚠️ ${sla.sla_type.toUpperCase()} SLA due in ${Math.ceil(
                delta / 60000
              )} minutes`,
              comment_type: "System",
              is_internal: true,
            },
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
  }

  // 8. Send SLA notifications (fixed) - COMPLETELY FIXED
  static async sendSLANotifications(notifications: any[]) {
    for (const notification of notifications) {
      try {
        // **FIX: Only handle breach notifications**
        if (notification.newlyBreached.length > 0) {
          const urgency = "Critical";
          const breachDetails = notification.newlyBreached
            .map((b: any) => {
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
            await prisma.ticket_comments.create({
              data: {
                ticket_id: notification.ticketId,
                user_id: null,
                comment_text: commentText,
                comment_type: "System",
                is_internal: true,
              },
            });

            console.log(
              `💬 Created breach comment for ticket ${notification.ticketNumber}`
            );
          } catch (commentError) {
            console.error(
              `❌ Error creating breach comment for ticket ${notification.ticketId}:`,
              commentError
            );
          }

          // Send email notifications
          const recipients = [];
          if (notification.agentEmail) recipients.push(notification.agentEmail);

          for (const email of recipients) {
            try {
              await this.sendEmailNotification({
                to: email,
                subject: `🚨 URGENT SLA BREACH - Ticket ${notification.ticketNumber}`,
                message: commentText,
                priority: notification.priority,
                urgency,
                businessHoursOnly: notification.businessHoursOnly,
              });
            } catch (emailError) {
              console.error(`❌ Error sending email notification:`, emailError);
            }
          }

          console.log(
            `📧 Sent ${urgency} SLA notification for ticket ${notification.ticketNumber}`
          );
        }
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

  // 10. Get SLA dashboard data with business hours context - FIXED
  static async getSLADashboardData() {
    try {
      const now = new Date();
      const isBusinessHours = await this.isCurrentlyBusinessHours();

      const [
        totalTickets,
        breachedTickets,
        withinSLATickets,
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

  // **FIXED: Method to mark SLA as Met when resolved**
  static async markSLAasMet(
    ticketId: number,
    slaType: "Response" | "Resolution"
  ) {
    try {
      await prisma.sla_history.updateMany({
        where: {
          ticket_id: ticketId,
          sla_type: slaType,
          status: { in: ["Pending", "Breached"] },
        },
        data: {
          status: "Met",
          actual_time: new Date(),
        },
      });

      // Check if all SLAs are now met or breached (no pending ones)
      const pendingSLAs = await prisma.sla_history.count({
        where: {
          ticket_id: ticketId,
          status: "Pending",
        },
      });

      if (pendingSLAs === 0) {
        // Check if any SLAs are still breached
        const breachedSLAs = await prisma.sla_history.count({
          where: {
            ticket_id: ticketId,
            status: "Breached",
          },
        });

        // Only mark as "Met" if no SLAs are breached
        const finalStatus = breachedSLAs > 0 ? "Breached" : "Met";

        await prisma.tickets.update({
          where: { id: ticketId },
          data: { sla_status: finalStatus },
        });

        console.log(
          `✅ Updated ticket ${ticketId} SLA status to: ${finalStatus}`
        );
      }

      console.log(`✅ Marked ${slaType} SLA as Met for ticket ${ticketId}`);
    } catch (error) {
      console.error(`❌ Error marking SLA as met:`, error);
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
          ticket_sla_history: { where: { status: "Pending" } },
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

      console.log(
        `🔍 Force checking SLA status for ticket ${ticket.ticket_number}`
      );

      const slaUpdate = await this.checkTicketSLAStatus(ticket, true);

      // if (slaUpdate && slaUpdate.needsNotification) {
      //   await this.sendSLANotifications([slaUpdate]);
      // }

      return slaUpdate;
    } catch (error) {
      console.error(`❌ Error force checking ticket ${ticketId}:`, error);
    }
  }
}
