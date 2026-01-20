import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function sendSystemEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  //   const config = await prisma.email_configurations.findFirst({
  //     where: { log_inst: 1, is_active: true },
  //   });

  //   if (!config) {
  //     throw new Error("Email configuration not found");
  //   }

  //   const transporter = nodemailer.createTransport({
  //     host: config.smtp_server,
  //     port: config.smtp_port || 587,
  //     secure: false,
  //     auth: {
  //       user: config.username!,
  //       pass: config.password!,
  //     },
  //     tls: { rejectUnauthorized: false },
  //   });
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME!,
      pass: process.env.SMTP_PASSWORD!,
    },
  });

  await transporter.sendMail({
    from: `Ticketing System`,
    to,
    subject,
    html,
  });
}
