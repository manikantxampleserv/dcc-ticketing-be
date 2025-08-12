import prisma from "../../utils/prisma.config";
import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRequest } from "@/middlewares/auth";
import logger from "../../config/logger";

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["name", "email", "password"],
    });
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  const hashedPassword = await bcryptjs.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employee_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  const JWT_SECRET = process.env.JWT_SECRET || "MKX_SECRET_KEY";
  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id ?? null,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "24h",
  });
  res.status(201).json({
    message: "User registered successfully",
    user,
    token,
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  logger.info(`Login attempt for email: ${email}`);
  logger.info(`Login attempt for password: ${password}`);

  if (!email || !password) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["email", "password"],
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  logger.info(`User found: ${user}`);

  if (!user || !(await bcryptjs.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const JWT_SECRET = process.env.JWT_SECRET || "MKX_SECRET_KEY";

  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employee_id ?? null,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "24h",
  });

  res.json({
    message: "Login successful",
    user: payload,
    token,
  });
}

export async function getProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employee_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    message: "Profile retrieved successfully",
    user,
  });
}
