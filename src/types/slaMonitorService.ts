// services/slaMonitor.ts
import { PrismaClient } from "@prisma/client";
import notificationService from "../v1/services/notification";

const prisma = new PrismaClient();

class SLAMonitor {
  private intervalId: NodeJS.Timeout | null = null;

  start(intervalMinutes: number = 3) {
    console.log(`🔍 SLA Monitor starting (every ${intervalMinutes}min)`);

    this.check(); // Run immediately
    this.intervalId = setInterval(
      () => this.check(),
      intervalMinutes * 60 * 1000
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log("⏹️ SLA Monitor stopped");
    }
  }

  private async check() {
    try {
      const tickets = await prisma.tickets.findMany({
        where: {
          status: { notIn: ["Closed", "Resolved"] },
          sla_deadline: { not: null },
        },
        include: {
          agents_user: { include: { user_notification_setting: true } },
          sla_priority: true,
        },
      });

      for (const ticket of tickets) {
        await this.checkTicket(ticket);
      }

      console.log(`✅ Checked ${tickets.length} tickets`);
    } catch (error) {
      console.error("❌ SLA check error:", error);
    }
  }

  private async checkTicket(ticket: any) {
    const now = new Date();
    const deadline = new Date(ticket.sla_deadline);

    const totalTime =
      deadline.getTime() - new Date(ticket.created_at).getTime();
    const elapsed = now.getTime() - new Date(ticket.created_at).getTime();
    const remaining = deadline.getTime() - now.getTime();

    const percentUsed = Math.min(100, (elapsed / totalTime) * 100);
    const threshold =
      ticket.assigned_agent?.user_notification_setting
        ?.warning_threshold_percent || 80;

    // Check if warning should be sent
    if (
      percentUsed >= threshold &&
      percentUsed < 100 &&
      ticket.sla_status !== "Warning"
    ) {
      await this.sendWarning(ticket, percentUsed, remaining);

      await prisma.tickets.update({
        where: { id: ticket.id },
        data: { sla_status: "Warning" },
      });
    }
    // Check if breached
    else if (remaining <= 0 && ticket.sla_status !== "Breached") {
      await prisma.tickets.update({
        where: { id: ticket.id },
        data: { sla_status: "Breached" },
      });
    }
  }

  private async sendWarning(
    ticket: any,
    percentUsed: number,
    remaining: number
  ) {
    const userIds: number[] = [];

    // Notify assigned agent
    if (ticket.assigned_agent_id) {
      userIds.push(ticket.assigned_agent_id);
    }

    // Notify supervisors for high priority
    if (
      ticket.sla_priority?.priority === "High" ||
      ticket.sla_priority?.priority === "Urgent" ||
      ticket.sla_priority?.priority === "Critical"
    ) {
      const supervisors = await prisma.users.findMany({
        // where: { role: { in: ["SUPERVISOR", "ADMIN"] } },
      });
      userIds.push(...supervisors.map((s: any) => s.id));
    }

    if (userIds.length > 0) {
      await notificationService.notify("sla_warning", userIds, {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        priority: ticket.sla_priority?.priority || "Medium",
        percentUsed: Math.round(percentUsed),
        timeRemaining: this.formatTime(remaining),
        customerName: ticket.customer_name || ticket.customer_email,
      });
    }
  }

  private formatTime(ms: number): string {
    if (ms <= 0) return "0m";
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }
}

export default new SLAMonitor();
