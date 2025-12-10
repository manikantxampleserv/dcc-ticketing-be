"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_routes_1 = __importDefault(require("../v1/routes/user.routes"));
const auth_routes_1 = __importDefault(require("../v1/routes/auth.routes"));
const category_routes_1 = __importDefault(require("../v1/routes/category.routes"));
const company_routes_1 = __importDefault(require("../v1/routes/company.routes"));
const customer_routes_1 = __importDefault(require("../v1/routes/customer.routes"));
const role_routes_1 = __importDefault(require("../v1/routes/role.routes"));
const department_routes_1 = __importDefault(require("../v1/routes/department.routes"));
const SLAconfiguration_routes_1 = __importDefault(require("../v1/routes/SLAconfiguration.routes"));
const ticket_routes_1 = __importDefault(require("../v1/routes/ticket.routes"));
const dashboard_routes_1 = __importDefault(require("../v1/routes/dashboard.routes"));
const ticketAttachment_routes_1 = __importDefault(require("../v1/routes/ticketAttachment.routes"));
const emailConfiguration_routes_1 = __importDefault(require("../v1/routes/emailConfiguration.routes"));
const systemSetting_routes_1 = __importDefault(require("../v1/routes/systemSetting.routes"));
const notification_routes_1 = __importDefault(require("../v1/routes/notification.routes"));
const notificationSetting_routes_1 = __importDefault(require("../v1/routes/notificationSetting.routes"));
const public_routes_1 = __importDefault(require("../v1/routes/public.routes"));
const routes = (0, express_1.Router)();
routes.get("/v1/health", (_, res) => {
    res.json({
        status: "OK",
        message: "Support API is alive, well-fed, and caffeinated.",
        uptime: process.uptime().toFixed(2) + "s",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        version: "v1.0.0",
        database: "Connected",
        memoryUsage: process.memoryUsage().rss + " bytes",
        developer: "Apmleserv Devlopers",
    });
});
routes.use("/v1", user_routes_1.default);
routes.use("/v1", auth_routes_1.default);
routes.use("/v1", category_routes_1.default);
routes.use("/v1", company_routes_1.default);
routes.use("/v1", customer_routes_1.default);
routes.use("/v1", role_routes_1.default);
routes.use("/v1", department_routes_1.default);
routes.use("/v1", SLAconfiguration_routes_1.default);
routes.use("/v1", ticket_routes_1.default);
routes.use("/v1", dashboard_routes_1.default);
routes.use("/v1", ticketAttachment_routes_1.default);
routes.use("/v1", emailConfiguration_routes_1.default);
routes.use("/v1", systemSetting_routes_1.default);
routes.use("/v1", notificationSetting_routes_1.default);
routes.use("/v1", notification_routes_1.default);
routes.use("/v1", public_routes_1.default);
exports.default = routes;
