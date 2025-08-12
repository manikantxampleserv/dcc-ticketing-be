import prisma from "../../utils/prisma.config";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";

export async function getUsersList(req: Request, res: Response): Promise<void> {
  const { page = "1", limit = "10", search } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const filters: any = {};
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const totalCount = await prisma.user.count({ where: filters });
  const users = await prisma.user.findMany({
    where: filters,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { id: "desc" },
  });

  res.status(200).json({
    message: "Users retrieved successfully",
    data: users,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_count: totalCount,
      has_next: pageNum * limitNum < totalCount,
      has_previous: pageNum > 1,
    },
    filters: { search },
  });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(200).json(user);
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["name", "email", "password"],
    });
    return;
  }

  // Check if user with email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    res.status(409).json({ error: "User with this email already exists" });
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
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
      created_at: true,
      updated_at: true,
    },
  });

  res.status(201).json({
    message: "User created successfully",
    user,
  });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const { name, email, password } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check email uniqueness if email is being updated
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email },
    });

    if (emailExists) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }
  }

  // Prepare update data
  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  res.status(200).json({
    message: "User updated successfully",
    user: updatedUser,
  });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Delete user
  await prisma.user.delete({ where: { id } });

  res.status(200).json({
    message: "User deleted successfully",
    user,
  });
}
