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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const email_1 = require("./types/email");
const app_1 = require("./app");
const logger_1 = __importDefault(require("./config/logger"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = (0, app_1.createApp)();
        const port = process.env.PORT || 8000;
        const server = app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
            logger_1.default.success(`Server running at http://localhost:${port}`);
            try {
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
