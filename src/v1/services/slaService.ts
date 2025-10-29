// // services/slaService.ts
// import { PrismaClient } from "@prisma/client";
// import notificationService from "./notification";

// const prisma = new PrismaClient();

// export enum SLAType {
//   FIRST_RESPONSE = "first_response",
//   RESOLUTION = "resolution",
// }

// export enum SLAStatus {
//   WITHIN = "Within",
//   WARNING = "Warning",
//   BREACHED = "Breached",
//   PAUSED = "Paused",
// }

// interface SLACalculation {
//   targetTime: Date;
//   remainingTime: number;
//   percentUsed: number;
//   status: SLAStatus;
//   timeToBreachMinutes: number;
// }

// class SLAService {
//   /**
//    * Initialize SLA tracking for a new ticket
//    */
//   async initializeSLA(ticketId: number): Promise<void> {
//     try {
//       const ticket = await prisma.tickets.findUnique({
//         where: { id: ticketId },
//         include: { sla_priority: true },
//       });

//       if (!ticket || !ticket.sla_priority) {
//         console.warn(`⚠️ No SLA configuration found for ticket ${ticketId}`);
//         return;
//       }

//       const now = new Date();
//       const slaConfig = ticket.sla_priority;

//       // Calculate target times
//       const firstResponseTarget = this.calculateTargetTime(
//         now,
//         slaConfig.response_time_hours || 60
//       );
//       const resolutionTarget = this.calculateTargetTime(
//         now,
//         slaConfig.resolution_time_hours || 240
//       );

//       // Create SLA history records
//       await prisma.sla_history.createMany({
//         data: [
//           {
//             ticket_id: ticketId,
//             sla_type: SLAType.FIRST_RESPONSE,
//             target_time: firstResponseTarget,
//             status: SLAStatus.WITHIN,
//             time_to_breach: slaConfig.response_time_hours || 60,
//           },
//           {
//             ticket_id: ticketId,
//             sla_type: SLAType.RESOLUTION,
//             target_time: resolutionTarget,
//             status: SLAStatus.WITHIN,
//             time_to_breach: slaConfig.resolution_time_hours || 240,
//           },
//         ],
//       });

//       // Update ticket SLA deadline (use first response as initial deadline)
//       await prisma.tickets.update({
//         where: { id: ticketId },
//         data: {
//           sla_deadline: firstResponseTarget,
//           sla_status: SLAStatus.WITHIN,
//         },
//       });

//       console.log(`✅ SLA initialized for ticket ${ticketId}`);
//     } catch (error) {
//       console.error("❌ Error initializing SLA:", error);
//       throw error;
//     }
//   }

//   /**
//    * Calculate target time based on business hours (optional)
//    */
//   private calculateTargetTime(startTime: Date, minutes: number): Date {
//     // Simple calculation - add minutes directly
//     // TODO: Implement business hours logic if needed
//     const targetTime = new Date(startTime);
//     targetTime.setMinutes(targetTime.getMinutes() + minutes);
//     return targetTime;
//   }

//   /**
//    * Record first response and update SLA
//    */
//   async recordFirstResponse(ticketId: number): Promise<void> {
//     try {
//       const now = new Date();

//       // Get SLA history for first response
//       const slaHistory = await prisma.sla_history.findFirst({
//         where: {
//           ticket_id: ticketId,
//           sla_type: SLAType.FIRST_RESPONSE,
//           actual_time: null,
//         },
//         orderBy: { created_at: "desc" },
//       });

//       if (!slaHistory) {
//         console.warn(`⚠️ No first response SLA found for ticket ${ticketId}`);
//         return;
//       }

//       // Determine if breached
//       const breached = now > slaHistory.target_time;
//       const status = breached ? SLAStatus.BREACHED : SLAStatus.WITHIN;

//       // Update SLA history
//       await prisma.sla_history.update({
//         where: { id: slaHistory.id },
//         data: {
//           actual_time: now,
//           status,
//         },
//       });

//       // Update ticket
//       await prisma.tickets.update({
//         where: { id: ticketId },
//         data: {
//           first_response_at: now,
//         },
//       });

