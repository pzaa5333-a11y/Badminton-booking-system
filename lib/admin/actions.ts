import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { placeBooking, repackDate } from "@/lib/allocation/engine";
import { getPoolBookingsForDate } from "@/lib/bookings/pool";
import { getCourt6BusyHours } from "@/lib/bookings/court6";
import { bookingHourWindow, CLOSING_HOUR, COURT6, HOLD_DURATION_MINUTES, POOL_COURT_NUMBERS } from "@/lib/types";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Cancel (§6.3): works on any booking not already cancelled/released,
 * locked or not. Frees its own courts, then repacks the date so any other
 * *unlocked* booking that would benefit from the freed space slides over
 * (§4.6) — repackDate never touches locked bookings by construction, so
 * this can't move anyone else's locked session as a side effect.
 */
export async function cancelBooking(id: string, updatedBy: string): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.status === "cancelled" || booking.status === "released") {
    return { ok: false, error: `Booking is already ${booking.status}.` };
  }

  await prisma.booking.update({
    where: { id },
    data: { status: "cancelled", cancelledAt: new Date(), updatedBy },
  });

  if (booking.court === "pool") {
    const now = new Date();
    const remaining = await getPoolBookingsForDate(booking.date, now);
    const changes = repackDate(remaining);
    for (const change of changes) {
      await prisma.booking.update({
        where: { id: change.id },
        data: { courtNumbers: change.courtNumbers, gapPolicyFlag: change.gapPolicyFlag },
      });
    }
  }

  return { ok: true };
}

function toNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? (value as number[]) : [];
}

function windowsOverlap(startA: number, durationA: number, startB: number, durationB: number): boolean {
  const windowA = bookingHourWindow(startA, durationA);
  const windowB = bookingHourWindow(startB, durationB);
  return windowA.some((h) => windowB.includes(h));
}

const ACTIVE_STATUSES = ["held", "paid", "confirmed"] as const;

/**
 * Reassign a booking's date, time and court(s) together in one step (§
 * admin "Reassign" — replaces the old separate override-courts and
 * swap-courts controls, which required jumping between screens for what
 * was really one task). Any *other* active booking that now overlaps the
 * new slot is left exactly where it is and flagged `needsAttention` for a
 * human to sort out — reassignment never auto-relocates a booking it
 * displaces. The original date/time/court(s) are snapshotted the first
 * time a booking is reassigned (never overwritten by a later
 * reassignment), so "Revert to original" always means the true original.
 */
export async function reassignBooking(
  id: string,
  target: { date: string; startHour: number; durationMinutes: number; courtNumbers: number[] },
  updatedBy: string
): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.status === "cancelled" || booking.status === "released") {
    return { ok: false, error: `Booking is already ${booking.status}.` };
  }

  const window = bookingHourWindow(target.startHour, target.durationMinutes);
  if (window[window.length - 1] + 1 > CLOSING_HOUR) {
    return { ok: false, error: "That session runs past closing time." };
  }

  const courtNumbers = booking.court === "court6" ? [COURT6] : target.courtNumbers;
  if (booking.court === "pool" && courtNumbers.some((c) => !(POOL_COURT_NUMBERS as readonly number[]).includes(c))) {
    return { ok: false, error: "Court numbers must be within 1–5." };
  }

  const others = await prisma.booking.findMany({
    where: { date: target.date, court: booking.court, status: { in: [...ACTIVE_STATUSES] }, id: { not: id } },
  });
  const displaced = others.filter((o) => {
    if (!windowsOverlap(target.startHour, target.durationMinutes, o.startHour, o.durationMinutes)) return false;
    if (booking.court === "court6") return true;
    const otherCourts = toNumberArray(o.courtNumbers);
    return otherCourts.some((c) => courtNumbers.includes(c));
  });

  const hasOriginal = booking.originalDate !== null;

  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: {
        date: target.date,
        startHour: target.startHour,
        durationMinutes: target.durationMinutes,
        courtNumbers,
        gapPolicyFlag: false,
        needsAttention: false,
        updatedBy,
        ...(hasOriginal
          ? {}
          : {
              originalDate: booking.date,
              originalStartHour: booking.startHour,
              originalDurationMinutes: booking.durationMinutes,
              originalCourtNumbers: booking.courtNumbers ?? [],
            }),
      },
    }),
    ...displaced.map((o) => prisma.booking.update({ where: { id: o.id }, data: { needsAttention: true, updatedBy } })),
  ]);

  return { ok: true };
}

/** Restore a reassigned booking to its true original date/time/court(s)
 * in one tap (§ admin "Revert to original"). Does not touch whatever it
 * displaced when it was reassigned — that stays flagged until an admin
 * resolves or dismisses it separately. */
