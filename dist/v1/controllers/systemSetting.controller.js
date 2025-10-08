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
exports.systemSettingController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("utils/pagination");
const prisma = new client_1.PrismaClient();
const serializeSystemSetting = (setting, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign({ id: setting.id, setting_key: setting.setting_key, setting_value: setting.setting_value, description: setting.description, data_type: setting.data_type }, (includeCreatedAt && { created_at: setting.created_at })), (includeUpdatedAt && { updated_at: setting.updated_at })));
exports.systemSettingController = {
    createSystemSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { setting_key, setting_value, description, data_type } = req.body;
                const systemSetting = yield prisma.system_settings.create({
                    data: {
                        setting_key,
                        setting_value,
                        description,
                        data_type,
                    },
                });
                res.success("System setting created successfully", serializeSystemSetting(systemSetting), 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    getSystemSettingById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = Number(req.params.id);
                const systemSetting = yield prisma.system_settings.findUnique({
                    where: { id },
                });
                if (!systemSetting) {
                    res.error("System setting not found", 404);
                    return;
                }
                res.success("System setting retrieved successfully", serializeSystemSetting(systemSetting, true, true), 200);
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
    // async updateSystemSetting(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { created_at, updated_at, ...systemSettingData } = req.body;
    //     const systemSetting = await prisma.system_settings.update({
    //       where: { id: Number(req.params.id) },
    //       data: {
    //         ...systemSettingData,
    //         created_at: created_at ? new Date(created_at) : new Date(),
    //         updated_at: updated_at ? new Date(updated_at) : new Date(),
    //       },
    //     });
    //     res.success(
    //       "System setting updated successfully",
    //       serializeSystemSetting(systemSetting),
    //       200
    //     );
    //   } catch (error: any) {
    //     console.error(error);
    //     res.error(error.message);
    //   }
    // },
    updateSystemSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { id, created_at, updated_at } = _a, systemSettingData = __rest(_a, ["id", "created_at", "updated_at"]);
                const systemSetting = yield prisma.system_settings.update({
                    where: { id: Number(req.params.id) },
                    data: Object.assign(Object.assign({}, systemSettingData), { updated_at: new Date() }),
                });
                res.success("System setting updated successfully", serializeSystemSetting(systemSetting), 200);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    deleteSystemSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.system_settings.delete({
                    where: { id: Number(req.params.id) },
                });
                res.success("System setting deleted successfully", null, 200);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    upsertSystemSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, setting_key, setting_value, description, data_type } = req.body;
                const systemSetting = yield prisma.system_settings.upsert({
                    where: { id: id !== null && id !== void 0 ? id : 0 },
                    update: {
                        setting_key,
                        setting_value,
                        description,
                        data_type,
                        updated_at: new Date(),
                    },
                    create: {
                        setting_key,
                        setting_value,
                        description,
                        data_type,
                    },
                });
                res.success(id
                    ? "System setting updated successfully"
                    : "System setting created successfully", serializeSystemSetting(systemSetting, true, true), id ? 200 : 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    getAllSystemSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = "1", limit = "10", search = "" } = req.query;
                const page_num = parseInt(page, 10);
                const limit_num = parseInt(limit, 10);
                const searchLower = search.toLowerCase();
                const filters = search
                    ? {
                        OR: [
                            {
                                setting_key: {
                                    contains: searchLower,
                                },
                            },
                            {
                                description: {
                                    contains: searchLower,
                                },
                            },
                        ],
                    }
                    : {};
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.system_settings,
                    filters,
                    page: page_num,
                    limit: limit_num,
                    orderBy: { id: "desc" },
                });
                res.success("System settings retrieved successfully", data.map((setting) => serializeSystemSetting(setting, true, true)), 200, pagination);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
};
