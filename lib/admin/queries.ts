import { prisma } from "@/lib/db";
import { isEffectivelyLocked } from "@/lib/allocation/lock";

const VISIBLE_STATUSES = ["held", "paid", "confirmed"] as const;

function toCourtNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === "number");
}

/** Schedule grid data for one date (§6) — a plain read, no placement logic. */
export async function getAdminScheduleForDate(date: string, now: Date = new Date()) {
  const rows = await prisma.booking.findMany({
    where: { date, status: { in: [...VISIBLE_STATUSES] } },
    include: { customer: true },
    orderBy: { startHour: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    court: r.court as "pool" | "court6",
    courtNumbers: toCourtNumbers(r.courtNumbers),
    startHour: r.startHour,
    durationMinutes: r.durationMinutes,
    status: r.status,
    locked: isEffectivelyLocked({ date: r.date, startHour: r.startHour, locked: r.locked }, now),
    gapPolicyFlag: r.gapPolicyFlag,
    needsAttention: r.needsAttention,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    customerName: r.customer.name,
    customerPhone: r.customer.phone,
    amountDue: r.amountDue,
    paymentMethod: r.paymentMethod,
    paymentCheckStatus: r.paymentCheckStatus,
    slipImageUrl: r.slipImageUrl,
    createdAt: r.createdAt.toISOString(),
    reassigned: r.originalDate !== null,
  }));
}

/** Booking history/log (also where a slip image, once uploaded, becomes
 * visible to staff — see lib/payments/slip-verifier.ts). Deliberately no
 * status filter — cancelled bookings stay visible here (and in the
 * Bookings tab's "Deleted zone") rather than disappearing, per the
 * recoverable-cancel design. `month` ("YYYY-MM") backs the Bookings tab's
 * monthly view; `date` (single day) backs the existing History tab. */
export async function getBookingHistory(
  params: { limit?: number; date?: string; month?: string; now?: Date } = {}
) {
  const now = params.now ?? new Date();
  const where = params.date
    ? { date: params.date }
    : params.month
      ? { date: { startsWith: params.month } }
      : undefined;

  const rows = await prisma.booking.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
  });

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    startHour: r.startHour,
    durationMinutes: r.durationMinutes,
    court: r.court,
    courtCount: r.courtCount,
    courtNumbers: toCourtNumbers(r.courtNumbers),
    status: r.status,
    locked: isEffectivelyLocked({ date: r.date, startHour: r.startHour, locked: r.locked }, now),
    gapPolicyFlag: r.gapPolicyFlag,
    needsAttention: r.needsAttention,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    amountDue: r.amountDue,
    slipImageUrl: r.slipImageUrl,
    paymentMethod: r.paymentMethod,
    paymentCheckStatus: r.paymentCheckStatus,
    customerName: r.customer.name,
    customerPhone: r.customer.phone,
    createdAt: r.createdAt.toISOString(),
    updatedBy: r.updatedBy,
    reassigned: r.originalDate !== null,
  }));
}

/** New-booking alert feed (§ admin in-app notifications) — bookings
 * created after `since`, newest first, capped small since this only backs
 * a toast/badge, not a full listing. */
export async function getRecentBookings(since: Date, limit = 20) {
  const rows = await prisma.booking.findMany({
    where: { createdAt: { gt: since } },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    startHour: r.startHour,
    customerName: r.customer.name,
    createdAt: r.createdAt.toISOString(),
  }));
}
