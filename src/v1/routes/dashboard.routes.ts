import { authenticateToken } from "../../middlewares/auth";
import { dashboardController } from "../controllers/dashboard.controller";
import { Router } from "express";

const router = Router();

router.get(
  "/getTicketStatus",
  authenticateToken,
  dashboardController.getTicketStatus
);
router.get(
  "/analitics-data",
  authenticateToken,
  dashboardController.getAnaliticsData
);
router.get(
  "/priority-distribution",
  authenticateToken,
  dashboardController.priorityDistribution
);
router.get("/trends-data", authenticateToken, dashboardController.trendsData);
router.get(
  "/hourly-ticket",
  authenticateToken,
  dashboardController.hourlyTickets
);
router.get(
  "/agents-performance",
  authenticateToken,
  dashboardController.agentsPerformance
);

export default router;
