"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.SimpleEmailTicketSystem = void 0;
exports.main = main;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const imap_1 = __importDefault(require("imap"));
const mailparser_1 = require("mailparser");
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
const GenerateTicket_1 = require("../utils/GenerateTicket");
const blackbaze_1 = require("../utils/blackbaze");
dotenv.config();
// const emailConfiguration = await prisma.email_configurations.findFirst({
//   where: { log_inst: 1 },
// });
// const prisma = new PrismaClient();
// const emailConfig: EmailConfig = {
//   user: emailConfiguration.username || process.env.SMTP_USERNAME!,
//   password: emailConfiguration?.password || process.env.SMTP_PASSWORD!,
//   host: emailConfiguration?.smtp_server || process.env.MAIL_HOST!,
//   port: emailConfiguration?.smtp_port || 993,
//   connTimeout: 60000, // 60 seconds connection timeout
//   authTimeout: 30000,
//   tls: true,
//   tlsOptions: {
//     rejectUnauthorized: false,
//     debug: console.log, // <-- Add this line to allow self-signed certificates
//   },
// };
const prisma = new client_1.PrismaClient();
class SimpleEmailTicketSystem {
    // Dynamic constructor - accepts configuration parameters
    constructor(logInst = 1, configId) {
        this.imap = null;
        this.lastUid = 0;
        this.emailConfig = null;
        this.logInst = logInst;
        this.configId = configId || 0;
        this.lastUidFilePath = path_1.default.join(__dirname, `lastUid_${logInst}.txt`);
    }
    // Dynamic configuration loader
    loadEmailConfiguration() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let emailConfiguration;
                emailConfiguration = yield prisma.email_configurations.findFirst({
                    where: { log_inst: 1 },
                });
                if (!emailConfiguration) {
                    throw new Error(`No email configuration found for logInst: ${this.logInst} or configId: ${this.configId}`);
                }
                return {
                    user: emailConfiguration.username || process.env.SMTP_USERNAME,
                    password: emailConfiguration.password || process.env.SMTP_PASSWORD,
                    host: emailConfiguration.smtp_server || process.env.MAIL_HOST,
                    port: emailConfiguration.smtp_port || 993,
                    connTimeout: 60000,
                    authTimeout: 30000,
                    tls: true,
                    tlsOptions: {
                        rejectUnauthorized: false,
                        debug: console.log,
                    },
                };
            }
            catch (error) {
                console.error("❌ Error loading email configuration:", error);
                throw error;
            }
        });
    }
    // Initialize with dynamic configuration
    initializeConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.emailConfig) {
                this.emailConfig = yield this.loadEmailConfiguration();
            }
            if (this.imap) {
                this.imap.destroy();
            }
            this.imap = new imap_1.default(this.emailConfig);
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadLastUid();
            yield this.initializeConnection();
            return new Promise((resolve, reject) => {
                if (!this.imap) {
                    reject(new Error("IMAP connection not initialized"));
                    return;
                }
                this.imap.once("ready", () => {
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
        });
    }
    loadLastUid() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (fs_1.default.existsSync(this.lastUidFilePath)) {
                    const content = yield fs_1.default.promises.readFile(this.lastUidFilePath, "utf-8");
                    this.lastUid = parseInt(content, 10) || 0;
                    console.log(`📥 Loaded lastUid: ${this.lastUid}`);
                }
                else {
                    this.lastUid = 0;
                    console.log("📥 lastUid file does not exist, starting from 0");
                }
            }
            catch (err) {
                console.error("❌ Error loading lastUid file:", err);
                this.lastUid = 0;
            }
        });
    }
    saveLastUid(newUid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs_1.default.promises.writeFile(this.lastUidFilePath, newUid.toString(), "utf-8");
                this.lastUid = newUid;
                console.log(`💾 Saved lastUid: ${this.lastUid}`);
            }
            catch (err) {
                console.error("❌ Error saving lastUid file:", err);
            }
        });
    }
    openInbox() {
        return new Promise((resolve, reject) => {
            if (!this.imap) {
                reject(new Error("IMAP not initialized"));
                return;
            }
            this.imap.openBox("INBOX", false, (err, box) => {
                if (err) {
                    console.error("❌ Failed to open inbox:", err);
                    return reject(err);
                }
                console.log(`📬 Inbox opened: total=${box.messages.total} unseen=${box.messages.unseen || 0} uidnext=${box.uidnext}`);
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
    listenForNewEmails() {
        if (!this.imap)
            return;
        this.imap.on("mail", (numNewMsgs) => {
            console.log(`📧 Mail event: ${numNewMsgs} new email(s)`);
            this.fetchNewEmails();
        });
    }
    fetchNewEmails() {
        if (!this.imap)
            return;
        this.imap.openBox("INBOX", (err, box) => {
            if (err) {
                console.error("❌ Error fetching mailbox status:", err);
                return;
            }
            console.log(`Mailbox status: total=${box.messages.total} unseen=${box.messages.unseen} uidnext=${box.uidnext}`);
            const newUidNext = box.uidnext - 1;
            if (newUidNext > this.lastUid) {
                const uidRange = `${this.lastUid + 1}:${newUidNext}`;
                console.log(`⬇️ Fetching emails with UID range: ${uidRange}`);
                if (!this.imap)
                    return;
                const fetcher = this.imap.fetch(uidRange, {
                    bodies: "",
                    markSeen: true,
                });
                fetcher.on("message", (msg, seqno) => this.processEmailMessage(msg, seqno));
                fetcher.once("error", (err) => console.error("❌ Fetch error:", err));
                fetcher.once("end", () => __awaiter(this, void 0, void 0, function* () {
                    console.log("✅ Finished fetching emails");
                    yield this.saveLastUid(newUidNext);
                }));
                console.log(`✅ Fetch complete up to UID: ${newUidNext}`);
            }
            else {
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
    processEmailMessage(msg, seqno) {
        let emailBuffer = "";
        msg.on("body", (stream) => {
            stream.on("data", (chunk) => {
                emailBuffer += chunk.toString("utf8");
            });
            stream.once("end", () => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Parse the email
                    const parsedEmail = yield (0, mailparser_1.simpleParser)(emailBuffer);
                    yield this.handleParsedEmail(parsedEmail); // ← CONNECTS TO: handleParsedEmail()
                }
                catch (error) {
                    console.error(`❌ Error processing email #${seqno}:`, error);
                }
            }));
        });
    }
    //  STEP 5: Handle parsed email and create ticket
    // ✅ STEP 5: Handle parsed email and create ticket - IMPROVED VERSION
    handleParsedEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            try {
                const senderEmail = (_d = (_c = (_b = (_a = email.from) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.address) === null || _d === void 0 ? void 0 : _d.toLowerCase();
                const senderName = ((_g = (_f = (_e = email.from) === null || _e === void 0 ? void 0 : _e.value) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.name) ||
                    (senderEmail === null || senderEmail === void 0 ? void 0 : senderEmail.split("@")[0]) ||
                    "Unknown Sender";
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
                // ✅ Process attachments (without ticket number for now)
                let attachments = yield this.processEmailAttachments(email);
                console.log("Attachments : ", email.attachments, attachments);
                let existingTicket = null;
                if (threadId) {
                    existingTicket = yield this.findTicketByThreadId(threadId);
                    console.log(`🧵 Extracted `, existingTicket);
                    if (existingTicket) {
                        yield this.createCommentFromEmail(existingTicket, senderEmail, body, messageId, email, attachments);
                        return;
                    }
                    else {
                        console.log(` No existing ticket found with thread ID: ${threadId}`);
                    }
                }
                const customer = yield this.findCustomer(senderEmail);
                // if (!customer) {
                //   console.log(`❌ Email ignored - ${senderEmail} is not a customer`);
                //   return;
                // }
                const ticket = yield this.createTicket(customer, subject, body, senderEmail, messageId, threadId !== null && threadId !== void 0 ? threadId : "", email, senderName, attachments);
                console.log(`Ticket created: #${ticket.ticket_number} for ${customer === null || customer === void 0 ? void 0 : customer.first_name} ${customer === null || customer === void 0 ? void 0 : customer.last_name}`);
            }
            catch (error) {
                console.error("Error handling email:", error);
            }
        });
    }
    createCommentFromEmail(ticket, senderEmail, body, messageId, fullEmail, attachments) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Determine if this is from customer or internal user
                const isCustomer = ((_a = ticket.customers) === null || _a === void 0 ? void 0 : _a.email.toLowerCase()) === (senderEmail === null || senderEmail === void 0 ? void 0 : senderEmail.toLowerCase());
                // ✅ Clean and process the email body
                // const cleanedBody = this.cleanEmailBody(body, fullEmail);
                const cleanedBody = body;
                console.log(`Adding comment to ticket #${ticket.ticket_number} `);
                const attachment_urls = JSON.stringify(attachments === null || attachments === void 0 ? void 0 : attachments.map((val) => val.fileUrl));
                const res = yield prisma.ticket_comments.create({
                    data: {
                        ticket_id: ticket.id,
                        customer_id: isCustomer ? (_b = ticket.customers) === null || _b === void 0 ? void 0 : _b.id : null,
                        user_id: isCustomer ? null : undefined,
                        comment_text: cleanedBody,
                        comment_type: "email_reply",
                        is_internal: false,
                        email_message_id: messageId,
                        attachment_urls,
                    },
                });
                // ✅ Save attachments if any
                if (attachments && attachments.length > 0) {
                    yield this.saveTicketAttachments(ticket.id, attachments);
                }
                // Update ticket timestamp
                yield prisma.tickets.update({
                    where: { id: ticket.id },
                    data: { updated_at: new Date() },
                });
            }
            catch (error) {
                console.error("❌ Error creating comment from email:", error);
            }
        });
    }
    // ✅ CORRECTED: Process email attachments with Backblaze B2
    processEmailAttachments(email, ticketNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const attachments = [];
            try {
                if (email.attachments && email.attachments.length > 0) {
                    console.log(`📎 Processing ${email.attachments.length} attachment(s)`);
                    for (const attachment of email.attachments) {
                        try {
                            // Skip inline images that are embedded in HTML
                            if (attachment.cid && attachment.contentDisposition === "inline") {
                                continue;
                            }
                            // Validate file type and size
                            if (!this.isAllowedFileType(attachment.filename || "", attachment.contentType || "")) {
                                console.warn(`❌ Skipping disallowed file type: ${attachment.filename}`);
                                continue;
                            }
                            const maxSize = parseInt(process.env.MAX_ATTACHMENT_SIZE || "10485760"); // 10MB default
                            if (attachment.size && attachment.size > maxSize) {
                                console.warn(`❌ Skipping oversized file: ${attachment.filename} (${attachment.size} bytes)`);
                                continue;
                            }
                            // Generate unique filename for Backblaze B2
                            const timestamp = Date.now();
                            const fileExtension = path_1.default.extname(attachment.filename || "") || ".bin";
                            const sanitizedName = (attachment.filename || "unknown").replace(/[^a-zA-Z0-9.-]/g, "_"); // Replace special chars
                            const fileName = ticketNumber
                                ? `email-attachments/${ticketNumber}/${timestamp}_${sanitizedName}`
                                : `email-attachments/temp/${timestamp}_${sanitizedName}`;
                            // ✅ Upload to Backblaze B2
                            console.log(`📤 Uploading ${attachment.filename} to Backblaze B2...`);
                            const fileUrl = yield (0, blackbaze_1.uploadFile)(attachment.content, fileName, attachment.contentType || "application/octet-stream");
                            const attachmentData = {
                                originalName: attachment.filename || "unknown",
                                fileName: fileName,
                                fileUrl: fileUrl,
                                mimeType: attachment.contentType || "application/octet-stream",
                                size: attachment.size || ((_a = attachment.content) === null || _a === void 0 ? void 0 : _a.length) || 0,
                                uploadedAt: new Date(),
                            };
                            attachments.push(attachmentData);
                            console.log(`✅ Uploaded attachment: ${attachment.filename} → ${fileUrl}`);
                        }
                        catch (attachmentError) {
                            console.log("Error in attachment convert : ", attachmentError);
                            console.error(`❌ Error processing attachment ${attachment.filename}:`, attachmentError);
                        }
                    }
                }
            }
            catch (error) {
                console.error("❌ Error processing email attachments:", error);
            }
            return attachments;
        });
    }
    // ✅ IMPROVED: Create ticket with better content handling
    createTicket(customer, subject, body, senderEmail, emailMessageId, threadId, fullEmail, senderNames, attachments) {
        return __awaiter(this, void 0, void 0, function* () {
            const ticketNumber = `TCKT-${Date.now()}`;
            const ids = yield prisma.sla_configurations.findFirst({
                where: {
                    priority: "Medium",
                },
            });
            // ✅ Clean and process the email body
            // const cleanedBody = this.cleanEmailBody(body, fullEmail);
            const cleanedBody = body;
            const attachment_urls = JSON.stringify(attachments === null || attachments === void 0 ? void 0 : attachments.map((val) => val.fileUrl));
            const tickets = yield prisma.tickets.create({
                data: {
                    ticket_number: ticketNumber,
                    customer_id: (customer === null || customer === void 0 ? void 0 : customer.id) || null,
                    customer_name: senderNames || "",
                    customer_email: senderEmail,
                    subject: this.cleanSubject(subject),
                    description: cleanedBody,
                    priority: ids ? ids === null || ids === void 0 ? void 0 : ids.id : 0,
                    status: "Open",
                    source: "Email",
                    original_email_message_id: emailMessageId,
                    email_thread_id: threadId || emailMessageId,
                    attachment_urls,
                },
            });
            if (attachments && attachments.length > 0) {
                yield this.saveTicketAttachments(tickets.id, attachments);
            }
            return yield prisma.tickets.update({
                where: { id: tickets.id },
                data: {
                    ticket_number: (0, GenerateTicket_1.generateTicketNumber)(tickets.id),
                },
            });
        });
    }
    // ✅ NEW: Save ticket attachments to database
    saveTicketAttachments(ticketId, attachments) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const attachmentRecords = attachments.map((att) => ({
                    ticket_id: ticketId,
                    file_name: att.originalName,
                    original_file_name: att.originalName,
                    file_path: att.fileUrl, // Store Backblaze B2 URL
                    file_size: att.size,
                    content_type: att.mimeType,
                    uploaded_by_type: "Customer",
                    uploaded_by: null, // From email, so no user
                    created_at: att.uploadedAt,
                }));
                yield prisma.ticket_attachments.createMany({
                    data: attachmentRecords,
                });
                console.log(`✅ Saved ${attachments.length} Backblaze B2 attachment(s) for ticket ${ticketId}`);
            }
            catch (error) {
                console.error(`❌ Error saving ticket attachments:`, error);
            }
        });
    }
    // ✅ Utility: Check if file type is allowed
    isAllowedFileType(filename, mimeType) {
        const allowedExtensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".pdf",
            ".doc",
            ".docx",
            ".txt",
            ".zip",
            ".xlsx",
            ".pptx",
            ".csv",
        ];
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/zip",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/csv",
        ];
        const extension = path_1.default.extname(filename).toLowerCase();
        return (allowedExtensions.includes(extension) ||
            allowedMimeTypes.includes(mimeType));
    }
    // ✅ IMPROVED: Clean email subject
    cleanSubject(subject) {
        return subject
            .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, "")
            .replace(/\[.*?\]/g, "") // Remove bracketed text like [EXTERNAL]
            .trim()
            .substring(0, 255);
    }
    //  STEP 6: Find customer in database
    findCustomer(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.$connect();
                return yield prisma.customers.findFirst({
                    where: {
                        email: email,
                    },
                });
            }
            catch (error) {
                console.error("❌ Database error while finding customer:", error);
                return null;
            }
        });
    }
    // ✅ NEW: Find ticket by Thread ID (most reliable method)
    findTicketByThreadId(threadId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ticket = yield prisma.tickets.findFirst({
                    where: {
                        email_thread_id: threadId, // ✅ Make sure this matches your DB column name
                    },
                    include: {
                        customers: true,
                    },
                });
                if (ticket) {
                    console.log(`✅ Found existing ticket: #${ticket.ticket_number}`);
                }
                else {
                    console.log(`❌ No existing ticket found with thread ID: ${threadId}`);
                }
                return ticket;
            }
            catch (error) {
                console.error("❌ Error finding ticket by thread ID:", error);
                return null;
            }
        });
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
    cleanBody(body) {
        const lines = body.split("\n");
        const cleanLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            // Stop at signature indicators
            if (trimmed.match(/^--\s*$/) ||
                trimmed.match(/^From:.*$/i) ||
                trimmed.match(/^Sent:.*$/i)) {
                break;
            }
            if (trimmed.length > 0) {
                cleanLines.push(trimmed);
            }
        }
        return cleanLines.join("\n").trim() || "No content available";
    }
    //  Stop the service
    stop() {
        if (!this.imap)
            return;
        this.imap.end();
        console.log("📪 Email service stopped");
    }
}
exports.SimpleEmailTicketSystem = SimpleEmailTicketSystem;
// MAIN FUNCTION: Entry point of the application
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const emailSystem = new SimpleEmailTicketSystem();
        try {
            yield emailSystem.start(); // ← STARTS THE ENTIRE SYSTEM
            console.log("🚀 Email ticket system is running...");
            // Keep the process running
            process.on("SIGINT", () => {
                console.log("\n🔄 Shutting down...");
                emailSystem.stop();
                prisma.$disconnect();
                process.exit(0);
            });
        }
        catch (error) {
            console.error("❌ Failed to start email system:", error);
            process.exit(1);
        }
    });
}
