"use strict";
/**
 * Application entry point.
 * Handles environment setup and starts the server.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const server_1 = require("./server");
// Load environment variables from .env file
dotenv_1.default.config({ quiet: true });
// Start the server
(0, server_1.startServer)();
