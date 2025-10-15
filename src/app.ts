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
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
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
        "https://ticketing_live.dcctz.com",
        "http://192.168.29.127:3000",
        "http://localhost:5174",
        "http://localhost:5173",
        "http://localhost:5175",
      ],
      credentials: true,
    })
  );
  app.use(responseHandler);

  // Mount API routes under /api (AFTER middleware setup)
  app.use("/api", routes);

  return app;
};
