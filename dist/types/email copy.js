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
// simple-email-ticket.ts
const imap_1 = __importDefault(require("imap"));
const mailparser_1 = require("mailparser");
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const prisma = new client_1.PrismaClient();
// || 587
// Email configuration
const emailConfig = {
    user: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    host: process.env.MAIL_HOST,
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
    constructor() {
        this.imap = new imap_1.default(emailConfig);
    }
    //  ENTRY POINT: Start the email monitoring system
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.imap.once("ready", () => {
                    console.log("✅ Connected to email server");
                    this.openInbox(); // ← CONNECTS TO: openInbox()
                    this.listenForNewEmails(); // ← CONNECTS TO: listenForNewEmails()
                    resolve();
                });
                this.imap.once("error", reject);
                this.imap.connect(); // ← INITIATES CONNECTION
            });
        });
    }
    //  STEP 1: Open the inbox folder
    openInbox() {
        this.imap.openBox("INBOX", false, (err) => {
            if (err) {
                console.error("❌ Failed to open inbox:", err);
            }
            else {
                // console.log('📬 Inbox opened successfully');
                this.fetchNewEmails(); // ← CONNECTS TO: fetchNewEmails() (initial fetch)
            }
        });
    }
    //  STEP 2: Listen for new emails in real-time
    listenForNewEmails() {
        this.imap.on("mail", (numNewMsgs) => {
            console.log(`📧 ${numNewMsgs} new email(s) received`);
            this.fetchNewEmails(); // ← CONNECTS TO: fetchNewEmails() (on new mail)
        });
    }
    //  STEP 3: Fetch all unread emails
    fetchNewEmails() {
        this.imap.search(["UNSEEN"], (err, results) => {
            if (err) {
                console.error("❌ Search error:", err);
                return;
            }
            if (!results || results.length === 0) {
                console.log("📭 No new emails to process");
                return;
            }
            console.log(`📧 Processing ${results.length} new email(s)`);
            // Fetch email content
            const fetch = this.imap.fetch(results, {
                bodies: "",
                markSeen: true,
            });
            fetch.on("message", (msg, seqno) => {
                this.processEmailMessage(msg, seqno); // ← CONNECTS TO: processEmailMessage()
            });
        });
    }
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
    handleParsedEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Extract email details
                const senderEmail = email.from.value[0].address.toLowerCase();
                const subject = email.subject || "No Subject";
                const body = email.text || email.html || "No content";
                const messageId = email.messageId;
                const references = email.references || [];
                console.log(`📧 Processing email from: ${senderEmail}`);
                console.log(`📋 Subject: ${subject}`);
                // Check if sender is a customer
                const customer = yield this.findCustomer(senderEmail); // ← CONNECTS TO: findCustomer()
                if (!customer) {
                    console.log(`❌ Email ignored - ${senderEmail} is not a customer`);
                    return;
                }
                // Create ticket
                const ticket = yield this.createTicket(customer, subject, body, senderEmail);
                console.log(`🎫 Ticket created: Ticket No. ${ticket.ticket_number} for ${customer.first_name + " " + customer.last_name} Customer`);
            }
            catch (error) {
                console.error("❌ Error handling email:", error);
            }
        });
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
    //  STEP 7: Create ticket from email
    createTicket(customer, subject, body, senderEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            const ticketNumber = `TCKT-${Date.now()}`;
            return yield prisma.tickets.create({
                data: {
                    ticket_number: ticketNumber,
                    customer_id: customer.id,
                    subject: this.cleanSubject(subject), // ← CONNECTS TO: cleanSubject()
                    description: this.cleanBody(body), // ← CONNECTS TO: cleanBody()
                    priority: 1,
                    status: "Open",
                    source: "Email",
                },
            });
        });
    }
    //  UTILITY: Clean email subject (remove Re:, Fwd: etc.)
    cleanSubject(subject) {
        return subject
            .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, "")
            .trim()
            .substring(0, 255);
    }
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
