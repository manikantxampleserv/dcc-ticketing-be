import { authenticateToken } from "middlewares/auth";
import { dashboardController } from "../controllers/dashboard.controller";
import { Router } from "express";

const router = Router();


router.get("/getTicketStatus", authenticateToken,dashboardController.getTicketStatus);


export default router;
