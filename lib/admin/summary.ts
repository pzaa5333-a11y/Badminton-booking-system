import { prisma } from "@/lib/db";

const ACTIVE_STATUSES = ["held", "paid", "confirmed"] as const;

export interface RevenueBreakdown {
  totalConfirmed: number;
  totalCancelled: number;
  byPaymentMethod: { method: string; label: string; amount: number }[];
}

const METHOD_LABELS: Record<string, string> = { transfer: "Bank Transfer", promptpay: "Bank Transfer", package: "Package", cash: "Cash" };

/** Revenue over a date range, split confirmed vs cancelled (the audit
 * trail — §1.1) and by payment method. `from`/`to` are inclusive
 * YYYY-MM-DD strings, compared as plain strings like the rest of the
 * app's `date` column. */
export async function getRevenueBreakdown(from: string, to: string): Promise<RevenueBreakdown> {
  const rows = await prisma.booking.findMany({
    where: { date: { gte: from, lte: to }, status: { in: ["confirmed", "paid", "cancelled"] } },
    select: { status: true, amountDue: true, paymentMethod: true },
  });

  let totalConfirmed = 0;
  let totalCancelled = 0;
  const byMethod = new Map<string, number>();

  for (const r of rows) {
    if (r.status === "cancelled") {
      totalCancelled += r.amountDue;
      continue;
    }
    totalConfirmed += r.amountDue;
    const key = r.paymentMethod ?? "unknown";
    byMethod.set(key, (byMethod.get(key) ?? 0) + r.amountDue);
  }

  const byPaymentMethod = [...byMethod.entries()]
    .map(([method, amount]) => ({ method, label: METHOD_LABELS[method] ?? method, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { totalConfirmed, totalCancelled, byPaymentMethod };
}

export interface PeakAnalysis {
  /** [dayOfWeek 0-6][hour] -> booked court-hours. */
  heatmap: number[][];
  busiestHours: { hour: number; count: number }[];
}

/** Tallies booked court-hours by day-of-week x clock hour (§1.1 peak
 * analysis) — one unit per court booked for one hour, so a 2-court
 * booking for 1h counts as 2. Cancelled bookings don't count; only
 * bookings that actually held courts do. */
export async function getPeakAnalysis(from: string, to: string): Promise<PeakAnalysis> {
  const rows = await prisma.booking.findMany({
    where: { date: { gte: from, lte: to }, status: { in: [...ACTIVE_STATUSES] } },
    select: { date: true, startHour: true, durationMinutes: true, court: true, courtCount: true, courtNumbers: true },
  });

  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const byHour = new Array(24).fill(0);

  for (const r of rows) {
    const dow = new Date(`${r.date}T00:00:00Z`).getUTCDay();
    const courts = r.court === "court6" ? 1 : Array.isArray(r.courtNumbers) ? r.courtNumbers.length : r.courtCount;
    const hours = r.durationMinutes / 60;
    for (let i = 0; i < hours; i++) {
      const hour = r.startHour + i;
      if (hour >= 24) continue;
      heatmap[dow][hour] += courts;
      byHour[hour] += courts;
    }
  }

  const busiestHours = byHour
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .sort((a, b) => a.hour - b.hour);

  return { heatmap, busiestHours };
}

export interface TopCustomer {
  customerId: string;
  name: string;
  sessionCount: number;
  amountSpent: number;
}

/** Most-frequent bookers by session count and ฿ spent (§1.1 top
 * customers) — confirmed/paid bookings only, so a cancelled session
 * doesn't count toward "loyal customer." */
export async function getTopCustomers(from: string, to: string, limit = 10): Promise<TopCustomer[]> {
  const rows = await prisma.booking.findMany({
    where: { date: { gte: from, lte: to }, status: { in: ["confirmed", "paid"] } },
    select: { customerId: true, amountDue: true, customer: { select: { name: true } } },
  });

  const byCustomer = new Map<string, TopCustomer>();
  for (const r of rows) {
    const existing = byCustomer.get(r.customerId);
    if (existing) {
      existing.sessionCount += 1;
      existing.amountSpent += r.amountDue;
    } else {
      byCustomer.set(r.customerId, {
        customerId: r.customerId,
        name: r.customer.name,
        sessionCount: 1,
        amountSpent: r.amountDue,
      });
    }
  }

  return [...byCustomer.values()].sort((a, b) => b.amountSpent - a.amountSpent).slice(0, limit);
}
