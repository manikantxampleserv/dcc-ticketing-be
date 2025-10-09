import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { uploadSingleFile } from "../../utils/fileUpload";
import { ticketController } from "../controllers/ticketController.controller";

const router = Router();

uploadSingleFile("attachment"),
  router.post(
    "/ticket",
    authenticateToken,
    uploadSingleFile("attachment_urls"),
    ticketController.createTicket
  );
router.post(
  "/ticket-comment",
  authenticateToken,
  uploadSingleFile("attachment"),
  //   upload.single("attachment"),
  ticketController.createComment
);

router.put("/ticket/:id", authenticateToken, ticketController.updateTicket);
router.put(
  "/ticket-action/:id",
  authenticateToken,
  ticketController.actionsTicket
);

router.put(
  "/ticket-merge/:id",
  authenticateToken,
  ticketController.mergeTicket
);
router.put(
  "/ticket-cc-add/:id",
  authenticateToken,
  ticketController.addCCTicket
);

router.get("/ticket/:id", authenticateToken, ticketController.getTicketById);

router.get("/ticket", authenticateToken, ticketController.getAllTicket);

router.delete("/ticket", validate, ticketController.deleteTicket);

export default router;
