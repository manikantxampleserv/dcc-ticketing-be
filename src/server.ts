/**
 * Server startup and configuration.
 * Handles server initialization and startup logging.
 */
import { main } from "types/email";
import { createApp } from "./app";
import logger from "./config/logger";

/**
 * Starts the HTTP server
 */
export const startServer = async () => {
  try {
    const app = createApp();
    const port = process.env.PORT || 4000;
    // Start HTTP server first
    const server = app.listen(port, async () => {
      logger.success(`🚀 Server running at http://localhost:${port}`);

      try {
        // Start email ticket system after server is ready
        logger.info("📧 Starting email ticket system...");
        await main(); // ← Better to await this
        logger.success("✅ Email ticket system started successfully");
      } catch (emailError) {
        logger.error("❌ Failed to start email system:", emailError);
        // Server continues running even if email system fails
      }
    });

    // Handle server errors
    server.on("error", (error) => {
      logger.error("❌ Server error:", error);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("🔄 Shutting down gracefully...");

      // Close HTTP server
      server.close(() => {
        logger.info("📪 HTTP server closed");
      });

      // Stop email system (if you add a stop method)
      // await emailSystem.stop();

      process.exit(0);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};
