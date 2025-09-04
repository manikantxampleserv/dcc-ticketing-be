// simple-email-ticket.ts
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

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
        debug: console.log  // <-- Add this line to allow self-signed certificates
    }
};

class SimpleEmailTicketSystem {
    private imap: Imap;

    constructor() {
        this.imap = new Imap(emailConfig);
    }

    // 🚀 ENTRY POINT: Start the email monitoring system
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.imap.once('ready', () => {
                console.log('✅ Connected to email server');
                this.openInbox(); // ← CONNECTS TO: openInbox()
                this.listenForNewEmails(); // ← CONNECTS TO: listenForNewEmails()
                resolve();
            });

            this.imap.once('error', reject);
            this.imap.connect(); // ← INITIATES CONNECTION
        });
    }

    // 📬 STEP 1: Open the inbox folder
    private openInbox(): void {
        this.imap.openBox('INBOX', false, (err: any) => {
            if (err) {
                console.error('❌ Failed to open inbox:', err);
            } else {
                // console.log('📬 Inbox opened successfully');
                this.fetchNewEmails(); // ← CONNECTS TO: fetchNewEmails() (initial fetch)
            }
        });
    }

    // 👂 STEP 2: Listen for new emails in real-time
    private listenForNewEmails(): void {
        this.imap.on('mail', (numNewMsgs: number) => {
            console.log(`📧 ${numNewMsgs} new email(s) received`);
            this.fetchNewEmails(); // ← CONNECTS TO: fetchNewEmails() (on new mail)
        });
    }

    // 🔍 STEP 3: Fetch all unread emails
    private fetchNewEmails(): void {
        this.imap.search(['UNSEEN'], (err: any, results: any) => {
            if (err) {
                console.error('❌ Search error:', err);
                return;
            }

            if (!results || results.length === 0) {
                console.log('📭 No new emails to process');
                return;
            }

            console.log(`📧 Processing ${results.length} new email(s)`);

            // Fetch email content
            const fetch = this.imap.fetch(results, {
                bodies: '',
                markSeen: true
            });

            fetch.on('message', (msg: any, seqno: any) => {
                this.processEmailMessage(msg, seqno); // ← CONNECTS TO: processEmailMessage()
            });
        });
    }

    // 📋 STEP 4: Process individual email message
    private processEmailMessage(msg: any, seqno: number): void {
        let emailBuffer = '';

        msg.on('body', (stream: any) => {
            stream.on('data', (chunk: Buffer) => {
                emailBuffer += chunk.toString('utf8');
            });

            stream.once('end', async () => {
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

    // 🎯 STEP 5: Handle parsed email and create ticket
    private async handleParsedEmail(email: ParsedEmail): Promise<void> {
        try {
            // Extract email details
            const senderEmail = email.from.value[0].address.toLowerCase();
            const subject = email.subject || 'No Subject';
            const body = email.text || email.html || 'No content';

            console.log(`📧 Processing email from: ${senderEmail}`);
            console.log(`📋 Subject: ${subject}`);

            // Check if sender is a customer
            const customer = await this.findCustomer(senderEmail); // ← CONNECTS TO: findCustomer()

            if (!customer) {
                console.log(`❌ Email ignored - ${senderEmail} is not a customer`);
                return;
            }

            // Create ticket
            const ticket = await this.createTicket(customer, subject, body, senderEmail);
            console.log(`🎫 Ticket created: Ticket No. ${ticket.ticket_number} for ${customer.first_name + " "+customer.last_name} Customer`) ;

        } catch (error) {
            console.error('❌ Error handling email:', error);
        }
    }

    // 👤 STEP 6: Find customer in database
    private async findCustomer(email: string): Promise<any | null> {
        try {
            await prisma.$connect();
            return await prisma.customers.findFirst({
                where: {
                    email: email
                }
            });
        }
        catch (error) {
            console.error('❌ Database error while finding customer:', error);
            return null;
        }
    }

    // 🎫 STEP 7: Create ticket from email
    private async createTicket(
        customer: any,
        subject: string,
        body: string,
        senderEmail: string
    ): Promise<any> {
        const ticketNumber = `TCKT-${Date.now()}`;

        return await prisma.tickets.create({
            data: {
                ticket_number: ticketNumber,
                customer_id: customer.id,
                subject: this.cleanSubject(subject), // ← CONNECTS TO: cleanSubject()
                description: this.cleanBody(body), // ← CONNECTS TO: cleanBody()
                priority: "Medium",
                status: "Open",
                source: "Email",
            }
        });
    }

    // 🧹 UTILITY: Clean email subject (remove Re:, Fwd: etc.)
    private cleanSubject(subject: string): string {
        return subject
            .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/i, '')
            .trim()
            .substring(0, 255);
    }

    // 🧹 UTILITY: Clean email body (remove signatures, replies)
    private cleanBody(body: string): string {
        const lines = body.split('\n');
        const cleanLines: string[] = [];

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

        return cleanLines.join('\n').trim() || 'No content available';
    }

    // 🛑 Stop the service
    stop(): void {
        this.imap.end();
        console.log('📪 Email service stopped');
    }
}

// 🎯 MAIN FUNCTION: Entry point of the application
async function main(): Promise<void> {
    const emailSystem = new SimpleEmailTicketSystem();

    try {
        await emailSystem.start(); // ← STARTS THE ENTIRE SYSTEM
        console.log('🚀 Email ticket system is running...');

        // Keep the process running
        process.on('SIGINT', () => {
            console.log('\n🔄 Shutting down...');
            emailSystem.stop();
            prisma.$disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start email system:', error);
        process.exit(1);
    }
}


export { SimpleEmailTicketSystem, main };


