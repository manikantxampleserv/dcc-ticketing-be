import { Router } from "express";
import { getFeedback } from "../controllers/public.controller";

const router = Router();

router.get("/feedback", getFeedback);

export default router;
