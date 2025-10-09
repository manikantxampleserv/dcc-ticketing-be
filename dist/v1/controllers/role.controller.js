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
exports.roleController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("../../utils/pagination");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
const serializeRole = (role, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign({ id: role.id, name: role.name, is_active: Boolean(role.is_active) }, (includeCreatedAt && { created_at: role.created_at })), (includeUpdatedAt && { updated_at: role.updated_at })));
exports.roleController = {
    createRole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.status(400).json({
                        success: false,
                        error: firstError.msg,
                    });
                    return;
                }
                const { name, is_active } = req.body;
                const role = yield prisma.role.create({
                    data: {
                        name,
                        is_active: is_active === true || is_active === "true" ? "Y" : "N",
                    },
                });
                res.status(201).send({
                    success: true,
                    message: "Role created successfully",
                    data: serializeRole(role, true, false),
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).send({
                    success: false,
                    error: error.message,
                });
            }
        });
    },
    getRoleById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.status(400).json({
                        success: false,
                        error: firstError.msg,
                    });
                    return;
                }
                const id = Number(req.params.id);
                const role = yield prisma.role.findUnique({ where: { id } });
                if (!role) {
                    res.status(404).send({ success: false, message: "Roles not found" });
                    return;
                }
                res.status(200).send({
                    success: true,
                    message: "Roles found successfully",
                    data: serializeRole(role, true, true),
                });
            }
            catch (error) {
                res.status(500).send({
                    success: false,
                    error: error.message,
                });
            }
        });
    },
    updateRole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { created_at, updated_at } = _a, roleData = __rest(_a, ["created_at", "updated_at"]);
                if (roleData.is_active !== undefined) {
                    roleData.is_active =
                        roleData.is_active === true || roleData.is_active === "true"
                            ? "Y"
                            : "N";
                }
                const role = yield prisma.role.update({
                    where: { id: Number(req.params.id) },
                    data: Object.assign(Object.assign({}, roleData), { created_at: created_at ? new Date(created_at) : undefined, updated_at: updated_at ? new Date(updated_at) : new Date() }),
                });
                res.status(200).send({
                    success: true,
                    message: "Role updated successfully",
                    data: serializeRole(role, false, true),
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).send({
                    success: false,
                    message: error.message,
                });
            }
        });
    },
    deleteRole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.role.delete({
                    where: { id: Number(req.params.id) },
                });
                res.status(200).send({
                    success: true,
                    message: "Role deleted successfully",
                });
            }
            catch (error) {
                res.status(500).send({
                    success: false,
                    message: "Internal Server Error",
                });
            }
        });
    },
    getAllRole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "" } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const searchLower = search.toLowerCase();
                const filters = search
                    ? {
                        name: {
                            contains: searchLower,
                        },
                    }
                    : {};
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.role,
                    filters,
                    page: page_num,
                    limit: limit_num,
                    orderBy: { id: "desc" },
                });
                res.status(200).send({
                    success: true,
                    message: "Role  retrieved successfully",
                    data: data.map((role) => serializeRole(role, true, true)),
                    pagination,
                });
            }
            catch (error) {
                res.status(500).send({
                    success: false,
                    error: error.message,
                });
            }
        });
    },
};
