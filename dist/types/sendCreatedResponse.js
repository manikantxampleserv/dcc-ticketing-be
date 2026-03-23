"use strict";
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
exports.sendTicketCreatedEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// // mailer/sendSatisfactionEmail.ts
// import jwt from "jsonwebtoken";
// const JWT_SECRET = process.env.JWT_SECRET as string;
// const BASE_URL =
//   (process.env.PUBLIC_BASE_URL as string) ||
//   "https://ticketing_app_api.dcctz.com/api/v1";
// interface FeedbackEmailProps {
//   ticketId: number | string;
//   ticketNumber: string | number;
//   requesterEmail: string;
//   requesterName?: string;
//   body: string;
// }
// function signFeedbackToken({
//   ticketId,
//   email,
// }: {
//   ticketId: number | string;
//   email: string;
// }): string {
//   return jwt.sign({ ticketId, email, purpose: "ticket_feedback" }, JWT_SECRET, {
//     expiresIn: "1d",
//   });
// }
// export const sendSatisfactionEmail = async ({
//   body = "",
//   ticketId,
//   ticketNumber,
//   requesterEmail,
//   requesterName,
// }: FeedbackEmailProps): Promise<void> => {
//   const token = signFeedbackToken({ ticketId, email: requesterEmail });
//   const yesUrl = `${BASE_URL}/feedback?t=${encodeURIComponent(token)}&v=1`;
//   const noUrl = `${BASE_URL}/feedback?t=${encodeURIComponent(token)}&v=0`;
//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: 587,
//     secure: false,
//     auth: {
//       user: process.env.SMTP_USERNAME!,
//       pass: process.env.SMTP_PASSWORD!,
//     },
//   });
//   const html =
//     (body === "Resolved" ? "" : body) +
//     `
//     <p>Hi ${requesterName || ""},</p>
//  <p>Your ticket <strong>#${ticketNumber}</strong> has been resolved. </p>
//  ${
//    body !== "Resolved"
//      ? `<p>The solution was generated and reviewed with the help of our AI assistant to speed up the process and give you a quicker response.</p>`
//      : ""
//  }
// <p>Please let us know whether the solution worked for you. Your feedback helps us improve our service.</p>
//  <p>
//       <a href="${yesUrl}" style="background:#16a34a;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">
//         <span style="font-weight:700; font-size:16px;">✓</span> I’m satisfied
//       </a>
//       &nbsp;
//       <a href="${noUrl}" style="background:#ef4444;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">
//      <span style="font-weight:700; font-size:16px;"> ✕ </span> Not satisfied
//       </a>
//     </p>
//     <p style="font-size:12px;color:#666">This is a one-click link to record your response.</p>
//   `;
//   await transporter.sendMail({
//     to: requesterEmail,
//     from: process.env.MAIL_FROM,
//     // cc: ["shreyansh.tripathi@ampleserv.com", "anil.kumar@ampleserv.com"],
//     subject: `Ticket #${ticketNumber} resolved — quick feedback`,
//     html,
//   });
// };
const sendTicketCreatedEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ ticketId, requesterEmail, ticketNumber, requesterName, subject, }) {
    try {
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USERNAME,
                pass: process.env.SMTP_PASSWORD,
            },
        });
        const htmlContent = `
      <div style="font-family: Arial; padding: 16px;">
        <h2> Ticket Created Successfully</h2>
        <p>Hi ${requesterName || "User"},</p>
        <p>Your ticket has been created.</p>
        
        <p><b>Ticket Number:</b> ${ticketNumber}</p>
        <p><b>Subject:</b> ${subject}</p>

        <p>Our team will get back to you shortly.</p>

        <hr />
        <small>This is an automated message.</small>
      </div>
    `;
        const info = yield transporter.sendMail({
            from: `"Doubleclick Consulting Limited" <${process.env.SMTP_FROM_EMAIL}>`,
            to: requesterEmail,
            subject: `Ticket Created - ${ticketNumber}`,
            html: htmlContent,
            // 🔥 IMPORTANT for threading
            headers: {
                "X-Ticket-ID": ticketId.toString(),
            },
        });
        // console.log("📧 Ticket created email sent:", info.messageId);
        return info.messageId; // ✅ RETURN THIS
    }
    catch (error) {
        console.error("❌ Error sending ticket created email:", error);
        return null;
    }
});
exports.sendTicketCreatedEmail = sendTicketCreatedEmail;
