"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const validate_1 = require("../../middlewares/validate");
const fileUpload_1 = require("../../utils/fileUpload");
const ticketController_controller_1 = require("../controllers/ticketController.controller");
const router = (0, express_1.Router)();
(0, fileUpload_1.uploadSingleFile)("attachment"),
    router.post("/ticket", auth_1.authenticateToken, (0, fileUpload_1.uploadSingleFile)("attachment_urls"), ticketController_controller_1.ticketController.createTicket);
router.post("/ticket-comment", auth_1.authenticateToken, (0, fileUpload_1.uploadMultipleFiles)("attachments", 10), // 👈 MATCH FRONTEND
fileUpload_1.handleUploadErrors, // 👈 IMPORTANT
// uploadSingleFile("attachment"),
//   upload.single("attachment"),
ticketController_controller_1.ticketController.createComment);
router.put("/ticket/:id", auth_1.authenticateToken, ticketController_controller_1.ticketController.updateTicket);
router.put("/ticket-action/:id", auth_1.authenticateToken, ticketController_controller_1.ticketController.actionsTicket);
router.put("/ticket-merge/:id", auth_1.authenticateToken, ticketController_controller_1.ticketController.mergeTicket);
router.put("/ticket-cc-add/:id", auth_1.authenticateToken, ticketController_controller_1.ticketController.addCCTicket);
router.get("/ticket/:id", auth_1.authenticateToken, ticketController_controller_1.ticketController.getTicketById);
router.get("/ticket", auth_1.authenticateToken, ticketController_controller_1.ticketController.getAllTicket);
router.get("/ticket-list", auth_1.authenticateToken, ticketController_controller_1.ticketController.getListTicket);
router.delete("/ticket", validate_1.validate, ticketController_controller_1.ticketController.deleteTicket);
exports.default = router;
