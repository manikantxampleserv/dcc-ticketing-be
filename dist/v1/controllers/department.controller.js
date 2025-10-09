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
exports.departmentController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("../../utils/pagination");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
const serializeDepartment = (department, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign({ id: department.id, department_name: department.department_name, is_active: Boolean(department.is_active) }, (includeCreatedAt && { created_at: department.created_at })), (includeUpdatedAt && { updated_at: department.updated_at })));
exports.departmentController = {
    createDepartment(req, res) {
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
                const { department_name, is_active } = req.body;
                const department = yield prisma.department.create({
                    data: {
                        department_name,
                        is_active: is_active === true || is_active === "true" ? "Y" : "N",
                    },
                    select: {
                        id: true,
                        department_name: true,
                        is_active: true,
                        created_at: true,
                    },
                });
                res.status(201).send({
                    success: true,
                    message: "Department created successfully",
                    data: serializeDepartment(department, true, false),
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
    getDepartmentById(req, res) {
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
                const department = yield prisma.department.findUnique({ where: { id } });
                if (!department) {
                    res
                        .status(404)
                        .send({ success: false, message: "Department not found" });
                    return;
                }
                res.status(200).send({
                    success: true,
                    message: "Department found successfully",
                    data: serializeDepartment(department, true, true),
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
    updateDepartment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { created_at, updated_at } = _a, departmentData = __rest(_a, ["created_at", "updated_at"]);
                if ("id" in departmentData) {
                    delete departmentData.id;
                }
                if (departmentData.is_active !== undefined) {
                    departmentData.is_active =
                        departmentData.is_active === true ||
                            departmentData.is_active === "true"
                            ? "Y"
                            : "N";
                }
                const department = yield prisma.department.update({
                    where: { id: Number(req.params.id) },
                    data: Object.assign(Object.assign({}, departmentData), { created_at: created_at ? new Date(created_at) : undefined, updated_at: updated_at ? new Date(updated_at) : new Date() }),
                });
                res.status(200).send({
                    success: true,
                    message: "Department updated successfully",
                    data: serializeDepartment(department, false, true),
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
    deleteDepartment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // try {
            //   await prisma.department.delete({
            //     where: { id: Number(req.params.id) },
            //   });
            //   res.status(200).send({
            //     success: true,
            //     message: "Department deleted successfully",
            //   });
            // } catch (error) {
            //   console.log("Error in department deletion", error);
            //   res.status(500).send({
            //     success: false,
            //     message: "Internal Server Error",
            //   });
            // }
            try {
                const { id, ids } = req.body;
                if (id && !isNaN(Number(id))) {
                    const department = yield prisma.department.findUnique({
                        where: { id: Number(id) },
                    });
                    if (!department) {
                        res.error("Department not found", 404);
                        return;
                    }
                    yield prisma.department.delete({ where: { id: Number(id) } });
                    res.success(`Department with id ${id} deleted successfully`, 200);
                    return;
                }
                if (Array.isArray(ids) && ids.length > 0) {
                    const deleteDepartment = yield prisma.department.deleteMany({
                        where: { id: { in: ids } },
                    });
                    if (deleteDepartment.count === 0) {
                        res.error("No matching department found for deletion", 404);
                        return;
                    }
                    res.success(`${deleteDepartment.count} department deleted successfully`, 200);
                    return;
                }
                res.error("Please provide a valid 'id' or 'ids[]' in the request body", 400);
            }
            catch (error) {
                res.error(error.message, 500);
            }
        });
    },
    getAllDepartment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "" } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const searchLower = search.toLowerCase();
                const filters = search
                    ? {
                        department_name: {
                            contains: searchLower,
                        },
                    }
                    : {};
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.department,
                    filters,
                    page: page_num,
                    limit: limit_num,
                    orderBy: { id: "desc" },
                });
                res.status(200).send({
                    success: true,
                    message: "Department  retrieved successfully",
                    data: data.map((department) => serializeDepartment(department, true, true)),
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
