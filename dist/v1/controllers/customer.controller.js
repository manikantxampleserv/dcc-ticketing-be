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
exports.customerController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("../../utils/pagination");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
const serializeCustomer = (customer, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign(Object.assign({ id: customer.id, company_id: customer.company_id, first_name: customer.first_name, last_name: customer.last_name, email: customer.email, phone: customer.phone, job_title: customer.job_title, is_active: customer.is_active }, (includeCreatedAt && { created_at: customer.created_at })), (includeUpdatedAt && { updated_at: customer.updated_at })), { companies: customer.companies
        ? {
            id: customer.companies.id,
            company_name: customer.companies.company_name,
            domain: customer.companies.domain,
        }
        : undefined, support_ticket_responses: customer.support_ticket_responses
        ? customer.support_ticket_responses.map((response) => ({
            id: response.id,
            ticket_id: response.ticket_id,
            agent_id: response.agent_id,
        }))
        : undefined, tickets: customer.tickets
        ? customer.tickets.map((ticket) => ({
            id: ticket.id,
            ticket_number: ticket.ticket_number,
        }))
        : undefined }));
exports.customerController = {
    createCustomer(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.status(400).json({ success: false, error: firstError.msg });
                    return;
                }
                const { company_id, first_name, last_name, email, phone, job_title, support_type, l1_support_hours, l1_support_applicable, is_active, } = req.body;
                const customer = yield prisma.customers.create({
                    data: {
                        company_id,
                        first_name,
                        last_name,
                        email,
                        phone,
                        support_type: support_type === null || support_type === void 0 ? void 0 : support_type.toString(),
                        l1_support_hours: l1_support_hours === null || l1_support_hours === void 0 ? void 0 : l1_support_hours.toString(),
                        l1_support_applicable: l1_support_applicable === null || l1_support_applicable === void 0 ? void 0 : l1_support_applicable.toString(),
                        job_title,
                        is_active,
                        created_at: new Date(),
                    },
                    include: {
                        companies: true,
                        support_ticket_responses: true,
                        tickets: true,
                    },
                });
                res.status(201).json({
                    success: true,
                    message: "Customer created successfully",
                    data: serializeCustomer(customer, true, false),
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    error: error.message || "Internal Server Error",
                });
            }
        });
    },
    getCustomerById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.status(400).json({ success: false, error: firstError.msg });
                    return;
                }
                const id = Number(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({ success: false, error: "Invalid customer ID" });
                    return;
                }
                const customer = yield prisma.customers.findUnique({
                    where: { id },
                    include: {
                        companies: true,
                        support_ticket_responses: true,
                        tickets: true,
                    },
                });
                if (!customer) {
                    res.status(404).json({ success: false, message: "Customer not found" });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: "Customer retrieved successfully",
                    data: serializeCustomer(customer, true, true),
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message || "Internal Server Error",
                });
            }
        });
    },
    updateCustomer(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.status(400).json({ success: false, error: firstError.msg });
                    return;
                }
                const id = Number(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({ success: false, error: "Invalid customer ID" });
                    return;
                }
                // ❌ remove fields that should not be updated directly
                const _a = req.body, { created_at, updated_at, company_id, support_type, l1_support_hours, l1_support_applicable } = _a, updateData = __rest(_a, ["created_at", "updated_at", "company_id", "support_type", "l1_support_hours", "l1_support_applicable"]);
                // ✅ build prisma update data safely
                const prismaData = Object.assign(Object.assign({}, updateData), { support_type: support_type === null || support_type === void 0 ? void 0 : support_type.toString(), l1_support_hours: l1_support_hours === null || l1_support_hours === void 0 ? void 0 : l1_support_hours.toString(), l1_support_applicable: l1_support_applicable === null || l1_support_applicable === void 0 ? void 0 : l1_support_applicable.toString(), updated_at: new Date() });
                // ✅ conditionally connect company
                if (company_id) {
                    prismaData.companies = {
                        connect: { id: Number(company_id) },
                    };
                }
                const updatedCustomer = yield prisma.customers.update({
                    where: { id },
                    data: prismaData,
                    include: {
                        companies: true,
                        support_ticket_responses: true,
                        tickets: true,
                    },
                });
                res.status(200).json({
                    success: true,
                    message: "Customer updated successfully",
                    data: serializeCustomer(updatedCustomer, true, true),
                });
            }
            catch (error) {
                console.error(error);
                if (error.code === "P2025") {
                    res.status(404).json({
                        success: false,
                        message: "Customer not found",
                    });
                }
                else {
                    res.status(500).json({
                        success: false,
                        error: error.message || "Internal Server Error",
                    });
                }
            }
        });
    },
    deleteCustomer(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // try {
            //   const id = Number(req.params.id);
            //   if (isNaN(id)) {
            //     res.status(400).json({ success: false, error: "Invalid customer ID" });
            //     return;
            //   }
            //   await prisma.customers.delete({ where: { id } });
            //   res.status(200).json({
            //     success: true,
            //     message: "Customer deleted successfully",
            //   });
            // } catch (error: any) {
            //   console.error(error);
            //   if (error.code === "P2025") {
            //     res.status(404).json({ success: false, message: "Customer not found" });
            //   } else {
            //     res
            //       .status(500)
            //       .json({ success: false, error: "Internal Server Error" });
            //   }
            // }
            try {
                const { id, ids } = req.body;
                if (id && !isNaN(Number(id))) {
                    const customer = yield prisma.customers.findUnique({
                        where: { id: Number(id) },
                    });
                    if (!customer) {
                        res.error("Customer not found", 404);
                        return;
                    }
                    yield prisma.customers.delete({ where: { id: Number(id) } });
                    res.success(`Customer with ID ${id} deleted successfully`, 200);
                    return;
                }
                if (Array.isArray(ids) && ids.length > 0) {
                    const deletedCustomer = yield prisma.customers.deleteMany({
                        where: { id: { in: ids } },
                    });
                    if (deletedCustomer.count === 0) {
                        res.error("No customers found for deletion", 404);
                        return;
                    }
                    res.success(`${deletedCustomer.count} customers deleted successfully`, 200);
                    return;
                }
                res.error("Please provide a valid 'id' or 'ids[]' in the request body", 400);
            }
            catch (error) {
                res.error(error.message, 500);
            }
        });
    },
    getAllCustomer(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "" } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const searchTerm = search.toLowerCase().trim();
                // Base filter object
                let filters = {};
                if (searchTerm) {
                    // If there’s a space, assume “first last”
                    const parts = searchTerm.split(/\s+/);
                    if (parts.length >= 2) {
                        // Use first part for first_name and last part for last_name
                        const [firstPart, ...rest] = parts;
                        const lastPart = rest.join(" ");
                        filters.AND = [
                            { first_name: { contains: firstPart } },
                            { last_name: { contains: lastPart } },
                        ];
                    }
                    else {
                        // Single term: OR across all fields
                        filters.OR = [
                            { email: { contains: searchTerm } },
                            { first_name: { contains: searchTerm } },
                            { last_name: { contains: searchTerm } },
                            { job_title: { contains: searchTerm } },
                            { phone: { contains: searchTerm } },
                        ];
                    }
                }
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.customers,
                    filters,
                    page: page_num,
                    limit: limit_num,
                    orderBy: { id: "desc" },
                    include: {
                        companies: true,
                        support_ticket_responses: true,
                        tickets: true,
                    },
                });
                res.status(200).json({
                    success: true,
                    message: "Customers retrieved successfully",
                    data: data.map((customer) => serializeCustomer(customer, true, true)),
                    pagination,
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    error: error.message || "Internal Server Error",
                });
            }
        });
    },
};
