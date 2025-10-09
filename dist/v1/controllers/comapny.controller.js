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
exports.companyController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("../../utils/pagination");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
const serializeCompany = (company, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign(Object.assign({ id: company.id, company_name: company.company_name, domain: company.domain, contact_email: company.contact_email, contact_phone: company.contact_phone, address: company.address, is_active: company.is_active ? "Y" : "N" }, (includeCreatedAt && { created_at: company.created_at })), (includeUpdatedAt && { updated_at: company.updated_at })), { customers: company.customers
        ? {
            id: company.customers.id,
            first_name: company.customers.first_name,
            last_name: company.customers.domain,
        }
        : undefined }));
exports.companyController = {
    createCompany(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.error(firstError.msg, 400);
                    return;
                }
                const { company_name, domain, contact_email, contact_phone, address, is_active, } = req.body;
                const company = yield prisma.companies.create({
                    data: {
                        company_name,
                        domain,
                        contact_email,
                        contact_phone,
                        address,
                        is_active,
                    },
                    include: {
                        customers: true,
                    },
                });
                res.success("Company created successfully", serializeCompany(company), 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    getCompanyById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.error(firstError.msg, 400);
                    return;
                }
                const id = Number(req.params.id);
                const company = yield prisma.companies.findUnique({ where: { id } });
                if (!company) {
                    res.error("Company not found", 404);
                    return;
                }
                res.success("Company fetched successfully", serializeCompany(company), 200);
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
    updateCompany(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { created_at, updated_at } = _a, companyData = __rest(_a, ["created_at", "updated_at"]);
                if ("id" in companyData) {
                    delete companyData.id;
                }
                if (companyData.is_active !== undefined) {
                    companyData.is_active =
                        companyData.is_active === true || companyData.is_active === "true";
                }
                const company = yield prisma.companies.update({
                    where: { id: Number(req.params.id) },
                    data: Object.assign(Object.assign({}, companyData), { created_at: created_at ? new Date(created_at) : new Date(), updated_at: updated_at ? new Date(updated_at) : new Date() }),
                });
                res.success("Category updated successfully", serializeCompany(company), 200);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    deleteCompany(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.companies.delete({
                    where: { id: Number(req.params.id) },
                });
                res.success("Company deleted successfully", 200);
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
    getAllCompany(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "" } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const searchLower = search.toLowerCase();
                const filters = search
                    ? {
                        company_name: {
                            contains: searchLower,
                        },
                    }
                    : {};
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.companies,
                    filters,
                    page: page_num,
                    limit: limit_num,
                    orderBy: { id: "desc" },
                    include: {
                        customers: true,
                    },
                });
                res.success("Company retrieved successfully", data.map((company) => serializeCompany(company, true, true)), 200, pagination);
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
};
