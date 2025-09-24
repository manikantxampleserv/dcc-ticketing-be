// Email service for sending comments
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
const prisma = new PrismaClient();
class EmailService {
  private transporter;
  private static instance: EmailService;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail", // ✅ Use Gmail service preset
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD, // App password, not regular password
      },
      // ✅ Connection pool and timeout settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000,
      rateLimit: 10,
      socketTimeout: 60000,
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      // ✅ TLS settings
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      },
    });
  }
  // ✅ Singleton pattern
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendCommentEmailToCustomer(
    ticket: any,
    comment: any,
    additionalEmails: any[]
  ): Promise<any> {
    try {
      const subject = additionalEmails?.length
        ? `Re: ${ticket.subject}`
        : `Re: ${ticket.subject}`;
      const customerEmail = ticket.customers.email;
      const agentName = comment.users
        ? `${comment.users.first_name} ${comment.users.last_name}`
        : "Support Team";
      let Emails = customerEmail;
      if (additionalEmails.length > 0) {
        Emails = [customerEmail, ...additionalEmails];
      }
      //Generate unique message ID for THIS outgoing email
      const newMessageId = `<ticket-${ticket.id}-comment-${
        comment.id
      }-${Date.now()}@gmail.com>`;

      // ✅ Get the ORIGINAL thread ID (from when ticket was created)
      const originalThreadId =
        ticket.email_thread_id || ticket.original_email_message_id;

      console.log(`🧵 Original Thread ID: ${originalThreadId}`);
      console.log(`📨 New Message ID: ${newMessageId}`);

      // ✅ Helper function to determine image MIME type
      const getImageMimeType = (fileName: string): string => {
        const extension = fileName.toLowerCase().split(".").pop();
        const mimeTypes: { [key: string]: string } = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          svg: "image/svg+xml",
        };
        return mimeTypes[extension || "jpg"] || "image/jpeg";
      };

      // ✅ FIXED: Prepare image attachment for email
      let emailAttachment: any = null;

      // ✅ FIXED: Use correct property name (image_url)
      if (comment.image_url || comment.imageUrl) {
        const imageUrl = comment.image_url || comment.imageUrl;

        try {
          console.log(`📷 Downloading image from: ${imageUrl}`);

          // Download image from Backblaze URL
          const response = await fetch(imageUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());

            // Get filename from URL or use default
            const urlParts = imageUrl.split("/");
            const fileName =
              urlParts[urlParts.length - 1] || `ticket_${ticket.id}_image.jpg`;

            emailAttachment = {
              filename: fileName,
              content: buffer,
              contentType: getImageMimeType(fileName),
              cid: "attached-image", // Content ID for inline images
            };

            console.log(`✅ Image prepared for email attachment: ${fileName}`);
          } else {
            console.error(
              `❌ Failed to download image: ${response.statusText}`
            );
          }
        } catch (imageError) {
          console.error(`❌ Error processing image attachment:`, imageError);
        }
      }

      // ✅ Build image section HTML if image exists
      let imageHtml = "";
      const imageUrl = comment.image_url || comment.imageUrl;

      if (imageUrl) {
        imageHtml = `
        <div style="margin: 20px 0;">
          <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">📷 Image Attachment:</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
            <img src="${imageUrl}" 
                 alt="Attached Image" 
                 style="max-width: 100%; max-height: 300px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <br>
            <a href="${imageUrl}" 
               style="color: #007bff; text-decoration: none; font-size: 14px; margin-top: 10px; display: inline-block;"
               target="_blank">🔗 View Full Size</a>
          </div>
        </div>
      `;
      }
      const htmlContent = await this.ticketCommentConversation(
        ticket,
        agentName,
        comment,
        imageHtml
      );
      console.log("Generated Email HTML Content");
      //   const htmlContent = `
      //   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 10px;">
      //     <h2 style="color: #333;">Ticket Update</h2>
      //     <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      //       <strong>Ticket #${ticket.ticket_number}</strong><br>
      //       <strong>Subject:</strong> ${ticket.subject}<br>
      //       <strong>Status:</strong> ${ticket.status}
      //     </div>

      //     <div style="margin: 20px 0;">
      //       <strong>${agentName} commented:</strong>
      //       <div style="background-color: #fff; padding: 15px; border-left: 4px solid #007bff; margin-top: 10px;">
      //         ${comment.comment_text.replace(/\n/g, "<br>")}
      //       </div>
      //     </div>

      //     <hr style="margin: 30px 0;">
      //     <p style="color: #666; font-size: 12px;">
      //       To reply to this ticket, simply reply to this email. Do not change the subject line.
      //     </p>
      //   </div>
      // `;

      // ✅ FIXED: Create mail options object with all properties
      const mailOptions: any = {
        from: `"Support Team" <${process.env.SMTP_USERNAME}>`,
        to: [customerEmail, ...additionalEmails],
        // to: customerEmail,
        // cc:
        //   additionalEmails.length > 0 ? additionalEmails.join(",") : undefined,
        subject,
        html: htmlContent,
        messageId: originalThreadId || newMessageId, // ✅ Unique ID for this outgoing email
        headers: {
          References: originalThreadId
            ? [originalThreadId]
            : `<ticket-${ticket.id}@yourdomain.com>`,
          "In-Reply-To": originalThreadId
            ? originalThreadId
            : `<ticket-${ticket.id}@yourdomain.com>`,
          "Thread-Topic": ticket.subject,
          "Thread-Index": this.generateThreadIndex(ticket.id),
          "X-Ticket-ID": ticket.ticket_number,
          "X-Original-Message-ID": originalThreadId,
        },
      };

      // ✅ CRITICAL: Add attachment to email if it exists
      if (emailAttachment) {
        mailOptions.attachments = [emailAttachment];
      }
      await this.transporter.sendMail(mailOptions);

      //  Update comment with the message ID of the email we just sent
      if (comment.id) {
        await prisma.ticket_comments.update({
          where: { id: comment.id },
          data: { email_message_id: newMessageId },
        });
      }

      console.log(
        `✅ Email sent to customer ${customerEmail} for ticket #${ticket.ticket_number}`
      );
      console.log(`🧵 Threaded with original: ${originalThreadId}`);
    } catch (error) {
      console.error("❌ Error sending email:", error);
    }
  }

  // ✅ Helper method for thread indexing
  private generateThreadIndex(ticketId: number): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    return `${ticketId}-${timestamp}`;
  }

  private async ticketCommentConversation(
    ticket: any,
    agentName: string,
    comment: any,
    imageHtml: string
  ): Promise<string> {
    try {
      const previousComments = await prisma.ticket_comments.findMany({
        where: {
          ticket_id: ticket.id,
          id: { not: comment.id }, // Exclude current comment
        },
        include: {
          ticket_comment_users: {
            select: {
              first_name: true,
              last_name: true,
              avatar: true,
            },
          },
          ticket_comment_customers: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: {
          created_at: "asc",
        },
      });
      console.log("Fetched previous comments for conversation history", ticket);
      const borderColor1 = ticket?.source == "Email" ? "#28a745" : "#007bff";
      const typeBgColor1 = ticket?.source == "Email" ? "#dbeafe" : "#dcfce7";
      const typeTextColor1 = ticket?.source == "Email" ? "#1e40af" : "#166534";

      // ✅ BUILD PREVIOUS CONVERSATION HTML
      let previousConversationHtml = "";
      if (previousComments.length > 0) {
        previousConversationHtml = `
        <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #6c757d; border-radius: 5px;">
          <h3 style="color: #333; font-size: 16px; margin-bottom: 20px;">📋 Previous Conversation (${previousComments.length} messages)</h3>
        `;

        previousComments.forEach((prevComment: any) => {
          const author = prevComment.ticket_comment_customers
            ? `${prevComment.ticket_comment_customers.first_name} ${prevComment.ticket_comment_customers.last_name}`
            : prevComment.ticket_comment_users
            ? `${prevComment.ticket_comment_users.first_name} ${prevComment.ticket_comment_users.last_name}`
            : "Support Team";

          const commentDate = new Date(
            prevComment.created_at
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          // Determine comment type and styling
          const isCustomer = !!prevComment.ticket_comment_customers;
          const commentTypeLabel = prevComment.is_internal
            ? "Internal"
            : "Email";
          // const commentTypeLabel =
          //   prevComment.comment_type || (isCustomer ? "customer" : "agent");
          const borderColor = isCustomer ? "#28a745" : "#007bff";
          const typeBgColor =
            prevComment.comment_type === "agent" ? "#dbeafe" : "#dcfce7";
          const typeTextColor =
            prevComment.comment_type === "agent" ? "#1e40af" : "#166534";

          // Handle attachments - using table layout for email compatibility
          let attachmentHtml = "";
          if (prevComment.attachment_urls) {
            const fileName =
              prevComment.attachment_urls.split("/").pop() || "Attachment";
            attachmentHtml = `
            <div style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 20px; vertical-align: middle;">
                    <div style="width: 16px; height: 16px; background-color: #6c757d; border-radius: 2px;"></div>
                  </td>
                  <td style="padding-left: 8px; vertical-align: middle;">
                    <span style="font-size: 12px; color: #333;">${fileName}</span>
                  </td>
                  <td style="text-align: right; vertical-align: middle;">
                    <a href="${prevComment.attachment_urls}" target="_blank" style="font-size: 12px; color: #007bff; text-decoration: none;">View</a>
                  </td>
                </tr>
              </table>
            </div>
          `;
          }
          // ${
          //                     prevComment.is_internal
          //                       ? `<span style="margin-left: 4px; padding: 2px 8px; font-size: 11px; border-radius: 12px; background-color: #fef3c7; color: #92400e;">Internal</span>`
          //                       : ""
          //                   }
          // Use table layout instead of flexbox for email compatibility
          previousConversationHtml += `
          <div style="margin-bottom: 15px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ${borderColor};">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <div style="width: 32px; height: 32px; background-color: #e9ecef; border-radius: 50%; text-align: center; line-height: 32px;">
                    ${
                      prevComment.ticket_comment_users?.avatar
                        ? `<img src="${prevComment.ticket_comment_users.avatar}" alt="avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
                        : `<span style="font-size: 12px; color: #6c757d;">👤</span>`
                    }
                  </div>
                </td>
                <td style="padding-left: 10px; vertical-align: top;">
                  <div>
                    <span style="font-weight: 600; color: #333; font-size: 14px;">${author}</span>
                    <span style="margin-left: 8px; padding: 2px 8px; font-size: 11px; border-radius: 12px; background-color: ${typeBgColor}; color: ${typeTextColor};">
                      ${commentTypeLabel}
                    </span>
                  
                  </div>
                  <div style="font-size: 12px; color: #6c757d; margin-top: 2px;">${commentDate}</div>
                </td>
              </tr>
            </table>
            <div style="color: #333; line-height: 1.6; font-size: 14px;">
              ${prevComment.comment_text.replace(/\n/g, "<br>")}
            </div>
            ${attachmentHtml}
          </div>
        `;
        });

        previousConversationHtml += `
          <div style="margin-bottom: 15px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ${borderColor1};">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <div style="width: 32px; height: 32px; background-color: #e9ecef; border-radius: 50%; text-align: center; line-height: 32px;">
                    ${`<span style="font-size: 12px; color: #6c757d;">👤</span>`}
                  </div>
                </td>
                <td style="padding-left: 10px; vertical-align: top;">
                  <div>
                    <span style="font-weight: 600; color: #333; font-size: 14px;">${
                      ticket?.source == "Email"
                        ? ticket?.customers?.first_name +
                          "  " +
                          ticket?.customers?.last_name
                        : "Admin"
                    }</span>
                     <span style="margin-left: 8px; padding: 2px 8px; font-size: 11px; border-radius: 12px; background-color: ${typeBgColor1}; color: ${typeTextColor1};">
                      ${ticket?.source == "Email" ? "Email" : "Internal"}
                    </span>
                  </div>
                  <div style="font-size: 12px; color: #6c757d; margin-top: 2px;">${new Date(
                    ticket?.created_at
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}</div>
                </td>
              </tr>
            </table>
            <div style="color: #333; line-height: 1.6; font-size: 14px;">
                    ${ticket.description}
            </div>
          </div>
        `;

        previousConversationHtml += `
        </div>
        <div style="margin: 10px 0; padding: 8px; background-color: #e3f2fd; border-radius: 4px; text-align: center;">
          <small style="color: #1976d2; font-style: italic;">
            ↑ Complete conversation history for your reference
          </small>
        </div>
      `;
      }

      // ✅ Build complete HTML content (removed flexbox, using table layout)
      const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 1000px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 300;">Ticket Update</h1>
        </div>

        <!-- Ticket Info -->
        <div style="background-color: #f8f9fa; padding: 20px; margin: 0; border-left: 5px solid #667eea;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top;">
                <strong style="color: #333; font-size: 16px;">Ticket #${
                  ticket.ticket_number
                }</strong><br>
                <span style="color: #666; font-size: 14px;">Subject: ${
                  ticket.subject
                }</span>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <span style="background-color: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  ${ticket.status.toUpperCase()}
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Latest Comment -->
        <div style="margin: 25px 20px;">
          <h2 style="color: #28a745; margin-bottom: 15px; font-size: 20px;">
            <span style="margin-right: 10px;">💬</span>
            Latest Comment from ${agentName}
          </h2>
          <div style="background-color: #fff; padding: 20px; border-left: 5px solid #28a745; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="font-size: 15px; line-height: 1.6; color: #333;">
              ${comment.comment_text.replace(/\n/g, "<br>")}
            </div>
          </div>
        </div>
        
        ${imageHtml}
        
        <!-- Previous Conversation History -->
        ${previousConversationHtml}
        
        <!-- Footer -->
        <div style="margin: 30px 20px 20px 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #6c757d;">
          <h4 style="color: #333; margin-bottom: 10px;">📧 How to Reply</h4>
          <p style="color: #666; font-size: 13px; margin: 0; line-height: 1.5;">
            To reply to this ticket, simply <strong>reply to this email</strong>. 
            <br>⚠️ <em>Please do not change the subject line to keep the conversation threaded.</em>
          </p>
        </div>

        <!-- Signature -->
        <div style="text-align: center; padding: 15px; color: #999; font-size: 12px; border-top: 1px solid #eee; margin-top: 20px;">
          Best regards,<br>
          <strong>Support Team</strong>
        </div>
      </div>`;

      return htmlContent;
    } catch (error) {
      console.error("❌ Error generating ticket conversation HTML:", error);
      return `<div>Error loading conversation history</div>`;
    }
  }

  // ✅ Test email connection
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("✅ Email service connection verified");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:", error);
      return false;
    }
  }
}

const emailService = new EmailService();
export default emailService;