export async function revertReassignment(id: string, updatedBy: string): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.originalDate === null) return { ok: false, error: "This booking hasn't been reassigned." };

  await prisma.booking.update({
    where: { id },
    data: {
      date: booking.originalDate,
      startHour: booking.originalStartHour!,
      durationMinutes: booking.originalDurationMinutes!,
      courtNumbers: booking.originalCourtNumbers ?? [],
      gapPolicyFlag: false,
      needsAttention: false,
      originalDate: null,
      originalStartHour: null,
      originalDurationMinutes: null,
      originalCourtNumbers: Prisma.DbNull,
      updatedBy,
    },
  });
  return { ok: true };
}

/** Clear a `needsAttention` flag once an admin has sorted out a slot a
 * reassignment displaced (by reassigning or cancelling it themselves) —
 * the explicit "resolve or dismiss" the marker calls for. */
export async function dismissNeedsAttention(id: string, updatedBy: string): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };

  await prisma.booking.update({ where: { id }, data: { needsAttention: false, updatedBy } });
  return { ok: true };
}

/**
 * Manual lock toggle: lets staff lock a booking before the automatic
 * 60-minute-before-start cutoff (e.g. a VIP court they don't want touched
 * even hours in advance). Unlocking only clears this manual flag — if the
 * booking is still within the automatic cutoff window, it stays
 * effectively locked regardless (isEffectivelyLocked ORs both), since that
 * safety guarantee is never meant to be simply switched off.
 */
export async function setBookingLocked(id: string, locked: boolean, updatedBy: string): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };

  await prisma.booking.update({ where: { id }, data: { locked, updatedBy } });
  return { ok: true };
}

/** Payment override (§6.3): mark paid without slip verification — cash at
 * the counter, or resolving a verification dispute. */
export async function markPaid(id: string, updatedBy: string): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.status === "cancelled" || booking.status === "released") {
    return { ok: false, error: `Booking is already ${booking.status}.` };
  }

  await prisma.booking.update({ where: { id }, data: { status: "confirmed", paymentMethod: "cash", updatedBy } });
  return { ok: true };
}

/**
 * Restore a cancelled booking (§ admin "Deleted zone"): re-attempts its
 * original slot via the same allocation engine a fresh booking would use.
 * If the slot's genuinely gone (someone else now holds it), the booking is
 * restored anyway — flagged `needsAttention` — rather than blocking the
 * restore outright (confirmed with the user: recoverable, not silently
 * lost, but also never allowed to fail).
 */
export async function restoreBooking(id: string, updatedBy: string): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.status !== "cancelled") return { ok: false, error: "Booking is not cancelled." };

  const now = new Date();
  const targetStatus = booking.paymentMethod ? "confirmed" : "held";
  const holdExpiresAt = targetStatus === "held" ? new Date(now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000) : null;

  if (booking.court === "court6") {
    const busy = new Set(await getCourt6BusyHours(booking.date, now));
    const window = bookingHourWindow(booking.startHour, booking.durationMinutes);
    const stillFree = window.every((h) => !busy.has(h));
    await prisma.booking.update({
      where: { id },
      data: {
        status: targetStatus,
        holdExpiresAt,
        courtNumbers: [COURT6],
        needsAttention: !stillFree,
        cancelledAt: null,
        updatedBy,
      },
    });
    return { ok: true };
  }

  const others = await getPoolBookingsForDate(booking.date, now, id);
  const placement = placeBooking(
    { startHour: booking.startHour, durationMinutes: booking.durationMinutes, courtCount: booking.courtCount },
    others
  );

  await prisma.booking.update({
    where: { id },
    data: {
      status: targetStatus,
      holdExpiresAt,
      courtNumbers: placement.status === "infeasible" ? [] : placement.courtNumbers,
      gapPolicyFlag: placement.status === "gap-policy",
      needsAttention: placement.status === "infeasible",
      cancelledAt: null,
      updatedBy,
    },
  });

  const allForDate = await getPoolBookingsForDate(booking.date, now);
  const repackChanges = repackDate(allForDate);
  for (const change of repackChanges) {
    await prisma.booking.update({
      where: { id: change.id },
      data: { courtNumbers: change.courtNumbers, gapPolicyFlag: change.gapPolicyFlag },
    });
  }

  return { ok: true };
}

/** Manual slip review (§ admin "Check payment"): flips a slip/bank-transfer
 * booking from "pending review" to "checked" once staff has compared the
 * slip against the amount owed. Never meaningful for package/cash
 * payments — those never get a `paymentCheckStatus` in the first place. */
export async function markPaymentChecked(id: string, updatedBy: string): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.paymentCheckStatus === null) return { ok: false, error: "Nothing to check for this booking." };

  await prisma.booking.update({ where: { id }, data: { paymentCheckStatus: "checked", updatedBy } });
  return { ok: true };
}
