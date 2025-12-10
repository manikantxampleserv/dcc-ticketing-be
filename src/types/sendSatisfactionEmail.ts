// mailer/sendSatisfactionEmail.ts
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET as string;
const BASE_URL =
  (process.env.PUBLIC_BASE_URL as string) ||
  "https://ticketing_app_api.dcctz.com/api/v1";

interface FeedbackEmailProps {
  ticketId: number | string;
  ticketNumber: string | number;
  requesterEmail: string;
  requesterName?: string;
  body: string;
}

function signFeedbackToken({
  ticketId,
  email,
}: {
  ticketId: number | string;
  email: string;
}): string {
  return jwt.sign({ ticketId, email, purpose: "ticket_feedback" }, JWT_SECRET, {
    expiresIn: "1d",
  });
}

export const sendSatisfactionEmail = async ({
  body = "",
  ticketId,
  ticketNumber,
  requesterEmail,
  requesterName,
}: FeedbackEmailProps): Promise<void> => {
  const token = signFeedbackToken({ ticketId, email: requesterEmail });

  const yesUrl = `${BASE_URL}/feedback?t=${encodeURIComponent(token)}&v=1`;
  const noUrl = `${BASE_URL}/feedback?t=${encodeURIComponent(token)}&v=0`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME!,
      pass: process.env.SMTP_PASSWORD!,
    },
  });

  const html =
    (body === "Resolved" ? "" : body) +
    `
    <p>Hi ${requesterName || ""},</p>
 <p>Your ticket <strong>#${ticketNumber}</strong> has been resolved. </p>
 ${
   body !== "Resolved"
     ? `<p>The solution was generated and reviewed with the help of our AI assistant to speed up the process and give you a quicker response.</p>`
     : ""
 }
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

  await transporter.sendMail({
    to: requesterEmail,
    from: process.env.MAIL_FROM,
    subject: `Ticket #${ticketNumber} resolved — quick feedback`,
    html,
  });
};
