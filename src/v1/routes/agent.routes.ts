import { authenticateToken } from "middlewares/auth";
import { Router } from "express";
import { validate } from "middlewares/validate";
import { agentsController } from "v1/controllers/agents.controller";
import {
  createAgentValidator,
  updateAgentValidator,
} from "v1/validators/agent.validator";

const router = Router();

router.post(
  "/agents",
  authenticateToken,
  createAgentValidator,
  validate,
  agentsController.createAgent
);
router.get("/agents/:id", authenticateToken, agentsController.getAgentById);

router.get("/agents", authenticateToken, agentsController.getAllAgents);

router.put(
  "/agents/:id",
  authenticateToken,
  updateAgentValidator,
  validate,
  agentsController.updateAgent
);

router.delete(
  "/agents/:id",
  authenticateToken,
  validate,
  agentsController.deleteAgent
);
router.delete(
  "/agents",
  authenticateToken,
  validate,
  agentsController.deleteAgent
);

export default router;
