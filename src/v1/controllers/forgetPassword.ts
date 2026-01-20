import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateResetToken, verifyResetToken } from "types/passwordResetToken";
import { sendSystemEmail } from "types/sendForgetPasswordEmail";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const forgotPassword = async (req: Request, res: Response) => {
  const { FRONTEND_URL, email } = req.body;

  const user = await prisma.users.findFirst({
    where: { email, is_active: true },
    select: { id: true, email: true, first_name: true, last_name: true },
  });

  // ✅ Prevent email enumeration
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User with this email does not exist.",
    });
    // return res.json({
    //   message: "If account exists, reset email sent",
    // });
  }
  /* ---------------- RESET LINK (UNCHANGED) ---------------- */
  const token = generateResetToken(user);
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  /* ---------------- OTP GENERATION ---------------- */
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.users.update({
    where: { id: user.id },
    data: {
      reset_otp: otp,
      reset_otp_expiry: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      reset_otp_attempts: 0,
    },
  });

  /* ---------------- SEND EMAIL ---------------- */
  await sendSystemEmail({
    to: user.email,
    subject: "Password Reset Request – Ticketing System",
    html: `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <p>Dear ${user.first_name} ${user.last_name},</p>

      <p>
        We received a request to reset the password for your Ticketing System account.
        You can reset your password using one of the options below.
      </p>

      <h3>Option 1: Reset via Secure Link</h3>
      <p>
        Click the button below to securely reset your password:
      </p>
      <p>
        <a 
          href="${resetUrl}" 
          style="
            display: inline-block;
            padding: 10px 16px;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
          "
        >
          Reset Password
        </a>
      </p>

      <p style="font-size: 13px; color: #666;">
        This link is valid for 10 minutes and can be used only once.
      </p>

      <hr style="margin: 24px 0;" />

      <h3>Option 2: Reset using One-Time Password (OTP)</h3>
      <p>
        Enter the following OTP to reset your password:
      </p>

      <p style="
        font-size: 22px;
        font-weight: bold;
        letter-spacing: 3px;
        background: #f3f4f6;
        display: inline-block;
        padding: 10px 16px;
        border-radius: 4px;
      ">
        ${otp}
      </p>

      <p style="font-size: 13px; color: #666;">
        This OTP is valid for 10 minutes. Do not share it with anyone.
      </p>

      <p>
        If you did not request a password reset, please ignore this email.
        Your account remains secure.
      </p>

      <p style="margin-top: 24px;">
        Regards,<br />
        <strong>Ticketing System Support Team</strong>
      </p>
    </div>
  `,
  });

  res.json({ message: "Reset email sent" });
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const payload = verifyResetToken(token);

    if (payload.type !== "password_reset") {
      return res.status(400).json({ message: "Invalid token" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.users.update({
      where: { id: payload.uid },
      data: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
    });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(400).json({
      message: "Reset link invalid or expired",
    });
  }
};

export const verifyResetOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const user = await prisma.users.findFirst({
    where: {
      email,
      reset_otp_expiry: { gt: new Date() },
    },
  });

  if (!user || user.reset_otp !== otp) {
    if (user) {
      await prisma.users.update({
        where: { id: user.id },
        data: { reset_otp_attempts: { increment: 1 } },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP.",
    });
  }

  if ((user.reset_otp_attempts || 0) >= 5) {
    return res
      .status(429)
      .json({ success: false, message: "Too many attempts" });
  }

  res.status(200).json({ message: "OTP verified successfully" });
};

export const resetPasswordWithOtp = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.users.findFirst({
    where: {
      email,
      reset_otp_expiry: { gt: new Date() },
    },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User with this email does not exist.",
    });
    // return res.status(400).json({ message: "OTP verification required" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.users.update({
    where: { id: user.id },
    data: {
      password_hash: passwordHash,
      reset_otp: null,
      reset_otp_expiry: null,
      reset_otp_attempts: 0,
      updated_at: new Date(),
    },
  });

  res.status(200).json({ message: "Password reset successful" });
};
