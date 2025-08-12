import prisma from "../../utils/prisma.config";
import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRequest } from "@/middlewares/auth";
import logger from "../../config/logger";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role = "Agent",
      department,
      phone,
    } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["username", "email", "password", "firstName", "lastName"],
      });
      return;
    }

    // Check if user exists by email
    const existingUserByEmail = await prisma.users.findUnique({
      where: { Email: email },
    });

    if (existingUserByEmail) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    // Check if user exists by username
    const existingUserByUsername = await prisma.users.findUnique({
      where: { Username: username },
    });

    if (existingUserByUsername) {
      res.status(409).json({ error: "User with this username already exists" });
      return;
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        Username: username,
        Email: email,
        PasswordHash: hashedPassword,
        FirstName: firstName,
        LastName: lastName,
        Role: role,
        Department: department,
        Phone: phone,
      },
      select: {
        UserID: true,
        Username: true,
        Email: true,
        FirstName: true,
        LastName: true,
        Role: true,
        Department: true,
        Phone: true,
        CreatedAt: true,
        UpdatedAt: true,
      },
    });

    const JWT_SECRET = process.env.JWT_SECRET || "SUPPORT_SECRET_KEY";
    const payload = {
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      firstName: user.FirstName,
      lastName: user.LastName,
      role: user.Role,
      department: user.Department,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "24h",
    });

    logger.info(`User registered successfully: ${user.Email}`);

    res.status(201).json({
      message: "User registered successfully",
      user,
      token,
    });
  } catch (error) {
    logger.error(`Registration error: ${error}`);
    res
      .status(500)
      .json({ error: "Internal server error during registration" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    logger.info(`Login attempt for email: ${email}`);

    if (!email || !password) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["email", "password"],
      });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { Email: email },
      select: {
        UserID: true,
        Username: true,
        Email: true,
        PasswordHash: true,
        FirstName: true,
        LastName: true,
        Role: true,
        Department: true,
        Phone: true,
        IsActive: true,
      },
    });

    logger.info(`User found: ${user ? "Yes" : "No"}`);

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!user.IsActive) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    const isValidPassword = await bcryptjs.compare(password, user.PasswordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Update last login timestamp
    await prisma.users.update({
      where: { UserID: user.UserID },
      data: { LastLoginAt: new Date() },
    });

    const JWT_SECRET = process.env.JWT_SECRET || "SUPPORT_SECRET_KEY";

    const payload = {
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      firstName: user.FirstName,
      lastName: user.LastName,
      role: user.Role,
      department: user.Department,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "24h",
    });

    logger.info(`Login successful for user: ${user.Email}`);

    res.json({
      message: "Login successful",
      user: payload,
      token,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ error: "Internal server error during login" });
  }
}

export async function getProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { UserID: userId },
      select: {
        UserID: true,
        Username: true,
        Email: true,
        FirstName: true,
        LastName: true,
        Role: true,
        Department: true,
        Phone: true,
        Avatar: true,
        IsActive: true,
        LastLoginAt: true,
        CreatedAt: true,
        UpdatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.IsActive) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    res.json({
      message: "Profile retrieved successfully",
      user,
    });
  } catch (error) {
    logger.error(`Get profile error: ${error}`);
    res
      .status(500)
      .json({ error: "Internal server error while fetching profile" });
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { firstName, lastName, phone, avatar, department } = req.body;

    // Check if user exists and is active
    const existingUser = await prisma.users.findUnique({
      where: { UserID: userId },
    });

    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!existingUser.IsActive) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (firstName) updateData.FirstName = firstName;
    if (lastName) updateData.LastName = lastName;
    if (phone !== undefined) updateData.Phone = phone;
    if (avatar !== undefined) updateData.Avatar = avatar;
    if (department !== undefined) updateData.Department = department;

    const updatedUser = await prisma.users.update({
      where: { UserID: userId },
      data: updateData,
      select: {
        UserID: true,
        Username: true,
        Email: true,
        FirstName: true,
        LastName: true,
        Role: true,
        Department: true,
        Phone: true,
        Avatar: true,
        IsActive: true,
        LastLoginAt: true,
        CreatedAt: true,
        UpdatedAt: true,
      },
    });

    logger.info(`Profile updated successfully for user: ${updatedUser.Email}`);

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    logger.error(`Update profile error: ${error}`);
    res
      .status(500)
      .json({ error: "Internal server error while updating profile" });
  }
}

export async function changePassword(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["currentPassword", "newPassword"],
      });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { UserID: userId },
      select: {
        UserID: true,
        Email: true,
        PasswordHash: true,
        IsActive: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.IsActive) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    const isValidPassword = await bcryptjs.compare(
      currentPassword,
      user.PasswordHash
    );

    if (!isValidPassword) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const hashedNewPassword = await bcryptjs.hash(newPassword, 10);

    await prisma.users.update({
      where: { UserID: userId },
      data: { PasswordHash: hashedNewPassword },
    });

    logger.info(`Password changed successfully for user: ${user.Email}`);

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error(`Change password error: ${error}`);
    res
      .status(500)
      .json({ error: "Internal server error while changing password" });
  }
}
