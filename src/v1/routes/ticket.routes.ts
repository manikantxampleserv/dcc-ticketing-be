import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  handleUploadErrors,
  uploadMultipleFiles,
  uploadSingleFile,
} from "../../utils/fileUpload";
import { ticketController } from "../controllers/ticketController.controller";
import { ZendeskTicketImportService } from "utils/ZendeskTicketImportService";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const router = Router();

(uploadSingleFile("attachment"),
  router.post(
    "/ticket",
    authenticateToken,
    uploadSingleFile("attachment_urls"),
    ticketController.createTicket,
  ));
router.post(
  "/ticket-comment",
  authenticateToken,
  uploadMultipleFiles("attachments", 10), // 👈 MATCH FRONTEND
  handleUploadErrors, // 👈 IMPORTANT
  // uploadSingleFile("attachment"),
  //   upload.single("attachment"),
  ticketController.createComment,
);

router.put("/ticket/:id", authenticateToken, ticketController.updateTicket);
router.put(
  "/ticket-action/:id",
  authenticateToken,
  ticketController.actionsTicket,
);

router.put(
  "/ticket-merge/:id",
  authenticateToken,
  ticketController.mergeTicket,
);
router.put(
  "/ticket-cc-add/:id",
  authenticateToken,
  ticketController.addCCTicket,
);

router.get("/ticket/:id", authenticateToken, ticketController.getTicketById);

router.get("/ticket", authenticateToken, ticketController.getAllTicket);
router.get(
  "/ticket-for-customer",
  authenticateToken,
  ticketController.getAllTicketForCutomer,
);
router.get("/ticket-list", authenticateToken, ticketController.getListTicket);

router.delete("/ticket", validate, ticketController.deleteTicket);
router.get("/remove-duplicate", async (req, res) => {
  try {
    await cleanDuplicateTickets();

    res.json({
      success: true,
      message: "Duplicate tickets cleaned successfully",
    });
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Cleanup failed",
    });
  }
});
router.get("/import-zendesk-tickets", async (req, res) => {
  try {
    // ✅ Run in background
    setImmediate(() => {
      ZendeskTicketImportService.importTickets()
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Import failed",
    });
  }
});
const cleanDuplicateTickets = async () => {
  const duplicates = await prisma.tickets.groupBy({
    by: ["zendesk_ticket_id"],
    _count: { zendesk_ticket_id: true },
    having: {
      zendesk_ticket_id: {
        _count: { gt: 1 },
      },
    },
  });

  for (const group of duplicates) {
    const tickets = await prisma.tickets.findMany({
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
    } else {
      ticketToKeep = tickets[0];
    }

    const toDelete = tickets.filter((t) => t.id !== ticketToKeep.id);

    // console.log("Total ticket ", toDelete);

    for (const t of toDelete) {
      await prisma.tickets.delete({
        where: { id: t.id },
      });
      await prisma.ticket_comments.deleteMany({
        where: { ticket_id: Number(t.id) },
      });

      console.log("Deleted ticket:", t.id);
    }

    console.log(
      `Kept ticket ${(ticketToKeep.id, ticketToKeep.ticket_number)} for zendesk_ticket_id ${group.zendesk_ticket_id}`,
    );
  }

  console.log("Cleanup completed");
};
export default router;