//       // Get resolution SLA to update ticket deadline
//       const resolutionSLA = await prisma.sla_history.findFirst({
//         where: {
//           ticket_id: ticketId,
//           sla_type: SLAType.RESOLUTION,
//           actual_time: null,
//         },
//       });

//       if (resolutionSLA) {
//         await prisma.tickets.update({
//           where: { id: ticketId },
//           data: {
//             sla_deadline: resolutionSLA.target_time,
//           },
//         });
//       }

//       console.log(
//         `✅ First response recorded for ticket ${ticketId} - Status: ${status}`
//       );

//       // Send notification if breached
//       if (breached) {
//         await this.notifyFirstResponseBreach(ticketId);
//       }
//     } catch (error) {
//       console.error("❌ Error recording first response:", error);
//       throw error;
//     }
//   }

//   /**
//    * Record ticket resolution and update SLA
//    */
//   async recordResolution(ticketId: number): Promise<void> {
//     try {
//       const now = new Date();

//       // Get SLA history for resolution
//       const slaHistory = await prisma.sla_history.findFirst({
//         where: {
//           ticket_id: ticketId,
//           sla_type: SLAType.RESOLUTION,
//           actual_time: null,
//         },
//         orderBy: { created_at: "desc" },
//       });

//       if (!slaHistory) {
//         console.warn(`⚠️ No resolution SLA found for ticket ${ticketId}`);
//         return;
//       }

//       // Determine if breached
//       const breached = now > slaHistory.target_time;
//       const status = breached ? SLAStatus.BREACHED : SLAStatus.WITHIN;

//       // Update SLA history
//       await prisma.sla_history.update({
//         where: { id: slaHistory.id },
//         data: {
//           actual_time: now,
//           status,
//         },
//       });

//       // Update ticket
//       await prisma.tickets.update({
//         where: { id: ticketId },
//         data: {
//           resolved_at: now,
//           sla_status: status,
//         },
//       });

//       console.log(
//         `✅ Resolution recorded for ticket ${ticketId} - Status: ${status}`
//       );

//       // Send notification if breached
//       if (breached) {
//         await this.notifyResolutionBreach(ticketId);
//       }
//     } catch (error) {
//       console.error("❌ Error recording resolution:", error);
//       throw error;
//     }
//   }

//   /**
//    * Calculate current SLA status for a ticket
//    */
//   async calculateSLAStatus(ticketId: number): Promise<{
//     firstResponse: SLACalculation | null;
//     resolution: SLACalculation | null;
//     overallStatus: SLAStatus;
//   }> {
//     try {
//       const ticket = await prisma.tickets.findUnique({
//         where: { id: ticketId },
//         include: {
//           ticket_sla_history: {
//             where: { actual_time: null },
//             orderBy: { created_at: "desc" },
//           },
//           sla_priority: true,
//         },
//       });

//       if (!ticket) {
//         throw new Error(`Ticket ${ticketId} not found`);
//       }

//       const now = new Date();
//       let firstResponseCalc: SLACalculation | null = null;
//       let resolutionCalc: SLACalculation | null = null;

//       // Calculate First Response SLA
//       const firstResponseSLA = ticket.ticket_sla_history.find(
//         (sla) => sla.sla_type === SLAType.FIRST_RESPONSE
//       );

//       if (firstResponseSLA && !ticket.first_response_at) {
//         firstResponseCalc = this.calculateSLAMetrics(
//           now,
//           firstResponseSLA.target_time,
//           ticket.created_at || now,
//           ticket.sla_priority?.response_time_hours - 30 || 80
//         );
//       }

//       // Calculate Resolution SLA
//       const resolutionSLA = ticket.ticket_sla_history.find(
//         (sla) => sla.sla_type === SLAType.RESOLUTION
//       );

//       if (resolutionSLA && !ticket.resolved_at) {
//         resolutionCalc = this.calculateSLAMetrics(
//           now,
//           resolutionSLA.target_time,
//           ticket.created_at || now,
//           ticket.sla_priority?.resolution_time_hours - 30 || 80
//         );
//       }

