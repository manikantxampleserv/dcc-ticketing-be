// services/notificationService.ts
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { Server as SocketIOServer } from "socket.io";

const prisma = new PrismaClient();

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

class NotificationService {
  private io: SocketIOServer | null = null;

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Send notification to users
   */
  async notify(type: string, userIds: number[], data: any): Promise<void> {
    try {
      // Get users with notification settings
      const users = await prisma.users.findMany({
        where: { id: { in: userIds } },
        include: { user_notification_setting: true },
      });

      // Filter users who want this notification
      const eligibleUsers = users.filter(async (user: any) => {
        const settings = user.user_notification_setting?.[0];

        if (type === "new_ticket" && settings?.new_ticket_alerts) {
          await this.createNotification(user.id, type, data);
        }
        if (type === "sla_warning" && settings?.sla_warnings) {
          await this.createNotification(user.id, type, data);
        }
        // if (settings?.email_notifications) {
        //    await EmailService.sendCommentEmailToCustomer(
        //   updatedTicket,
        //   comment,
        //   []
        // );
        //   // this.sendEmail(user, type, data);
        // }

        return true;
      });
      console.log("eligibleUsers", users);
      // Create and send notifications
      // for (const user of eligibleUsers) {

      //   // Send via Socket.IO
      //   // this.sendSocketNotification(user.id, notification);

      //   // Send email
      //   if (user.user_notification_setting?.[0]?.email_notifications) {
      //     this.sendEmail(user, type, data);
      //   }
      // }
    } catch (error) {
      console.error("❌ Notification error:", error);
    }
  }

  /**
   * Create notification in database
   */
  private async createNotification(userId: number, type: string, data: any) {
    const content = this.getContent(type, data);

    return await prisma.notifications.create({
      data: {
        user_id: userId,
        type,
        title: content.title,
        message: content.message,
        ticket_id: data.ticketId,
        read: false,
        sent_via: "in_app",
      },
    });
  }

  /**
   * Send via Socket.IO
   */
  // private sendSocketNotification(userId: number, notification: any) {
  //   if (!this.io) return;

  //   this.io.to(`user_${userId}`).emit("notification", {
  //     id: notification.id,
  //     type: notification.type,
  //     title: notification.title,
  //     message: notification.message,
  //     ticket_id: notification.ticket_id,
  //     created_at: notification.created_at,
  //   });
  //   const room_clients = this.io.sockets.adapter.rooms.get(`user_${userId}`);
  //   console.log(
  //     `👥 Clients in room user_${userId}:`,
  //     room_clients ? room_clients.size : 0
  //   );
  //   console.log(`📱 Socket notification sent to user ${userId}`);
  // }

  /**
   * Send email
   */
  private async sendEmail(user: any, type: string, data: any) {
    try {
      const content = this.getEmailContent(type, data, user);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: content.subject,
        html: content.html,
      });

      console.log(`📧 Email sent to ${user.email}`);
    } catch (error) {
      console.error("❌ Email error:", error);
    }
  }

  /**
   * Get notification content
   */
  private getContent(type: string, data: any) {
    const templates = {
      new_ticket: {
        title: `New Ticket #${data.ticketNumber}`,
        message: `New ticket from ${data.customerName}: ${data.subject}`,
      },
      ticket_assigned: {
        title: `Ticket Assigned #${data.ticketNumber}`,
        message: `Ticket "${data.subject}" has been assigned to you`,
      },
      sla_warning: {
        title: `⚠️ SLA Warning - #${data.ticketNumber}`,
        message: `Ticket at ${data.percentUsed}% SLA. ${data.timeRemaining} remaining`,
      },
    };

    return (
      templates[type as keyof typeof templates] || {
        title: "Notification",
        message: "You have a new notification",
      }
    );
  }

  /**
   * Get email content
   */
  private getEmailContent(type: string, data: any, user: any) {
    const baseUrl = process.env.APP_URL;

    if (type === "new_ticket" || type === "ticket_assigned") {
      return {
        subject: `🎫 ${type === "new_ticket" ? "New" : "Assigned"} Ticket #${
          data.ticketNumber
        }`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h2>🎫 ${
                type === "new_ticket" ? "New Ticket Created" : "Ticket Assigned"
              }</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Hi ${
                user.first_name
                  ? user.first_name + user.last_name
                  : user.username
              },</p>
              <p>${
                type === "new_ticket"
                  ? "A new ticket has been created"
                  : "A ticket has been assigned to you"
              }:</p>
              <ul>
                <li><strong>Ticket:</strong> #${data.ticketNumber}</li>
                <li><strong>Subject:</strong> ${data.subject}</li>
                <li><strong>Customer:</strong> ${data.customerName}</li>
                <li><strong>Priority:</strong> ${data.priority}</li>
              </ul>
              <a href="${baseUrl}/tickets/${data.ticketId}" 
                 style="display: inline-block; background: #007bff; color: white; 
                        padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                View Ticket
              </a>
            </div>
          </div>
        `,
      };
    }

    if (type === "sla_warning") {
      return {
        subject: `⚠️ SLA Warning - Ticket #${data.ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff9800; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h2>⚠️ SLA Warning Alert</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #ff9800; background: #fff3cd;">
              <p>Hi ${
                user.first_name
                  ? user.first_name + user.last_name
                  : user.username
              },</p>
              <p><strong>Ticket #${
                data.ticketNumber
              } is approaching SLA breach!</strong></p>
              <ul>
                <li><strong>Subject:</strong> ${data.subject}</li>

              </ul>
              <p style="color: #d32f2f;"><strong>⚠️ Action Required: Please respond immediately</strong></p>
              <a href="${baseUrl}/tickets/${data.ticketId}" 
                 style="display: inline-block; background: #ff9800; color: white; 
                        padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                View Ticket Now
              </a>
            </div>
          </div>
        `,
      };
    }

    // <li><strong>SLA Usage:</strong> ${data.percentUsed}%</li>
    // <li><strong>Time Remaining:</strong> ${data.timeRemaining}</li>
    return { subject: "Notification", html: "<p>New notification</p>" };
  }

  async markAsRead(notificationId: number) {
    await prisma.notifications.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return await prisma.notifications.count({
      where: { user_id: userId, read: false },
    });
  }
}

export default new NotificationService();
