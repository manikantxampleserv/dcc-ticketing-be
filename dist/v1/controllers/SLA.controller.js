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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLAcontroller = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("utils/pagination");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
const serializeSlaConfig = (sla, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign({ id: Number(sla.id), priority: sla.priority, response_time_hours: sla.response_time_hours, resolution_time_hours: sla.resolution_time_hours, business_hours_only: sla.business_hours_only, business_start_time: sla.business_start_time, business_end_time: sla.business_end_time, include_weekends: sla.include_weekends, is_active: sla.is_active }, (includeCreatedAt && { created_at: sla.created_at })), (includeUpdatedAt && { updated_at: sla.updated_at })));
exports.SLAcontroller = {
    createOrUpdate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    const firstError = errors.array()[0];
                    res.error(firstError.msg, 400);
                    return;
                }
                const { id, priority, response_time_hours, resolution_time_hours, business_hours_only, business_start_time, business_end_time, include_weekends, is_active, } = req.body;
                let slaConfig;
                console.log("Body : ", req.body, id);
                if (id) {
                    const existing = yield prisma.sla_configurations.findUnique({
                        where: { id: Number(id) },
                    });
                    if (!existing) {
                        res.error("SLA configuration not found", 404);
                        return;
                    }
                    slaConfig = yield prisma.sla_configurations.update({
                        where: { id: Number(id) },
                        data: {
                            priority,
                            response_time_hours,
                            resolution_time_hours,
                            business_hours_only,
                            business_start_time,
                            business_end_time,
                            include_weekends,
                            is_active,
                            updated_at: new Date(),
                        },
                    });
                    res.success("SLA configuration updated successfully", serializeSlaConfig(slaConfig, true, false), 200);
                    return;
                }
                slaConfig = yield prisma.sla_configurations.create({
                    data: {
                        priority,
                        response_time_hours: (_a = req.body) === null || _a === void 0 ? void 0 : _a.response_time_hours,
                        resolution_time_hours: (_b = req.body) === null || _b === void 0 ? void 0 : _b.resolution_time_hours,
                        business_hours_only: business_hours_only !== null && business_hours_only !== void 0 ? business_hours_only : false,
                        business_start_time: business_start_time !== null && business_start_time !== void 0 ? business_start_time : "09:00:00",
                        business_end_time: business_end_time !== null && business_end_time !== void 0 ? business_end_time : "17:00:00",
                        include_weekends: include_weekends !== null && include_weekends !== void 0 ? include_weekends : false,
                        is_active: is_active !== null && is_active !== void 0 ? is_active : true,
                    },
                });
                res.success("SLA configuration created successfully", serializeSlaConfig(slaConfig, true, true), 201);
                return;
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
                return;
            }
        });
    },
    getSLAbyId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = Number(req.params.id);
                const slaConfig = yield prisma.sla_configurations.findUnique({
                    where: { id },
                });
                if (!slaConfig) {
                    res.error("SLA configuration not found", 404);
                }
                res.success("SLA configuration fetched successfully", serializeSlaConfig(slaConfig, true, true), 200);
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
    deleteSLA(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.sla_configurations.delete({
                    where: { id: Number(req.params.id) },
                });
                res.success("SLA configuration deleted successfully");
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
    getAllSLA(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "" } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const searchLower = search.toLowerCase();
                const filters = search
                    ? { priority: { contains: searchLower } }
                    : {};
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.sla_configurations,
                    filters,
                    page: page_num,
                    limit: limit_num,
                    orderBy: { id: "desc" },
                });
                res.success("SLA configurations retrieved successfully", data.map((sla) => serializeSlaConfig(sla, true, true)), 200, pagination);
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
};
