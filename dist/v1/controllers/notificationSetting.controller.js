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
exports.notificationSettingController = void 0;
const client_1 = require("@prisma/client");
const pagination_1 = require("../../utils/pagination");
const prisma = new client_1.PrismaClient();
const serializeNotificationSetting = (setting, includeCreatedAt = false, includeUpdatedAt = false) => (Object.assign(Object.assign({ id: setting.id, agent_id: setting.agent_id, email_notifications: setting.email_notifications, sla_warnings: setting.sla_warnings, new_ticket_alerts: setting.new_ticket_alerts, escalation_alerts: setting.escalation_alerts, customer_feedback_alerts: setting.customer_feedback_alerts, agent_user: setting.user_notification_setting, warning_threshold_percent: setting.warning_threshold_percent }, (includeCreatedAt && { created_at: setting.created_at })), (includeUpdatedAt && { updated_at: setting.updated_at })));
exports.notificationSettingController = {
    createNotificationSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, email_notifications, sla_warnings, new_ticket_alerts, escalation_alerts, customer_feedback_alerts, warning_threshold_percent, } = req.body;
                const agent_id = req.user.id;
                console.log("agent_id", id, req.user);
                let NotificationSetting = null;
                const isPresent = yield prisma.notification_settings.findFirst({
                    where: { id: Number(id) },
                });
                if (isPresent) {
                    NotificationSetting = yield prisma.notification_settings.update({
                        where: { id: Number(id) },
                        data: {
                            agent_id: Number(agent_id),
                            email_notifications,
                            sla_warnings,
                            new_ticket_alerts,
                            escalation_alerts,
                            customer_feedback_alerts,
                            warning_threshold_percent,
                            created_at: new Date(),
                            updated_at: new Date(),
                        },
                        include: {
                            user_notification_setting: true,
                        },
                    });
                }
                else {
                    NotificationSetting = yield prisma.notification_settings.create({
                        data: {
                            agent_id: Number(agent_id),
                            email_notifications,
                            sla_warnings,
                            new_ticket_alerts,
                            escalation_alerts,
                            customer_feedback_alerts,
                            warning_threshold_percent,
                            created_at: new Date(),
                            // updated_at: new Date(),
                        },
                        include: {
                            user_notification_setting: true,
                        },
                    });
                }
                res.success("Notification setting created successfully", serializeNotificationSetting(NotificationSetting), 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    getNotificationSettingById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = Number(req.params.id);
                const NotificationSetting = yield prisma.notification_settings.findUnique({
                    where: { id },
                    include: {
                        user_notification_setting: true,
                    },
                });
                if (!NotificationSetting) {
                    res.error("Notification setting not found", 404);
                    return;
                }
                res.success("Notification setting retrieved successfully", serializeNotificationSetting(NotificationSetting, true, true), 200);
            }
            catch (error) {
                res.error(error.message);
            }
        });
    },
    // async updateNotificationSetting(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { created_at, updated_at, ...NotificationSettingData } = req.body;
    //     const NotificationSetting = await prisma.notification_settings.update({
    //       where: { id: Number(req.params.id) },
    //       data: {
    //         ...NotificationSettingData,
    //         created_at: created_at ? new Date(created_at) : new Date(),
    //         updated_at: updated_at ? new Date(updated_at) : new Date(),
    //       },
    //     });
    //     res.success(
    //       "Notification setting updated successfully",
    //       serializeNotificationSetting(NotificationSetting),
    //       200
    //     );
    //   } catch (error: any) {
    //     console.error(error);
    //     res.error(error.message);
    //   }
    // },
    updateNotificationSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const _a = req.body, { id, created_at, updated_at } = _a, NotificationSettingData = __rest(_a, ["id", "created_at", "updated_at"]);
                const NotificationSetting = yield prisma.notification_settings.update({
                    where: { id: Number(req.params.id) },
                    data: Object.assign(Object.assign({}, NotificationSettingData), { updated_at: new Date() }),
                    include: {
                        user_notification_setting: true,
                    },
                });
                res.success("Notification setting updated successfully", serializeNotificationSetting(NotificationSetting), 200);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    deleteNotificationSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.notification_settings.delete({
                    where: { id: Number(req.params.id) },
                });
                res.success("Notification setting deleted successfully", null, 200);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    upsertNotificationSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id, email_notifications, sla_warnings, new_ticket_alerts, escalation_alerts, customer_feedback_alerts, warning_threshold_percent, } = req.body;
                const agent_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const NotificationSetting = yield prisma.notification_settings.upsert({
                    where: { id: id !== null && id !== void 0 ? id : 0 },
                    update: {
                        agent_id: Number(agent_id),
                        email_notifications,
                        sla_warnings,
                        new_ticket_alerts,
                        escalation_alerts,
                        customer_feedback_alerts,
                        warning_threshold_percent,
                        created_at: new Date(),
                        // updated_at: new Date(),
                        updated_at: new Date(),
                    },
                    create: {
                        agent_id: Number(agent_id),
                        email_notifications,
                        sla_warnings,
                        new_ticket_alerts,
                        escalation_alerts,
                        customer_feedback_alerts,
                        warning_threshold_percent,
                        created_at: new Date(),
                        // updated_at: new Date(),
                    },
                });
                res.success(id
                    ? "Notification setting updated successfully"
                    : "Notification setting created successfully", serializeNotificationSetting(NotificationSetting, true, true), id ? 200 : 201);
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
    getAllNotificationSetting(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // const { page = "1", limit = "10", search = "" } = req.query;
                console.log("agent_id ???????????????", (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
                const agent_id = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                // const page_num = parseInt(page as string, 10);
                // const limit_num = parseInt(limit as string, 10);
                // const searchLower = (search as string).toLowerCase();
                // const filters: any = search
                //   ? {
                //       OR: [
                //         {
                //           setting_key: {
                //             contains: searchLower,
                //           },
                //         },
                //         {
                //           description: {
                //             contains: searchLower,
                //           },
                //         },
                //       ],
                //     }
                //   : {};
                console.log("agent_id", agent_id);
                const { data, pagination } = yield (0, pagination_1.paginate)({
                    model: prisma.notification_settings,
                    // filters,
                    filters: { agent_id: Number(agent_id) },
                    include: { user_notification_setting: true },
                    // page: page_num,
                    // limit: limit_num,
                    orderBy: { id: "desc" },
                });
                res.success("Notification settings retrieved successfully", data.map((setting) => serializeNotificationSetting(setting, true, true)), 200
                // pagination
                );
            }
            catch (error) {
                console.error(error);
                res.error(error.message);
            }
        });
    },
};
