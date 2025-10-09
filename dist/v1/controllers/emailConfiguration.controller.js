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
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailConfigurationController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("../../utils/pagination");
const prisma = new client_1.PrismaClient();
const serializeEmailConfiguration = (email, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign({ id: email.id, smtp_server: email.smtp_server, smtp_port: Number(email.smtp_port), username: email.username, password: email.password, enable_tls: Boolean(email.enable_tls), from_email: email.from_email, from_name: email.from_name, auto_reply_enabled: Boolean(email.auto_reply_enabled), is_active: email.is_active }, (includeCreatedAt && { created_at: email.created_at })), (includeUpdatedAt && { updated_at: email.updated_at })));
exports.emailConfigurationController = {
    createEmailConfiguration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { smtp_server, smtp_port, username, password, enable_tls, from_email, from_name, is_active, auto_reply_enabled, auto_reply_message, } = req.body;
                const emailConfiguration = yield prisma.email_configurations.create({
                    data: {
                        smtp_server,
                        smtp_port,
                        username,
                        password,
                        enable_tls,
                        from_email,
                        from_name,
                        is_active,
                        auto_reply_enabled,
                        auto_reply_message,
                    },
                });
                res.success("Email Configuration created successfully", serializeEmailConfiguration(emailConfiguration), 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    getEmailConfigurationById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = Number(req.params.id);
                const emailConfiguration = yield prisma.email_configurations.findUnique({
                    where: { id },
                });
                if (!emailConfiguration) {
                    res.error("Email Configuration not found", 404);
                    return;
                }
                res.success("Email Configuration retrieved successfully", serializeEmailConfiguration(emailConfiguration), 200);
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
    // async updateEmailConfiguration(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { created_at, updated_at, ...emailConfigurationData } = req.body;
    //     const emailConfiguration = await prisma.email_configurations.update({
    //       where: { id: Number(req.params.id) },
    //       data: {
    //         ...emailConfigurationData,
    //         created_at: created_at ? new Date(created_at) : new Date(),
    //         updated_at: updated_at ? new Date(updated_at) : new Date(),
    //       },
    //     });
    //     res.success(
    //       "Email Configuration updated successfully",
    //       serializeEmailConfiguration(emailConfiguration),
    //       200
    //     );
    //   } catch (error: any) {
    //     console.error(error);
    //     res.error(error.message);
    //   }
    // },
    updateEmailConfiguration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { id, created_at, updated_at } = _a, emailConfigurationData = __rest(_a, ["id", "created_at", "updated_at"]);
                const emailConfiguration = yield prisma.email_configurations.update({
                    where: { id: Number(req.params.id) },
                    data: Object.assign(Object.assign({}, emailConfigurationData), { updated_at: new Date() }),
                });
                res.success("Email Configuration updated successfully", serializeEmailConfiguration(emailConfiguration), 200);
            }
            catch (error) {
                console.error("Error in updateEmailConfiguration:", error);
                res.error(error.message);
            }
        });
    },
    upsertEmailConfiguration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, smtp_server, smtp_port, username, password, enable_tls, from_email, from_name, is_active, auto_reply_enabled, auto_reply_message, } = req.body;
                const emailConfiguration = yield prisma.email_configurations.upsert({
                    where: { id: id !== null && id !== void 0 ? id : 0 }, // if no id is passed, prisma won't find a match
                    update: {
                        smtp_server,
                        smtp_port,
                        username,
                        password,
                        enable_tls,
                        from_email,
                        from_name,
                        is_active,
                        auto_reply_enabled,
                        auto_reply_message,
                        updated_at: new Date(),
                    },
                    create: {
                        smtp_server,
                        smtp_port,
                        username,
                        password,
                        enable_tls,
                        from_email,
                        from_name,
                        is_active,
                        auto_reply_enabled,
                        auto_reply_message,
                    },
                });
                res.success(id
                    ? "Email Configuration updated successfully"
                    : "Email Configuration created successfully", serializeEmailConfiguration(emailConfiguration, true, true), id ? 200 : 201);
            }
            catch (error) {
                console.error("Error in upsertEmailConfiguration:", error);
                res.error(error.message);
            }
        });
    },
    deleteEmailConfiguration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.email_configurations.delete({
                    where: { id: Number(req.params.id) },
                });
                res.success("Email Configuration deleted successfully", null, 200);
            }
            catch (error) {
                console.error(error);
            }
        });
    },
    getAllEmailConfiguration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "" } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const searchLower = search.toLowerCase();
                const filters = search
                    ? {
                        username: {
                            contains: searchLower,
                        },
                    }
                    : {};
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.email_configurations,
                    filters,
                    page: page_num,
                    limit: limit_num,
                    orderBy: { id: "desc" },
                });
                res.success("Email Configurations retrieved successfully", data.map((email) => serializeEmailConfiguration(email, true, true)), 200, pagination);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
};
