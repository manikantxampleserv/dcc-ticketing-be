// Email service for sending comments
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
const prisma = new PrismaClient();

interface EmailConfigurationRecord {
  id: number;
  log_inst: number | null;
  username: string;
  password: string;
  smtp_server: string;
  smtp_port: number;
  enable_tls: boolean | null;
  from_email: string;
  // Add other fields that actually exist in your database
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private static instance: EmailService;
  private logInst: number;

  constructor(logInst: number = 1) {
    this.logInst = logInst;
  }

  // ✅ Singleton pattern with dynamic configuration
  public static getInstance(logInst: number = 1): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService(logInst);
    }
    return EmailService.instance;
  }

  // ✅ Dynamic transporter initialization
  private async initializeTransporter(): Promise<void> {
    try {
      const emailConfiguration = await this.loadEmailConfiguration();

      // Determine if using Gmail service or custom SMTP
      const isGmailService =
        emailConfiguration.smtp_server?.includes("gmail.com") ||
        emailConfiguration.username?.includes("@gmail.com");

      if (isGmailService) {
        // ✅ Gmail-specific configuration - FIXED: createTransport
        this.transporter = nodemailer.createTransport({
          service: "gmail",
          host: emailConfiguration.smtp_server || process.env.MAIL_HOST,
          port: emailConfiguration.smtp_port || 993,
          auth: {
            user: emailConfiguration.username! || process.env.SMTP_USERNAME,
            pass: emailConfiguration.password! || process.env.SMTP_PASSWORD,
          },
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          rateDelta: 20000,
          rateLimit: 10,
          socketTimeout: 60000,
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          tls: {
            rejectUnauthorized: false,
            minVersion: "TLSv1.2",
          },
        });
      } else {
        // ✅ Custom SMTP configuration - FIXED: createTransport
        const port = emailConfiguration.smtp_port || 993;
        const isSecurePort = port === 465; // Port 465 is SSL from start

        this.transporter = nodemailer.createTransport({
          host: emailConfiguration.smtp_server || process.env.MAIL_HOST,
          port: port,
          secure: isSecurePort, // true for 465 (SSL), false for other ports
          auth: {
            user: emailConfiguration.username || process.env.SMTP_USERNAME,
            pass: emailConfiguration.password || process.env.SMTP_PASSWORD,
          },
          tls: {
            rejectUnauthorized: false,
            minVersion: "TLSv1.2",
          },
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          socketTimeout: 60000,
          connectionTimeout: 60000,
          greetingTimeout: 30000,
        });
      }

      // ✅ Test the connection with null check
      if (this.transporter) {
        await this.transporter.verify();
        console.log(
          `✅ Email transporter initialized successfully for logInst: ${this.logInst}`,
        );
      }
    } catch (error) {
      console.error(
        `❌ Failed to initialize email transporter for logInst ${this.logInst}:`,
        error,
      );
      this.transporter = null;
      throw error;
    }
  }

  // ✅ Load email configuration from database
  private async loadEmailConfiguration(): Promise<EmailConfigurationRecord> {
    try {
      const emailConfiguration = await prisma.email_configurations.findFirst({
        where: {
          log_inst: 1,
        },
      });

      if (!emailConfiguration) {
        throw new Error(
          `No active email configuration found for logInst: ${this.logInst}`,
        );
      }

      console.log(`📧 Loaded email config for logInst: ${this.logInst}`);

      // ✅ Return the configuration as-is from database
      return emailConfiguration as EmailConfigurationRecord;
    } catch (error) {
      console.error(
        `❌ Error loading email configuration for logInst ${this.logInst}:`,
        error,
      );
      throw error;
    }
  }

  // ✅ Ensure transporter is ready before sending with proper null checks
  private async ensureTransporter(): Promise<void> {
    if (!this.transporter) {
      await this.initializeTransporter();
    }

    if (!this.transporter) {
      throw new Error("Failed to initialize email transporter");
    }
  }

  async sendCommentEmailToCustomer(
    ticket: any,
    comment: any,
    additionalEmails: any[],
  ): Promise<any> {
    try {
      // ✅ Ensure transporter is initialized
      await this.ensureTransporter();
      const isSeparatedEmail = typeof comment === "string";
      // ✅ Transporter is guaranteed to be non-null here due to ensureTransporter
      if (!this.transporter) {
        throw new Error("Email transporter not available");
      }

      const subject =
        additionalEmails?.length && isSeparatedEmail
          ? `${comment}`
          : `Re: ${ticket.subject}`;

      const customerEmail = ticket?.customers?.email
        ? [ticket?.customers?.email]
        : [];
      // const customerEmail = ticket.customers?.email
      //   ? [ticket.customer_email, ticket.customers.email]
      //   : [ticket.customer_email];
      const assignedEmail = ticket.agents_user?.email;
      const agentName = comment?.users
        ? `${comment.users.first_name} ${comment.users.last_name}`
        : "Support Team";
      let Emails =
        comment?.mailInternal == "false" || isSeparatedEmail
          ? assignedEmail
          : [...customerEmail, assignedEmail];
      if (additionalEmails.length > 0) {
        Emails = [...Emails, ...additionalEmails];
      }
      console.log("Emails to send comment to:", Emails);
      //Generate unique message ID for THIS outgoing email
      const newMessageId = `<ticket-${ticket.id}-comment-${
        comment.id
      }-${Date.now()}@gmail.com>`;

      // ✅ Get the ORIGINAL thread ID (from when ticket was created)
      const originalThreadId = isSeparatedEmail
        ? newMessageId
        : ticket.email_thread_id || ticket.original_email_message_id;

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
      // if (comment?.image_url || comment?.imageUrl) {
      //   const imageUrl = comment.image_url || comment.imageUrl;

      //   try {
      //     // Download image from Backblaze URL
      //     const response = await fetch(imageUrl);
      //     if (response.ok) {
      //       const buffer = Buffer.from(await response.arrayBuffer());

      //       // Get filename from URL or use default
      //       const urlParts = imageUrl.split("/");
      //       const fileName =
      //         urlParts[urlParts.length - 1] || `ticket_${ticket.id}_image.jpg`;

      //       emailAttachment = {
      //         filename: fileName,
      //         content: buffer,
      //         contentType: getImageMimeType(fileName),
      //         cid: "attached-image", // Content ID for inline images
      //       };

      //       console.log(`✅ Image prepared for email attachment: ${fileName}`);
      //     } else {
      //       console.error(
      //         `❌ Failed to download image: ${response.statusText}`
      //       );
      //     }
      //   } catch (imageError) {
      //     console.error(`❌ Error processing image attachment:`, imageError);
      //   }
      // }

      // ✅ Build image section HTML if image exists

      // const imageUrl = comment?.image_url || comment?.imageUrl;
      const imageUrls: string[] = Array.isArray(comment?.imageUrls)
        ? comment.imageUrls
        : [];

      const emailAttachments: any[] = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];

        try {
          const response = await fetch(imageUrl);
          if (!response.ok) continue;

          const buffer = Buffer.from(await response.arrayBuffer());

          const fileName =
            imageUrl.split("/").pop() || `ticket_${ticket.id}_${i + 1}.jpg`;

          emailAttachments.push({
            filename: fileName,
            content: buffer,
            contentType: getImageMimeType(fileName),
            disposition: "attachment", // ✅ FORCE ATTACHMENT
          });
        } catch (err) {
          console.error("❌ Image download failed:", imageUrl, err);
        }
      }

      let imageHtml = "";
      if (imageUrls.length > 0) {
        imageHtml = `
    <div style="margin:20px 0;">
      <h3 style="font-size:16px;margin-bottom:10px;">📎 Attachments :</h3>

      <table cellpadding="0" cellspacing="0" width="100%">
        ${imageUrls
          .map(
            (url) => `
            <tr>
              <td style="padding:6px 0;">
                <div style="
                  display:flex;
                  align-items:center;
                  gap:10px;
                  background:#f6f8fa;
                  border:1px solid #e1e4e8;
                  border-radius:6px;
                  padding:8px 12px;
                  max-width:420px;
                ">
                  <span style="font-size:18px;">📎</span>

                  <a href="${url}"
                     target="_blank"
                     style="
                       font-size:14px;
                       color:#0366d6;
                       text-decoration:none;
                       white-space:nowrap;
                       overflow:hidden;
                       text-overflow:ellipsis;
                       max-width:320px;
                       display:inline-block;
                     ">
                    ${url.split("/").pop()}
                  </a>
                </div>
              </td>
            </tr>
          `,
          )
          .join("")}
      </table>
    </div>
  `;
      }

      const htmlContent = await this.ticketCommentConversation(
        ticket,
        agentName,
        comment,
        imageHtml,
      );
      // ✅ FIXED: Create mail options object with all properties
      const mailOptions: any = {
        from: `"Support Team" <${process.env.SMTP_USERNAME}>`,
        to: Emails,
        // to: customerEmail,
        cc: [
          "shreyansh.tripathi@ampleserv.com",
          "anil.kumar@ampleserv.com",
          ...(ticket?.cc_of_ticket?.length
            ? ticket.cc_of_ticket.map((cc: any) => cc.email)
            : []),
        ],
        // cc:
        //  ( ticket?.cc_of_ticket && ticket?.cc_of_ticket?.length > 0
        //     ? ticket?.cc_of_ticket.map((cc: any) => cc.email).join(",")
        //     : undefined ),
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
      if (emailAttachments.length > 0) {
        mailOptions.attachments = emailAttachments;
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
        `✅ Email sent to customer ${customerEmail} for ticket #${ticket.ticket_number}`,
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

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  private getBorderColors(isCustomer: boolean, sourceIsEmail: boolean) {
    const border = isCustomer ? "#56be5bff" : "#5299d7ff";
    const bg = isCustomer ? "#f4fbf5ff" : "#f8fcffff";
    const threadBorder = sourceIsEmail ? "#28a745" : "#3697feff";
    return { border, bg, threadBorder };
  }

  public async ticketCommentConversation(
    ticket: any,
    agentName: string,
    comment: any,
    imageHtml: string,
  ): Promise<string> {
    try {
      const isSeparatedEmail = typeof comment === "string";

      const previousComments = isSeparatedEmail
        ? null
        : await prisma.ticket_comments.findMany({
            where: {
              ticket_id: ticket.id,
              is_internal: false,
              id: { not: comment?.id }, // Exclude current comment
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
              created_at: "desc",
            },
          });

      const sourceIsEmail = ticket.source === "Email";
      const threadBorderColor = sourceIsEmail ? "#28a745" : "#007bff";

      // let html = `<div style="padding:0 20px;">${imageHtml || ""}`;
      let html = "";
      html += `
         <div style="background-color: #f8f9fa;  padding: 5px; margin: 0; border-left: 5px solid #667eea;">
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
               <td style="text-align: right; vertical-align: center;">
                 ${
                   comment?.mailInternal == "false" || isSeparatedEmail
                     ? `<span style="background-color: #28a745; color: white;    white-space: nowrap; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight:bold;">
                   ${ticket.status.toUpperCase()}
                 </span>`
                     : ""
                 }
               </td>
             </tr>
           </table>
         </div

         <!-- Latest Comment -->
         <div style="margin: 5px;">
           <h2 style="color: #28a745; margin-bottom: 10px;  font-size: 15px;">
             <span style="color: #28a745 !important;margin-right: 10px;">💬</span>
             Latest Comment from ${agentName}
           </h2>
           
           <div style="background-color: #c1e9fd8d; padding: 10px; border-left: 5px solid #28a745; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
             <div style="font-size: 15px; line-height: 1.6; color: #333;">
               ${
                 isSeparatedEmail
                   ? comment
                   : comment?.comment_text.replace(/\n/g, "<br>")
               }
               </div>
               </div>
               ${imageHtml || ""}
           <div style="padding:20p 0x;">
         ${
           ticket.description
             ? `<div style="background-color: #f0f6f88d; padding: 10px 0;margin-top:5px;border-radius: 8px;">
             <div style="font-size: 15px;padding:0 4px; line-height: 1.6; color: #333;">
               ${ticket.description}
             </div>
           </div>`
             : ""
         }
         </div>`;

      if (previousComments && previousComments?.length > 0) {
        html += `
          <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif; margin-top:20px;">
            <tr>
              <td style="padding:0 20px 0 0;">
                <h3 style="font-size:16px; color:#333333; margin:0;">
                  📋 Conversation History (${previousComments.length})
                </h3>
              </td>
            </tr>`;

        previousComments?.forEach((pc: any) => {
          const isCustomer = !!pc.ticket_comment_customers;
          const author = pc.ticket_comment_customers
            ? `${pc.ticket_comment_customers.first_name} ${pc.ticket_comment_customers.last_name}`
            : pc.ticket_comment_users
              ? `${pc.ticket_comment_users.first_name} ${pc.ticket_comment_users.last_name}`
              : "Support Team";
          // const date = this.formatDate(pc?.created_at);
          const date = new Date(pc.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          const { border, bg } = this.getBorderColors(
            isCustomer,
            sourceIsEmail,
          );

          html += `
            <tr>
              <td style="padding:10px 0px;">
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:${bg}; border-radius:4px; padding:10px;">
                  <tr>

                    <td style="padding-left:10px;">
                    <div style="display:flex;align-items:start;">
                     ${
                       pc.ticket_comment_users?.avatar
                         ? `<img src="${pc.ticket_comment_users.avatar}" alt="avatar" style="width:32px; height:32px; border-radius:50%;">`
                         : `<div style="width:32px; height:32px; border-radius:50%; background:#cfd8dc; text-align:center; line-height:32px; color:#607d8b;">👤</div>`
                     }
                      <div style="font-size:14px; font-weight:600; margin-left:7px; color:#333333;">
                        ${author}
                        <div style="font-size:12px; color:#555555; margin-left:8px;">
                          ${date}
                        </div>
                      </div>
                      </div>
                      <div style="margin-top:8px; font-size:14px; color:#333333; line-height:1.5;">
                     <div style="margin-top:8px; font-size:14px; color:#333333; line-height:1.5;">
  ${
    pc.comment_text ?? ""

    // pc.comment_text?.replace(
    //   /(data:image[^"]+)/g,
    //   (match: any) =>
    //     `<img src="${match}" style="max-width:300px; display:block; margin-top:10px;">`
    // ) ?? ""
  }
</div>
                      </div>
                      
                     ${
                       pc.attachment_urls
                         ? (() => {
                             const urls = JSON.parse(
                               pc.attachment_urls || "[]",
                             );
                             return urls
                               .map(
                                 (url: string) => `
              <div style="margin-top:4px;">
                📎 <a href="${url}" target="_blank" style="font-size:12px; color:#1e88e5;">
                  ${url.split("/").pop()}
                </a>
              </div>`,
                               )
                               .join("");
                           })()
                         : ""
                     }

                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
        });

        // Add original ticket description block
        const ticketDate = this.formatDate(ticket.created_at);
        // html += `
        //     <tr>
        //       <td style="padding:10px 20px;">
        //         <table width="100%" cellpadding="0" cellspacing="0"
        //           style="border-left:4px solid ${threadBorderColor}; background:#e8f5e9; border-radius:4px; padding:10px;">
        //           <tr>
        //             <td>
        //               <div style="font-size:14px; font-weight:600; color:#333333;">
        //                 ${ticket?.customers?.first_name} ${ticket.customers?.last_name}
        //                 <span style="font-size:12px; color:#555555; margin-left:8px;">
        //                   ${ticketDate}
        //                 </span>
        //               </div>
        //               <div style="margin-top:8px; font-size:14px; color:#333333; line-height:1.5;">
        //                 ${ticket.description}
        //               </div>
        //             </td>
        //           </tr>
        //         </table>
        //       </td>
        //     </tr>`;
        html += `</table>`;
      }

      html += `</div>`;
      return html;
    } catch (error) {
      console.error("Error generating ticket conversation HTML:", error);
      return `<div style="color:#d32f2f; padding:20px;">Unable to load conversation history.</div>`;
    }
  }

  async sendTicketCreationEmailToCustomer(
    ticket: any,
    customerEmail: string | undefined,
  ): Promise<{ messageId: string; threadId: string } | null> {
    try {
      // ✅ Ensure transporter is initialized
      await this.ensureTransporter();

      // ✅ Transporter is guaranteed to be non-null here due to ensureTransporter
      if (!this.transporter) {
        throw new Error("Email transporter not available");
      }
      const subject = `Ticket Created: ${ticket.subject} [#${ticket.ticket_number}]`;

      // Generate unique message ID for this outgoing email
      const newMessageId = `<ticket-${
        ticket.id
      }-created-${Date.now()}@gmail.com>`;

      // For new tickets, this will be the thread starter
      const threadId = ticket.email_thread_id || newMessageId;

      const htmlContent = await this.ticketCreationEmailTemplate(ticket);

      const mailOptions: any = {
        from: `"Support Team" <${process.env.SMTP_USERNAME}>`,
        to: [ticket?.agents_user?.email, customerEmail],
        subject,
        html: htmlContent,
        messageId: newMessageId,
        headers: {
          "Thread-Topic": ticket.subject,
          "Thread-Index": this.generateThreadIndex(ticket.id),
          "X-Ticket-ID": ticket.ticket_number,
          "X-Original-Message-ID": newMessageId,
        },
      };

      // If ticket has CC users, include them
      if (ticket?.cc_of_ticket && ticket.cc_of_ticket.length > 0) {
        mailOptions.cc = ticket.cc_of_ticket
          .map((cc: any) => cc.email)
          .join(",");
      }

      await this.transporter.sendMail(mailOptions);

      console.log(
        `✅ Ticket creation email sent to ${customerEmail} for ticket #${ticket.ticket_number}`,
      );

      return {
        messageId: newMessageId,
        threadId: threadId,
      };
    } catch (error) {
      console.error("❌ Error sending ticket creation email:", error);
      return null;
    }
  }

  // Email template for ticket creation
  private async ticketCreationEmailTemplate(ticket: any): Promise<string> {
    const ticketDate = new Date(ticket.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Status color mapping
    const statusColors: Record<string, string> = {
      open: "#0066CC",
      pending: "#FF8C00",
      resolved: "#28A745",
      closed: "#6C757D",
    };

    const statusColor = statusColors[ticket.status.toLowerCase()] || "#0066CC";

    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Support Ticket Created - #${ticket.ticket_number}</title>
  
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->

  <style>
    /* Reset styles for email clients */
    * { box-sizing: border-box; }
    body, table, td, p, a, li, blockquote { 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
    }
    table, td { 
      mso-table-lspace: 0pt; 
      mso-table-rspace: 0pt; 
    }
    img { 
      -ms-interpolation-mode: bicubic; 
      border: 0; 
      display: block; 
    }
    .main-container{
    }

    /* Responsive media queries */
    @media screen and (max-width: 600px) {
      /* Container adjustments */
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: auto !important;
      }
      .main-container{
        padding: auto !important;
      }
      /* Padding adjustments for mobile */
      .mobile-padding {
        padding: 20px !important;
      }
      
      .mobile-padding-small {
        padding: 15px !important;
      }

      
      /* Text adjustments */
      .mobile-text-center {
        text-align: center !important;
      }
      
      .mobile-font-large {
        font-size: 24px !important;
        line-height: 30px !important;
      }
      
      .mobile-font-medium {
        font-size: 18px !important;
        line-height: 24px !important;
      }
      
      .mobile-font-small {
        font-size: 14px !important;
        line-height: 20px !important;
      }
      
      .mobile-font-tiny {
        font-size: 12px !important;
        line-height: 16px !important;
      }
      
      /* Table adjustments */
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
      }
      
      .mobile-stack td {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        padding-bottom: 10px !important;
      }
      
      /* Hide desktop-only elements */
      .mobile-hide {
        display: none !important;
      }
      
      /* Full width on mobile */
      .mobile-full-width {
        width: 100% !important;
        max-width: 100% !important;
      }
      
      /* Spacing adjustments */
      .mobile-spacing {
        margin-bottom: 15px !important;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .dark-bg { background-color: #1a1a1a !important; }
      .dark-text { color: #ffffff !important; }
      .dark-border { border-color: #333333 !important; }
    }
  </style>
</head>

<body style="margin: 0; padding: 0; background-color: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Outer table for full width background -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F5F5;">
    <tr>
      <td align="center" class="main-container" style="padding: 40px 20px;">
        
        <!-- Main email container -->
        <div class="email-container" style=" width: 100%; margin: auto; border: 1px solid #b3b1b1b2; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          
          <!-- Header Section -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="background-color: #052e5699; padding: 40px 30px; text-align: center;" class="mobile-padding">
                <h1 class="mobile-font-large" style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                  Support Ticket Confirmation
                </h1>
                <p class="mobile-font-small" style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
                  Your request has been successfully submitted
                </p>
              </td>
            </tr>
          </table>

          <!-- Ticket Summary Card -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 30px; border-bottom: 1px solid #E5E5E5;" class="mobile-padding">
                <div style="background-color: #F8F9FA; border-radius: 6px; padding: 20px; border-left: 4px solid ${statusColor};" class="mobile-padding-small">
                  
                  <!-- Ticket ID and Status Row - Responsive Table -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="mobile-stack">
                    <tr>
                      <td style="padding-bottom: 12px; vertical-align: top;" class="mobile-spacing">
                        <span class="mobile-font-tiny" style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block;">Ticket ID</span>
                        <div class="mobile-font-medium" style="color: #1A1A1A; font-size: 20px; font-weight: 700; margin-top: 4px;">#${
                          ticket.ticket_number
                        }</div>
                      </td>
                      <td style="text-align: right; padding-bottom: 12px; vertical-align: top;" class="mobile-text-center">
                        <span style="display: inline-block; background-color: ${statusColor}; color: #FFFFFF; padding: 6px 14px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                          ${ticket.status}
                        </span>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Subject and Date Section -->
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E5E5E5;">
                    <div class="mobile-font-small" style="color: #1A1A1A; font-size: 16px; font-weight: 600; margin-bottom: 8px; word-wrap: break-word; line-height: 1.4;">
                      ${ticket.subject}
                    </div>
                    <div class="mobile-font-tiny" style="color: #666666; font-size: 13px;">
                      Created on ${ticketDate}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Ticket Description Section -->
         ${
           ticket.description &&
           ` <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 30px;" class="mobile-padding">
                <h2 class="mobile-font-small" style="color: #1A1A1A; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  Request Details
                </h2>
                <div style="background-color: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 6px; padding: 20px;" class="mobile-padding-small">
                  <div class="mobile-font-small" style="color: #333333; font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word;">
                    ${ticket.description.replace(/\n/g, "<br>")}
                  </div>
                </div>
              </td>
            </tr>
          </table>`
         }

          <!-- Response Instructions Section -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 0 30px 30px 30px;" class="mobile-padding">
                <div style="background-color: #FFF9E6; border-radius: 6px; padding: 20px; border-left: 4px solid #FF8C00;" class="mobile-padding-small">
                  <h3 class="mobile-font-small" style="color: #CC6F00; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">
                    Need to Add More Information?
                  </h3>
                  <p class="mobile-font-small" style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0; word-wrap: break-word;">
                    Simply reply to this email with additional details. Please keep the ticket number <strong>#${
                      ticket.ticket_number
                    }</strong> in the subject line to ensure your message is properly tracked.
                  </p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Footer Section -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="background-color: #F8F9FA; padding: 30px; text-align: center; border-top: 1px solid #E5E5E5;" class="mobile-padding">
                <p class="mobile-font-small" style="color: #666666; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
                  If you have any questions, please don't hesitate to contact us.
                </p>
                <p class="mobile-font-tiny" style="color: #999999; font-size: 12px; margin: 0; line-height: 1.4;">
                  © ${new Date().getFullYear()} DoubleClick Support Team. All rights reserved.
                </p>
              </td>
            </tr>
          </table>

        </div>
        
        <!-- Mobile disclaimer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; margin-top: 20px;" class="mobile-full-width">
          <tr>
            <td align="center" style="padding: 0 20px;">
              <p class="mobile-font-tiny" style="color: #999999; font-size: 11px; line-height: 1.4; margin: 0; text-align: center;">
                If you're having trouble viewing this email, please ensure images are enabled.<br class="mobile-hide">
                Add our email to your contacts for better delivery.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  // private async ticketCommentConversation(
  //   ticket: any,
  //   agentName: string,
  //   comment: any,
  //   imageHtml: string
  // ): Promise<string> {
  //   try {
  //     const previousComments = await prisma.ticket_comments.findMany({
  //       where: {
  //         ticket_id: ticket.id,
  //         id: { not: comment.id }, // Exclude current comment
  //       },
  //       include: {
  //         ticket_comment_users: {
  //           select: {
  //             first_name: true,
  //             last_name: true,
  //             avatar: true,
  //           },
  //         },
  //         ticket_comment_customers: {
  //           select: {
  //             first_name: true,
  //             last_name: true,
  //           },
  //         },
  //       },
  //       orderBy: {
  //         created_at: "asc",
  //       },
  //     });
  //     console.log("Fetched previous comments for conversation history", ticket);
  //     const borderColor1 = ticket?.source == "Email" ? "#28a745" : "#007bff";
  //     const typeBgColor1 = ticket?.source == "Email" ? "#dbeafe" : "#dcfce7";
  //     const typeTextColor1 = ticket?.source == "Email" ? "#1e40af" : "#166534";

  //     // ✅ BUILD PREVIOUS CONVERSATION HTML
  //     let previousConversationHtml = "";
  //     if (previousComments.length > 0) {
  //       previousConversationHtml = `
  //       <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #6c757d; border-radius: 5px;">
  //         <h3 style="color: #333; font-size: 16px; margin-bottom: 20px;">📋 Previous Conversation (${previousComments.length} messages)</h3>
  //       `;

  //       previousComments.forEach((prevComment: any) => {
  //         const author = prevComment.ticket_comment_customers
  //           ? `${prevComment.ticket_comment_customers.first_name} ${prevComment.ticket_comment_customers.last_name}`
  //           : prevComment.ticket_comment_users
  //           ? `${prevComment.ticket_comment_users.first_name} ${prevComment.ticket_comment_users.last_name}`
  //           : "Support Team";

  //         const commentDate = new Date(
  //           prevComment.created_at
  //         ).toLocaleDateString("en-US", {
  //           year: "numeric",
  //           month: "short",
  //           day: "numeric",
  //           hour: "2-digit",
  //           minute: "2-digit",
  //           hour12: true,
  //         });

  //         // Determine comment type and styling
  //         const isCustomer = !!prevComment.ticket_comment_customers;
  //         const commentTypeLabel = prevComment.is_internal
  //           ? "Internal"
  //           : "Email";
  //         // const commentTypeLabel =
  //         //   prevComment.comment_type || (isCustomer ? "customer" : "agent");
  //         const borderColor = isCustomer ? "#28a745" : "#007bff";
  //         const typeBgColor =
  //           prevComment.comment_type === "agent" ? "#dbeafe" : "#dcfce7";
  //         const typeTextColor =
  //           prevComment.comment_type === "agent" ? "#1e40af" : "#166534";

  //         // Handle attachments - using table layout for email compatibility
  //         let attachmentHtml = "";
  //         if (prevComment.attachment_urls) {
  //           const fileName =
  //             prevComment.attachment_urls.split("/").pop() || "Attachment";
  //           attachmentHtml = `
  //           <div style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
  //             <table style="width: 100%; border-collapse: collapse;">
  //               <tr>
  //                 <td style="width: 20px; vertical-align: middle;">
  //                   <div style="width: 16px; height: 16px; background-color: #6c757d; border-radius: 2px;"></div>
  //                 </td>
  //                 <td style="padding-left: 8px; vertical-align: middle;">
  //                   <span style="font-size: 12px; color: #333;">${fileName}</span>
  //                 </td>
  //                 <td style="text-align: right; vertical-align: middle;">
  //                   <a href="${prevComment.attachment_urls}" target="_blank" style="font-size: 12px; color: #007bff; text-decoration: none;">View</a>
  //                 </td>
  //               </tr>
  //             </table>
  //           </div>
  //         `;
  //         }
  //         // ${
  //         //                     prevComment.is_internal
  //         //                       ? `<span style="margin-left: 4px; padding: 2px 8px; font-size: 11px; border-radius: 12px; background-color: #fef3c7; color: #92400e;">Internal</span>`
  //         //                       : ""
  //         //                   }
  //         // Use table layout instead of flexbox for email compatibility
  //         previousConversationHtml += `
  //         <div style="margin-bottom: 15px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ${borderColor};">
  //           <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
  //             <tr>
  //               <td style="width: 40px; vertical-align: top;">
  //                 <div style="width: 32px; height: 32px; background-color: #e9ecef; border-radius: 50%; text-align: center; line-height: 32px;">
  //                   ${
  //                     prevComment.ticket_comment_users?.avatar
  //                       ? `<img src="${prevComment.ticket_comment_users.avatar}" alt="avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
  //                       : `<span style="font-size: 12px; color: #6c757d;">👤</span>`
  //                   }
  //                 </div>
  //               </td>
  //               <td style="padding-left: 10px; vertical-align: top;">
  //                 <div>
  //                   <span style="font-weight: 600; color: #333; font-size: 14px;">${author}</span>
  //                   <span style="margin-left: 8px; padding: 2px 8px; font-size: 11px; border-radius: 12px; background-color: ${typeBgColor}; color: ${typeTextColor};">
  //                     ${commentTypeLabel}
  //                   </span>

  //                 </div>
  //                 <div style="font-size: 12px; color: #6c757d; margin-top: 2px;">${commentDate}</div>
  //               </td>
  //             </tr>
  //           </table>
  //           <div style="color: #333; line-height: 1.6; font-size: 14px;">
  //             ${prevComment.comment_text.replace(/\n/g, "<br>")}
  //           </div>
  //           ${attachmentHtml}
  //         </div>
  //       `;
  //       });

  //       previousConversationHtml += `
  //         <div style="margin-bottom: 15px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ${borderColor1};">
  //           <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
  //             <tr>
  //               <td style="width: 40px; vertical-align: top;">
  //                 <div style="width: 32px; height: 32px; background-color: #e9ecef; border-radius: 50%; text-align: center; line-height: 32px;">
  //                   ${`<span style="font-size: 12px; color: #6c757d;">👤</span>`}
  //                 </div>
  //               </td>
  //               <td style="padding-left: 10px; vertical-align: top;">
  //                 <div>
  //                   <span style="font-weight: 600; color: #333; font-size: 14px;">${
  //                     ticket?.source == "Email"
  //                       ? ticket?.customers?.first_name +
  //                         "  " +
  //                         ticket?.customers?.last_name
  //                       : "Admin"
  //                   }</span>
  //                    <span style="margin-left: 8px; padding: 2px 8px; font-size: 11px; border-radius: 12px; background-color: ${typeBgColor1}; color: ${typeTextColor1};">
  //                     ${ticket?.source == "Email" ? "Email" : "Internal"}
  //                   </span>
  //                 </div>
  //                 <div style="font-size: 12px; color: #6c757d; margin-top: 2px;">${new Date(
  //                   ticket?.created_at
  //                 ).toLocaleDateString("en-US", {
  //                   year: "numeric",
  //                   month: "short",
  //                   day: "numeric",
  //                   hour: "2-digit",
  //                   minute: "2-digit",
  //                   hour12: true,
  //                 })}</div>
  //               </td>
  //             </tr>
  //           </table>
  //           <div style="color: #333; line-height: 1.6; font-size: 14px;">
  //                   ${ticket.description}
  //           </div>
  //         </div>
  //       `;

  //       previousConversationHtml += `
  //       </div>
  //       <div style="margin: 10px 0; padding: 8px; background-color: #e3f2fd; border-radius: 4px; text-align: center;">
  //         <small style="color: #1976d2; font-style: italic;">
  //           ↑ Complete conversation history for your reference
  //         </small>
  //       </div>
  //     `;
  //     }

  //     // ✅ Build complete HTML content (removed flexbox, using table layout)
  //     const htmlContent = `
  //     <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 1000px; margin: 0 auto; background-color: #ffffff;">

  //       <!-- Header -->
  //       <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
  //         <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 300;">Ticket Update</h1>
  //       </div>

  //       <!-- Ticket Info -->
  //       <div style="background-color: #f8f9fa; padding: 20px; margin: 0; border-left: 5px solid #667eea;">
  //         <table style="width: 100%; border-collapse: collapse;">
  //           <tr>
  //             <td style="vertical-align: top;">
  //               <strong style="color: #333; font-size: 16px;">Ticket #${
  //                 ticket.ticket_number
  //               }</strong><br>
  //               <span style="color: #666; font-size: 14px;">Subject: ${
  //                 ticket.subject
  //               }</span>
  //             </td>
  //             <td style="text-align: right; vertical-align: top;">
  //               <span style="background-color: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
  //                 ${ticket.status.toUpperCase()}
  //               </span>
  //             </td>
  //           </tr>
  //         </table>
  //       </div>

  //       <!-- Latest Comment -->
  //       <div style="margin: 25px 20px;">
  //         <h2 style="color: #28a745; margin-bottom: 15px; font-size: 20px;">
  //           <span style="margin-right: 10px;">💬</span>
  //           Latest Comment from ${agentName}
  //         </h2>
  //         <div style="background-color: #fff; padding: 20px; border-left: 5px solid #28a745; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
  //           <div style="font-size: 15px; line-height: 1.6; color: #333;">
  //             ${comment.comment_text.replace(/\n/g, "<br>")}
  //           </div>
  //         </div>
  //       </div>

  //       ${imageHtml}

  //       <!-- Previous Conversation History -->
  //       ${previousConversationHtml}

  //       <!-- Footer -->
  //       <div style="margin: 30px 20px 20px 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #6c757d;">
  //         <h4 style="color: #333; margin-bottom: 10px;">📧 How to Reply</h4>
  //         <p style="color: #666; font-size: 13px; margin: 0; line-height: 1.5;">
  //           To reply to this ticket, simply <strong>reply to this email</strong>.
  //           <br>⚠️ <em>Please do not change the subject line to keep the conversation threaded.</em>
  //         </p>
  //       </div>

  //       <!-- Signature -->
  //       <div style="text-align: center; padding: 15px; color: #999; font-size: 12px; border-top: 1px solid #eee; margin-top: 20px;">
  //         Best regards,<br>
  //         <strong>Support Team</strong>
  //       </div>
  //     </div>`;

  //     return htmlContent;
  //   } catch (error) {
  //     console.error("❌ Error generating ticket conversation HTML:", error);
  //     return `<div>Error loading conversation history</div>`;
  //   }
  // }

  // ✅ Test email connection
  async testConnection(): Promise<boolean> {
    try {
      // ✅ Ensure transporter is initialized
      await this.ensureTransporter();

      // ✅ Transporter is guaranteed to be non-null here due to ensureTransporter
      if (!this.transporter) {
        throw new Error("Email transporter not available");
      }
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
