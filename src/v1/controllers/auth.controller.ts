import prisma from "utils/prisma.config";
import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRequest } from "middlewares/auth";
import logger from "config/logger";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      role_id = "Agent",
      department_id,
      phone,
    } = req.body;

    if (!username || !email || !password || !first_name || !last_name) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["username", "email", "password", "first_name", "last_name"],
      });
      return;
    }

    const existingUserByEmail = await prisma.users.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    const existingUserByUsername = await prisma.users.findUnique({
      where: { username },
    });
    if (existingUserByUsername) {
      res.status(409).json({ error: "User with this username already exists" });
      return;
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        username,
        email,
        password_hash: hashedPassword,
        first_name,
        last_name,
        role_id,
        department_id,
        phone,
      },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role_id: true,
        department_id: true,
        phone: true,
        created_at: true,
        updated_at: true,
      },
    });

    const JWT_SECRET = process.env.JWT_SECRET || "SUPPORT_SECRET_KEY";
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: user.role_id,
      department_id: user.department_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    logger.info(`User registered successfully: ${user.email}`);

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
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        password_hash: true,
        first_name: true,
        last_name: true,
        role_id: true,
        department_id: true,
        phone: true,
        avatar: true,
        is_active: true,
      },
    });

    if (!user) {
      logger.error(`User found: No`);
    } else {
      logger.success(`User found: Yes`);
    }

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.is_active === false) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    const isValidPassword = await bcryptjs.compare(
      password,
      user.password_hash
    );
    if (!isValidPassword) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const JWT_SECRET = process.env.JWT_SECRET || "SUPPORT_SECRET_KEY";
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role_id_id: user.role_id,
      department_id: user.department_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    logger.success(`Login successful for user: ${user.email}`);

    res.json({
      message: "Login successful",
      user: payload,
      token,
    });
  } catch (error: any) {
    console.error(error);

    // Prisma connection pool timeout error
    if (
      error.message &&
      error.message.includes(
        "Timed out fetching a new connection from the connection pool"
      )
    ) {
      res.status(503).json({
        success: false,
        message:
          "Service temporarily unavailable. The server is experiencing high load. Please try again in a few moments.",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred during login. Please try again.",
      });
    }
  }
}

export async function getProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role_id: true,
        department_id: true,
        phone: true,
        avatar: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        tickets: true,
        user_role: { select: { id: true, name: true } },
        user_department: { select: { id: true, department_name: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.is_active === false) {
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
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { first_name, last_name, phone, avatar, department_id } = req.body;

    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (existingUser.is_active === false) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    const updateData: any = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (department_id !== undefined) updateData.department_id = department_id;

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role_id: true,
        department_id: true,
        phone: true,
        avatar: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        user_role: { select: { id: true, name: true } },
        user_department: { select: { id: true, department_name: true } },
      },
    });

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
