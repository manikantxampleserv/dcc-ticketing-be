import { Router, Request, Response } from "express";
import user from "../v1/routes/user.routes";
import auth from "../v1/routes/auth.routes";

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

export default routes;
