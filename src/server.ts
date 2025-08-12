/**
 * Server startup and configuration.
 * Handles server initialization and startup logging.
 */

import { createApp } from "./app";
import logger from "./config/logger";

/**
 * Starts the HTTP server
 */
export const startServer = () => {
  // Create Express application
  const app = createApp();

  // Set the port from environment variable or default to 4000
  const port = process.env.PORT || 4000;

  // Start the server and listen on the specified port
  app.listen(port, () => {
    logger.success(`Server running at http://localhost:${port}`);
    logger.success(`API Documentation: http://localhost:${port}/docs`);
  });
};
