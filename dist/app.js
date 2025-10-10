"use strict";
/**
 * Express application configuration.
 * Sets up middleware, routes, and application-level configurations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const responseHandler_1 = require("./middlewares/responseHandler");
const SLAMonitoringService_1 = require("./utils/SLAMonitoringService");
/**
 * Creates and configures the Express application
 * @returns {Application} Configured Express application
 */
const createApp = () => {
    // Create an Express application
    const app = (0, express_1.default)();
    // Middleware to parse JSON bodies
    app.use(express_1.default.json());
    SLAMonitoringService_1.BusinessHoursAwareSLAMonitoringService.startMonitoring();
    // Middleware to parse URL-encoded bodies
    app.use(express_1.default.urlencoded({ extended: true }));
    // Middleware to parse cookies
    app.use((0, cookie_parser_1.default)());
    // Enable CORS for all origins with credentials
    app.use((0, cors_1.default)({
        origin: [
            "https://ticketing.dcctz.com",
            "https://ticketing_live.dcctz.com",
            "http://192.168.29.127:3000",
            "http://localhost:5174",
            "http://localhost:5173",
            "http://localhost:5175",
        ],
        credentials: true,
    }));
    app.use(responseHandler_1.responseHandler);
    // Mount API routes under /api (AFTER middleware setup)
    app.use("/api", routes_1.default);
    return app;
};
exports.createApp = createApp;
