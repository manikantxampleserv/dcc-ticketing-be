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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersList = getUsersList;
exports.getUsersOption = getUsersOption;
exports.getUser = getUser;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.updateUserStatus = updateUserStatus;
const prisma_config_1 = __importDefault(require("../../utils/prisma.config"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const blackbaze_1 = require("../../utils/blackbaze");
const formatUserAvatar = (users) => {
    if (!users)
        return null;
    const { password_hash } = users, user = __rest(users, ["password_hash"]);
    if (user.avatar && !/^https?:\/\//.test(user.avatar)) {
        return Object.assign(Object.assign({}, user), { avatar: `${process.env.BACKBLAZE_BUCKET_URL}/${user.avatar}` });
    }
    return user;
};
const formatUserListAvatars = (users = []) => users.map(formatUserAvatar);
function getUsersList(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = "1", limit = "10", search, role_id, department_id, } = req.query;
            const page_num = parseInt(page, 10);
            const limit_num = parseInt(limit, 10);
            const searchLower = (search || "").toLowerCase();
            // const filters: any = search
            //   ? {
            //       username: {
            //         contains: searchLower,
            //       },
            //       email: {
            //         contains: searchLower,
            //       },
            //       first_name: {
            //         contains: searchLower,
            //       },
            //       last_name: {
            //         contains: searchLower,
            //       },
            //     }
            //   : {};
            const filters = {};
            // Add search filters using OR condition
            if (searchLower) {
                filters.OR = [
                    {
                        username: {
                            contains: searchLower,
                            // mode: "insensitive",
                        },
                    },
                    {
                        email: {
                            contains: searchLower,
                            // mode: "insensitive",
                        },
                    },
                    {
                        first_name: {
                            contains: searchLower,
                            // mode: "insensitive",
                        },
                    },
                    {
                        last_name: {
                            contains: searchLower,
                            // mode: "insensitive",
                        },
                    },
                ];
            }
            if (role_id)
                filters.role_id = Number(role_id);
            if (department_id)
                filters.department_id = Number(department_id);
            const total_count = yield prisma_config_1.default.users.count({ where: filters });
            const users = yield prisma_config_1.default.users.findMany({
                where: filters,
                skip: (page_num - 1) * limit_num,
                take: limit_num,
                include: {
                    user_role: { select: { id: true, name: true } }, // related role
                    user_department: { select: { id: true, department_name: true } }, // related department
                    tickets: true,
                    manager: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                            phone: true,
                            avatar: true,
                        },
                    },
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
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ error: "internal server error" });
        }
    });
}
function getUsersOption(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = "1", limit = "1000", search, role_id, department_id, } = req.query;
            const page_num = parseInt(page, 10);
            const limit_num = parseInt(limit, 10);
            const searchLower = (search || "").toLowerCase();
            // const filters: any = search
            //   ? {
            //       username: {
            //         contains: searchLower,
            //       },
            //       email: {
            //         contains: searchLower,
            //       },
            //       first_name: {
            //         contains: searchLower,
            //       },
            //       last_name: {
            //         contains: searchLower,
            //       },
            //     }
            //   : {};
            const filters = {};
            // Add search filters using OR condition
            if (searchLower) {
                filters.OR = [
                    {
                        username: {
                            contains: searchLower,
                            // mode: "insensitive",
                        },
                    },
                    {
                        email: {
                            contains: searchLower,
                            // mode: "insensitive",
                        },
                    },
                    {
                        first_name: {
                            contains: searchLower,
                            // mode: "insensitive",
                        },
                    },
                    {
                        last_name: {
                            contains: searchLower,
                            // mode: "insensitive",
                        },
                    },
                ];
            }
            if (role_id)
                filters.role_id = Number(role_id);
            if (department_id)
                filters.department_id = Number(department_id);
            const total_count = yield prisma_config_1.default.users.count({ where: filters });
            const users = yield prisma_config_1.default.users.findMany({
                where: filters,
                skip: (page_num - 1) * limit_num,
                take: limit_num,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                    phone: true,
                    avatar: true,
                },
                // include: {
                //   user_role: { select: { id: true, name: true } }, // related role
                //   user_department: { select: { id: true, department_name: true } }, // related department
                //   tickets: true,
                //   manager: {
                //     select: {
                //       id: true,
                //       username: true,
                //       email: true,
                //       first_name: true,
                //       last_name: true,
                //       phone: true,
                //       avatar: true,
                //     },
                //   },
                // },
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
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ error: "internal server error" });
        }
    });
}
function getUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                res.status(400).json({ error: "invalid id" });
                return;
            }
            const user = yield prisma_config_1.default.users.findUnique({
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
        }
        catch (error) {
            res.status(500).json({ error: "internal server error" });
        }
    });
}
function createUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { username, email, password_hash, first_name, last_name, role_id, department_id, phone, manager_id, } = req.body;
            const created_by = req.user ? Number(req.user.id) : null;
            console.log("Creating user by:", created_by, req.body, req.file);
            let avatarUrl = null;
            if (req.file) {
                const fileName = `avatars/${Date.now()}_${req.file.originalname}`;
                avatarUrl = yield (0, blackbaze_1.uploadFile)(req.file.buffer, fileName, req.file.mimetype);
            }
            const existing_email = yield prisma_config_1.default.users.findUnique({ where: { email } });
            console.log("Existing email check:", existing_email);
            if (existing_email) {
                res.status(409).json({ error: "user with this email already exists" });
                return;
            }
            // const existing_username = await prisma.users.findUnique({
            //   where: { username: email?.split("@")[0] },
            // });
            // if (existing_username) {
            //   res.status(409).json({ error: "user with this username already exists" });
            //   return;
            // }
            const hashed_password = yield bcryptjs_1.default.hash(password_hash, 10);
            const user = yield prisma_config_1.default.users.create({
                data: {
                    username: email === null || email === void 0 ? void 0 : email.split("@")[0],
                    email,
                    password_hash: hashed_password,
                    first_name,
                    last_name,
                    role_id: Number(role_id),
                    department_id: Number(department_id),
                    phone,
                    manager_id: Number(manager_id),
                    avatar: avatarUrl,
                    created_by,
                },
                include: {
                    user_role: { select: { id: true, name: true } },
                    user_department: { select: { id: true, department_name: true } },
                    tickets: true,
                    manager: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                            phone: true,
                            avatar: true,
                        },
                    },
                },
            });
            res.status(201).json({
                message: "user created successfully",
                user: formatUserAvatar(user),
            });
        }
        catch (error) {
            console.log("Error in creating user", error);
            res.status(500).json({ error: "internal server error" });
        }
    });
}
function updateUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                res.status(400).json({ error: "invalid id" });
                return;
            }
            console.log("Files : ", req.file);
            const { username, email, password, password_hash, first_name, last_name, role_id, department_id, phone, manager_id, is_active, } = req.body;
            const existing_user = yield prisma_config_1.default.users.findUnique({ where: { id } });
            if (!existing_user) {
                res.status(404).json({ error: "user not found" });
                return;
            }
            if (email && email !== existing_user.email) {
                const email_exists = yield prisma_config_1.default.users.findUnique({ where: { email } });
                if (email_exists) {
                    res.status(409).json({ error: "user with this email already exists" });
                    return;
                }
            }
            if (username && username !== existing_user.username) {
                const username_exists = yield prisma_config_1.default.users.findUnique({
                    where: { username },
                });
                if (username_exists) {
                    res
                        .status(409)
                        .json({ error: "user with this username already exists" });
                    return;
                }
            }
            const update_data = {};
            if (username)
                update_data.username = username;
            if (email)
                update_data.email = email;
            if (first_name)
                update_data.first_name = first_name;
            if (last_name)
                update_data.last_name = last_name;
            if (role_id)
                update_data.role_id = Number(role_id);
            if (department_id)
                update_data.department_id = Number(department_id);
            if (phone !== undefined)
                update_data.phone = phone;
            if (manager_id !== undefined)
                update_data.manager_id = Number(manager_id);
            if (is_active !== undefined)
                update_data.is_active = Boolean(is_active);
            if (password)
                update_data.password_hash = yield bcryptjs_1.default.hash(password, 10);
            if (password_hash)
                update_data.password_hash = yield bcryptjs_1.default.hash(password_hash, 10);
            // console.log("Password : ", password, update_data, req.body);
            if (req.file) {
                if (existing_user.avatar) {
                    const filePath = existing_user.avatar.replace(`${process.env.BACKBLAZE_BUCKET_URL}/`, "");
                    yield (0, blackbaze_1.deleteFile)(filePath);
                }
                const fileName = `avatars/${Date.now()}_${req.file.originalname}`;
                const avatarUrl = yield (0, blackbaze_1.uploadFile)(req.file.buffer, fileName, req.file.mimetype);
                update_data.avatar = avatarUrl;
            }
            const updated_user = yield prisma_config_1.default.users.update({
                where: { id },
                data: update_data,
                include: {
                    user_role: { select: { id: true, name: true } },
                    user_department: { select: { id: true, department_name: true } },
                    tickets: true,
                    manager: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                            phone: true,
                            avatar: true,
                        },
                    },
                },
            });
            res.status(200).json({
                message: "user updated successfully",
                user: formatUserAvatar(updated_user),
            });
        }
        catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ error: "internal server error" });
        }
    });
}
function deleteUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { ids } = req.body;
            const paramId = req.params.id ? parseInt(req.params.id, 10) : null;
            console.log("ids ???????????????11111", ids, Array.isArray(ids) && ids.length > 0, paramId);
            if (paramId && !isNaN(paramId)) {
                const user = yield prisma_config_1.default.users.findUnique({ where: { id: paramId } });
                if (!user) {
                    res.status(404).json({ error: "user not found" });
                    return;
                }
                yield prisma_config_1.default.users.delete({ where: { id: paramId } });
                res.status(200).json({
                    message: "user deleted successfully",
                    deleted_id: paramId,
                });
                return;
            }
            console.log("ids ???????????????", ids, Array.isArray(ids) && ids.length > 0);
            if (Array.isArray(ids) && ids.length > 0) {
                const deleted_users = yield prisma_config_1.default.users.deleteMany({
                    where: { id: { in: ids } },
                });
                res.status(200).json({
                    success: true,
                    message: "Users deleted successfully",
                });
                return;
            }
            res.status(400).json({ error: "Invalid id provided" });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
}
function updateUserStatus(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                res.status(400).json({ success: false, message: "Invalid user ID" });
                return;
            }
            const user = yield prisma_config_1.default.users.findUnique({
                where: { id },
                select: { is_active: true },
            });
            if (!user) {
                res.status(404).json({ success: false, message: "User not found" });
                return;
            }
            const newStatus = !user.is_active;
            const updatedUser = yield prisma_config_1.default.users.update({
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
                message: `User status updated to ${updatedUser.is_active ? "active" : "inactive"}`,
                data: updatedUser,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
}
