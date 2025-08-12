import prisma from "../../utils/prisma.config";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";

export async function getUsersList(req: Request, res: Response): Promise<void> {
  try {
    const { page = "1", limit = "10", search } = req.query;
    const page_num = parseInt(page as string, 10);
    const limit_num = parseInt(limit as string, 10);

    const filters: any = {};
    if (search) {
      filters.OR = [
        { username: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { first_name: { contains: search as string, mode: "insensitive" } },
        { last_name: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const total_count = await prisma.users.count({ where: filters });
    const users = await prisma.users.findMany({
      where: filters,
      skip: (page_num - 1) * limit_num,
      take: limit_num,
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { id: "desc" },
    });

    res.status(200).json({
      message: "users retrieved successfully",
      data: users,
      pagination: {
        current_page: page_num,
        total_pages: Math.ceil(total_count / limit_num),
        total_count,
        has_next: page_num * limit_num < total_count,
        has_previous: page_num > 1,
      },
      filters: { search },
    });
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      role = "Agent",
      department,
      phone,
      avatar,
      created_by,
    } = req.body;

    if (!username || !email || !password || !first_name || !last_name) {
      res.status(400).json({
        error: "missing required fields",
        required: ["username", "email", "password", "first_name", "last_name"],
      });
      return;
    }

    const existing_email = await prisma.users.findUnique({ where: { email } });
    if (existing_email) {
      res.status(409).json({ error: "user with this email already exists" });
      return;
    }

    const existing_username = await prisma.users.findUnique({
      where: { username },
    });
    if (existing_username) {
      res.status(409).json({ error: "user with this username already exists" });
      return;
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        username,
        email,
        password_hash: hashed_password,
        first_name,
        last_name,
        role,
        department,
        phone,
        avatar,
        created_by,
      },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.status(201).json({
      message: "user created successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }

    const {
      username,
      email,
      password,
      first_name,
      last_name,
      role,
      department,
      phone,
      avatar,
      is_active,
    } = req.body;

    const existing_user = await prisma.users.findUnique({ where: { id } });
    if (!existing_user) {
      res.status(404).json({ error: "user not found" });
      return;
    }

    if (email && email !== existing_user.email) {
      const email_exists = await prisma.users.findUnique({ where: { email } });
      if (email_exists) {
        res.status(409).json({ error: "user with this email already exists" });
        return;
      }
    }

    if (username && username !== existing_user.username) {
      const username_exists = await prisma.users.findUnique({
        where: { username },
      });
      if (username_exists) {
        res
          .status(409)
          .json({ error: "user with this username already exists" });
        return;
      }
    }

    const update_data: any = {};
    if (username) update_data.username = username;
    if (email) update_data.email = email;
    if (first_name) update_data.first_name = first_name;
    if (last_name) update_data.last_name = last_name;
    if (role) update_data.role = role;
    if (department !== undefined) update_data.department = department;
    if (phone !== undefined) update_data.phone = phone;
    if (avatar !== undefined) update_data.avatar = avatar;
    if (is_active !== undefined) update_data.is_active = is_active;
    if (password) update_data.password_hash = await bcrypt.hash(password, 10);

    const updated_user = await prisma.users.update({
      where: { id },
      data: update_data,
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      message: "user updated successfully",
      user: updated_user,
    });
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }

    const deleted_user = await prisma.users.update({
      where: { id },
      data: { is_active: false },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      message: "user deleted successfully",
      user: deleted_user,
    });
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
}
