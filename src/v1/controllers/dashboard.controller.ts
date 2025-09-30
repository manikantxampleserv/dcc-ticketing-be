import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dashboardController = {
  async getTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.user_id ? Number(req.query.user_id) : null;

      let filter: any = {};

      if (userId) {
        if (isNaN(userId)) {
          res.error("Invalid user_id", 400);
          return;
        }

        const user = await prisma.users.findUnique({
          where: { id: userId },
          include: { user_role: true },
        });

        if (!user) {
          res.error("User not found", 404);
          return;
        }

        const isAdmin = user.user_role.name === "Admin";
        filter = isAdmin ? {} : { assigned_agent_id: user.id };
      }

      // Count all tickets
      const totalTickets = await prisma.tickets.count({
        where: filter,
      });

      // Count open tickets
      const openTickets = await prisma.tickets.count({
        where: { ...filter, status: "Open" },
      });
      const progressTickets = await prisma.tickets.count({
        where: { ...filter, status: "In Progress" },
      });
      const breachedTickets = await prisma.tickets.count({
        where: { ...filter, status: "Breached" },
      });

      // Count resolved today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const resolvedToday = await prisma.tickets.count({
        where: {
          ...filter,
          resolved_at: { gte: today, lt: tomorrow },
        },
      });

      res.success("Ticket status fetched successfully", {
        totalTickets,
        openTickets,
        resolvedToday,
        progressTickets,
        breachedTickets,
      });
    } catch (error: any) {
      res.error(error.message);
    }
  },
};
