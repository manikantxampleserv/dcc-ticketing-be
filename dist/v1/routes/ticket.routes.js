"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const validate_1 = require("../../middlewares/validate");
const fileUpload_1 = require("../../utils/fileUpload");
const ticketController_controller_1 = require("../controllers/ticketController.controller");
const ZendeskTicketImportService_1 = require("../../utils/ZendeskTicketImportService");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
((0, fileUpload_1.uploadSingleFile)("attachment"),
    router.post("/ticket", auth_1.authenticateToken, (0, fileUpload_1.uploadSingleFile)("attachment_urls"), ticketController_controller_1.ticketController.createTicket));
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
router.get("/ticket-for-customer", auth_1.authenticateToken, ticketController_controller_1.ticketController.getAllTicketForCutomer);
router.get("/ticket-list", auth_1.authenticateToken, ticketController_controller_1.ticketController.getListTicket);
router.delete("/ticket", validate_1.validate, ticketController_controller_1.ticketController.deleteTicket);
router.get("/remove-duplicate", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield cleanDuplicateTickets();
        res.json({
            success: true,
            message: "Duplicate tickets cleaned successfully",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Cleanup failed",
        });
    }
}));
router.get("/import-zendesk-tickets", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ✅ Run in background
        setImmediate(() => {
            ZendeskTicketImportService_1.ZendeskTicketImportService.importTickets()
                .then(() => console.log("Import completed"))
                .catch((err) => console.error("Import failed:", err));
        });
        // ZendeskTicketImportService.importTickets();
        // res.setHeader(
        //   "Content-Type",
        //   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // );
        // res.setHeader(
        //   "Content-Disposition",
        //   "attachment; filename=all-ticket-email.xlsx",
        // );
        // res.send(buffer);
        res.json({
            success: true,
            message: "Zendesk ticket import started",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Import failed",
        });
    }
}));
const cleanDuplicateTickets = () => __awaiter(void 0, void 0, void 0, function* () {
    const duplicates = yield prisma.tickets.groupBy({
        by: ["zendesk_ticket_id"],
        _count: { zendesk_ticket_id: true },
        having: {
            zendesk_ticket_id: {
                _count: { gt: 1 },
            },
        },
    });
    for (const group of duplicates) {
        const tickets = yield prisma.tickets.findMany({
            where: {
                zendesk_ticket_id: group.zendesk_ticket_id,
            },
            select: {
                id: true,
                ticket_number: true,
                created_at: true,
                _count: {
                    select: { ticket_comments: true },
                },
            },
            orderBy: {
                created_at: "asc",
            },
        });
        const withComments = tickets.filter((t) => t._count.ticket_comments > 0);
        let ticketToKeep;
        if (withComments.length > 0) {
            ticketToKeep = withComments[0];
        }
        else {
            ticketToKeep = tickets[0];
        }
        const toDelete = tickets.filter((t) => t.id !== ticketToKeep.id);
        // console.log("Total ticket ", toDelete);
        for (const t of toDelete) {
            yield prisma.tickets.delete({
                where: { id: t.id },
            });
            yield prisma.ticket_comments.deleteMany({
                where: { ticket_id: Number(t.id) },
            });
            console.log("Deleted ticket:", t.id);
        }
        console.log(`Kept ticket ${(ticketToKeep.id, ticketToKeep.ticket_number)} for zendesk_ticket_id ${group.zendesk_ticket_id}`);
    }
    console.log("Cleanup completed");
});
exports.default = router;
