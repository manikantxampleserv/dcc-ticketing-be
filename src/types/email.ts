import fs from "fs";
import path from "path";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

// TypeScript Interfaces
interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  connTimeout: number;
  tls: boolean;
  authTimeout: number;
  tlsOptions: {
    rejectUnauthorized: boolean;
    debug: (msg: string) => void;
  };
}

interface ParsedEmail {
  from: {
    value: Array<{
      address: string;
      name?: string;
    }>;
  };
  subject?: string;
  text?: string;
  html?: string;
  messageId?: string;
  references?: string[];
  inReplyTo?: string;
  body?: any;
}

const prisma = new PrismaClient();
// || 587
// Email configuration
const emailConfig: EmailConfig = {
  user: process.env.SMTP_USERNAME!,
  password: process.env.SMTP_PASSWORD!,
  host: process.env.MAIL_HOST!,
  port: 993,
  connTimeout: 60000, // 60 seconds connection timeout
  authTimeout: 30000,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false,
    debug: console.log, // <-- Add this line to allow self-signed certificates
  },
};

class SimpleEmailTicketSystem {
  private imap: Imap;
  private lastUid = 0;
  private lastUidFilePath: string = path.join(__dirname, "lastUid.txt");

  constructor() {
    this.imap = new Imap(emailConfig);
  }
  async start(): Promise<void> {
    await this.loadLastUid();

    return new Promise((resolve, reject) => {
      this.imap.once("ready", () => {
        console.log("✅ Connected to IMAP");
        this.openInbox()
          .then(() => {
            this.listenForNewEmails();
            resolve();
          })
          .catch(reject);
      });
      this.imap.once("error", reject);
      this.imap.connect();
    });
  }

  private async loadLastUid(): Promise<void> {
    try {
      if (fs.existsSync(this.lastUidFilePath)) {
        const content = await fs.promises.readFile(
          this.lastUidFilePath,
          "utf-8"
        );
        this.lastUid = parseInt(content, 10) || 0;
        console.log(`📥 Loaded lastUid: ${this.lastUid}`);
      } else {
        this.lastUid = 0;
        console.log("📥 lastUid file does not exist, starting from 0");
      }
    } catch (err) {
      console.error("❌ Error loading lastUid file:", err);
      this.lastUid = 0;
    }
  }

  private async saveLastUid(newUid: number): Promise<void> {
    try {
      await fs.promises.writeFile(
        this.lastUidFilePath,
        newUid.toString(),
        "utf-8"
      );
      this.lastUid = newUid;
      console.log(`💾 Saved lastUid: ${this.lastUid}`);
    } catch (err) {
      console.error("❌ Error saving lastUid file:", err);
    }
  }

