import { authenticateToken } from "../../middlewares/auth";
import { SLAcontroller } from "../controllers/SLA.controller";
import { Router } from "express";

const router = Router();

router.post("/SLA", authenticateToken, SLAcontroller.createOrUpdate);

router.get("/SLA/:id", SLAcontroller.getSLAbyId);

router.get("/SLA", SLAcontroller.getAllSLA);

router.delete("/SLA/:id", SLAcontroller.deleteSLA);

export default router;
