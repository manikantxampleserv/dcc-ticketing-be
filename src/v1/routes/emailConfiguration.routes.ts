import { Router } from "express";
import { authenticateToken } from "middlewares/auth";
import { emailConfigurationController } from "../controllers/emailConfiguration.controller";

const router = Router();

router.post(
  "/email-configuration",
  authenticateToken,
  emailConfigurationController.createEmailConfiguration
);

router.get(
  "/email-configuration/:id",
  authenticateToken,
  emailConfigurationController.getEmailConfigurationById
);

router.get(
  "/email-configuration",
  authenticateToken,
  emailConfigurationController.getAllEmailConfiguration
);

router.put(
  "/email-configuration/:id",
  authenticateToken,
  emailConfigurationController.updateEmailConfiguration
);

router.delete(
  "/email-configuration/:id",
  authenticateToken,
  emailConfigurationController.deleteEmailConfiguration
);
router.post(
  "/email-configuration/upsert",
  authenticateToken,
  emailConfigurationController.upsertEmailConfiguration
);

export default router;
