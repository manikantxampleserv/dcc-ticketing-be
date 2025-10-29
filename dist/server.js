"use strict";
// // server.ts
// import { createServer } from "http";
// import { Server as SocketIOServer } from "socket.io";
// import { createApp } from "./app";
// import logger from "./config/logger";
// import dotenv from "dotenv";
// import slaMonitor from "./types/slaMonitorService";
// import { SimpleEmailTicketSystem } from "./types/email";
// import notificationService from "./v1/services/notification";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
// dotenv.config({ quiet: true });
// export const startServer = async () => {
//   try {
//     const app = createApp();
//     // Create HTTP server from Express app
//     const httpServer = createServer(app);
//     // ✅ FIXED: Better CORS configuration for production
//     const allowedOrigins = [
//       "https://ticketing.dcctz.com",
//       "https://ticketing_live.dcctz.com",
//       "http://192.168.29.127:3000",
//       "http://localhost:5174",
//       "http://localhost:5173",
//       "http://localhost:5175",
//     ];
//     // Add environment-specific origins
//     if (process.env.NODE_ENV === "production") {
//       // Production origins only
//       const productionOrigins = allowedOrigins.filter((origin) =>
//         origin.startsWith("https://")
//       );
//       allowedOrigins.length = 0;
//       allowedOrigins.push(...productionOrigins);
//     }
//     logger.info(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
//     // Socket.IO setup with improved CORS
//     const io = new SocketIOServer(httpServer, {
//       cors: {
//         origin: (origin, callback) => {
//           // Allow requests with no origin (like mobile apps or curl)
//           if (!origin) return callback(null, true);
//           // Check if origin is allowed
//           if (allowedOrigins.includes(origin)) {
//             callback(null, true);
//           } else {
//             logger.warn(`❌ CORS blocked origin: ${origin}`);
//             callback(new Error(`Origin ${origin} not allowed by CORS`));
//           }
//         },
//         methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//         credentials: true,
//         allowedHeaders: ["Content-Type", "Authorization"],
//       },
//       // ✅ Add these for better connection stability
//       transports: ["websocket", "polling"],
//       allowEIO3: true,
//       pingTimeout: 60000,
//       pingInterval: 25000,
//     });
//     // Socket.IO connection handling
//     io.on("connection", (socket) => {
//       logger.info(
//         `✅ Client connected: ${socket.id} from ${socket.handshake.address}`
//       );
//       socket.on("join", (userId: number) => {
//         const room = `user_${userId}`;
//         socket.join(room);
//         logger.info(`👤 User ${userId} joined notification room`);
//         const rooms = Array.from(socket.rooms);
//         logger.info(`📍 Socket ${socket.id} is now in rooms:`, rooms);
//         socket.emit("joined", { userId, room, socketId: socket.id });
//       });
//       socket.on("leave", (userId: number) => {
//         const room = `user_${userId}`;
//         socket.leave(room);
//         logger.info(`👋 User ${userId} left notification room`);
//       });
//       socket.on("disconnect", (reason) => {
//         logger.info(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
//       });
//       socket.on("error", (error) => {
//         logger.error(`❌ Socket error for ${socket.id}:`, error);
//       });
//     });
//     // Attach Socket.IO to notification service
//     notificationService.setSocketIO(io);
//     logger.success("✅ Socket.IO attached to NotificationService");
//     const port = process.env.PORT || 8000;
//     httpServer.listen(port, async () => {
//       logger.success(`Server running at http://localhost:${port}`);
//       logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
//       try {
//         // Start email ticket system
//         const emailSystem = new SimpleEmailTicketSystem();
//         await emailSystem.start();
//         logger.success("📧 Email ticket system started");
//         // Start SLA monitoring
//         slaMonitor.start(5);
//         logger.success("🔍 SLA monitoring started");
//         // Graceful shutdown
//         const shutdown = () => {
//           logger.info("\n🔄 Shutting down gracefully...");
//           emailSystem.stop();
//           slaMonitor.stop();
//           io.close(() => {
//             logger.info("Socket.IO closed");
//           });
//           httpServer.close(() => {
//             logger.success("✅ Server closed");
//             process.exit(0);
//           });
//         };
//         process.on("SIGINT", shutdown);
//         process.on("SIGTERM", shutdown);
//       } catch (emailError) {
//         logger.error("Failed to start email system:", emailError);
//       }
//     });
//     httpServer.on("error", (error: any) => {
//       if (error.code === "EADDRINUSE") {
//         logger.error(`Port ${port} is already in use`);
//       } else {
//         logger.error("Server error:", error);
//       }
//     });
//   } catch (error) {
//     logger.error("Failed to start server:", error);
//     process.exit(1);
//   }
// };
// startServer();
// // server.ts
// import { createServer } from "http";
// import { Server as SocketIOServer } from "socket.io";
// import { createApp } from "./app";
// import logger from "./config/logger";
// import dotenv from "dotenv";
// import slaMonitor from "./types/slaMonitorService";
// import { SimpleEmailTicketSystem } from "./types/email";
// import notificationService from "./v1/services/notification";
// dotenv.config({ quiet: true });
// export const startServer = async () => {
//   try {
//     const app = createApp();
//     // Create HTTP server from Express app
//     const httpServer = createServer(app);
//     // Socket.IO setup
//     const io = new SocketIOServer(httpServer, {
//       cors: {
//         origin: [
//           "https://ticketing.dcctz.com",
//           "https://ticketing_live.dcctz.com",
//           "http://192.168.29.127:3000",
//           "http://localhost:5174",
//           "http://localhost:5173",
//           "http://localhost:5175",
//         ],
//         methods: ["GET", "POST"],
//         credentials: true,
//       },
//     });
//     // Socket.IO connection handling
//     io.on("connection", (socket) => {
//       logger.info(`✅ Client connected: ${socket.id}`);
//       socket.on("join", (userId: number) => {
//         const room = `user_${userId}`;
//         socket.join(`user_${userId}`);
//         logger.info(`👤 User ${userId} joined notification room`);
//         // ✅ ADDED: Confirm room membership
//         const rooms = Array.from(socket.rooms);
//         logger.info(`📍 Socket ${socket.id} is now in rooms:`, rooms);
//         // Send confirmation back to client
//         socket.emit("joined", { userId, room, socketId: socket.id });
//       });
//       socket.on("leave", (userId: number) => {
//         socket.leave(`user_${userId}`);
//         logger.info(`👋 User ${userId} left notification room`);
//       });
//       socket.on("disconnect", () => {
//         logger.info(`❌ Client disconnected: ${socket.id}`);
//       });
//     });
//     // Attach Socket.IO to notification service
//     notificationService.setSocketIO(io);
//     logger.success("✅ Socket.IO attached to NotificationService");
//     const port = process.env.PORT || 8000;
//     httpServer.listen(port, async () => {
//       logger.success(`Server running at http://localhost:${port}`);
//       try {
//         // Start email ticket system
//         const emailSystem = new SimpleEmailTicketSystem();
//         await emailSystem.start();
//         logger.success("📧 Email ticket system started");
//         // Start SLA monitoring
//         slaMonitor.start(5); // Check every 5 minutes
//         logger.success("🔍 SLA monitoring started");
//         // Graceful shutdown
//         const shutdown = () => {
//           logger.info("\n🔄 Shutting down gracefully...");
//           emailSystem.stop();
//           slaMonitor.stop();
//           httpServer.close(() => {
//             logger.success("✅ Server closed");
//             process.exit(0);
//           });
//         };
//         process.on("SIGINT", shutdown);
//         process.on("SIGTERM", shutdown);
//       } catch (emailError) {
//         logger.error("Failed to start email system:", emailError);
//       }
//     });
//     httpServer.on("error", (error) => {
//       logger.error("Server error:", error);
//     });
//   } catch (error) {
//     logger.error("Failed to start server:", error);
//     process.exit(1);
//   }
// };
// // Start the server
// startServer();
const email_1 = require("./types/email");
const app_1 = require("./app");
const logger_1 = __importDefault(require("./config/logger"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
const slaMonitorService_1 = __importDefault(require("../src/types/slaMonitorService"));
const email_2 = require("../src/types/email");
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = (0, app_1.createApp)();
        const port = process.env.PORT || 8000;
        const server = app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
            logger_1.default.success(`Server running at http://localhost:${port}`);
            try {
                // Start services
                const emailSystem = new email_2.SimpleEmailTicketSystem();
                emailSystem.start().then(() => console.log("📧 Email system started"));
                slaMonitorService_1.default.start(5); // Check every 5 minutes
                // Graceful shutdown
                process.on("SIGINT", () => {
                    console.log("\n🔄 Shutting down...");
                    emailSystem.stop();
                    slaMonitorService_1.default.stop();
                    process.exit(0);
                });
                logger_1.default.info("Starting email ticket system...");
                yield (0, email_1.main)();
                logger_1.default.success("Email ticket system started successfully");
            }
            catch (emailError) {
                logger_1.default.error("Failed to start email system:", emailError);
            }
        }));
        server.on("error", (error) => {
            logger_1.default.error("Server error:", error);
        });
        process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
            logger_1.default.info("Shutting down gracefully...");
            server.close(() => {
                logger_1.default.info("HTTP server closed");
            });
            process.exit(0);
        }));
    }
    catch (error) {
        logger_1.default.error("Failed to start server:", error);
        process.exit(1);
    }
});
exports.startServer = startServer;
