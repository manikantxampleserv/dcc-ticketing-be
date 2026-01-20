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
exports.sendSystemEmail = sendSystemEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function sendSystemEmail(_a) {
    return __awaiter(this, arguments, void 0, function* ({ to, subject, html, }) {
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
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USERNAME,
                pass: process.env.SMTP_PASSWORD,
            },
        });
        yield transporter.sendMail({
            from: `Ticketing System`,
            to,
            subject,
            html,
        });
    });
}
