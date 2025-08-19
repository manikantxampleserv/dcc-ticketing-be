import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { paginate } from "utils/pagination";
import { validationResult } from "express-validator";
import { deleteFile, uploadFile } from "utils/blackbaze";

const prisma = new PrismaClient();

const formatFileAttachment = (attachment: any) => {
  if (!attachment) return null;

  if (attachment.file_path && !/^https?:\/\//.test(attachment.file_path)) {
    return {
      ...attachment,
      file_path: `${process.env.BACKBLAZE_BUCKET_URL}/${attachment.file_path}`,
    };
  }
  return attachment;
};

const formatFileAttachments = (file: any[] = []) =>
  file.map(formatFileAttachment);

const serializeTicketAttachment = (
  attachment: any,
  includeCreatedAt = false
) => ({
  id: attachment.id,
  ticket_id: Number(attachment.ticket_id),
  response_id: attachment.response_id,
  file_name: attachment.file_name,
  original_file_name: attachment.original_file_name,
  file_path: attachment.file_path,
  file_size: attachment.file_size ? Number(attachment.file_size) : 0,
  content_type: attachment.content_type,
  file_hash: attachment.file_hash,
  uploaded_by: attachment.uploaded_by,
  uploaded_by_type: attachment.uploaded_by_type,
  is_public: Boolean(attachment.is_public),
  virus_scanned: Boolean(attachment.virus_scanned),
  scan_result: attachment.scan_result,
  ...(includeCreatedAt && { created_at: attachment.created_at }),
  tickets: attachment.tickets
    ? { id: attachment.tickets.id, subject: attachment.tickets.subject }
    : undefined,
  users: attachment.users
    ? { id: attachment.users.id, name: attachment.users.first_name }
    : undefined,
});

export const ticketAttachmentController = {
  async createTicketAttachment(req: Request, res: Response): Promise<void> {
    try {
      const {
        ticket_id,
        response_id,
        file_name,
        original_file_name,
        file_size,
        content_type,
        file_hash,
        uploaded_by,
        uploaded_by_type,
        is_public,
        virus_scanned,
        scan_result,
      } = req.body;

      if (!req.file) {
        res.error("File is required", 400);
        return;
      }

      const fileName = `fileAttachments/${Date.now()}_${req.file.originalname}`;
      const fileUrl = await uploadFile(
        req.file.buffer,
        fileName,
        req.file.mimetype
      );

      const attachment = await prisma.ticket_attachments.create({
        data: {
          ticket_id: Number(ticket_id),
          response_id: response_id ? Number(response_id) : null,
          file_name,
          original_file_name,
          file_path: fileUrl,
          file_size: BigInt(file_size),
          content_type,
          file_hash,
          uploaded_by: Number(uploaded_by),
          uploaded_by_type: uploaded_by_type ?? "User",
          is_public: is_public === "true" || is_public === true,
          virus_scanned: virus_scanned === "true" || virus_scanned === true,
          scan_result,
        },
        include: {
          tickets: true,
          users: true,
        },
      });

      const serializedAttachment = serializeTicketAttachment(attachment, true);

      res.success(
        "Attachment created successfully",
        {
          ...formatFileAttachment(serializedAttachment),
          serialized: serializedAttachment,
        },
        201
      );
    } catch (error: any) {
      res.error(error.message || "Internal server error", 500);
    }
  },

  async getTicketAttachmnetById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const attachment = await prisma.ticket_attachments.findUnique({
        where: { id },
        include: { tickets: true, users: true },
      });

      if (!attachment) {
        res.error("Attachment not found", 404);
        return;
      }

      res.success(
        "Attachment fetched successfully",
        serializeTicketAttachment(attachment, true),
        200
      );
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async updateTicketAttachment(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.error("Invalid attachment ID", 400);
        return;
      }
      const existingAttachment = await prisma.ticket_attachments.findUnique({
        where: { id },
      });

      if (!existingAttachment) {
        res.error("Attachment not found", 404);
        return;
      }

      const { created_at, ...attachmentData } = req.body;

      const updateData: any = {
        ...attachmentData,
      };

      if (req.file) {
        if (existingAttachment.file_path) {
          try {
            const fileName = existingAttachment.file_path.replace(
              `${process.env.BACKBLAZE_BUCKET_URL}/`,
              ""
            );

            await deleteFile(fileName);
          } catch (deleteError) {
            console.error("Error deleting old file:", deleteError);
          }
        }

        const fileName = `fileAttachments/${Date.now()}_${
          req.file.originalname
        }`;
        const fileUrl = await uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype
        );

        updateData.file_path = fileUrl;
        updateData.original_file_name = req.file.originalname;
        updateData.file_size = BigInt(req.file.size);
        updateData.content_type = req.file.mimetype;
        updateData.file_name = req.file.originalname;
      }

      if (attachmentData.ticket_id)
        updateData.ticket_id = Number(attachmentData.ticket_id);
      if (attachmentData.response_id)
        updateData.response_id = Number(attachmentData.response_id);
      if (attachmentData.uploaded_by)
        updateData.uploaded_by = Number(attachmentData.uploaded_by);

      if (attachmentData.is_public !== undefined) {
        updateData.is_public =
          attachmentData.is_public === "true" ||
          attachmentData.is_public === true;
      }
      if (attachmentData.virus_scanned !== undefined) {
        updateData.virus_scanned =
          attachmentData.virus_scanned === "true" ||
          attachmentData.virus_scanned === true;
      }

      if (attachmentData.file_size && !req.file) {
        updateData.file_size = BigInt(attachmentData.file_size);
      }

      const updated = await prisma.ticket_attachments.update({
        where: { id },
        data: updateData,
        include: { tickets: true, users: true },
      });

      const serializedAttachment = serializeTicketAttachment(updated, true);

      res.success("Attachment updated successfully", serializedAttachment, 200);
    } catch (error: any) {
      console.error("Error updating attachment:", error);
      res.error(error.message || "Internal server error", 500);
    }
  },

  // Delete
  async deleteTicketAttachment(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const existingAttachment = await prisma.ticket_attachments.findUnique({
        where: { id },
      });

      if (!existingAttachment) {
        res.error("Attachment not found", 404);
        return;
      }

      // Optionally delete file from storage
      if (existingAttachment.file_path) {
        try {
          await deleteFile(existingAttachment.file_path);
        } catch (deleteError) {
          console.error("Error deleting file from storage:", deleteError);
          // Continue with database deletion even if file deletion fails
        }
      }

      await prisma.ticket_attachments.delete({
        where: { id },
      });

      res.success("Attachment deleted successfully", null, 200);
    } catch (error: any) {
      res.error(error.message || "Internal server error", 500);
    }
  },

  async getAllTicketAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "10", search = "" } = req.query;
      const page_num = parseInt(page as string, 10);
      const limit_num = parseInt(limit as string, 10);
      const searchLower = (search as string).toLowerCase();

      const filters: any = search
        ? {
            OR: [
              {
                file_name: { contains: searchLower },
              },
              {
                original_file_name: {
                  contains: searchLower,
                },
              },
            ],
          }
        : {};

      const { data, pagination } = await paginate({
        model: prisma.ticket_attachments,
        filters,
        page: page_num,
        limit: limit_num,
        orderBy: { created_at: "desc" },
        include: { tickets: true, users: true },
      });

      res.success(
        "Attachments retrieved successfully",
        data.map((a: any) => serializeTicketAttachment(a, true)),
        200,
        pagination
      );
    } catch (error: any) {
      res.error(error.message || "Internal server error", 500);
    }
  },
};
