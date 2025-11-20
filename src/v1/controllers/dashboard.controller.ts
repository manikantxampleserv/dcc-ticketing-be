import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Helpers */
function parseDateRange(query: Record<string, any>) {
  const to = query.to ? new Date(String(query.to)) : new Date();
  const from = query.from
    ? new Date(String(query.from))
    : new Date(to.getTime() - 1000 * 60 * 60 * 24 * 30); // default 30 days
  // normalize to start/end of day (UTC)
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
}

function msToMinutes(ms: number | null | undefined) {
  if (ms == null) return null;
  return ms / 1000 / 60;
}

function minutesToHuman(minutes: number | null) {
  if (minutes == null) return null;
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h ${r}m`;
}

type MetricKey =
  | "first_response_time"
  | "resolution_time"
  | "tickets_count"
  | "sla_adherence";
type IntervalKey = "day" | "week" | "month";

function startOfUTCDay(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function addUTCInterval(d: Date, interval: IntervalKey, step = 1) {
  const res = new Date(d);
  if (interval === "day") res.setUTCDate(res.getUTCDate() + step);
  else if (interval === "week") res.setUTCDate(res.getUTCDate() + 7 * step);
  else if (interval === "month") res.setUTCMonth(res.getUTCMonth() + step);
  return res;
}

function isoDateKey(d: Date, interval: IntervalKey) {
  if (interval === "day") return d.toISOString().slice(0, 10);
  if (interval === "month")
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}`;
  if (interval === "week") {
    const start = startOfUTCDay(d);
    return start.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Helper: determine scoping/filter based on req.user (auth) and optional req.query.user_id.
 * Returns:
 *  - filter: object to spread into prisma `where` for ticket queries (e.g. { assigned_agent_id: userId } or {} )
 *  - requestingUserId: number | null
 *  - isAdmin: boolean
 */
async function getUserScope(req: Request) {
  // 1) explicit query param overrides
  if (req.query.user_id) {
    const userId = Number(req.query.user_id);
    if (isNaN(userId)) {
      return {
        filter: null,
        requestingUserId: null,
        isAdmin: false,
        error: "Invalid user_id",
      };
    }
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { user_role: true },
    });
    if (!user)
      return {
        filter: null,
        requestingUserId: null,
        isAdmin: false,
        error: "User not found",
      };
    const isAdmin = user.user_role?.name === "Admin";
    const filter = isAdmin ? {} : { assigned_agent_id: user.id };
    return { filter, requestingUserId: user.id, isAdmin, error: null };
  }

  // 2) try req.user (populated by auth middleware)
  // @ts-ignore - allow custom user on Request
  const authUser = (req as any).user;
  if (authUser && authUser.id) {
    const user = await prisma.users.findUnique({
      where: { id: Number(authUser.id) },
      include: { user_role: true },
    });
    if (!user)
      return {
        filter: null,
        requestingUserId: null,
        isAdmin: false,
        error: "Authenticated user not found",
      };
    const isAdmin = user.user_role?.name === "Admin";
    const filter = isAdmin ? {} : { assigned_agent_id: user.id };
    return { filter, requestingUserId: user.id, isAdmin, error: null };
  }

  // 3) no user info => treat as global/admin access (safe fallback)
  return { filter: {}, requestingUserId: null, isAdmin: true, error: null };
}

