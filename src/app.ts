// app.ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import routes from "./routes";
import { responseHandler } from "./middlewares/responseHandler";
import { BusinessHoursAwareSLAMonitoringService } from "./utils/SLAMonitoringService";

export const createApp = (): Application => {
  // Create Express application
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Middleware to parse cookies
  app.use(cookieParser());

  // Enable CORS
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

  // Custom response handler middleware
  app.use(responseHandler);

  // Start Business Hours SLA Monitoring
  BusinessHoursAwareSLAMonitoringService.startMonitoring();

  // Mount API routes
  app.use("/api", routes);

  return app;
};

// /**
//  * Express application configuration.
//  * Sets up middleware, routes, and application-level configurations.
//  */
// import { Server as SocketIOServer } from "socket.io";
// import { createServer } from "http";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import express, { Application } from "express";
// import routes from "./routes";
// import { responseHandler } from "./middlewares/responseHandler";
// import { BusinessHoursAwareSLAMonitoringService } from "./utils/SLAMonitoringService";
// import notificationService from "./v1/services/notification";

// // Create an Express application
// const app = express();

// export const createApp = (): Application => {
//   // Middleware to parse JSON bodies
//   app.use(express.json());
//   app.use(express.json({ limit: "10mb" }));
//   app.use(express.urlencoded({ limit: "10mb", extended: true }));
//   BusinessHoursAwareSLAMonitoringService.startMonitoring();
//   // Middleware to parse URL-encoded bodies
//   app.use(express.urlencoded({ extended: true }));

//   // Middleware to parse cookies
//   app.use(cookieParser());

//   // Enable CORS for all origins with credentials
//   app.use(
//     cors({
//       origin: [
//         "https://ticketing.dcctz.com",
//         "https://ticketing_live.dcctz.com",
//         "http://192.168.29.127:3000",
//         "http://localhost:5174",
//         "http://localhost:5173",
//         "http://localhost:5175",
//       ],
//       credentials: true,
//     })
//   );
//   app.use(responseHandler);

//   // Mount API routes under /api (AFTER middleware setup)
//   app.use("/api", routes);

//   return app;
// };
