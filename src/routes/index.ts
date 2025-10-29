import { Router, Request, Response } from "express";
import user from "../v1/routes/user.routes";
import auth from "../v1/routes/auth.routes";
import categoryRoutes from "../v1/routes/category.routes";
import companyRoutes from "../v1/routes/company.routes";
import customerRoutes from "../v1/routes/customer.routes";
import roleRoutes from "../v1/routes/role.routes";
import departmentRoutes from "../v1/routes/department.routes";
import SLAconfigurationRoutes from "../v1/routes/SLAconfiguration.routes";
import ticketRoutes from "../v1/routes/ticket.routes";
import dashboardRoutes from "../v1/routes/dashboard.routes";
import ticketAttachment from "../v1/routes/ticketAttachment.routes";
import emailConfiguration from "../v1/routes/emailConfiguration.routes";
import systemSettingRoutes from "../v1/routes/systemSetting.routes";
import notificationRoutes from "../v1/routes/notification.routes";
import notificationSettingRoutes from "../v1/routes/notificationSetting.routes";

const routes = Router();

routes.get("/v1/health", (_: Request, res: Response) => {
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

routes.use("/v1", user);
routes.use("/v1", auth);
routes.use("/v1", categoryRoutes);
routes.use("/v1", companyRoutes);
routes.use("/v1", customerRoutes);
routes.use("/v1", roleRoutes);
routes.use("/v1", departmentRoutes);
routes.use("/v1", SLAconfigurationRoutes);
routes.use("/v1", ticketRoutes);
routes.use("/v1", dashboardRoutes);
routes.use("/v1", ticketAttachment);
routes.use("/v1", emailConfiguration);
routes.use("/v1", systemSettingRoutes);
routes.use("/v1", notificationSettingRoutes);
routes.use("/v1", notificationRoutes);

export default routes;
