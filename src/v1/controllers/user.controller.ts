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
      { Username: { contains: search, mode: "insensitive" } },
      { Email: { contains: search, mode: "insensitive" } },
      { FirstName: { contains: search, mode: "insensitive" } },
      { LastName: { contains: search, mode: "insensitive" } },
    ];
  }

  const totalCount = await prisma.users.count({ where: filters });
  const users = await prisma.users.findMany({
    where: filters,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
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
    orderBy: { UserID: "desc" },
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
  const UserID = parseInt(req.params.id);
  const user = await prisma.users.findUnique({
    where: { UserID },
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

  res.status(200).json(user);
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const {
    username,
    email,
    password,
    firstName,
    lastName,
    role = "Agent",
    department,
    phone,
    avatar,
    createdBy,
  } = req.body;

  // Validate required fields
  if (!username || !email || !password || !firstName || !lastName) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["username", "email", "password", "firstName", "lastName"],
    });
    return;
  }

  // Check if user with email already exists
  const existingUserByEmail = await prisma.users.findUnique({
    where: { Email: email },
  });

  if (existingUserByEmail) {
    res.status(409).json({ error: "User with this email already exists" });
    return;
  }

  // Check if user with username already exists
  const existingUserByUsername = await prisma.users.findUnique({
    where: { Username: username },
  });

  if (existingUserByUsername) {
    res.status(409).json({ error: "User with this username already exists" });
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
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
      Avatar: avatar,
      CreatedBy: createdBy,
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
      Avatar: true,
      IsActive: true,
      CreatedAt: true,
      UpdatedAt: true,
    },
  });

  res.status(201).json({
    message: "User created successfully",
    user,
  });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const UserID = parseInt(req.params.id);
  const {
    username,
    email,
    password,
    firstName,
    lastName,
    role,
    department,
    phone,
    avatar,
    isActive,
  } = req.body;

  // Check if user exists
  const existingUser = await prisma.users.findUnique({ where: { UserID } });
  if (!existingUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check email uniqueness if email is being updated
  if (email && email !== existingUser.Email) {
    const emailExists = await prisma.users.findUnique({
      where: { Email: email },
    });

    if (emailExists) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }
  }

  // Check username uniqueness if username is being updated
  if (username && username !== existingUser.Username) {
    const usernameExists = await prisma.users.findUnique({
      where: { Username: username },
    });

    if (usernameExists) {
      res.status(409).json({ error: "User with this username already exists" });
      return;
    }
  }

  // Prepare update data
  const updateData: any = {};
  if (username) updateData.Username = username;
  if (email) updateData.Email = email;
  if (firstName) updateData.FirstName = firstName;
  if (lastName) updateData.LastName = lastName;
  if (role) updateData.Role = role;
  if (department !== undefined) updateData.Department = department;
  if (phone !== undefined) updateData.Phone = phone;
  if (avatar !== undefined) updateData.Avatar = avatar;
  if (isActive !== undefined) updateData.IsActive = isActive;
  if (password) {
    updateData.PasswordHash = await bcrypt.hash(password, 10);
  }

  // Update user
  const updatedUser = await prisma.users.update({
    where: { UserID },
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

  res.status(200).json({
    message: "User updated successfully",
    user: updatedUser,
  });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const UserID = parseInt(req.params.id);

  const user = await prisma.users.findUnique({
    where: { UserID },
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
      CreatedAt: true,
      UpdatedAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Soft delete by setting IsActive to false (recommended)
  const deletedUser = await prisma.users.update({
    where: { UserID },
    data: { IsActive: false },
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
      CreatedAt: true,
      UpdatedAt: true,
    },
  });

  // If you want hard delete instead, use this:
  // await prisma.users.delete({ where: { UserID } });

  res.status(200).json({
    message: "User deleted successfully",
    user: deletedUser,
  });
}