export const dashboardController = {
  async getTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const scope = await getUserScope(req);
      if (scope.error) {
        res.error(scope.error, 400);
        return;
      }
      const filter = scope.filter ?? {};

      // Count all tickets (scoped)
      const totalTickets = await prisma.tickets.count({
        where: filter,
      });

      const openTickets = await prisma.tickets.count({
        where: { ...filter, status: "Open" },
      });
      const progressTickets = await prisma.tickets.count({
        where: { ...filter, status: "In Progress" },
      });
      const breachedTickets = await prisma.tickets.count({
        where: { ...filter, sla_status: "Breached" },
      });

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(today.getUTCDate() + 1);

      const resolvedToday = await prisma.tickets.count({
        where: {
          ...filter,
          status: "Resolved",
          // optionally limit by resolved_at within today:
          // resolved_at: { gte: today, lt: tomorrow }
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

  async getAnaliticsData(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = parseDateRange(req.query);
      const scope = await getUserScope(req);
      if (scope.error) {
        res.error(scope.error, 400);
        return;
      }
      const filter = scope.filter ?? {};

      // include created_at in filter, plus scope filter
      const tickets = await prisma.tickets.findMany({
        where: {
          AND: [filter, { created_at: { gte: from, lte: to } }],
        },
        select: {
          id: true,
          created_at: true,
          first_response_at: true,
          resolved_at: true,
          sla_deadline: true,
          sla_status: true,
          customer_satisfaction_rating: true,
          priority: true,
          status: true,
        },
      });

      let frtSum = 0,
        frtCount = 0;
      let resSum = 0,
        resCount = 0;
      let slaTotal = 0,
        slaWithin = 0;
      let csatSum = 0,
        csatCount = 0;

      for (const t of tickets) {
        if (t.first_response_at && t.created_at) {
          const ms = t.first_response_at.getTime() - t.created_at.getTime();
          if (ms >= 0) {
            frtSum += msToMinutes(ms) ?? 0;
            frtCount++;
          }
        }

        if (t.resolved_at && t.created_at) {
          const ms = t.resolved_at.getTime() - t.created_at.getTime();
          if (ms >= 0) {
            resSum += msToMinutes(ms) ?? 0;
            resCount++;
          }
        }

        if (t.sla_deadline) {
          slaTotal++;
          if (t.first_response_at && t.first_response_at <= t.sla_deadline) {
            slaWithin++;
          }
        }

        if (typeof t.customer_satisfaction_rating === "number") {
          csatSum += t.customer_satisfaction_rating;
          csatCount++;
        }
      }

      const avgFirstResponseMinutes = frtCount ? frtSum / frtCount : 0;
      const avgResolutionMinutes = resCount ? resSum / resCount : 0;
      const slaAdherencePercent = slaTotal ? (slaWithin / slaTotal) * 100 : 0;
      const avgCsat = csatCount ? csatSum / csatCount : null;

      res.success("Ticket analitics fetched successfully", {
        range: { from: from.toISOString(), to: to.toISOString() },
        totals: { tickets_count: tickets.length },
        first_response_time: {
          avg_minutes: Number(avgFirstResponseMinutes.toFixed(2)),
          human: minutesToHuman(avgFirstResponseMinutes),
          samples: frtCount,
        },
        resolution_time: {
          avg_minutes: Number(avgResolutionMinutes.toFixed(2)),
          human: minutesToHuman(avgResolutionMinutes),
          samples: resCount,
        },
        sla: {
          total_monitored: slaTotal,
          within_sla: slaWithin,
          percent: Number(slaAdherencePercent.toFixed(2)),
        },
        customer_satisfaction: {
          avg_rating: avgCsat !== null ? Number(avgCsat.toFixed(2)) : null,
          samples: csatCount,
        },
      });
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async priorityDistribution(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = parseDateRange(req.query);
      const scope = await getUserScope(req);
      if (scope.error) {
        res.error(scope.error, 400);
        return;
      }
      const filter = scope.filter ?? {};

      // use groupBy with combined filter
      const counts = await prisma.tickets.groupBy({
        by: ["priority"],
        where: {
          AND: [filter, { created_at: { gte: from, lte: to } }],
        },
        _count: {
          priority: true,
        },
        orderBy: {
          _count: {
            priority: "desc",
          },
        },
      });

      const slaPriorities = await prisma.sla_configurations.findMany({
        where: {
          id: { in: counts.map((c) => c.priority) },
        },
      });

      const distribution = counts.map((r) => ({
        priority: r.priority,
        count: r._count.priority,
        priority_label:
          slaPriorities.find((sp) => sp.id === r.priority)?.priority ?? null,
      }));

      res.success("Ticket priority distribution successfully", {
        range: { from: from.toISOString(), to: to.toISOString() },
        distribution,
      });
    } catch (error: any) {
      res.error(error.message);
    }
  },

  async trendsData(req: Request, res: Response): Promise<void> {
    try {
      const metric = String(
        req.query.metric || "first_response_time"
      ) as MetricKey;
      const interval = String(req.query.interval || "day") as IntervalKey;
      const { from, to } = parseDateRange(req.query); // should return Date objects

      if (!["day", "week", "month"].includes(interval)) {
        res.status(400).json({
          error: "Only 'day', 'week' or 'month' intervals are supported.",
        });
        return;
      }

      const scope = await getUserScope(req);
      if (scope.error) {
        res.error(scope.error, 400);
        return;
      }
      const filter = scope.filter ?? {};

      // fetch needed fields from DB for date range + scope
      const tickets = await prisma.tickets.findMany({
        where: {
          AND: [filter, { created_at: { gte: from, lte: to } }],
        },
        select: {
          id: true,
          created_at: true,
          first_response_at: true,
          resolved_at: true,
          sla_deadline: true,
        },
      });

      // Build the buckets based on chosen interval, all in UTC
      const buckets: string[] = [];
      const bucketMap = new Map<string, typeof tickets>();
      for (
        let d = startOfUTCDay(new Date(from));
        d <= to;
        d = addUTCInterval(d, interval, 1)
      ) {
        const key = isoDateKey(d, interval);
        buckets.push(key);
        bucketMap.set(key, []);
      }

      // assign tickets to buckets (using created_at)
      for (const t of tickets) {
        if (!t.created_at) continue;
        const bucketDate = startOfUTCDay(new Date(t.created_at));
        const key = isoDateKey(bucketDate, interval);
        if (!bucketMap.has(key)) continue;
        (bucketMap.get(key) as any).push(t);
      }

      // compute series
      const series = buckets.map((bucketKey) => {
        const bucket = (bucketMap.get(bucketKey) as any) || [];
        let value: number | null = null;

        if (metric === "first_response_time") {
          let sum = 0,
            cnt = 0;
          for (const t of bucket) {
            if (t.first_response_at && t.created_at) {
              const ms = t.first_response_at.getTime() - t.created_at.getTime();
              if (ms >= 0) {
                sum += msToMinutes(ms) ?? 0;
                cnt++;
              }
            }
          }
          value = cnt ? sum / cnt : null;
        } else if (metric === "resolution_time") {
          let sum = 0,
            cnt = 0;
          for (const t of bucket) {
            if (t.resolved_at && t.created_at) {
              const ms = t.resolved_at.getTime() - t.created_at.getTime();
              if (ms >= 0) {
                sum += msToMinutes(ms) ?? 0;
                cnt++;
              }
            }
          }
          value = cnt ? sum / cnt : null;
        } else if (metric === "tickets_count") {
          value = bucket.length;
        } else if (metric === "sla_adherence") {
          let monitored = 0,
            within = 0;
          for (const t of bucket) {
            if (t.sla_deadline) {
              monitored++;
              if (t.first_response_at && t.first_response_at <= t.sla_deadline)
                within++;
            }
          }
          value = monitored ? (within / monitored) * 100 : null;
        } else {
          value = null;
        }

        return {
          date: bucketKey,
          value: value === null ? null : Number(value.toFixed(2)),
        };
      });

      // respond
      res.status(200).json({
        success: true,
        data: {
          metric,
          interval,
          range: { from: from.toISOString(), to: to.toISOString() },
          series,
        },
        message: "Ticket trends fetched successfully",
      });
    } catch (err: any) {
      console.error("trendsData error", err);
      res
        .status(500)
        .json({ success: false, error: err.message ?? "Internal error" });
    }
  },

  async hourlyTickets(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = parseDateRange(req.query); // should return Date objects

      const scope = await getUserScope(req);
      if (scope.error) {
        res.error(scope.error, 400);
        return;
      }
      const filter = scope.filter ?? {};

      // fetch only created_at for tickets in range + scope
      const tickets = await prisma.tickets.findMany({
        where: {
          AND: [filter, { created_at: { gte: from, lte: to } }],
        },
        select: { created_at: true },
      });

      // initialize 0-23 buckets
      const buckets = new Array(24).fill(0);

      // Use server-side UTC hour to avoid timezone surprises.
      for (const t of tickets) {
        if (!t.created_at) continue;
        const hour = t.created_at.getUTCHours(); // 0..23
        buckets[hour] = (buckets[hour] ?? 0) + 1;
      }

      // map to series
      const series = buckets.map((count, hour) => ({ hour, count }));

      res.status(200).json({
        success: true,
        data: {
          range: { from: from.toISOString(), to: to.toISOString() },
          series,
        },
        message: "Hourly ticket volume fetched",
      });
    } catch (err: any) {
      console.error("hourlyTickets error", err);
      res
        .status(500)
        .json({ success: false, error: err.message ?? "Internal error" });
    }
  },

  async agentsPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = parseDateRange(req.query); // expects parseDateRange to give Date objects

      const scope = await getUserScope(req);
      if (scope.error) {
        res.error(scope.error, 400);
        return;
      }
      const filter = scope.filter ?? {};

      // 1) fetch tickets in range that have an assigned agent (and respect scope)
      const tickets = await prisma.tickets.findMany({
        where: {
          AND: [
            filter,
            { created_at: { gte: from, lte: to } },
            { assigned_agent_id: { not: null } },
          ],
        },
        select: {
          id: true,
          assigned_agent_id: true,
          created_at: true,
          first_response_at: true,
          resolved_at: true,
          sla_deadline: true,
          customer_satisfaction_rating: true, // optional field - include if exists
        },
      });

      // 2) aggregate per agent in memory
      type AgentAgg = {
        agentId: number;
        totalTickets: number;
        resolvedTickets: number;
        sumResolutionHours: number;
        resolutionCount: number;
        sumFRTMinutes: number;
        frtCount: number;
        slaMonitored: number;
        slaWithin: number;
        sumCustSat: number;
        custSatCount: number;
      };

      const map = new Map<number, AgentAgg>();

      for (const t of tickets) {
        const agentId = t.assigned_agent_id as number;
        if (!map.has(agentId)) {
          map.set(agentId, {
            agentId,
            totalTickets: 0,
            resolvedTickets: 0,
            sumResolutionHours: 0,
            resolutionCount: 0,
            sumFRTMinutes: 0,
            frtCount: 0,
            slaMonitored: 0,
            slaWithin: 0,
            sumCustSat: 0,
            custSatCount: 0,
          });
        }
        const agg = map.get(agentId)!;
        agg.totalTickets++;

        if (t.resolved_at && t.created_at) {
          const diffMs = t.resolved_at.getTime() - t.created_at.getTime();
          if (diffMs >= 0) {
            agg.sumResolutionHours += diffMs / (1000 * 60 * 60); // hours
            agg.resolutionCount++;
            agg.resolvedTickets++;
          }
        }

        if (t.first_response_at && t.created_at) {
          const diffMs = t.first_response_at.getTime() - t.created_at.getTime();
          if (diffMs >= 0) {
            agg.sumFRTMinutes += diffMs / (1000 * 60); // minutes
            agg.frtCount++;
          }
        }

        if (t.sla_deadline) {
          agg.slaMonitored++;
          if (t.first_response_at && t.first_response_at <= t.sla_deadline)
            agg.slaWithin++;
        }

        if (typeof t.customer_satisfaction_rating === "number") {
          agg.sumCustSat += t.customer_satisfaction_rating;
          agg.custSatCount++;
        }
      }

      // 3) fetch agent user profiles for agentIds
      const agentIds = Array.from(map.keys());
      const users = agentIds.length
        ? await prisma.users.findMany({
            where: { id: { in: agentIds } },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              username: true,
            },
          })
        : [];

      // 4) build response objects
      const result = agentIds.map((agentId) => {
        const agg = map.get(agentId)!;
        const user = users.find((u) => u.id === agentId);
        const avgResolutionTime = agg.resolutionCount
          ? Number((agg.sumResolutionHours / agg.resolutionCount).toFixed(2))
          : 0;
        const avgResponseTime = agg.frtCount
          ? Number((agg.sumFRTMinutes / agg.frtCount).toFixed(2))
          : 0;
        const slaCompliance = agg.slaMonitored
          ? Number(((agg.slaWithin / agg.slaMonitored) * 100).toFixed(2))
          : 0;
        const customerSatisfaction = agg.custSatCount
          ? Number((agg.sumCustSat / agg.custSatCount).toFixed(2))
          : null;

        return {
          agentId,
          name: user
            ? `${user.first_name} ${user.last_name}`.trim() || user.username
            : `Agent ${agentId}`,
          email: user?.email ?? null,
          totalTickets: agg.totalTickets,
          resolvedTickets: agg.resolvedTickets,
          avgResolutionTime, // hours
          avgResponseTime, // minutes
          slaCompliance, // percent
          customerSatisfaction, // avg rating or null
        };
      });

      // optionally sort by totalTickets desc
      result.sort((a, b) => b.totalTickets - a.totalTickets);

      res.status(200).json({
        success: true,
        data: {
          range: { from: from.toISOString(), to: to.toISOString() },
          agents: result,
        },
        message: "Agent performance fetched",
      });
    } catch (err: any) {
      console.error("agentsPerformance error", err);
      res
        .status(500)
        .json({ success: false, error: err.message ?? "Internal error" });
    }
  },
};