//       // Determine overall status
//       let overallStatus = SLAStatus.WITHIN;
//       if (
//         firstResponseCalc?.status === SLAStatus.BREACHED ||
//         resolutionCalc?.status === SLAStatus.BREACHED
//       ) {
//         overallStatus = SLAStatus.BREACHED;
//       } else if (
//         firstResponseCalc?.status === SLAStatus.WARNING ||
//         resolutionCalc?.status === SLAStatus.WARNING
//       ) {
//         overallStatus = SLAStatus.WARNING;
//       }

//       return {
//         firstResponse: firstResponseCalc,
//         resolution: resolutionCalc,
//         overallStatus,
//       };
//     } catch (error) {
//       console.error("❌ Error calculating SLA status:", error);
//       throw error;
//     }
//   }

//   /**
//    * Calculate SLA metrics
//    */
//   private calculateSLAMetrics(
//     now: Date,
//     targetTime: Date,
//     startTime: Date,
//     warningThreshold: number
//   ): SLACalculation {
//     const totalTime = targetTime.getTime() - startTime.getTime();
//     const elapsedTime = now.getTime() - startTime.getTime();
//     const remainingTime = targetTime.getTime() - now.getTime();

//     const percentUsed = Math.min(100, (elapsedTime / totalTime) * 100);
//     const timeToBreachMinutes = Math.max(
//       0,
//       Math.floor(remainingTime / (1000 * 60))
//     );

//     let status = SLAStatus.WITHIN;
//     if (remainingTime <= 0) {
//       status = SLAStatus.BREACHED;
//     } else if (percentUsed >= warningThreshold) {
//       status = SLAStatus.WARNING;
//     }

//     return {
//       targetTime,
//       remainingTime,
//       percentUsed: Math.round(percentUsed),
//       status,
//       timeToBreachMinutes,
//     };
//   }

//   /**
//    * Monitor all active tickets for SLA breaches
//    */
//   async monitorAllSLAs(): Promise<void> {
//     try {
//       console.log(`🔍 [${new Date().toISOString()}] Monitoring SLAs...`);

//       // Get all active tickets with pending SLAs
//       const activeTickets = await prisma.tickets.findMany({
//         where: {
//           status: { notIn: ["Closed", "Resolved"] },
//         },
//         include: {
//           ticket_sla_history: {
//             where: { actual_time: null },
//           },
//           agents_user: {
//             include: {
//               user_notification_setting: true,
//             },
//           },
//           sla_priority: true,
//         },
//       });

//       for (const ticket of activeTickets) {
//         await this.checkAndUpdateTicketSLA(ticket);
//       }

//       console.log(
//         `✅ SLA monitoring completed for ${activeTickets.length} tickets`
//       );
//     } catch (error) {
//       console.error("❌ Error monitoring SLAs:", error);
//     }
//   }

//   /**
//    * Check and update individual ticket SLA
//    */
//   private async checkAndUpdateTicketSLA(ticket: any): Promise<void> {
//     try {
//       const slaStatus = await this.calculateSLAStatus(ticket.id);

//       // Check First Response SLA
//       if (slaStatus.firstResponse) {
//         const firstResponseSLA = ticket.ticket_sla_history.find(
//           (sla: any) => sla.sla_type === SLAType.FIRST_RESPONSE
//         );

//         if (firstResponseSLA) {
//           await this.handleSLAStatusChange(
//             ticket,
//             firstResponseSLA,
//             slaStatus.firstResponse,
//             SLAType.FIRST_RESPONSE
//           );
//         }
//       }

//       // Check Resolution SLA
//       if (slaStatus.resolution) {
//         const resolutionSLA = ticket.ticket_sla_history.find(
//           (sla: any) => sla.sla_type === SLAType.RESOLUTION
//         );

//         if (resolutionSLA) {
//           await this.handleSLAStatusChange(
//             ticket,
//             resolutionSLA,
//             slaStatus.resolution,
//             SLAType.RESOLUTION
//           );
//         }
//       }

//       // Update overall ticket SLA status
//       if (ticket.sla_status !== slaStatus.overallStatus) {
//         await prisma.tickets.update({
//           where: { id: ticket.id },
//           data: { sla_status: slaStatus.overallStatus },
//         });
//       }
//     } catch (error) {
//       console.error(`❌ Error checking SLA for ticket ${ticket.id}:`, error);
//     }
//   }

