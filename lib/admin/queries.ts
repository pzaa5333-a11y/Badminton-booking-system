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
    customerName: r.customer.name,
    customerPhone: r.customer.phone,
    amountDue: r.amountDue,
    paymentMethod: r.paymentMethod,
  }));
}

/** Booking history/log (also where a slip image, once uploaded, becomes
 * visible to staff — see lib/payments/slip-verifier.ts). */
export async function getBookingHistory(params: { limit?: number; date?: string } = {}) {
  const rows = await prisma.booking.findMany({
    where: params.date ? { date: params.date } : undefined,
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
    gapPolicyFlag: r.gapPolicyFlag,
    amountDue: r.amountDue,
    slipImageUrl: r.slipImageUrl,
    paymentMethod: r.paymentMethod,
    customerName: r.customer.name,
    customerPhone: r.customer.phone,
    createdAt: r.createdAt.toISOString(),
    updatedBy: r.updatedBy,
  }));
}
