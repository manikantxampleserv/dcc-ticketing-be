/**
 * Express application configuration.
 * Sets up middleware, routes, and application-level configurations.
 */

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import routes from "./routes";
import { responseHandler } from "./middlewares/responseHandler";
import { BusinessHoursAwareSLAMonitoringService } from "./utils/SLAMonitoringService";

/**
 * Creates and configures the Express application
 * @returns {Application} Configured Express application
 */
export const createApp = (): Application => {
  // Create an Express application
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json());
  BusinessHoursAwareSLAMonitoringService.startMonitoring();
  // Middleware to parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Middleware to parse cookies
  app.use(cookieParser());

  // Enable CORS for all origins with credentials
  app.use(
    cors({
      origin: [
        "https://ticketing.dcctz.com",
        "https://ticketing_live.dcctz.com/",
        "http://192.168.29.127:3000",
        "http://localhost:3000",
        "http://10.160.5.101:3000",
        "http://localhost:3002",
        "http://localhost:3003",
      ],
      credentials: true,
    })
  );
  app.use(responseHandler);

  // Mount API routes under /api (AFTER middleware setup)
  app.use("/api", routes);

  return app;
};
