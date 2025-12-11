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
exports.categoryController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("../../utils/pagination");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
const serializeCategory = (category) => ({
    id: category.id,
    category_name: category.category_name,
    description: category.description,
    isActive: category.is_active,
    created_at: category.created_at,
});
exports.categoryController = {
    // Create category
    createCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.error(firstError.msg, 400);
                    return;
                }
                const { category_name, description, is_active, created_at } = req.body;
                if (!category_name) {
                    res.error("Category name is required", 400);
                    return;
                }
                const category = yield prisma.categories.create({
                    data: {
                        category_name,
                        description,
                        is_active: is_active !== null && is_active !== void 0 ? is_active : true,
                        created_at: created_at ? new Date(created_at) : new Date(),
                    },
                });
                res.success("Category created successfully", serializeCategory(category), 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    // Get category by ID
    getCategoryById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = Number(req.params.id);
                const category = yield prisma.categories.findUnique({
                    where: { id },
                });
                if (!category) {
                    res.error("Category not found", 404);
                }
                res.success("Category fetched successfully", serializeCategory(category));
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    // Update category
    updateCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { created_at } = _a, rest = __rest(_a, ["created_at"]);
                if ("id" in rest) {
                    delete rest.id;
                }
                if ("name" in rest) {
                    rest.category_name = rest.name;
                    delete rest.name;
                }
                const category = yield prisma.categories.update({
                    where: { id: Number(req.params.id) },
                    data: Object.assign(Object.assign({}, rest), { created_at: created_at ? new Date(created_at) : new Date() }),
                });
                res.success("Category updated successfully", serializeCategory(category));
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    // Delete category
    deleteCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const bodyIds = (_a = req.body) === null || _a === void 0 ? void 0 : _a.ids;
                const ids = Array.isArray(bodyIds)
                    ? bodyIds.map(Number).filter((n) => Number.isFinite(n))
                    : [];
                const paramId = req.params.id ? Number(req.params.id) : null;
                // Bulk delete
                if (ids.length > 0) {
                    const deleted = yield prisma.categories.deleteMany({
                        where: { id: { in: ids } },
                    });
                    return void res.status(200).json({
                        success: true,
                        message: `${deleted.count} categor${deleted.count === 1 ? "y" : "ies"} deleted successfully`,
                        deleted_count: deleted.count,
                    });
                }
                // Single delete
                if (paramId && Number.isFinite(paramId)) {
                    const category = yield prisma.categories.findUnique({
                        where: { id: paramId },
                        select: { id: true },
                    });
                    if (!category) {
                        return void res
                            .status(404)
                            .json({ success: false, error: "Category not found" });
                    }
                    yield prisma.categories.delete({ where: { id: paramId } });
                    return void res.status(200).json({
                        success: true,
                        message: "Category deleted successfully",
                        deleted_id: paramId,
                    });
                }
                return void res.status(400).json({
                    success: false,
                    error: "Invalid id provided. Provide path param :id or body { ids: number[] }",
                });
            }
            catch (err) {
                // If you didn't switch to SetNull yet and FK fails, Prisma throws P2003
                if ((err === null || err === void 0 ? void 0 : err.code) === "P2003") {
                    return void res.status(400).json({
                        success: false,
                        error: "Cannot delete category because it is linked with one or more tickets. Either unlink tickets ",
                    });
                }
                console.error(err);
                return void res
                    .status(500)
                    .json({ success: false, error: "Internal server error" });
            }
        });
    },
    // Get all categories
    getAllCategories(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "" } = req.query;
                const pageNum = parseInt(page, 10);
                const limitNum = parseInt(limit, 10);
                const filters = search
                    ? { category_name: { contains: search.toLowerCase() } }
                    : {};
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.categories,
                    filters,
                    page: pageNum,
                    limit: limitNum,
                    orderBy: { id: "desc" },
                });
                res.success("Categories retrieved successfully", data.map(serializeCategory), 200, pagination);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
};
