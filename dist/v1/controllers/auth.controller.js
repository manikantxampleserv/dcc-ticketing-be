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
exports.sendError = sendError;
exports.register = register;
exports.login = login;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
const prisma_config_1 = __importDefault(require("../../utils/prisma.config"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../../config/logger"));
function sendError(res, status, code, message, extra = {}) {
    return res.status(status).json({
        success: false,
        error: Object.assign({ code, message }, extra),
    });
}
function register(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { username, email, password, first_name, last_name, role_id = "Agent", department_id, phone, } = req.body;
            if (!username || !email || !password || !first_name || !last_name) {
                res.status(400).json({
                    error: "Missing required fields",
                    required: ["username", "email", "password", "first_name", "last_name"],
                });
                return;
            }
            const existingUserByEmail = yield prisma_config_1.default.users.findUnique({
                where: { email },
            });
            if (existingUserByEmail) {
                res.status(409).json({ error: "User with this email already exists" });
                return;
            }
            const existingUserByUsername = yield prisma_config_1.default.users.findUnique({
                where: { username },
            });
            if (existingUserByUsername) {
                res.status(409).json({ error: "User with this username already exists" });
                return;
            }
            const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
            const user = yield prisma_config_1.default.users.create({
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
            const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "24h" });
            logger_1.default.info(`User registered successfully: ${user.email}`);
            res.status(201).json({
                message: "User registered successfully",
                user,
                token,
            });
        }
        catch (error) {
            logger_1.default.error(`Registration error: ${error}`);
            res
                .status(500)
                .json({ error: "Internal server error during registration" });
        }
    });
}
function login(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { email, password } = req.body;
            logger_1.default.info(`Login attempt for email: ${email}`);
            if (!email || !password) {
                res.status(400).json({
                    error: "Missing required fields",
                    required: ["email", "password"],
                });
                return;
            }
            const user = yield prisma_config_1.default.users.findUnique({
                where: { email },
                include: {
                    user_role: true,
                },
            });
            if (!user) {
                logger_1.default.error(`User found: No`);
            }
            else {
                logger_1.default.success(`User found: Yes`);
            }
            if (!user) {
                res.status(401).json({ success: false, error: "Invalid credentials" });
                return;
            }
            if (user.is_active === false) {
                res.status(401).json({ error: "Account is deactivated" });
                return;
            }
            const isValidPassword = yield bcryptjs_1.default.compare(password, user.password_hash);
            console.log("isValidate : ", isValidPassword);
            if (!isValidPassword) {
                res.status(401).json({
                    success: false,
                    error: "Invalid credentials",
                });
                // res.status(401).json({ message: "Invalid credentials" });
                return;
            }
            yield prisma_config_1.default.users.update({
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
                role_name: ((_a = user.user_role) === null || _a === void 0 ? void 0 : _a.name) || "",
            };
            const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "24h" });
            logger_1.default.success(`Login successful for user: ${user.email}`);
            res.json({
                message: "Login successful",
                user: payload,
                token,
            });
        }
        catch (error) {
            console.error(error);
            // Prisma connection pool timeout error
            if (error.message &&
                error.message.includes("Timed out fetching a new connection from the connection pool")) {
                res.status(503).json({
                    success: false,
                    message: "Service temporarily unavailable. The server is experiencing high load. Please try again in a few moments.",
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    message: "An unexpected error occurred during login. Please try again.",
                });
            }
        }
    });
}
function getProfile(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const user = yield prisma_config_1.default.users.findUnique({
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
                    tickets: {
                        select: {
                            id: true,
                            status: true,
                            priority: true,
                            ticket_number: true,
                            subject: true,
                            sla_status: true,
                            source: true,
                            created_at: true,
                            updated_at: true,
                            sla_priority: true,
                        },
                    },
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
            const totals = yield prisma_config_1.default.tickets.count({
                where: { OR: [{ assigned_agent_id: userId }, { assigned_by: userId }] },
            });
            const ActiveTotals = yield prisma_config_1.default.tickets.count({
                where: {
                    OR: [{ assigned_agent_id: userId }, { assigned_by: userId }],
                    status: {
                        in: ["Open", "In Progress"],
                    },
                },
            });
            res.json({
                message: "Profile retrieved successfully",
                user: Object.assign(Object.assign({}, user), { total_tickets: totals, active_tickets: ActiveTotals }),
            });
        }
        catch (error) {
            logger_1.default.error(`Get profile error: ${error}`);
            res
                .status(500)
                .json({ error: "Internal server error while fetching profile" });
        }
    });
}
function updateProfile(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            const { first_name, last_name, phone, avatar, department_id } = req.body;
            const existingUser = yield prisma_config_1.default.users.findUnique({
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
            const updateData = {};
            if (first_name)
                updateData.first_name = first_name;
            if (last_name)
                updateData.last_name = last_name;
            if (phone !== undefined)
                updateData.phone = phone;
            if (avatar !== undefined)
                updateData.avatar = avatar;
            if (department_id !== undefined)
                updateData.department_id = department_id;
            const updatedUser = yield prisma_config_1.default.users.update({
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
        }
        catch (error) {
            logger_1.default.error(`Update profile error: ${error}`);
            res
                .status(500)
                .json({ error: "Internal server error while updating profile" });
        }
    });
}
