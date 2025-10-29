// app.ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import routes from "./routes";
import { responseHandler } from "./middlewares/responseHandler";
import { BusinessHoursAwareSLAMonitoringService } from "./utils/SLAMonitoringService";
import { corsDebugger } from "./middlewares/debuger";

export const createApp = (): Application => {
  // Create Express application
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Middleware to parse cookies
  app.use(cookieParser());

  // Enable CORS
  // ✅ FIXED: Better CORS configuration
  const allowedOrigins = [
    "https://ticketing.dcctz.com",
    "https://ticketing_live.dcctz.com",
    "http://192.168.29.127:3000",
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:5175",
  ];

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // In production, only allow HTTPS origins
        if (
          process.env.NODE_ENV === "production" &&
          !origin.startsWith("https://")
        ) {
          return callback(
            new Error("Only HTTPS origins allowed in production")
          );
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`❌ CORS blocked origin: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposedHeaders: ["Content-Range", "X-Content-Range"],
      maxAge: 86400, // 24 hours
    })
  );

  // Custom response handler middleware
  app.use(responseHandler);

  // Start Business Hours SLA Monitoring
  BusinessHoursAwareSLAMonitoringService.startMonitoring();
  app.use(corsDebugger);

  // Mount API routes
  app.use("/api", routes);

  return app;
};

/**
 * Express application configuration.
 * Sets up middleware, routes, and application-level configurations.
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
