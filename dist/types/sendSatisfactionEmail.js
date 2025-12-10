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
exports.sendSatisfactionEmail = void 0;
// mailer/sendSatisfactionEmail.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:4000/api/v1";
function signFeedbackToken({ ticketId, email, }) {
    return jsonwebtoken_1.default.sign({ ticketId, email, purpose: "ticket_feedback" }, JWT_SECRET, {
        expiresIn: "1d",
    });
}
const sendSatisfactionEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ body = "", ticketId, ticketNumber, requesterEmail, requesterName, }) {
    const token = signFeedbackToken({ ticketId, email: requesterEmail });
    const yesUrl = `${BASE_URL}/feedback?t=${encodeURIComponent(token)}&v=1`;
    const noUrl = `${BASE_URL}/feedback?t=${encodeURIComponent(token)}&v=0`;
    const transporter = nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
        },
    });
    const html = (body === "Resolved" ? "" : body) +
        `
    <p>Hi ${requesterName || ""},</p>
 <p>Your ticket <strong>#${ticketNumber}</strong> has been resolved. </p>
 ${body !== "Resolved"
            ? `<p>The solution was generated and reviewed with the help of our AI assistant to speed up the process and give you a quicker response.</p>`
            : ""}
<p>Please let us know whether the solution worked for you. Your feedback helps us improve our service.</p>
 <p>
      <a href="${yesUrl}" style="background:#16a34a;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">
        <span style="font-weight:700; font-size:16px;">✓</span> I’m satisfied
      </a>
      &nbsp;
      <a href="${noUrl}" style="background:#ef4444;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">
     <span style="font-weight:700; font-size:16px;"> ✕ </span> Not satisfied
      </a>
    </p>
    <p style="font-size:12px;color:#666">This is a one-click link to record your response.</p>
  `;
    yield transporter.sendMail({
        to: requesterEmail,
        from: process.env.MAIL_FROM,
        subject: `Ticket #${ticketNumber} resolved — quick feedback`,
        html,
    });
});
exports.sendSatisfactionEmail = sendSatisfactionEmail;
