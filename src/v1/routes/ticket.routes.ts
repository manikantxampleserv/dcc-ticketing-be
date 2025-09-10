import { authenticateToken } from "middlewares/auth";
import { ticketController } from "../controllers/ticketController.controller";
import { Router } from "express";
import { validate } from "middlewares/validate";

const router = Router();

router.post("/ticket", authenticateToken, ticketController.createTicket);

router.put("/ticket/:id", ticketController.updateTicket);

router.get("/ticket/:id", ticketController.getTicketById);

router.get("/ticket", ticketController.getAllTicket);

router.delete("/ticket", validate, ticketController.deleteTicket);

export default router;