//   /**
//    * Handle SLA status changes and send notifications
//    */
//   private async handleSLAStatusChange(
//     ticket: any,
//     slaHistory: any,
//     calculation: SLACalculation,
//     slaType: SLAType
//   ): Promise<void> {
//     // Update SLA history if status changed
//     if (slaHistory.status !== calculation.status) {
//       await prisma.sla_history.update({
//         where: { id: slaHistory.id },
//         data: {
//           status: calculation.status,
//           time_to_breach: calculation.timeToBreachMinutes,
//         },
//       });

//       // Send notifications based on status
//       if (calculation.status === SLAStatus.WARNING) {
//         await this.sendSLAWarning(ticket, calculation, slaType);
//       } else if (calculation.status === SLAStatus.BREACHED) {
//         if (slaType === SLAType.FIRST_RESPONSE) {
//           await this.notifyFirstResponseBreach(ticket.id);
//         } else {
//           await this.notifyResolutionBreach(ticket.id);
//         }
//       }
//     }
//   }

//   /**
//    * Send SLA warning notification
//    */
//   private async sendSLAWarning(
//     ticket: any,
//     calculation: SLACalculation,
//     slaType: SLAType
//   ): Promise<void> {
//     const recipientIds: number[] = [];

//     // Add assigned agent
//     if (ticket.assigned_agent_id) {
//       recipientIds.push(ticket.assigned_agent_id);
//     }

//     // Add supervisors for high priority
//     if (["High", "Urgent"].includes(ticket.sla_priority?.priority)) {
//       const supervisors = await prisma.users.findMany({
//         // where: { role: { in: ["SUPERVISOR", "ADMIN"] } },
//       });
//       recipientIds.push(...supervisors.map((s) => s.id));
//     }

//     if (recipientIds.length > 0) {
//       const slaTypeLabel =
//         slaType === SLAType.FIRST_RESPONSE ? "First Response" : "Resolution";

//       await notificationService.trigger("sla_warning", recipientIds, {
//         ticketId: ticket.id,
//         ticketNumber: ticket.ticket_number,
//         subject: ticket.subject,
//         priority: ticket.sla_priority?.priority,
//         slaType: slaTypeLabel,
//         timeRemaining: this.formatTimeRemaining(calculation.remainingTime),
//         currentPercent: calculation.percentUsed,
//         thresholdPercent:
//           ticket.assigned_agent?.notification_settings
//             ?.warning_threshold_percent || 80,
//         customerName: ticket.customer_name || ticket.customer_email,
//       });
//     }
//   }

//   /**
//    * Notify first response breach
//    */
//   private async notifyFirstResponseBreach(ticketId: number): Promise<void> {
//     const ticket = await prisma.tickets.findUnique({
//       where: { id: ticketId },
//       include: { sla_priority: true },
//     });

//     if (!ticket) return;

//     const recipientIds: number[] = [];

//     if (ticket.assigned_agent_id) {
//       recipientIds.push(ticket.assigned_agent_id);
//     }

//     // Always notify supervisors on breach
//     const supervisors = await prisma.users.findMany({
//       //   where: { role: { in: ["SUPERVISOR", "ADMIN"] } },
//     });
//     recipientIds.push(...supervisors.map((s) => s.id));

//     if (recipientIds.length > 0) {
//       await notificationService.trigger("sla_breach", recipientIds, {
//         ticketId: ticket.id,
//         ticketNumber: ticket.ticket_number,
//         subject: ticket.subject,
//         priority: ticket.sla_priority?.priority,
//         slaType: "First Response",
//         customerName: ticket.customer_name || ticket.customer_email,
//       });
//     }
//   }

//   /**
//    * Notify resolution breach
//    */
//   private async notifyResolutionBreach(ticketId: number): Promise<void> {
//     const ticket = await prisma.tickets.findUnique({
//       where: { id: ticketId },
//       include: { sla_priority: true },
//     });

//     if (!ticket) return;

//     const recipientIds: number[] = [];