  private openInbox(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.openBox("INBOX", false, (err, box) => {
        if (err) {
          console.error("❌ Failed to open inbox:", err);
          return reject(err);
        }
        console.log(
          `📬 Inbox opened: total=${box.messages.total} unseen=${box.messages.unseen} uidnext=${box.uidnext}`
        );

        // If first run and lastUid = 0, initialize to uidnext - 1 to skip old emails
        if (this.lastUid === 0) {
          this.lastUid = box.uidnext - 1;
          this.saveLastUid(this.lastUid);
          console.log(`Initial lastUid set to ${this.lastUid}`);
        }

        resolve();
      });
    });
  }

  private listenForNewEmails(): void {
    this.imap.on("mail", (numNewMsgs: any) => {
      console.log(`📧 Mail event: ${numNewMsgs} new email(s)`);
      this.fetchNewEmails();
    });
  }

  private fetchNewEmails(): void {
    this.imap.openBox("INBOX", (err, box) => {
      if (err) {
        console.error("❌ Error fetching mailbox status:", err);
        return;
      }
      console.log(
        `Mailbox status: total=${box.messages.total} unseen=${box.messages.unseen} uidnext=${box.uidnext}`
      );
      const newUidNext = box.uidnext - 1;
      if (newUidNext > this.lastUid) {
        const uidRange = `${this.lastUid + 1}:${newUidNext}`;
        console.log(`⬇️ Fetching emails with UID range: ${uidRange}`);

        const fetcher = this.imap.fetch(uidRange, {
          bodies: "",
          markSeen: true,
        });
        fetcher.on("message", (msg, seqno) =>
          this.processEmailMessage(msg, seqno)
        );
        fetcher.once("error", (err) => console.error("❌ Fetch error:", err));
        fetcher.once("end", async () => {
          console.log("✅ Finished fetching emails");
          await this.saveLastUid(newUidNext);
        });
        console.log(`✅ Fetch complete up to UID: ${newUidNext}`);
      } else {
        console.log("📭 No new emails to fetch");
      }
    });
  }

  //  ENTRY POINT: Start the email monitoring system
  // async start(): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     this.imap.once("ready", () => {
  //       console.log("✅ Connected to email server");
  //       this.openInbox(); // ← CONNECTS TO: openInbox()
  //       this.listenForNewEmails(); // ← CONNECTS TO: listenForNewEmails()
  //       resolve();
  //     });

  //     this.imap.once("error", reject);
  //     this.imap.connect(); // ← INITIATES CONNECTION
  //   });
  // }
  // // //  STEP 1: Open the inbox folder
  // private openInbox(): void {
  //   this.imap.openBox("INBOX", false, (err: any, box: any) => {
  //     if (err) {
  //       console.error("❌ Failed to open inbox:", err);
  //     } else {
  //       console.log(
  //         `📬 Inbox opened: ${box.messages.total} total messages, ${box.messages.unseen} unseen`
  //       );
  //       this.fetchNewEmails(); // ← CONNECTS TO: fetchNewEmails() (initial fetch)
  //     }
  //   });
  // }

  // //  STEP 2: Listen for new emails in real-time
  // private listenForNewEmails(): void {
  //   this.imap.on("mail", (numNewMsgs: number) => {
  //     console.log(`📧 ${numNewMsgs} new email(s) received`);
  //     this.fetchNewEmails(); // ← CONNECTS TO: fetchNewEmails() (on new mail)
  //   });
  // }

  // //  STEP 3: Fetch all unread emails
  // private fetchNewEmails(): void {
  //   this.imap.search(["UNSEEN", "RECENT", "NEW"], (err: any, results: any) => {
  //     if (err) {
  //       console.error("❌ Search error:", err);
  //       return;
  //     }
  //     console.log("Search results:", results);
  //     if (!results || results.length === 0) {
  //       console.log("📭 No new emails to process");
  //       return;
  //     }
  //     console.log(`📧 Processing ${results.length} new email(s)`);

  //     // Fetch email content
  //     const fetch = this.imap.fetch(results, {
  //       bodies: "",
  //       markSeen: true,
  //     });

  //     fetch.on("message", (msg: any, seqno: any) => {
  //       this.processEmailMessage(msg, seqno); // ← CONNECTS TO: processEmailMessage()
  //     });
  //   });
  // }

  //  STEP 4: Process individual email message
  private processEmailMessage(msg: any, seqno: number): void {
    let emailBuffer = "";

    msg.on("body", (stream: any) => {
      stream.on("data", (chunk: Buffer) => {
        emailBuffer += chunk.toString("utf8");
      });

      stream.once("end", async () => {
        try {
          // Parse the email
          const parsedEmail: any = await simpleParser(emailBuffer);
          await this.handleParsedEmail(parsedEmail); // ← CONNECTS TO: handleParsedEmail()
        } catch (error) {
          console.error(`❌ Error processing email #${seqno}:`, error);
        }
      });
    });
  }

  //  STEP 5: Handle parsed email and create ticket
  // ✅ STEP 5: Handle parsed email and create ticket - IMPROVED VERSION
  private async handleParsedEmail(email: ParsedEmail): Promise<void> {
    try {
      const senderEmail = email.from?.value?.[0]?.address?.toLowerCase();
      const subject = email.subject || "No Subject";
      // const body = email.html || email.text || "No content";
      const body = email.html || `<pre>${email.text}</pre>`;

      const messageId = email.messageId;
      const references = email.references || [];
      const inReplyTo = email.inReplyTo;

      const threadId = references.length > 0 ? references[0] : inReplyTo;
      console.log(`🧵 Extracted Thread ID: ${threadId}`, email);

      if (!senderEmail) {
        console.error("❌ No sender email found");
        return;
      }

      let existingTicket = null;

      if (threadId) {
        existingTicket = await this.findTicketByThreadId(threadId);
        console.log(`🧵 Extracted `, existingTicket);

        if (existingTicket) {
          await this.createCommentFromEmail(
            existingTicket,
            senderEmail,
            body,
            messageId,
            email // ✅ Pass full email object for better processing
          );
          return;
        } else {
          console.log(
            `❌ No existing ticket found with thread ID: ${threadId}`
          );
        }
      }

      const customer = await this.findCustomer(senderEmail);

      if (!customer) {
        console.log(`❌ Email ignored - ${senderEmail} is not a customer`);
        return;
      }

      const ticket = await this.createTicket(
        customer,
        subject,
        body,
        senderEmail,
        messageId,
        threadId ?? "",
        email // ✅ Pass full email object
      );

      console.log(
        `Ticket created: #${ticket.ticket_number} for ${customer.first_name} ${customer.last_name}`
      );
    } catch (error) {
      console.error("Error handling email:", error);
    }
  }

  // ✅ IMPROVED: Create comment from email reply with better content handling
  private async createCommentFromEmail(
    ticket: any,
    senderEmail: string,
    body: string,
    messageId?: string,
    fullEmail?: ParsedEmail
  ): Promise<void> {
    try {
      // Determine if this is from customer or internal user
      const isCustomer =
        ticket.customers.email.toLowerCase() === senderEmail.toLowerCase();

      // ✅ Clean and process the email body
      // const cleanedBody = this.cleanEmailBody(body, fullEmail);
      const cleanedBody = body;

      console.log(`Adding comment to ticket #${ticket.ticket_number} `);
      const res = await prisma.ticket_comments.create({
        data: {
          ticket_id: ticket.id,
          customer_id: isCustomer ? ticket.customers.id : null,
          user_id: isCustomer ? null : undefined,
          comment_text: cleanedBody,
          comment_type: "email_reply",
          is_internal: false,
          email_message_id: messageId,
        },
      });

      // Update ticket timestamp
      await prisma.tickets.update({
        where: { id: ticket.id },
        data: { updated_at: new Date() },
      });
    } catch (error) {
      console.error("❌ Error creating comment from email:", error);
    }
  }

  // ✅ IMPROVED: Create ticket with better content handling
  private async createTicket(
    customer: any,
    subject: string,
    body: string,
    senderEmail: string,
    emailMessageId?: string,
    threadId?: string,
    fullEmail?: ParsedEmail
  ): Promise<any> {
    const ticketNumber = `TCKT-${Date.now()}`;

    // ✅ Clean and process the email body
    // const cleanedBody = this.cleanEmailBody(body, fullEmail);
    const cleanedBody = body;

    return await prisma.tickets.create({
      data: {
        ticket_number: ticketNumber,
        customer_id: customer.id,
        subject: this.cleanSubject(subject),
        description: cleanedBody,
        priority: "Medium",
        status: "Open",
        source: "Email",
        original_email_message_id: emailMessageId,
        email_thread_id: threadId || emailMessageId,
      },
    });
  }

  // ✅ NEW: Enhanced email body cleaning function
  private cleanEmailBody(body: string, fullEmail?: ParsedEmail): string {
    try {
      // If it's HTML content, extract meaningful text and preserve some formatting
      if (body.includes("<") && body.includes(">")) {
        // Remove common email client artifacts
        let cleanedHtml = body
          // Remove email client specific elements
          .replace(
            /<div[^>]*class="[^"]*gmail[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            ""
          )
          .replace(/<div[^>]*id="[^"]*gmail[^"]*"[^>]*>.*?<\/div>/gi, "")
          // Remove tracking pixels and tiny images
          .replace(/<img[^>]*width="1"[^>]*>/gi, "")
          .replace(/<img[^>]*height="1"[^>]*>/gi, "")
          // Remove script and style tags
          .replace(/<script[^>]*>.*?<\/script>/gi, "")
          .replace(/<style[^>]*>.*?<\/style>/gi, "")
          // Remove excessive whitespace
          .replace(/\s+/g, " ")
          .trim();

        // Convert to readable text while preserving some structure
        const textContent = this.htmlToText(cleanedHtml);
        return this.removeEmailSignatures(textContent);
      } else {
        // Plain text email
        return this.removeEmailSignatures(body);
      }
    } catch (error) {
      console.error("❌ Error cleaning email body:", error);
      return body.substring(0, 1000); // Fallback: return first 1000 chars
    }
  }

  // ✅ NEW: Convert HTML to readable text while preserving structure
  private htmlToText(html: string): string {
    return (
      html
        // Convert common HTML elements to text equivalents
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/div>/gi, "\n")
        .replace(/<div[^>]*>/gi, "")
        .replace(/<\/h[1-6]>/gi, "\n")
        .replace(/<h[1-6][^>]*>/gi, "")
        // Handle lists
        .replace(/<\/li>/gi, "\n")
        .replace(/<li[^>]*>/gi, "• ")
        .replace(/<\/(ul|ol)>/gi, "\n")
        .replace(/<(ul|ol)[^>]*>/gi, "")
        // Remove remaining HTML tags
        .replace(/<[^>]*>/g, "")
        // Decode HTML entities
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Clean up excessive whitespace
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim()
    );
  }

  // ✅ IMPROVED: Remove email signatures and quoted content
  private removeEmailSignatures(body: string): string {
    const lines = body.split("\n");
    const cleanLines: string[] = [];
    let foundSignature = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Common signature indicators
      if (
        line.match(/^--\s*$/) ||
        line.match(/^_{3,}$/) ||
        line.match(/^-{3,}$/) ||
        line.match(/^={3,}$/) ||
        line.match(/^Best regards,?\s*$/i) ||
        line.match(/^Sincerely,?\s*$/i) ||
        line.match(/^Thanks?,?\s*$/i) ||
        line.match(/^Thank you,?\s*$/i) ||
        // Email thread indicators
        line.match(/^From:.*$/i) ||
        line.match(/^Sent:.*$/i) ||
        line.match(/^To:.*$/i) ||
        line.match(/^Subject:.*$/i) ||
        line.match(/^Date:.*$/i) ||
        // Gmail/Outlook quote indicators
        line.match(/^On .* wrote:$/i) ||
        line.match(/^On .* at .* wrote:$/i) ||
        line.match(/^>+/m) || // Quoted text
        // Mobile signature indicators
        line.match(/^Sent from my (iPhone|iPad|Android)/i) ||
        line.match(/^Get Outlook for/i)
      ) {
        foundSignature = true;
        break;
      }

      // If we haven't found a signature yet, keep the line
      if (!foundSignature && line.length > 0) {
        cleanLines.push(line);
      }
    }

    const result = cleanLines.join("\n").trim();

    // If the result is too short, return the original (might have been over-cleaned)
    if (result.length < 10 && body.length > 50) {
      return body.substring(0, 500); // Return first 500 chars of original
    }

    return result || "No content available";
  }

  // ✅ IMPROVED: Clean email subject
  private cleanSubject(subject: string): string {
    return subject
      .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, "")
      .replace(/\[.*?\]/g, "") // Remove bracketed text like [EXTERNAL]
      .trim()
      .substring(0, 255);
  }

  private extractThreadId(email: ParsedEmail): string | null {
    // Priority 1: Use existing thread reference (In-Reply-To)
    if (email.inReplyTo) {
      console.log(`🧵 Using In-Reply-To as Thread ID: ${email.inReplyTo}`);
      return email.inReplyTo;
    }

    // Priority 2: Use first reference (original email in thread)
    if (email.references && email.references.length > 0) {
      console.log(
        `🧵 Using References[0] as Thread ID: ${email.references[0]}`
      );
      return email.references[0];
    }

    // Priority 3: Use message ID as new thread root (for new conversations)
    if (email.messageId) {
      console.log(`🧵 Using Message ID as new Thread ID: ${email.messageId}`);
      return email.messageId;
    }

    console.log("🧵 No Thread ID found");
    return null;
  }
  //  STEP 6: Find customer in database
  private async findCustomer(email: string): Promise<any | null> {
    try {
      await prisma.$connect();
      return await prisma.customers.findFirst({
        where: {
          email: email,
        },
      });
    } catch (error) {
      console.error("❌ Database error while finding customer:", error);
      return null;
    }
  }
  // ✅ NEW: Find ticket by Thread ID (most reliable method)
  private async findTicketByThreadId(threadId: string): Promise<any | null> {
    try {
      const ticket = await prisma.tickets.findFirst({
        where: {
          email_thread_id: threadId, // ✅ Make sure this matches your DB column name
        },
        include: {
          customers: true,
        },
      });

      if (ticket) {
        console.log(`✅ Found existing ticket: #${ticket.ticket_number}`);
      } else {
        console.log(`❌ No existing ticket found with thread ID: ${threadId}`);
      }

      return ticket;
    } catch (error) {
      console.error("❌ Error finding ticket by thread ID:", error);
      return null;
    }
  }
  // ✅ NEW: Create comment from email reply
  // private async createCommentFromEmail(
  //   ticket: any,
  //   senderEmail: string,
  //   body: string,
  //   messageId?: string
  // ): Promise<void> {
  //   try {
  //     // Determine if this is from customer or internal user
  //     const isCustomer =
  //       ticket.customers.email.toLowerCase() === senderEmail.toLowerCase();

  //     await prisma.ticket_comments.create({
  //       data: {
  //         ticket_id: ticket.id,
  //         customer_id: isCustomer ? ticket.customers.id : null,
  //         user_id: isCustomer ? null : undefined, // You might want to find user by email
  //         comment_text: this.cleanBody(body),
  //         comment_type: "email_reply",
  //         is_internal: false,
  //         email_message_id: messageId,
  //       },
  //     });

  //     // Update ticket timestamp
  //     await prisma.tickets.update({
  //       where: { id: ticket.id },
  //       data: { updated_at: new Date() },
  //     });
  //   } catch (error) {
  //     console.error("❌ Error creating comment from email:", error);
  //   }
  // }

  //  STEP 7: Create ticket from email
  // private async createTicket(
  //   customer: any,
  //   subject: string,
  //   body: string,
  //   senderEmail: string,
  //   emailMessageId?: string, // ✅ NEW: Original email message ID
  //   threadId?: string // ✅ NEW: Email thread ID
  // ): Promise<any> {
  //   const ticketNumber = `TCKT-${Date.now()}`;

  //   return await prisma.tickets.create({
  //     data: {
  //       ticket_number: ticketNumber,
  //       customer_id: customer.id,
  //       subject: this.cleanSubject(subject),
  //       description: this.cleanBody(body),
  //       priority: "Medium",
  //       status: "Open",
  //       source: "Email",
  //       original_email_message_id: emailMessageId, // ✅ Store original email ID
  //       email_thread_id: threadId || emailMessageId, // ✅ Store thread ID
  //     },
  //   });
  // }

  //  UTILITY: Clean email subject (remove Re:, Fwd: etc.)
  // private cleanSubject(subject: string): string {
  //   return subject
  //     .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, "")
  //     .trim()
  //     .substring(0, 255);
  // }

  //  UTILITY: Clean email body (remove signatures, replies)
  private cleanBody(body: string): string {
    const lines = body.split("\n");
    const cleanLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Stop at signature indicators
      if (
        trimmed.match(/^--\s*$/) ||
        trimmed.match(/^From:.*$/i) ||
        trimmed.match(/^Sent:.*$/i)
      ) {
        break;
      }

      if (trimmed.length > 0) {
        cleanLines.push(trimmed);
      }
    }

    return cleanLines.join("\n").trim() || "No content available";
  }

  //  Stop the service
  stop(): void {
    this.imap.end();
    console.log("📪 Email service stopped");
  }
}

// MAIN FUNCTION: Entry point of the application
async function main(): Promise<void> {
  const emailSystem = new SimpleEmailTicketSystem();

  try {
    await emailSystem.start(); // ← STARTS THE ENTIRE SYSTEM
    console.log("🚀 Email ticket system is running...");

    // Keep the process running
    process.on("SIGINT", () => {
      console.log("\n🔄 Shutting down...");
      emailSystem.stop();
      prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Failed to start email system:", error);
    process.exit(1);
  }
}

export { SimpleEmailTicketSystem, main };
