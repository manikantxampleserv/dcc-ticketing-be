import { Router } from "express";
import { ticketAttachmentController } from "../controllers/ticketAttachment.controller";
import { authenticateToken } from "../../middlewares/auth";
import { upload } from "../../utils/multer";
import { validate } from "middlewares/validate";

const routes = Router();

routes.post(
  "/ticket-attachment",
  authenticateToken,
  upload.single("file_path"),
  ticketAttachmentController.createTicketAttachment
);

routes.get(
  "/ticket-attachment",
  authenticateToken,
  ticketAttachmentController.getAllTicketAttachment
);

routes.get(
  "/ticket-attachment/:id",
  authenticateToken,
  ticketAttachmentController.getTicketAttachmnetById
);

routes.put(
  "/ticket-attachment/:id",
  authenticateToken,
  upload.single("file_path"),
  ticketAttachmentController.updateTicketAttachment
);

routes.delete(
  "/ticket-attachment/:id",
  authenticateToken,
  validate,
  ticketAttachmentController.deleteTicketAttachment
);
export default routes;
