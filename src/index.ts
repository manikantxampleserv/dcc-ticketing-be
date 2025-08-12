/**
 * Application entry point.
 * Handles environment setup and starts the server.
 */

import dotenv from "dotenv";
import { startServer } from "./server";

// Load environment variables from .env file
dotenv.config({ quiet: true });

// Start the server
startServer();
