import prisma from "../../utils/prisma.config";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { deleteFile, uploadFile } from "../../utils/blackbaze";

const formatUserAvatar = (users: any) => {
  if (!users) return null;
  const { password_hash, ...user } = users;

  if (user.avatar && !/^https?:\/\//.test(user.avatar)) {
    return {
      ...user,
      avatar: `${process.env.BACKBLAZE_BUCKET_URL}/${user.avatar}`,
    };
  }
  return user;
};

const formatUserListAvatars = (users: any[] = []) =>
  users.map(formatUserAvatar);

export async function getUsersList(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      role_id,
      department_id,
    } = req.query;
    const page_num = parseInt(page as string, 10);
    const limit_num = parseInt(limit as string, 10);

    const searchLower = ((search || "") as string).toLowerCase();
    const filters: any = search
      ? {
          username: {
            contains: searchLower,
          },
          email: {
            contains: searchLower,
          },
          first_name: {
            contains: searchLower,
          },
          last_name: {
            contains: searchLower,
          },
        }
      : {};

    if (role_id) filters.role_id = Number(role_id);
    if (department_id) filters.department_id = Number(department_id);

    const total_count = await prisma.users.count({ where: filters });

    const users = await prisma.users.findMany({
      where: filters,
      skip: (page_num - 1) * limit_num,
      take: limit_num,
      include: {
        user_role: { select: { id: true, name: true } }, // related role
        user_department: { select: { id: true, department_name: true } }, // related department
        tickets: true,
      },
      orderBy: { id: "desc" },
    });

    res.status(200).json({
      message: "users retrieved successfully",
      data: formatUserListAvatars(users),
      pagination: {
        current_page: page_num,
        total_pages: Math.ceil(total_count / limit_num),
        total_count,
        has_next: page_num * limit_num < total_count,
        has_previous: page_num > 1,
      },
    });
  } catch (error) {
    console.log(error);
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
      include: {
        user_role: { select: { id: true, name: true } },
        user_department: { select: { id: true, department_name: true } },
        tickets: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }

    res.status(200).json(formatUserAvatar(user));
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const {
      username,
      email,
      password_hash,
      first_name,
      last_name,
      role_id,
      department_id,
      phone,
    } = req.body;

    const created_by = req.user ? Number(req.user.id) : null;
    console.log("Creating user by:", created_by, req.body, req.file);
    let avatarUrl = null;
    if (req.file) {
      const fileName = `avatars/${Date.now()}_${req.file.originalname}`;
      avatarUrl = await uploadFile(
        req.file.buffer,
        fileName,
        req.file.mimetype
      );
    }

    const existing_email = await prisma.users.findUnique({ where: { email } });
    if (existing_email) {
      res.status(409).json({ error: "user with this email already exists" });
      return;
    }

    const existing_username = await prisma.users.findUnique({
      where: { username: email?.split("@")[0] },
    });
    if (existing_username) {
      res.status(409).json({ error: "user with this username already exists" });
      return;
    }

    const hashed_password = await bcrypt.hash(password_hash, 10);

    const user = await prisma.users.create({
      data: {
        username: email?.split("@")[0],
        email,
        password_hash: hashed_password,
        first_name,
        last_name,
        role_id: Number(role_id),
        department_id: Number(department_id),
        phone,
        avatar: avatarUrl,
        created_by,
      },
      include: {
        user_role: { select: { id: true, name: true } },
        user_department: { select: { id: true, department_name: true } },
        tickets: true,
      },
    });

    res.status(201).json({
      message: "user created successfully",
      user: formatUserAvatar(user),
    });
  } catch (error) {
    console.log("Error in creating user", error);
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
      role_id,
      department_id,
      phone,
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
    if (role_id) update_data.role_id = Number(role_id);
    if (department_id) update_data.department_id = Number(department_id);
    if (phone !== undefined) update_data.phone = phone;
    if (is_active !== undefined) update_data.is_active = Boolean(is_active);
    if (password) update_data.password_hash = await bcrypt.hash(password, 10);

    if (req.file) {
      if (existing_user.avatar) {
        const filePath = existing_user.avatar.replace(
          `${process.env.BACKBLAZE_BUCKET_URL}/`,
          ""
        );
        await deleteFile(filePath);
      }
      const fileName = `avatars/${Date.now()}_${req.file.originalname}`;
      const avatarUrl = await uploadFile(
        req.file.buffer,
        fileName,
        req.file.mimetype
      );
      update_data.avatar = avatarUrl;
    }

    const updated_user = await prisma.users.update({
      where: { id },
      data: update_data,
      include: {
        user_role: { select: { id: true, name: true } },
        user_department: { select: { id: true, department_name: true } },
        tickets: true,
      },
    });

    res.status(200).json({
      message: "user updated successfully",
      user: formatUserAvatar(updated_user),
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "internal server error" });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { ids } = req.body;
    const paramId = req.params.id ? parseInt(req.params.id, 10) : null;

    if (paramId && !isNaN(paramId)) {
      const user = await prisma.users.findUnique({ where: { id: paramId } });
      if (!user) {
        res.status(404).json({ error: "user not found" });
        return;
      }

      await prisma.users.delete({ where: { id: paramId } });

      res.status(200).json({
        message: "user deleted successfully",
        deleted_id: paramId,
      });
      return;
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const deleted_users = await prisma.users.deleteMany({
        where: { id: { in: ids } },
      });

      res.status(200).json({
        success: true,
        message: "Users deleted successfully",
      });
      return;
    }

    res.status(400).json({ error: "Invalid id provided" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateUserStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { id },
      select: { is_active: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const newStatus = !user.is_active;

    const updatedUser = await prisma.users.update({
      where: { id },
      data: { is_active: newStatus },
      include: {
        user_role: { select: { id: true, name: true } },
        user_department: { select: { id: true, department_name: true } },
        tickets: true,
      },
    });

    res.status(200).json({
      success: true,
      message: `User status updated to ${
        updatedUser.is_active ? "active" : "inactive"
      }`,
      data: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
