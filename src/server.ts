import { main } from "./types/email";
import { createApp } from "./app";
import logger from "./config/logger";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

export const startServer = async () => {
  try {
    const app = createApp();
    const port = process.env.PORT || 8000;
    const server = app.listen(port, async () => {
      logger.success(`Server running at http://localhost:${port}`);

      try {
        logger.info("Starting email ticket system...");
        await main();
        logger.success("Email ticket system started successfully");
      } catch (emailError) {
        logger.error("Failed to start email system:", emailError);
      }
    });

    server.on("error", (error) => {
      logger.error("Server error:", error);
    });

    process.on("SIGINT", async () => {
      logger.info("Shutting down gracefully...");
      server.close(() => {
        logger.info("HTTP server closed");
      });
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};
