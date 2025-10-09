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
exports.agentsController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("../../utils/pagination");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
const serializeAgents = (agent, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign(Object.assign({ id: agent.id, first_name: agent.first_name, last_name: agent.last_name, role: agent.role, department: agent.department, hire_date: agent.hire_date, avatar: agent.avatar, email: agent.email, phone: agent.phone, user_id: agent.user_id, is_active: agent.is_active }, (includeCreatedAt && { created_at: agent.created_at })), (includeUpdatedAt && { updated_at: agent.updated_at })), { users: agent.users
        ? {
            id: agent.users.id,
            email: agent.users.email,
            first_name: agent.users.first_name,
            last_name: agent.users.last_name,
        }
        : undefined, agent_role: agent.agent_role
        ? {
            id: agent.agent_role.id,
            name: agent.agent_role.name,
        }
        : undefined, agent_department: agent.agent_department
        ? {
            id: agent.agent_department.id,
            department_name: agent.agent_department.department_name,
        }
        : undefined, support_ticket_responses: agent.support_ticket_responses
        ? agent.support_ticket_responses.map((response) => ({
            id: response.id,
            ticket_id: response.ticket_id,
            agent_id: response.agent_id,
        }))
        : undefined, tickets: agent.tickets
        ? agent.tickets.map((ticket) => ({
            id: ticket.id,
            ticket_number: ticket.ticket_number,
        }))
        : undefined }));
exports.agentsController = {
    createAgent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.status(400).json({ success: false, error: firstError.msg });
                    return;
                }
                const { role, department, hire_date, avatar, user_id, first_name, last_name, email, phone, is_active, } = req.body;
                const agent = yield prisma.agents.create({
                    data: {
                        role,
                        department,
                        hire_date,
                        avatar,
                        user_id,
                        first_name,
                        last_name,
                        email,
                        phone,
                        is_active,
                        created_at: new Date(),
                    },
                    include: {
                        users: true,
                        agent_role: true,
                        agent_department: true,
                    },
                });
                res.status(201).json({
                    success: true,
                    message: "Agent created successfully",
                    data: serializeAgents(agent, true, false),
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
    getAgentById(req, res) {
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
                    data: serializeAgents(customer, true, true),
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
    updateAgent(req, res) {
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
                const _a = req.body, { created_at, updated_at } = _a, updateData = __rest(_a, ["created_at", "updated_at"]);
                const updatedCustomer = yield prisma.customers.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, updateData), { updated_at: new Date() }),
                    include: {
                        companies: true,
                        support_ticket_responses: true,
                        tickets: true,
                    },
                });
                res.status(200).json({
                    success: true,
                    message: "Customer updated successfully",
                    data: serializeAgents(updatedCustomer, true, true),
                });
            }
            catch (error) {
                console.error(error);
                if (error.code === "P2025") {
                    res.status(404).json({ success: false, message: "Customer not found" });
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
    deleteAgent(req, res) {
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
                const { id } = req.params;
                const { ids } = req.body;
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
    getAllAgents(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10" } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.agents,
                    page: page_num,
                    limit: limit_num,
                    orderBy: { id: "desc" },
                    include: {
                        users: true,
                        agent_performance: true,
                        tickets: true,
                        support_ticket_responses: true,
                        ticket_history: true,
                    },
                });
                res.status(200).json({
                    success: true,
                    message: "Agents retrieved successfully",
                    data: data.map((agent) => serializeAgents(agent, true, true)),
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
