import { authenticateToken } from "middlewares/auth";
import { ticketController } from "../controllers/ticketController.controller";
import { Router } from "express";
import { validate } from "middlewares/validate";
import { upload } from "utils/multer";
import { uploadSingleFile } from "utils/fileUpload";

const router = Router();

router.post("/ticket", authenticateToken, ticketController.createTicket);
router.post(
  "/ticket-comment",
  authenticateToken,
  uploadSingleFile("attachment"),
  //   upload.single("attachment"),
  ticketController.createComment
);

router.put("/ticket/:id", authenticateToken, ticketController.updateTicket);

router.get("/ticket/:id", authenticateToken, ticketController.getTicketById);

router.get("/ticket", authenticateToken, ticketController.getAllTicket);

router.delete("/ticket", validate, ticketController.deleteTicket);

export default router;
