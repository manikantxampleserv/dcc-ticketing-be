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
const slaMonitorService_1 = __importDefault(require("./slaMonitorService"));
const ticketController_controller_1 = require("../v1/controllers/ticketController.controller");
const sendSatisfactionEmail_1 = require("./sendSatisfactionEmail");
const emailImageExtractor_1 = require("./emailImageExtractor");
dotenv.config();
const prisma = new client_1.PrismaClient();
class SimpleEmailTicketSystem {
    constructor(logInst = 1, configId) {
        this.imap = null;
        this.lastUid = 0;
        this.emailConfig = null;
        this.pollingInterval = null;
        this.isIdleSupported = false;
        // ✅ FIX #1: Add a flag to prevent concurrent fetches
        this.isFetching = false;
        this.pendingFetch = false;
        this.logInst = logInst;
        this.configId = configId || 0;
        this.lastUidFilePath = path_1.default.join(__dirname, `lastUid_${logInst}.txt`);
    }
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
                    host: emailConfiguration.smtp_server || process.env.SMTP_HOST,
                    // port: 993,
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
                    console.log("✅ Connected to email server");
                    this.openInbox()
                        .then(() => {
                        // ✅ FIX #3: Remove event listeners OR use them ONLY with proper locking
                        this.setupEmailListeners();
                        console.log("🔍 Checking for emails on startup...");
                        this.fetchNewEmails();
                        // ✅ FIX #4: Use 30-second polling as PRIMARY method only
                        this.startPolling(30000);
                        resolve();
                    })
                        .catch(reject);
                });
                this.imap.once("error", (err) => {
                    console.error("❌ IMAP connection error:", err);
                    this.stopPolling();
                    reject(err);
                });
                this.imap.once("close", (hadError) => {
                    console.log(`📪 Connection closed${hadError ? " with error" : ""}`);
                    this.stopPolling();
                    console.log("🔄 Reconnecting in 5 seconds...");
                    setTimeout(() => {
                        this.start().catch((err) => {
                            console.error("❌ Reconnection failed:", err);
                        });
                    }, 5000);
                });
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
                var _a;
                if (err) {
                    console.error("❌ Failed to open inbox:", err);
                    return reject(err);
                }
                console.log(`📬 Inbox opened: total=${box.messages.total} unseen=${box.messages.unseen || 0} uidnext=${box.uidnext}`);
                if (((_a = this.imap) === null || _a === void 0 ? void 0 : _a.serverSupports) && this.imap.serverSupports("IDLE")) {
                    this.isIdleSupported = true;
                    console.log("✅ IMAP IDLE is supported (using polling method)");
                }
                else {
                    console.log("⚠️ IMAP IDLE not supported, using polling only");
                }
                if (this.lastUid === 0) {
                    this.lastUid = box.uidnext - 1;
                    this.saveLastUid(this.lastUid);
                    console.log(`📝 Initial lastUid set to ${this.lastUid}`);
                }
                resolve();
            });
        });
    }
    // ✅ FIX #5: Simplified event listeners with debouncing
    setupEmailListeners() {
        if (!this.imap)
            return;
        console.log("👂 Setting up email listeners...");
        // ✅ Use debouncing to prevent rapid duplicate calls
        let mailEventTimeout = null;
        this.imap.on("mail", (numNewMsgs) => {
            console.log(`📧 Mail event triggered: ${numNewMsgs} new email(s)`);
            // ✅ FIX: Debounce - only trigger if not already queued
            if (mailEventTimeout) {
                clearTimeout(mailEventTimeout);
            }
            mailEventTimeout = setTimeout(() => {
                if (!this.isFetching) {
                    this.fetchNewEmails();
                }
                else {
                    this.pendingFetch = true;
                }
                mailEventTimeout = null;
            }, 500); // 500ms debounce
        });
        // ✅ FIX: Disable 'update' event or make it non-blocking
        // The update event fires too frequently and can cause race conditions
        // Comment it out and rely on 'mail' event + polling instead
        /*
        this.imap.on("update", (seqno: number, info: any) => {
          console.log(`🔄 Mailbox update event: seqno=${seqno}`);
          this.fetchNewEmails();
        });
        */
        console.log("✅ Email listeners configured with debouncing");
    }
    // ✅ FIX #6: Improved polling with atomic operations
    startPolling(intervalMs = 30000) {
        console.log(`🔄 Starting polling every ${intervalMs / 1000} seconds...`);
        this.pollingInterval = setInterval(() => {
            try {
                // console.log(
                //   `🔍 [${new Date().toISOString()}] Polling for new emails...`
                // );
                if (!this.isFetching) {
                    this.fetchNewEmails();
                }
                else {
                    console.log("⏭️ Fetch already in progress, skipping this poll");
                    this.pendingFetch = true;
                }
            }
            catch (error) {
                console.error("❌ Polling error:", error);
            }
        }, intervalMs);
    }
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log("⏹️ Polling stopped");
        }
    }
    // ✅ FIX #7: Add locking mechanism to fetchNewEmails
    fetchNewEmails() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.imap)
                return;
            // ✅ If already fetching, mark as pending and return
            if (this.isFetching) {
                console.log("⏳ Fetch already in progress, marking as pending...");
                this.pendingFetch = true;
                return;
            }
            this.isFetching = true;
            try {
                yield new Promise((resolve, reject) => {
                    if (!this.imap) {
                        reject(new Error("IMAP not initialized"));
                        return;
                    }
                    this.imap.openBox("INBOX", false, (err, box) => {
                        if (err) {
                            console.error("❌ Error opening mailbox:", err);
                            this.isFetching = false;
                            return reject(err);
                        }
                        const currentUidNext = box.uidnext - 1;
                        // console.log(`📊 Mailbox status:`, {
                        //   total: box.messages.total,
                        //   unseen: box.messages.unseen,
                        //   lastUid: this.lastUid,
                        //   currentUidNext,
                        //   newEmails: currentUidNext - this.lastUid,
                        // });
                        if (currentUidNext > this.lastUid) {
                            const uidRange = `${this.lastUid + 1}:${currentUidNext}`;
                            console.log(`⬇️ Fetching emails with UID range: ${uidRange}`);
                            if (!this.imap) {
                                reject(new Error("IMAP disconnected"));
                                return;
                            }
                            const fetcher = this.imap.fetch(uidRange, {
                                bodies: "",
                            });
                            let processedCount = 0;
                            let totalMessages = 0;
                            fetcher.on("message", (msg, seqno) => {
                                console.log(`📨 Processing email #${seqno}`);
                                totalMessages++;
                                this.processEmailMessage(msg, seqno).finally(() => {
                                    processedCount++;
                                    // If all messages processed, save UID and resolve
                                    if (processedCount === totalMessages) {
                                        this.saveLastUid(currentUidNext).then(() => {
                                            console.log(`✅ Finished fetching emails. Updated lastUid to ${currentUidNext}`);
                                            this.isFetching = false;
                                            resolve();
                                        });
                                    }
                                });
                            });
                            fetcher.once("error", (err) => {
                                console.error("❌ Fetch error:", err);
                                this.isFetching = false;
                                reject(err);
                            });
                            fetcher.once("end", () => {
                                // ✅ Only resolve if no messages were processed
                                if (totalMessages === 0) {
                                    // console.log("📭 No new emails to fetch");
                                    this.isFetching = false;
                                    resolve();
                                }
                            });
                        }
                        else {
                            // console.log("📭 No new emails to fetch");
                            this.isFetching = false;
                            resolve();
                        }
                    });
                });
            }
            catch (error) {
                console.error("❌ Error in fetchNewEmails:", error);
                this.isFetching = false;
            }
            // ✅ FIX #8: If pending fetch was triggered, execute it
            if (this.pendingFetch) {
                console.log("🔄 Executing pending fetch...");
                this.pendingFetch = false;
                this.fetchNewEmails();
            }
        });
    }
    processEmailMessage(msg, seqno) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let emailBuffer = "";
                msg.on("body", (stream) => {
                    stream.on("data", (chunk) => {
                        emailBuffer += chunk.toString("utf8");
                    });
                    stream.once("end", () => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const parsedEmail = yield (0, mailparser_1.simpleParser)(emailBuffer);
                            yield this.handleParsedEmail(parsedEmail);
                            resolve();
                        }
                        catch (error) {
                            console.error(`❌ Error processing email #${seqno}:`, error);
                            reject(error);
                        }
                    }));
                });
                msg.once("error", (err) => {
                    console.error(`❌ Message stream error #${seqno}:`, err);
                    reject(err);
                });
            });
        });
    }
    handleParsedEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            try {
                const senderEmail = (_d = (_c = (_b = (_a = email.from) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.address) === null || _d === void 0 ? void 0 : _d.toLowerCase();
                const senderName = ((_g = (_f = (_e = email.from) === null || _e === void 0 ? void 0 : _e.value) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.name) ||
                    (senderEmail === null || senderEmail === void 0 ? void 0 : senderEmail.split("@")[0]) ||
                    "Unknown Sender";
                const subject = email.subject || "No Subject";
                const bodyText = email.text || "";
                let body = email.html || `<pre>${email.text}</pre>`;
                if (body.includes("data:image")) {
                    const result = yield (0, emailImageExtractor_1.replaceBase64ImagesWithUrls)(body, (0, GenerateTicket_1.generateTicketNumber)(Date.now()));
                    body = result.html;
                }
                const messageId = email.messageId;
                const references = email.references || [];
                const inReplyTo = email.inReplyTo;
                // console.log(
                //   `📧 Full email parsed:`,
                //   email.messageId,
                //   email.references,
                //   email.inReplyTo
                // );
                const threadId = Array.isArray(references)
                    ? references[0] // string | undefined
                    : references || inReplyTo || messageId;
                // console.log(
                //   `🧵 Processing email from: ${senderEmail}, subject: ${subject}`
                // );
                if (!senderEmail) {
                    console.error("❌ No sender email found");
                    return;
                }
                let attachments = yield this.processEmailAttachments(email);
                console.log(`📎 Found ${attachments.length} attachment(s)`);
                let existingTicket = null;
                // console.log(`ℹ️ This is existing  thread ID: ${threadId}`);
                if (threadId) {
                    existingTicket = yield this.findTicketByThreadId(threadId);
                    if (existingTicket) {
                        console.log(`✅ Adding reply to existing ticket #${existingTicket.ticket_number}`);
                        yield this.createCommentFromEmail(existingTicket, senderEmail, body, bodyText, messageId, email, attachments);
                        return;
                    }
                    else {
                        console.log(`ℹ️ No existing ticket found with thread ID: ${threadId}`);
                    }
                }
                const customer = yield this.findCustomer(senderEmail);
                const ticket = yield this.createTicket(customer, subject, body, bodyText, senderEmail, messageId, threadId !== null && threadId !== void 0 ? threadId : "", email, senderName, attachments);
                console.log(`🎫 Ticket created: #${ticket.ticket_number} for ${customer
                    ? `${customer.first_name} ${customer.last_name}`
                    : senderEmail}`);
            }
            catch (error) {
                console.error("❌ Error handling email:", error);
            }
        });
    }
    cleanPlainEmailText(text) {
        if (!text)
            return "";
        // 1️⃣ Remove common noise
        let cleaned = text
            .replace(/\[cid:[^\]]+\]/gi, "")
            .replace(/\[facebook icon.*?\]|\[twitter icon.*?\]|\[youtube icon.*?\]|\[linkedin icon.*?\]/gi, "")
            .replace(/mailto:\S+/gi, "")
            .replace(/<[^>]*>/g, "")
            .replace(/\r/g, "")
            .trim();
        // 2️⃣ Remove signature (cut at common markers)
        cleaned = cleaned.split(/\n\s*(Regards,|Thanks,|Best regards,|Kind regards,|Sincerely,|--|\nWashington Rapul|\nICT Manager)/i)[0];
        // 3️⃣ Remove greeting line (optional but recommended)
        cleaned = cleaned.replace(/^(hi|hello|dear|greetings)[^\n]*\n+/i, "");
        // 4️⃣ Normalize new lines
        cleaned = cleaned
            .replace(/\n{2,}/g, "\n")
            .replace(/[ \t]+/g, " ")
            .trim();
        return cleaned;
    }
    askAITicketSystem(question) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cleanQuestion = this.cleanPlainEmailText(question);
                const response = yield fetch("https://ai.dcctz.com/ticket-system/ask", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question: cleanQuestion }),
                });
                return yield response.json();
            }
            catch (error) {
                console.error("❌ Error calling AI Ticket API:", error);
                return null;
            }
        });
    }
    createCommentFromEmail(ticket, senderEmail, body, bodyText, messageId, fullEmail, attachments) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const isCustomer = ((_a = ticket.customers) === null || _a === void 0 ? void 0 : _a.email.toLowerCase()) === (senderEmail === null || senderEmail === void 0 ? void 0 : senderEmail.toLowerCase());
                const cleanedBody = this.cleanBody(body);
                // console.log(`💬 Adding comment to ticket #${ticket.ticket_number}`);
                const attachment_urls = JSON.stringify((attachments === null || attachments === void 0 ? void 0 : attachments.map((val) => val.fileUrl)) || []);
                yield prisma.ticket_comments.create({
                    data: {
                        ticket_id: ticket.id,
                        customer_id: isCustomer ? (_b = ticket.customers) === null || _b === void 0 ? void 0 : _b.id : null,
                        user_id: isCustomer ? null : undefined,
                        comment_text: cleanedBody,
                        email_body_text: bodyText,
                        comment_type: "email_reply",
                        is_internal: false,
                        email_message_id: messageId,
                        attachment_urls,
                    },
                });
                if (attachments && attachments.length > 0) {
                    yield this.saveTicketAttachments(ticket.id, attachments);
                }
                yield prisma.tickets.update({
                    where: { id: ticket.id },
                    data: {
                        updated_at: new Date(),
                        sort_comment: (() => {
                            const words = bodyText.trim().split(/\s+/);
                            return words.length > 50
                                ? words.slice(0, 30).join(" ") + "..."
                                : bodyText;
                        })(),
                    },
                });
            }
            catch (error) {
                console.error("❌ Error creating comment from email:", error);
            }
        });
    }
    processEmailAttachments(email, ticketNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const attachments = [];
            try {
                if (email.attachments && email.attachments.length > 0) {
                    console.log(`📎 Processing ${email.attachments.length} attachment(s)`);
                    for (const attachment of email.attachments) {
                        try {
                            if (attachment.cid && attachment.contentDisposition === "inline") {
                                continue;
                            }
                            if (!this.isAllowedFileType(attachment.filename || "", attachment.contentType || "")) {
                                console.warn(`❌ Skipping disallowed file type: ${attachment.filename}`);
                                continue;
                            }
                            const maxSize = parseInt(process.env.MAX_ATTACHMENT_SIZE || "10485760");
                            if (attachment.size && attachment.size > maxSize) {
                                console.warn(`❌ Skipping oversized file: ${attachment.filename} (${attachment.size} bytes)`);
                                continue;
                            }
                            const timestamp = Date.now();
                            const sanitizedName = (attachment.filename || "unknown").replace(/[^a-zA-Z0-9.-]/g, "_");
                            const fileName = ticketNumber
                                ? `email-attachments/${ticketNumber}/${timestamp}_${sanitizedName}`
                                : `email-attachments/temp/${timestamp}_${sanitizedName}`;
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
    createTicket(customer, subject, body, bodyText, senderEmail, emailMessageId, threadId, fullEmail, senderNames, attachments) {
        return __awaiter(this, void 0, void 0, function* () {
            const ticketNumber = `TCKT-${Date.now()}`;
            const slaConfig = yield prisma.sla_configurations.findFirst({
                where: {
                    priority: "Medium",
                },
            });
            const cleanedBody = this.cleanBody(body);
            const attachment_urls = JSON.stringify((attachments === null || attachments === void 0 ? void 0 : attachments.map((val) => val.fileUrl)) || []);
            const tickets = yield prisma.tickets.create({
                data: {
                    ticket_number: ticketNumber,
                    customer_id: (customer === null || customer === void 0 ? void 0 : customer.id) || null,
                    customer_name: senderNames || "",
                    customer_email: senderEmail,
                    subject: this.cleanSubject(subject),
                    description: cleanedBody,
                    email_body_text: bodyText,
                    sort_description: (() => {
                        const words = bodyText.trim().split(/\s+/);
                        return words.length > 30
                            ? words.slice(0, 30).join(" ") + "..."
                            : bodyText;
                    })(),
                    priority: slaConfig ? slaConfig.id : 0,
                    status: "Open",
                    source: "Email",
                    original_email_message_id: emailMessageId,
                    email_thread_id: threadId || emailMessageId,
                    attachment_urls,
                },
            });
            const updatedTicket = yield prisma.tickets.update({
                where: { id: tickets.id },
                data: {
                    ticket_number: (0, GenerateTicket_1.generateTicketNumber)(tickets.id),
                },
            });
            const aiResponse = yield this.askAITicketSystem((bodyText === null || bodyText === void 0 ? void 0 : bodyText.trim()) || tickets.description);
            // console.log(
            //   "🤖 AI Response:",
            //   this.cleanPlainEmailText(bodyText.trim()),
            //   JSON.stringify(aiResponse)
            // );
            if ((aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.success) && customer) {
                yield (0, sendSatisfactionEmail_1.sendSatisfactionEmail)({
                    body: aiResponse.answer,
                    ticketId: tickets.id,
                    requesterEmail: customer === null || customer === void 0 ? void 0 : customer.email,
                    // requesterEmail:  senderEmail,
                    ticketNumber: updatedTicket.ticket_number,
                    requesterName: senderNames || "",
                });
            }
            try {
                yield (0, ticketController_controller_1.generateSLAHistory)(tickets.id, slaConfig ? slaConfig.id : 0, tickets.created_at || new Date());
            }
            catch (slaError) {
                console.error("Error generating SLA history:", slaError);
            }
            if (attachments && attachments.length > 0) {
                yield this.saveTicketAttachments(tickets.id, attachments);
            }
            return updatedTicket;
        });
    }
    saveTicketAttachments(ticketId, attachments) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const attachmentRecords = attachments.map((att) => ({
                    ticket_id: ticketId,
                    file_name: att.originalName,
                    original_file_name: att.originalName,
                    file_path: att.fileUrl,
                    file_size: att.size,
                    content_type: att.mimeType,
                    uploaded_by_type: "Customer",
                    uploaded_by: null,
                    created_at: att.uploadedAt,
                }));
                yield prisma.ticket_attachments.createMany({
                    data: attachmentRecords,
                });
                console.log(`✅ Saved ${attachments.length} attachment(s) for ticket ${ticketId}`);
            }
            catch (error) {
                console.error(`❌ Error saving ticket attachments:`, error);
            }
        });
    }
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
    cleanSubject(subject) {
        return subject
            .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, "")
            .replace(/\[.*?\]/g, "")
            .trim()
            .substring(0, 255);
    }
    findCustomer(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
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
    findTicketByThreadId(threadId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ticket = yield prisma.tickets.findFirst({
                    where: {
                        email_thread_id: threadId,
                    },
                    include: {
                        customers: true,
                    },
                });
                return ticket;
            }
            catch (error) {
                console.error("❌ Error finding ticket by thread ID:", error);
                return null;
            }
        });
    }
    cleanBody(body) {
        return body.replace(/\r\n/g, "\n").trim() || "No content available";
    }
    stop() {
        console.log("🔄 Shutting down email service...");
        this.stopPolling();
        if (this.imap) {
            this.imap.end();
            this.imap = null;
        }
        console.log("📪 Email service stopped");
    }
}
exports.SimpleEmailTicketSystem = SimpleEmailTicketSystem;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const emailSystem = new SimpleEmailTicketSystem();
        try {
            yield emailSystem.start();
            process.on("SIGINT", () => {
                console.log("\n🔄 Shutting down...");
                emailSystem.stop();
                slaMonitorService_1.default.stop();
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
// import fs from "fs";
// import path from "path";
// import Imap from "imap";
// import { simpleParser } from "mailparser";
// import { PrismaClient } from "@prisma/client";
// import * as dotenv from "dotenv";
// import { generateTicketNumber } from "../utils/GenerateTicket.js";
// import { uploadFile } from "../utils/blackbaze.js";
// import slaMonitor from "./slaMonitorService.js";
// dotenv.config();
// // TypeScript Interfaces
// interface EmailConfig {
//   user: string;
//   password: string;
//   host: string;
//   port: number;
//   connTimeout: number;
//   tls: boolean;
//   authTimeout: number;
//   tlsOptions: {
//     rejectUnauthorized: boolean;
//     debug: (msg: string) => void;
//   };
// }
// interface ParsedEmail {
//   from: {
//     value: Array<{
//       address: string;
//       name?: string;
//     }>;
//   };
//   subject?: string;
//   text?: string;
//   html?: string;
//   messageId?: string;
//   references?: string[];
//   inReplyTo?: string;
//   body?: any;
//   attachments?: any;
// }
// interface EmailConfigurationRecord {
//   id: number;
//   log_inst: number | null;
//   username: string | null;
//   password: string | null;
//   smtp_server: string;
//   smtp_port: number | null;
//   is_active: boolean | null;
// }
// const prisma = new PrismaClient();
// class SimpleEmailTicketSystem {
//   private imap: Imap | null = null;
//   private lastUid = 0;
//   private lastUidFilePath: string;
//   private emailConfig: EmailConfig | null = null;
//   private configId: number;
//   private logInst: number;
//   private pollingInterval: NodeJS.Timeout | null = null;
//   private isIdleSupported = false;
//   // Dynamic constructor - accepts configuration parameters
//   constructor(logInst: number = 1, configId?: number) {
//     this.logInst = logInst;
//     this.configId = configId || 0;
//     this.lastUidFilePath = path.join(__dirname, `lastUid_${logInst}.txt`);
//   }
//   // Dynamic configuration loader
//   private async loadEmailConfiguration(): Promise<EmailConfig> {
//     try {
//       let emailConfiguration: Partial<EmailConfigurationRecord> | null;
//       emailConfiguration = await prisma.email_configurations.findFirst({
//         where: { log_inst: 1 },
//       });
//       if (!emailConfiguration) {
//         throw new Error(
//           `No email configuration found for logInst: ${this.logInst} or configId: ${this.configId}`
//         );
//       }
//       return {
//         user: emailConfiguration.username || process.env.SMTP_USERNAME!,
//         password: emailConfiguration.password || process.env.SMTP_PASSWORD!,
//         host: emailConfiguration.smtp_server || process.env.MAIL_HOST!,
//         port: emailConfiguration.smtp_port || 993,
//         connTimeout: 60000,
//         authTimeout: 30000,
//         tls: true,
//         tlsOptions: {
//           rejectUnauthorized: false,
//           debug: console.log,
//         },
//       };
//     } catch (error) {
//       console.error("❌ Error loading email configuration:", error);
//       throw error;
//     }
//   }
//   // Initialize with dynamic configuration
//   private async initializeConnection(): Promise<void> {
//     if (!this.emailConfig) {
//       this.emailConfig = await this.loadEmailConfiguration();
//     }
//     if (this.imap) {
//       this.imap.destroy();
//     }
//     this.imap = new Imap(this.emailConfig);
//   }
//   async start(): Promise<void> {
//     await this.loadLastUid();
//     await this.initializeConnection();
//     return new Promise((resolve, reject) => {
//       if (!this.imap) {
//         reject(new Error("IMAP connection not initialized"));
//         return;
//       }
//       this.imap.once("ready", () => {
//         console.log("✅ Connected to email server");
//         this.openInbox()
//           .then(() => {
//             this.listenForNewEmails();
//             // Check for new emails immediately on startup
//             console.log("🔍 Checking for emails on startup...");
//             this.fetchNewEmails();
//             // Start polling every 30 seconds as primary method
//             this.startPolling(30000);
//             resolve();
//           })
//           .catch(reject);
//       });
//       this.imap.once("error", (err: any) => {
//         console.error("❌ IMAP connection error:", err);
//         this.stopPolling();
//         reject(err);
//       });
//       // Handle connection closure
//       this.imap.once("close", (hadError: boolean) => {
//         console.log(`📪 Connection closed${hadError ? " with error" : ""}`);
//         this.stopPolling();
//         // Reconnect after 5 seconds
//         console.log("🔄 Reconnecting in 5 seconds...");
//         setTimeout(() => {
//           this.start().catch((err) => {
//             console.error("❌ Reconnection failed:", err);
//           });
//         }, 5000);
//       });
//       this.imap.connect();
//     });
//   }
//   private async loadLastUid(): Promise<void> {
//     try {
//       if (fs.existsSync(this.lastUidFilePath)) {
//         const content = await fs.promises.readFile(
//           this.lastUidFilePath,
//           "utf-8"
//         );
//         this.lastUid = parseInt(content, 10) || 0;
//         console.log(`📥 Loaded lastUid: ${this.lastUid}`);
//       } else {
//         this.lastUid = 0;
//         console.log("📥 lastUid file does not exist, starting from 0");
//       }
//     } catch (err) {
//       console.error("❌ Error loading lastUid file:", err);
//       this.lastUid = 0;
//     }
//   }
//   private async saveLastUid(newUid: number): Promise<void> {
//     try {
//       await fs.promises.writeFile(
//         this.lastUidFilePath,
//         newUid.toString(),
//         "utf-8"
//       );
//       this.lastUid = newUid;
//       console.log(`💾 Saved lastUid: ${this.lastUid}`);
//     } catch (err) {
//       console.error("❌ Error saving lastUid file:", err);
//     }
//   }
//   private openInbox(): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (!this.imap) {
//         reject(new Error("IMAP not initialized"));
//         return;
//       }
//       this.imap.openBox("INBOX", false, (err, box) => {
//         if (err) {
//           console.error("❌ Failed to open inbox:", err);
//           return reject(err);
//         }
//         console.log(
//           `📬 Inbox opened: total=${box.messages.total} unseen=${
//             box.messages.unseen || 0
//           } uidnext=${box.uidnext}`
//         );
//         // Check if server supports IDLE (for informational purposes)
//         if (this.imap?.serverSupports && this.imap.serverSupports("IDLE")) {
//           this.isIdleSupported = true;
//           console.log("✅ IMAP IDLE is supported (using polling method)");
//         } else {
//           console.log("⚠️ IMAP IDLE not supported, using polling only");
//         }
//         // If first run and lastUid = 0, initialize to uidnext - 1 to skip old emails
//         if (this.lastUid === 0) {
//           this.lastUid = box.uidnext - 1;
//           this.saveLastUid(this.lastUid);
//           console.log(`📝 Initial lastUid set to ${this.lastUid}`);
//         }
//         resolve();
//       });
//     });
//   }
//   // ✅ SIMPLIFIED: Listen for new emails (without IDLE)
//   private listenForNewEmails(): void {
//     if (!this.imap) return;
//     console.log("👂 Setting up email listeners...");
//     // Listen for 'mail' event (if server pushes notifications)
//     this.imap.on("mail", (numNewMsgs: number) => {
//       console.log(`📧 Mail event triggered: ${numNewMsgs} new email(s)`);
//       this.fetchNewEmails();
//     });
//     // Listen for 'update' event (mailbox status changed)
//     this.imap.on("update", (seqno: number, info: any) => {
//       console.log(`🔄 Mailbox update event: seqno=${seqno}`);
//       this.fetchNewEmails();
//     });
//     console.log("✅ Email listeners configured (relying on polling)");
//   }
//   // ✅ IMPROVED: Polling with error handling
//   private startPolling(intervalMs: number = 30000): void {
//     console.log(`🔄 Starting polling every ${intervalMs / 1000} seconds...`);
//     this.pollingInterval = setInterval(() => {
//       try {
//         console.log(
//           `🔍 [${new Date().toISOString()}] Polling for new emails...`
//         );
//         this.fetchNewEmails();
//       } catch (error) {
//         console.error("❌ Polling error:", error);
//       }
//     }, intervalMs);
//   }
//   private stopPolling(): void {
//     if (this.pollingInterval) {
//       clearInterval(this.pollingInterval);
//       this.pollingInterval = null;
//       console.log("⏹️ Polling stopped");
//     }
//   }
//   private fetchNewEmails(): void {
//     if (!this.imap) return;
//     this.imap.openBox("INBOX", false, (err, box) => {
//       if (err) {
//         console.error("❌ Error opening mailbox:", err);
//         return;
//       }
//       const currentUidNext = box.uidnext - 1;
//       console.log(`📊 Mailbox status:`, {
//         total: box.messages.total,
//         unseen: box.messages.unseen,
//         lastUid: this.lastUid,
//         currentUidNext,
//         newEmails: currentUidNext - this.lastUid,
//       });
//       if (currentUidNext > this.lastUid) {
//         const uidRange = `${this.lastUid + 1}:${currentUidNext}`;
//         console.log(`⬇️ Fetching emails with UID range: ${uidRange}`);
//         if (!this.imap) return;
//         // ✅ FIXED: Keep emails unread by removing markSeen: true
//         const fetcher = this.imap.fetch(uidRange, {
//           bodies: "",
//           // markSeen: false, // Keep emails unread
//         });
//         fetcher.on("message", (msg, seqno) => {
//           console.log(`📨 Processing email #${seqno}`);
//           this.processEmailMessage(msg, seqno);
//         });
//         fetcher.once("error", (err) => {
//           console.error("❌ Fetch error:", err);
//         });
//         fetcher.once("end", async () => {
//           console.log(
//             `✅ Finished fetching emails up to UID: ${currentUidNext}`
//           );
//           await this.saveLastUid(currentUidNext);
//         });
//       } else {
//         console.log("📭 No new emails to fetch");
//       }
//     });
//   }
//   private processEmailMessage(msg: any, seqno: number): void {
//     let emailBuffer = "";
//     msg.on("body", (stream: any) => {
//       stream.on("data", (chunk: Buffer) => {
//         emailBuffer += chunk.toString("utf8");
//       });
//       stream.once("end", async () => {
//         try {
//           // Parse the email
//           const parsedEmail: any = await simpleParser(emailBuffer);
//           await this.handleParsedEmail(parsedEmail);
//         } catch (error) {
//           console.error(`❌ Error processing email #${seqno}:`, error);
//         }
//       });
//     });
//   }
//   private async handleParsedEmail(email: ParsedEmail): Promise<void> {
//     try {
//       const senderEmail = email.from?.value?.[0]?.address?.toLowerCase();
//       const senderName =
//         email.from?.value?.[0]?.name ||
//         senderEmail?.split("@")[0] ||
//         "Unknown Sender";
//       const subject = email.subject || "No Subject";
//       const body = email.html || `<pre>${email.text}</pre>`;
//       const messageId = email.messageId;
//       const references = email.references || [];
//       const inReplyTo = email.inReplyTo;
//       const threadId = references.length > 0 ? references[0] : inReplyTo;
//       console.log(
//         `🧵 Processing email from: ${senderEmail}, subject: ${subject}`
//       );
//       if (!senderEmail) {
//         console.error("❌ No sender email found");
//         return;
//       }
//       // Process attachments
//       let attachments = await this.processEmailAttachments(email);
//       console.log(`📎 Found ${attachments.length} attachment(s)`);
//       let existingTicket = null;
//       // Check if this is a reply to an existing ticket
//       if (threadId) {
//         existingTicket = await this.findTicketByThreadId(threadId);
//         if (existingTicket) {
//           console.log(
//             `✅ Adding reply to existing ticket #${existingTicket.ticket_number}`
//           );
//           await this.createCommentFromEmail(
//             existingTicket,
//             senderEmail,
//             body,
//             messageId,
//             email,
//             attachments
//           );
//           return;
//         } else {
//           console.log(
//             `ℹ️ No existing ticket found with thread ID: ${threadId}`
//           );
//         }
//       }
//       // Find customer
//       const customer = await this.findCustomer(senderEmail);
//       // Create new ticket (even if customer not found, for external emails)
//       const ticket = await this.createTicket(
//         customer,
//         subject,
//         body,
//         senderEmail,
//         messageId,
//         threadId ?? "",
//         email,
//         senderName,
//         attachments
//       );
//       console.log(
//         `🎫 Ticket created: #${ticket.ticket_number} for ${
//           customer
//             ? `${customer.first_name} ${customer.last_name}`
//             : senderEmail
//         }`
//       );
//     } catch (error) {
//       console.error("❌ Error handling email:", error);
//     }
//   }
//   private async createCommentFromEmail(
//     ticket: any,
//     senderEmail: string,
//     body: string,
//     messageId?: string,
//     fullEmail?: ParsedEmail,
//     attachments?: any[]
//   ): Promise<void> {
//     try {
//       // Determine if this is from customer or internal user
//       const isCustomer =
//         ticket.customers?.email.toLowerCase() === senderEmail?.toLowerCase();
//       const cleanedBody = this.cleanBody(body);
//       console.log(`💬 Adding comment to ticket #${ticket.ticket_number}`);
//       const attachment_urls = JSON.stringify(
//         attachments?.map((val: any) => val.fileUrl) || []
//       );
//       await prisma.ticket_comments.create({
//         data: {
//           ticket_id: ticket.id,
//           customer_id: isCustomer ? ticket.customers?.id : null,
//           user_id: isCustomer ? null : undefined,
//           comment_text: cleanedBody,
//           comment_type: "email_reply",
//           is_internal: false,
//           email_message_id: messageId,
//           attachment_urls,
//         },
//       });
//       // Save attachments if any
//       if (attachments && attachments.length > 0) {
//         await this.saveTicketAttachments(ticket.id, attachments);
//       }
//       // Update ticket timestamp
//       await prisma.tickets.update({
//         where: { id: ticket.id },
//         data: { updated_at: new Date() },
//       });
//     } catch (error) {
//       console.error("❌ Error creating comment from email:", error);
//     }
//   }
//   private async processEmailAttachments(
//     email: any,
//     ticketNumber?: string
//   ): Promise<any[]> {
//     const attachments: any[] = [];
//     try {
//       if (email.attachments && email.attachments.length > 0) {
//         console.log(`📎 Processing ${email.attachments.length} attachment(s)`);
//         for (const attachment of email.attachments) {
//           try {
//             // Skip inline images that are embedded in HTML
//             if (attachment.cid && attachment.contentDisposition === "inline") {
//               continue;
//             }
//             // Validate file type and size
//             if (
//               !this.isAllowedFileType(
//                 attachment.filename || "",
//                 attachment.contentType || ""
//               )
//             ) {
//               console.warn(
//                 `❌ Skipping disallowed file type: ${attachment.filename}`
//               );
//               continue;
//             }
//             const maxSize = parseInt(
//               process.env.MAX_ATTACHMENT_SIZE || "10485760"
//             ); // 10MB default
//             if (attachment.size && attachment.size > maxSize) {
//               console.warn(
//                 `❌ Skipping oversized file: ${attachment.filename} (${attachment.size} bytes)`
//               );
//               continue;
//             }
//             // Generate unique filename for Backblaze B2
//             const timestamp = Date.now();
//             const sanitizedName = (attachment.filename || "unknown").replace(
//               /[^a-zA-Z0-9.-]/g,
//               "_"
//             );
//             const fileName = ticketNumber
//               ? `email-attachments/${ticketNumber}/${timestamp}_${sanitizedName}`
//               : `email-attachments/temp/${timestamp}_${sanitizedName}`;
//             console.log(
//               `📤 Uploading ${attachment.filename} to Backblaze B2...`
//             );
//             const fileUrl = await uploadFile(
//               attachment.content,
//               fileName,
//               attachment.contentType || "application/octet-stream"
//             );
//             const attachmentData = {
//               originalName: attachment.filename || "unknown",
//               fileName: fileName,
//               fileUrl: fileUrl,
//               mimeType: attachment.contentType || "application/octet-stream",
//               size: attachment.size || attachment.content?.length || 0,
//               uploadedAt: new Date(),
//             };
//             attachments.push(attachmentData);
//             console.log(
//               `✅ Uploaded attachment: ${attachment.filename} → ${fileUrl}`
//             );
//           } catch (attachmentError) {
//             console.error(
//               `❌ Error processing attachment ${attachment.filename}:`,
//               attachmentError
//             );
//           }
//         }
//       }
//     } catch (error) {
//       console.error("❌ Error processing email attachments:", error);
//     }
//     return attachments;
//   }
//   private async createTicket(
//     customer: any,
//     subject: string,
//     body: string,
//     senderEmail: string,
//     emailMessageId?: string,
//     threadId?: string,
//     fullEmail?: ParsedEmail,
//     senderNames?: string,
//     attachments?: any[]
//   ): Promise<any> {
//     const ticketNumber = `TCKT-${Date.now()}`;
//     const slaConfig = await prisma.sla_configurations.findFirst({
//       where: {
//         priority: "Medium",
//       },
//     });
//     const cleanedBody = this.cleanBody(body);
//     const attachment_urls = JSON.stringify(
//       attachments?.map((val: any) => val.fileUrl) || []
//     );
//     const tickets = await prisma.tickets.create({
//       data: {
//         ticket_number: ticketNumber,
//         customer_id: customer?.id || null,
//         customer_name: senderNames || "",
//         customer_email: senderEmail,
//         subject: this.cleanSubject(subject),
//         description: cleanedBody,
//         priority: slaConfig ? slaConfig.id : 0,
//         status: "Open",
//         source: "Email",
//         original_email_message_id: emailMessageId,
//         email_thread_id: threadId || emailMessageId,
//         attachment_urls,
//       },
//     });
//     if (attachments && attachments.length > 0) {
//       await this.saveTicketAttachments(tickets.id, attachments);
//     }
//     const updatedTicket = await prisma.tickets.update({
//       where: { id: tickets.id },
//       data: {
//         ticket_number: generateTicketNumber(tickets.id),
//       },
//     });
//     // 🔔 TRIGGER NEW TICKET NOTIFICATION
//     // await notificationService.notify(
//     //   "new_ticket",
//     //   [Number(assigned_agent_id)],
//     //   {
//     //     ticketId: tickets.id,
//     //     ticketNumber: tickets.ticket_number,
//     //     subject: tickets.subject,
//     //     priority: "Medium",
//     //     customerName:
//     //       tickets.customer_name || tickets.customer_email,
//     //   }
//     // );
//     return updatedTicket;
//   }
//   // Add this new method to the class:
//   // private async triggerNewTicketNotification(
//   //   ticket: any,
//   //   customer: any,
//   //   senderName: string
//   // ): Promise<void> {
//   //   try {
//   //     // Import the notification service
//   //     const notificationService = require("./notificationService").default;
//   //     // Get available agents (you can customize this logic)
//   //     const agents = await prisma.users.findMany({
//   //       where: {
//   //         // role: { in: ['AGENT', 'SUPERVISOR', 'ADMIN'] },
//   //         is_active: true,
//   //       },
//   //     });
//   //     if (agents.length > 0) {
//   //       await notificationService.notify(
//   //         "new_ticket",
//   //         agents.map((a) => a.id),
//   //         {
//   //           ticketId: tickets.id,
//   //           ticketNumber: ticket.ticket_number,
//   //           subject: ticket.subject,
//   //           priority: ticket.priority,
//   //           customerName:
//   //             senderName || customer?.first_name || ticket.customer_email,
//   //         }
//   //       );
//   //     }
//   //   } catch (error) {
//   //     console.error("❌ Error triggering new ticket notification:", error);
//   //   }
//   // }
//   private async saveTicketAttachments(
//     ticketId: number,
//     attachments: any[]
//   ): Promise<void> {
//     try {
//       const attachmentRecords = attachments.map((att) => ({
//         ticket_id: ticketId,
//         file_name: att.originalName,
//         original_file_name: att.originalName,
//         file_path: att.fileUrl,
//         file_size: att.size,
//         content_type: att.mimeType,
//         uploaded_by_type: "Customer",
//         uploaded_by: null,
//         created_at: att.uploadedAt,
//       }));
//       await prisma.ticket_attachments.createMany({
//         data: attachmentRecords,
//       });
//       console.log(
//         `✅ Saved ${attachments.length} attachment(s) for ticket ${ticketId}`
//       );
//     } catch (error) {
//       console.error(`❌ Error saving ticket attachments:`, error);
//     }
//   }
//   private isAllowedFileType(filename: string, mimeType: string): boolean {
//     const allowedExtensions = [
//       ".jpg",
//       ".jpeg",
//       ".png",
//       ".gif",
//       ".pdf",
//       ".doc",
//       ".docx",
//       ".txt",
//       ".zip",
//       ".xlsx",
//       ".pptx",
//       ".csv",
//     ];
//     const allowedMimeTypes = [
//       "image/jpeg",
//       "image/png",
//       "image/gif",
//       "application/pdf",
//       "application/msword",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//       "text/plain",
//       "application/zip",
//       "application/vnd.ms-excel",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//       "application/vnd.ms-powerpoint",
//       "application/vnd.openxmlformats-officedocument.presentationml.presentation",
//       "text/csv",
//     ];
//     const extension = path.extname(filename).toLowerCase();
//     return (
//       allowedExtensions.includes(extension) ||
//       allowedMimeTypes.includes(mimeType)
//     );
//   }
//   private cleanSubject(subject: string): string {
//     return subject
//       .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, "")
//       .replace(/\[.*?\]/g, "")
//       .trim()
//       .substring(0, 255);
//   }
//   private async findCustomer(email: string): Promise<any | null> {
//     try {
//       return await prisma.customers.findFirst({
//         where: {
//           email: email,
//         },
//       });
//     } catch (error) {
//       console.error("❌ Database error while finding customer:", error);
//       return null;
//     }
//   }
//   private async findTicketByThreadId(threadId: string): Promise<any | null> {
//     try {
//       const ticket = await prisma.tickets.findFirst({
//         where: {
//           email_thread_id: threadId,
//         },
//         include: {
//           customers: true,
//         },
//       });
//       return ticket;
//     } catch (error) {
//       console.error("❌ Error finding ticket by thread ID:", error);
//       return null;
//     }
//   }
//   private cleanBody(body: string): string {
//     // Basic email body cleanup
//     return (
//       body.replace(/\r\n/g, "\n").trim().substring(0, 10000) ||
//       "No content available"
//     );
//   }
//   // ✅ IMPROVED: Stop method
//   stop(): void {
//     console.log("🔄 Shutting down email service...");
//     this.stopPolling();
//     if (this.imap) {
//       this.imap.end();
//       this.imap = null;
//     }
//     console.log("📪 Email service stopped");
//   }
// }
// // MAIN FUNCTION: Entry point of the application
// async function main(): Promise<void> {
//   const emailSystem = new SimpleEmailTicketSystem();
//   try {
//     await emailSystem.start();
//     // Keep the process running
//     process.on("SIGINT", () => {
//       console.log("\n🔄 Shutting down...");
//       emailSystem.stop();
//       slaMonitor.stop();
//       prisma.$disconnect();
//       process.exit(0);
//     });
//   } catch (error) {
//     console.error("❌ Failed to start email system:", error);
//     process.exit(1);
//   }
// }
// export { SimpleEmailTicketSystem, main };
// import fs from "fs";
// import path from "path";
// import Imap from "imap";
// import { simpleParser } from "mailparser";
// import { PrismaClient } from "@prisma/client";
// import * as dotenv from "dotenv";
// import { generateTicketNumber } from "../utils/GenerateTicket.js";
// import { uploadFile } from "../utils/blackbaze.js";
// dotenv.config();
// // TypeScript Interfaces
// interface EmailConfig {
//   user: string;
//   password: string;
//   host: string;
//   port: number;
//   connTimeout: number;
//   tls: boolean;
//   authTimeout: number;
//   tlsOptions: {
//     rejectUnauthorized: boolean;
//     debug: (msg: string) => void;
//   };
// }
// interface ParsedEmail {
//   from: {
//     value: Array<{
//       address: string;
//       name?: string;
//     }>;
//   };
//   subject?: string;
//   text?: string;
//   html?: string;
//   messageId?: string;
//   references?: string[];
//   inReplyTo?: string;
//   body?: any;
//   attachments?: any;
// }
// interface EmailConfigurationRecord {
//   id: number;
//   log_inst: number | null;
//   username: string | null;
//   password: string | null;
//   smtp_server: string;
//   smtp_port: number | null;
//   is_active: boolean | null;
// }
// // const emailConfiguration = await prisma.email_configurations.findFirst({
// //   where: { log_inst: 1 },
// // });
// // const prisma = new PrismaClient();
// // const emailConfig: EmailConfig = {
// //   user: emailConfiguration.username || process.env.SMTP_USERNAME!,
// //   password: emailConfiguration?.password || process.env.SMTP_PASSWORD!,
// //   host: emailConfiguration?.smtp_server || process.env.MAIL_HOST!,
// //   port: emailConfiguration?.smtp_port || 993,
// //   connTimeout: 60000, // 60 seconds connection timeout
// //   authTimeout: 30000,
// //   tls: true,
// //   tlsOptions: {
// //     rejectUnauthorized: false,
// //     debug: console.log, // <-- Add this line to allow self-signed certificates
// //   },
// // };
// const prisma = new PrismaClient();
// class SimpleEmailTicketSystem {
//   private imap: Imap | null = null;
//   private lastUid = 0;
//   private lastUidFilePath: string;
//   private emailConfig: EmailConfig | null = null;
//   private configId: number;
//   private logInst: number;
//   private pollingInterval: NodeJS.Timeout | null = null; // ✅ NEW: Polling timer
//   private isIdleSupported = false; // ✅ NEW: Track IDLE support
//   // Dynamic constructor - accepts configuration parameters
//   constructor(logInst: number = 1, configId?: number) {
//     this.logInst = logInst;
//     this.configId = configId || 0;
//     this.lastUidFilePath = path.join(__dirname, `lastUid_${logInst}.txt`);
//   }
//   // Dynamic configuration loader
//   private async loadEmailConfiguration(): Promise<EmailConfig> {
//     try {
//       let emailConfiguration: Partial<EmailConfigurationRecord> | null;
//       emailConfiguration = await prisma.email_configurations.findFirst({
//         where: { log_inst: 1 },
//       });
//       if (!emailConfiguration) {
//         throw new Error(
//           `No email configuration found for logInst: ${this.logInst} or configId: ${this.configId}`
//         );
//       }
//       return {
//         user: emailConfiguration.username || process.env.SMTP_USERNAME!,
//         password: emailConfiguration.password || process.env.SMTP_PASSWORD!,
//         host: emailConfiguration.smtp_server || process.env.MAIL_HOST!,
//         port: emailConfiguration.smtp_port || 993,
//         connTimeout: 60000,
//         authTimeout: 30000,
//         tls: true,
//         tlsOptions: {
//           rejectUnauthorized: false,
//           debug: console.log,
//         },
//       };
//     } catch (error) {
//       console.error("❌ Error loading email configuration:", error);
//       throw error;
//     }
//   }
//   // Initialize with dynamic configuration
//   private async initializeConnection(): Promise<void> {
//     if (!this.emailConfig) {
//       this.emailConfig = await this.loadEmailConfiguration();
//     }
//     if (this.imap) {
//       this.imap.destroy();
//     }
//     this.imap = new Imap(this.emailConfig);
//   }
//   async start(): Promise<void> {
//     await this.loadLastUid();
//     await this.initializeConnection();
//     return new Promise((resolve, reject) => {
//       if (!this.imap) {
//         reject(new Error("IMAP connection not initialized"));
//         return;
//       }
//       this.imap.once("ready", () => {
//         this.openInbox()
//           .then(() => {
//             this.listenForNewEmails();
//             // ✅ Check for new emails immediately on startup
//             this.fetchNewEmails();
//             // ✅ Start polling as fallback (every 30 seconds)
//             this.startPolling(30000);
//             resolve();
//           })
//           .catch(reject);
//       });
//       this.imap.once("error", reject);
//       // ✅ Handle connection closure
//       this.imap.once("close", () => {
//         console.log("📪 Connection closed, attempting to reconnect...");
//         this.stopPolling();
//         setTimeout(() => this.start(), 5000); // Reconnect after 5 seconds
//       });
//       this.imap.connect();
//     });
//   }
//   private async loadLastUid(): Promise<void> {
//     try {
//       if (fs.existsSync(this.lastUidFilePath)) {
//         const content = await fs.promises.readFile(
//           this.lastUidFilePath,
//           "utf-8"
//         );
//         this.lastUid = parseInt(content, 10) || 0;
//         console.log(`📥 Loaded lastUid: ${this.lastUid}`);
//       } else {
//         this.lastUid = 0;
//         console.log("📥 lastUid file does not exist, starting from 0");
//       }
//     } catch (err) {
//       console.error("❌ Error loading lastUid file:", err);
//       this.lastUid = 0;
//     }
//   }
//   private async saveLastUid(newUid: number): Promise<void> {
//     try {
//       await fs.promises.writeFile(
//         this.lastUidFilePath,
//         newUid.toString(),
//         "utf-8"
//       );
//       this.lastUid = newUid;
//       console.log(`💾 Saved lastUid: ${this.lastUid}`);
//     } catch (err) {
//       console.error("❌ Error saving lastUid file:", err);
//     }
//   }
//   private openInbox(): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (!this.imap) {
//         reject(new Error("IMAP not initialized"));
//         return;
//       }
//       this.imap.openBox("INBOX", false, (err, box) => {
//         if (err) {
//           console.error("❌ Failed to open inbox:", err);
//           return reject(err);
//         }
//         console.log(
//           `📬 Inbox opened: total=${box.messages.total} unseen=${
//             box.messages.unseen || 0
//           } uidnext=${box.uidnext}`
//         );
//         // Check if server supports IDLE
//         if (this.imap?.serverSupports && this.imap.serverSupports("IDLE")) {
//           this.isIdleSupported = true;
//           console.log("✅ IMAP IDLE is supported");
//         } else {
//           console.log("⚠️ IMAP IDLE not supported, using polling only");
//         }
//         // If first run and lastUid = 0, initialize to uidnext - 1 to skip old emails
//         if (this.lastUid === 0) {
//           this.lastUid = box.uidnext - 1;
//           this.saveLastUid(this.lastUid);
//           console.log(`Initial lastUid set to ${this.lastUid}`);
//         }
//         resolve();
//       });
//     });
//   }
//   // ✅ IMPROVED: Listen for new emails with IDLE support
//   private listenForNewEmails(): void {
//     if (!this.imap) return;
//     console.log("👂 Setting up email listeners...");
//     // Listen for 'mail' event (triggered by IDLE or server push)
//     this.imap.on("mail", (numNewMsgs: number) => {
//       console.log(`📧 Mail event triggered: ${numNewMsgs} new email(s)`);
//       this.fetchNewEmails();
//     });
//     // Listen for 'update' event (mailbox status changed)
//     this.imap.on("update", (seqno: number, info: any) => {
//       console.log(`🔄 Mailbox update event: seqno=${seqno}`);
//       this.fetchNewEmails();
//     });
//     // ✅ Enable IDLE mode if supported
//     if (this.isIdleSupported) {
//       this.enableIdle();
//     }
//   }
//   // ✅ NEW: Enable IMAP IDLE for real-time notifications
//   private enableIdle(): void {
//     if (!this.imap) return;
//     try {
//       console.log("💤 Entering IDLE mode...");
//       // @ts-ignore - IDLE is not in type definitions but exists
//       this.imap.idle((err: any) => {
//         if (err) {
//           console.error("❌ IDLE error:", err);
//           return;
//         }
//         console.log("✅ IDLE mode activated");
//       });
//       // Exit IDLE and re-enter periodically (required by RFC)
//       setInterval(() => {
//         if (!this.imap) return;
//         console.log("🔄 Refreshing IDLE connection...");
//         // @ts-ignore
//         this.imap.idle((err: any) => {
//           if (err) console.error("❌ IDLE refresh error:", err);
//         });
//       }, 25 * 60 * 1000); // Refresh every 25 minutes (IMAP IDLE timeout is usually 29 min)
//     } catch (error) {
//       console.error("❌ Failed to enable IDLE:", error);
//     }
//   }
//   private startPolling(intervalMs: number = 30000): void {
//     console.log(`🔄 Starting polling every ${intervalMs / 1000} seconds...`);
//     this.pollingInterval = setInterval(() => {
//       try {
//         console.log(
//           `🔍 [${new Date().toISOString()}] Polling for new emails...`
//         );
//         this.fetchNewEmails();
//       } catch (error) {
//         console.error("❌ Polling error:", error);
//       }
//     }, intervalMs);
//   }
//   // ✅ NEW: Stop polling
//   private stopPolling(): void {
//     if (this.pollingInterval) {
//       clearInterval(this.pollingInterval);
//       this.pollingInterval = null;
//       console.log("⏹️ Polling stopped");
//     }
//   }
//   private fetchNewEmails(): void {
//     if (!this.imap) return;
//     this.imap.openBox("INBOX", (err, box) => {
//       if (err) {
//         console.error("❌ Error fetching mailbox status:", err);
//         return;
//       }
//       console.log(
//         `Mailbox status: total=${box.messages.total} unseen=${box.messages.unseen} uidnext=${box.uidnext} uiOld=${this.lastUid} UiNew=${box.uidnext}`
//       );
//       const newUidNext = box.uidnext - 1;
//       if (newUidNext > this.lastUid) {
//         const uidRange = `${this.lastUid + 1}:${newUidNext}`;
//         console.log(`⬇️ Fetching emails with UID range: ${uidRange}`);
//         if (!this.imap) return;
//         const fetcher = this.imap.fetch(uidRange, {
//           bodies: "",
//           markSeen: true,
//         });
//         fetcher.on("message", (msg, seqno) =>
//           this.processEmailMessage(msg, seqno)
//         );
//         fetcher.once("error", (err) => console.error("❌ Fetch error:", err));
//         fetcher.once("end", async () => {
//           console.log("✅ Finished fetching emails");
//           await this.saveLastUid(newUidNext);
//         });
//         console.log(`✅ Fetch complete up to UID: ${newUidNext}`);
//       } else {
//         console.log("📭 No new emails to fetch");
//       }
//     });
//   }
//   //  ENTRY POINT: Start the email monitoring system
//   // async start(): Promise<void> {
//   //   return new Promise((resolve, reject) => {
//   //     this.imap.once("ready", () => {
//   //       console.log("✅ Connected to email server");
//   //       this.openInbox(); // ← CONNECTS TO: openInbox()
//   //       this.listenForNewEmails(); // ← CONNECTS TO: listenForNewEmails()
//   //       resolve();
//   //     });
//   //     this.imap.once("error", reject);
//   //     this.imap.connect(); // ← INITIATES CONNECTION
//   //   });
//   // }
//   // // //  STEP 1: Open the inbox folder
//   // private openInbox(): void {
//   //   this.imap.openBox("INBOX", false, (err: any, box: any) => {
//   //     if (err) {
//   //       console.error("❌ Failed to open inbox:", err);
//   //     } else {
//   //       console.log(
//   //         `📬 Inbox opened: ${box.messages.total} total messages, ${box.messages.unseen} unseen`
//   //       );
//   //       this.fetchNewEmails(); // ← CONNECTS TO: fetchNewEmails() (initial fetch)
//   //     }
//   //   });
//   // }
//   // //  STEP 2: Listen for new emails in real-time
//   // private listenForNewEmails(): void {
//   //   this.imap.on("mail", (numNewMsgs: number) => {
//   //     console.log(`📧 ${numNewMsgs} new email(s) received`);
//   //     this.fetchNewEmails(); // ← CONNECTS TO: fetchNewEmails() (on new mail)
//   //   });
//   // }
//   // //  STEP 3: Fetch all unread emails
//   // private fetchNewEmails(): void {
//   //   this.imap.search(["UNSEEN", "RECENT", "NEW"], (err: any, results: any) => {
//   //     if (err) {
//   //       console.error("❌ Search error:", err);
//   //       return;
//   //     }
//   //     console.log("Search results:", results);
//   //     if (!results || results.length === 0) {
//   //       console.log("📭 No new emails to process");
//   //       return;
//   //     }
//   //     console.log(`📧 Processing ${results.length} new email(s)`);
//   //     // Fetch email content
//   //     const fetch = this.imap.fetch(results, {
//   //       bodies: "",
//   //       markSeen: true,
//   //     });
//   //     fetch.on("message", (msg: any, seqno: any) => {
//   //       this.processEmailMessage(msg, seqno); // ← CONNECTS TO: processEmailMessage()
//   //     });
//   //   });
//   // }
//   //  STEP 4: Process individual email message
//   private processEmailMessage(msg: any, seqno: number): void {
//     let emailBuffer = "";
//     msg.on("body", (stream: any) => {
//       stream.on("data", (chunk: Buffer) => {
//         emailBuffer += chunk.toString("utf8");
//       });
//       stream.once("end", async () => {
//         try {
//           // Parse the email
//           const parsedEmail: any = await simpleParser(emailBuffer);
//           await this.handleParsedEmail(parsedEmail); // ← CONNECTS TO: handleParsedEmail()
//         } catch (error) {
//           console.error(`❌ Error processing email #${seqno}:`, error);
//         }
//       });
//     });
//   }
//   //  STEP 5: Handle parsed email and create ticket
//   // ✅ STEP 5: Handle parsed email and create ticket - IMPROVED VERSION
//   private async handleParsedEmail(email: ParsedEmail): Promise<void> {
//     try {
//       const senderEmail = email.from?.value?.[0]?.address?.toLowerCase();
//       const senderName =
//         email.from?.value?.[0]?.name ||
//         senderEmail?.split("@")[0] ||
//         "Unknown Sender";
//       const subject = email.subject || "No Subject";
//       // const body = email.html || email.text || "No content";
//       const body = email.html || `<pre>${email.text}</pre>`;
//       const messageId = email.messageId;
//       const references = email.references || [];
//       const inReplyTo = email.inReplyTo;
//       const threadId = references.length > 0 ? references[0] : inReplyTo;
//       console.log(`🧵 Extracted Thread ID: ${threadId}`, email);
//       if (!senderEmail) {
//         console.error("❌ No sender email found");
//         return;
//       }
//       // ✅ Process attachments (without ticket number for now)
//       let attachments = await this.processEmailAttachments(email);
//       console.log("Attachments : ", email.attachments, attachments);
//       let existingTicket = null;
//       if (threadId) {
//         existingTicket = await this.findTicketByThreadId(threadId);
//         console.log(`🧵 Extracted `, existingTicket);
//         if (existingTicket) {
//           await this.createCommentFromEmail(
//             existingTicket,
//             senderEmail,
//             body,
//             messageId,
//             email,
//             attachments
//           );
//           return;
//         } else {
//           console.log(` No existing ticket found with thread ID: ${threadId}`);
//         }
//       }
//       const customer = await this.findCustomer(senderEmail);
//       // if (!customer) {
//       //   console.log(`❌ Email ignored - ${senderEmail} is not a customer`);
//       //   return;
//       // }
//       const ticket = await this.createTicket(
//         customer,
//         subject,
//         body,
//         senderEmail,
//         messageId,
//         threadId ?? "",
//         email,
//         senderName,
//         attachments
//       );
//       console.log(
//         `Ticket created: #${ticket.ticket_number} for ${customer?.first_name} ${customer?.last_name}`
//       );
//     } catch (error) {
//       console.error("Error handling email:", error);
//     }
//   }
//   private async createCommentFromEmail(
//     ticket: any,
//     senderEmail: string,
//     body: string,
//     messageId?: string,
//     fullEmail?: ParsedEmail,
//     attachments?: any[]
//   ): Promise<void> {
//     try {
//       // Determine if this is from customer or internal user
//       const isCustomer =
//         ticket.customers?.email.toLowerCase() === senderEmail?.toLowerCase();
//       // ✅ Clean and process the email body
//       // const cleanedBody = this.cleanEmailBody(body, fullEmail);
//       const cleanedBody = this.cleanBody(body);
//       console.log(`Adding comment to ticket #${ticket.ticket_number} `);
//       const attachment_urls = JSON.stringify(
//         attachments?.map((val: any) => val.fileUrl)
//       );
//       const res = await prisma.ticket_comments.create({
//         data: {
//           ticket_id: ticket.id,
//           customer_id: isCustomer ? ticket.customers?.id : null,
//           user_id: isCustomer ? null : undefined,
//           comment_text: cleanedBody,
//           comment_type: "email_reply",
//           is_internal: false,
//           email_message_id: messageId,
//           attachment_urls,
//         },
//       });
//       // ✅ Save attachments if any
//       if (attachments && attachments.length > 0) {
//         await this.saveTicketAttachments(ticket.id, attachments);
//       }
//       // Update ticket timestamp
//       await prisma.tickets.update({
//         where: { id: ticket.id },
//         data: { updated_at: new Date() },
//       });
//     } catch (error) {
//       console.error("❌ Error creating comment from email:", error);
//     }
//   }
//   // ✅ CORRECTED: Process email attachments with Backblaze B2
//   private async processEmailAttachments(
//     email: any,
//     ticketNumber?: string
//   ): Promise<any[]> {
//     const attachments: any[] = [];
//     try {
//       if (email.attachments && email.attachments.length > 0) {
//         console.log(`📎 Processing ${email.attachments.length} attachment(s)`);
//         for (const attachment of email.attachments) {
//           try {
//             // Skip inline images that are embedded in HTML
//             if (attachment.cid && attachment.contentDisposition === "inline") {
//               continue;
//             }
//             // Validate file type and size
//             if (
//               !this.isAllowedFileType(
//                 attachment.filename || "",
//                 attachment.contentType || ""
//               )
//             ) {
//               console.warn(
//                 `❌ Skipping disallowed file type: ${attachment.filename}`
//               );
//               continue;
//             }
//             const maxSize = parseInt(
//               process.env.MAX_ATTACHMENT_SIZE || "10485760"
//             ); // 10MB default
//             if (attachment.size && attachment.size > maxSize) {
//               console.warn(
//                 `❌ Skipping oversized file: ${attachment.filename} (${attachment.size} bytes)`
//               );
//               continue;
//             }
//             // Generate unique filename for Backblaze B2
//             const timestamp = Date.now();
//             const fileExtension =
//               path.extname(attachment.filename || "") || ".bin";
//             const sanitizedName = (attachment.filename || "unknown").replace(
//               /[^a-zA-Z0-9.-]/g,
//               "_"
//             ); // Replace special chars
//             const fileName = ticketNumber
//               ? `email-attachments/${ticketNumber}/${timestamp}_${sanitizedName}`
//               : `email-attachments/temp/${timestamp}_${sanitizedName}`;
//             // ✅ Upload to Backblaze B2
//             console.log(
//               `📤 Uploading ${attachment.filename} to Backblaze B2...`
//             );
//             const fileUrl = await uploadFile(
//               attachment.content,
//               fileName,
//               attachment.contentType || "application/octet-stream"
//             );
//             const attachmentData = {
//               originalName: attachment.filename || "unknown",
//               fileName: fileName,
//               fileUrl: fileUrl,
//               mimeType: attachment.contentType || "application/octet-stream",
//               size: attachment.size || attachment.content?.length || 0,
//               uploadedAt: new Date(),
//             };
//             attachments.push(attachmentData);
//             console.log(
//               `✅ Uploaded attachment: ${attachment.filename} → ${fileUrl}`
//             );
//           } catch (attachmentError) {
//             console.log("Error in attachment convert : ", attachmentError);
//             console.error(
//               `❌ Error processing attachment ${attachment.filename}:`,
//               attachmentError
//             );
//           }
//         }
//       }
//     } catch (error) {
//       console.error("❌ Error processing email attachments:", error);
//     }
//     return attachments;
//   }
//   // ✅ IMPROVED: Create ticket with better content handling
//   private async createTicket(
//     customer: any,
//     subject: string,
//     body: string,
//     senderEmail: string,
//     emailMessageId?: string,
//     threadId?: string,
//     fullEmail?: ParsedEmail,
//     senderNames?: string,
//     attachments?: any[]
//   ): Promise<any> {
//     const ticketNumber = `TCKT-${Date.now()}`;
//     const ids = await prisma.sla_configurations.findFirst({
//       where: {
//         priority: "Medium",
//       },
//     });
//     // ✅ Clean and process the email body
//     // const cleanedBody = this.cleanEmailBody(body, fullEmail);
//     const cleanedBody = this.cleanBody(body);
//     const attachment_urls = JSON.stringify(
//       attachments?.map((val: any) => val.fileUrl)
//     );
//     const tickets = await prisma.tickets.create({
//       data: {
//         ticket_number: ticketNumber,
//         customer_id: customer?.id || null,
//         customer_name: senderNames || "",
//         customer_email: senderEmail,
//         subject: this.cleanSubject(subject),
//         description: cleanedBody,
//         priority: ids ? ids?.id : 0,
//         status: "Open",
//         source: "Email",
//         original_email_message_id: emailMessageId,
//         email_thread_id: threadId || emailMessageId,
//         attachment_urls,
//       },
//     });
//     if (attachments && attachments.length > 0) {
//       await this.saveTicketAttachments(tickets.id, attachments);
//     }
//     return await prisma.tickets.update({
//       where: { id: tickets.id },
//       data: {
//         ticket_number: generateTicketNumber(tickets.id),
//       },
//     });
//   }
//   // ✅ NEW: Save ticket attachments to database
//   private async saveTicketAttachments(
//     ticketId: number,
//     attachments: any[]
//   ): Promise<void> {
//     try {
//       const attachmentRecords = attachments.map((att) => ({
//         ticket_id: ticketId,
//         file_name: att.originalName,
//         original_file_name: att.originalName,
//         file_path: att.fileUrl, // Store Backblaze B2 URL
//         file_size: att.size,
//         content_type: att.mimeType,
//         uploaded_by_type: "Customer",
//         uploaded_by: null, // From email, so no user
//         created_at: att.uploadedAt,
//       }));
//       await prisma.ticket_attachments.createMany({
//         data: attachmentRecords,
//       });
//       console.log(
//         `✅ Saved ${attachments.length} Backblaze B2 attachment(s) for ticket ${ticketId}`
//       );
//     } catch (error) {
//       console.error(`❌ Error saving ticket attachments:`, error);
//     }
//   }
//   // ✅ Utility: Check if file type is allowed
//   private isAllowedFileType(filename: string, mimeType: string): boolean {
//     const allowedExtensions = [
//       ".jpg",
//       ".jpeg",
//       ".png",
//       ".gif",
//       ".pdf",
//       ".doc",
//       ".docx",
//       ".txt",
//       ".zip",
//       ".xlsx",
//       ".pptx",
//       ".csv",
//     ];
//     const allowedMimeTypes = [
//       "image/jpeg",
//       "image/png",
//       "image/gif",
//       "application/pdf",
//       "application/msword",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//       "text/plain",
//       "application/zip",
//       "application/vnd.ms-excel",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//       "application/vnd.ms-powerpoint",
//       "application/vnd.openxmlformats-officedocument.presentationml.presentation",
//       "text/csv",
//     ];
//     const extension = path.extname(filename).toLowerCase();
//     return (
//       allowedExtensions.includes(extension) ||
//       allowedMimeTypes.includes(mimeType)
//     );
//   }
//   // ✅ IMPROVED: Clean email subject
//   private cleanSubject(subject: string): string {
//     return subject
//       .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, "")
//       .replace(/\[.*?\]/g, "") // Remove bracketed text like [EXTERNAL]
//       .trim()
//       .substring(0, 255);
//   }
//   //  STEP 6: Find customer in database
//   private async findCustomer(email: string): Promise<any | null> {
//     try {
//       await prisma.$connect();
//       return await prisma.customers.findFirst({
//         where: {
//           email: email,
//         },
//       });
//     } catch (error) {
//       console.error("❌ Database error while finding customer:", error);
//       return null;
//     }
//   }
//   // ✅ NEW: Find ticket by Thread ID (most reliable method)
//   private async findTicketByThreadId(threadId: string): Promise<any | null> {
//     try {
//       const ticket = await prisma.tickets.findFirst({
//         where: {
//           email_thread_id: threadId, // ✅ Make sure this matches your DB column name
//         },
//         include: {
//           customers: true,
//         },
//       });
//       if (ticket) {
//         console.log(`✅ Found existing ticket: #${ticket.ticket_number}`);
//       } else {
//         console.log(`❌ No existing ticket found with thread ID: ${threadId}`);
//       }
//       return ticket;
//     } catch (error) {
//       console.error("❌ Error finding ticket by thread ID:", error);
//       return null;
//     }
//   }
//   // ✅ NEW: Create comment from email reply
//   // private async createCommentFromEmail(
//   //   ticket: any,
//   //   senderEmail: string,
//   //   body: string,
//   //   messageId?: string
//   // ): Promise<void> {
//   //   try {
//   //     // Determine if this is from customer or internal user
//   //     const isCustomer =
//   //       ticket.customers.email.toLowerCase() === senderEmail.toLowerCase();
//   //     await prisma.ticket_comments.create({
//   //       data: {
//   //         ticket_id: ticket.id,
//   //         customer_id: isCustomer ? ticket.customers.id : null,
//   //         user_id: isCustomer ? null : undefined, // You might want to find user by email
//   //         comment_text: this.cleanBody(body),
//   //         comment_type: "email_reply",
//   //         is_internal: false,
//   //         email_message_id: messageId,
//   //       },
//   //     });
//   //     // Update ticket timestamp
//   //     await prisma.tickets.update({
//   //       where: { id: ticket.id },
//   //       data: { updated_at: new Date() },
//   //     });
//   //   } catch (error) {
//   //     console.error("❌ Error creating comment from email:", error);
//   //   }
//   // }
//   //  STEP 7: Create ticket from email
//   // private async createTicket(
//   //   customer: any,
//   //   subject: string,
//   //   body: string,
//   //   senderEmail: string,
//   //   emailMessageId?: string, // ✅ NEW: Original email message ID
//   //   threadId?: string // ✅ NEW: Email thread ID
//   // ): Promise<any> {
//   //   const ticketNumber = `TCKT-${Date.now()}`;
//   //   return await prisma.tickets.create({
//   //     data: {
//   //       ticket_number: ticketNumber,
//   //       customer_id: customer.id,
//   //       subject: this.cleanSubject(subject),
//   //       description: this.cleanBody(body),
//   //       priority: "Medium",
//   //       status: "Open",
//   //       source: "Email",
//   //       original_email_message_id: emailMessageId, // ✅ Store original email ID
//   //       email_thread_id: threadId || emailMessageId, // ✅ Store thread ID
//   //     },
//   //   });
//   // }
//   //  UTILITY: Clean email subject (remove Re:, Fwd: etc.)
//   // private cleanSubject(subject: string): string {
//   //   return subject
//   //     .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, "")
//   //     .trim()
//   //     .substring(0, 255);
//   // }
//   //  UTILITY: Clean email body (remove signatures, replies)
//   private cleanBody(body: string): string {
//     return body.replace("\n", "");
//     const lines = body.split("\n");
//     const cleanLines: string[] = [];
//     for (const line of lines) {
//       const trimmed = line.trim();
//       // Stop at signature indicators
//       if (
//         trimmed.match(/^--\s*$/) ||
//         trimmed.match(/^From:.*$/i) ||
//         trimmed.match(/^Sent:.*$/i)
//       ) {
//         break;
//       }
//       if (trimmed.length > 0) {
//         cleanLines.push(trimmed);
//       }
//     }
//     return cleanLines.join("\n").trim() || "No content available";
//   }
//   //  Stop the service
//   stop(): void {
//     if (!this.imap) return;
//     this.imap.end();
//     console.log("📪 Email service stopped");
//   }
// }
// // MAIN FUNCTION: Entry point of the application
// async function main(): Promise<void> {
//   const emailSystem = new SimpleEmailTicketSystem();
//   try {
//     await emailSystem.start(); // ← STARTS THE ENTIRE SYSTEM
//     console.log("🚀 Email ticket system is running...");
//     // Keep the process running
//     process.on("SIGINT", () => {
//       console.log("\n🔄 Shutting down...");
//       emailSystem.stop();
//       prisma.$disconnect();
//       process.exit(0);
//     });
//   } catch (error) {
//     console.error("❌ Failed to start email system:", error);
//     process.exit(1);
//   }
// }
// export { SimpleEmailTicketSystem, main };