//     if (ticket.assigned_agent_id) {
//       recipientIds.push(ticket.assigned_agent_id);
//     }

//     // Always notify supervisors on breach
//     const supervisors = await prisma.users.findMany({
//       //   where: { role: { in: ["SUPERVISOR", "ADMIN"] } },
//     });
//     recipientIds.push(...supervisors.map((s) => s.id));

//     if (recipientIds.length > 0) {
//       await notificationService.trigger("sla_breach", recipientIds, {
//         ticketId: ticket.id,
//         ticketNumber: ticket.ticket_number,
//         subject: ticket.subject,
//         priority: ticket.sla_priority?.priority,
//         slaType: "Resolution",
//         customerName: ticket.customer_name || ticket.customer_email,
//       });
//     }
//   }

//   /**
//    * Format time remaining
//    */
//   private formatTimeRemaining(ms: number): string {
//     if (ms <= 0) return "0 minutes";

//     const minutes = Math.floor(ms / (1000 * 60));
//     const hours = Math.floor(minutes / 60);
//     const days = Math.floor(hours / 24);

//     if (days > 0) {
//       const remainingHours = hours % 24;
//       return `${days}d ${remainingHours}h`;
//     }
//     if (hours > 0) {
//       const remainingMinutes = minutes % 60;
//       return `${hours}h ${remainingMinutes}m`;
//     }
//     return `${minutes}m`;
//   }

//   /**
//    * Pause SLA (e.g., when waiting for customer response)
//    */
//   async pauseSLA(ticketId: number, reason: string): Promise<void> {
//     await prisma.sla_history.updateMany({
//       where: {
//         ticket_id: ticketId,
//         actual_time: null,
//       },
//       data: { status: SLAStatus.PAUSED },
//     });

//     await prisma.tickets.update({
//       where: { id: ticketId },
//       data: { sla_status: SLAStatus.PAUSED },
//     });

//     console.log(`⏸️ SLA paused for ticket ${ticketId}: ${reason}`);
//   }

//   /**
//    * Resume SLA
//    */
//   async resumeSLA(ticketId: number): Promise<void> {
//     const ticket = await prisma.tickets.findUnique({
//       where: { id: ticketId },
//       include: {
//         ticket_sla_history: {
//           where: { status: SLAStatus.PAUSED },
//         },
//       },
//     });

//     if (!ticket) return;

//     // Recalculate target times
//     // This is a simplified version - you may want more complex logic
//     for (const slaHistory of ticket.ticket_sla_history) {
//       await prisma.sla_history.update({
//         where: { id: slaHistory.id },
//         data: { status: SLAStatus.WITHIN },
//       });
//     }

//     await prisma.tickets.update({
//       where: { id: ticketId },
//       data: { sla_status: SLAStatus.WITHIN },
//     });

//     console.log(`▶️ SLA resumed for ticket ${ticketId}`);
//   }

//   /**
//    * Get SLA statistics for a ticket
//    */
//   async getTicketSLAStats(ticketId: number): Promise<any> {
//     const slaHistories = await prisma.sla_history.findMany({
//       where: { ticket_id: ticketId },
//       orderBy: { created_at: "desc" },
//     });

//     const stats = {
//       firstResponse: {
//         targetTime: null as Date | null,
//         actualTime: null as Date | null,
//         status: null as string | null,
//         breached: false,
//       },
//       resolution: {
//         targetTime: null as Date | null,
//         actualTime: null as Date | null,
//         status: null as string | null,
//         breached: false,
//       },
//     };

//     for (const sla of slaHistories) {
//       if (sla.sla_type === SLAType.FIRST_RESPONSE) {
//         stats.firstResponse = {
//           targetTime: sla.target_time,
//           actualTime: sla.actual_time,
//           status: sla.status,
//           breached: sla.status === SLAStatus.BREACHED,
//         };
//       } else if (sla.sla_type === SLAType.RESOLUTION) {
//         stats.resolution = {
//           targetTime: sla.target_time,
//           actualTime: sla.actual_time,
//           status: sla.status,
//           breached: sla.status === SLAStatus.BREACHED,
//         };
//       }
//     }

//     return stats;
//   }
// }

// export default new SLAService();
