import { prisma } from "@/lib/db";
import { placeBooking, repackDate } from "@/lib/allocation/engine";
import { getPoolBookingsForDate } from "@/lib/bookings/pool";
import { getCourt6BusyHours } from "@/lib/bookings/court6";
import { bookingHourWindow, COURT6, HOLD_DURATION_MINUTES, POOL_COURT_NUMBERS } from "@/lib/types";

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

/**
 * Manual court override (§6.3): a deliberate staff action, allowed to touch
 * a locked booking too — the UI requires a confirmation step before calling
 * this, since it's an intentional exception to the engine's normal
 * never-move-a-locked-booking guarantee, not something that should happen
 * by accident.
 */
export async function overrideCourtNumbers(id: string, courtNumbers: number[], updatedBy: string): Promise<ActionResult> {
  if (courtNumbers.some((c) => !(POOL_COURT_NUMBERS as readonly number[]).includes(c))) {
    return { ok: false, error: "Court numbers must be within 1–5." };
  }
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.court !== "pool") return { ok: false, error: "Court 6 has no assignment to override." };

  await prisma.booking.update({
    where: { id },
    data: { courtNumbers, gapPolicyFlag: false, updatedBy },
  });
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

/**
 * Swap two pool bookings' court assignments (§ admin "swap courts"): unlike
 * overrideCourtNumbers, neither booking is overwritten with a blank slate —
 * both keep a valid assignment, just exchanged. Deliberately no repack
 * afterward (same precedent as override: a deliberate manual action bypasses
 * automatic placement), and locked bookings are allowed — the UI requires a
 * confirmation step first when either side is locked.
 */
export async function swapCourtNumbers(bookingIdA: string, bookingIdB: string, updatedBy: string): Promise<ActionResult> {
  if (bookingIdA === bookingIdB) return { ok: false, error: "Choose two different bookings." };

  const [a, b] = await Promise.all([
    prisma.booking.findUnique({ where: { id: bookingIdA } }),
    prisma.booking.findUnique({ where: { id: bookingIdB } }),
  ]);
  if (!a || !b) return { ok: false, error: "Booking not found" };
  if (a.court !== "pool" || b.court !== "pool") return { ok: false, error: "Only courts 1–5 bookings can be swapped." };

  const aCourts = Array.isArray(a.courtNumbers) ? (a.courtNumbers as number[]) : [];
  const bCourts = Array.isArray(b.courtNumbers) ? (b.courtNumbers as number[]) : [];

  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingIdA }, data: { courtNumbers: bCourts, updatedBy } }),
    prisma.booking.update({ where: { id: bookingIdB }, data: { courtNumbers: aCourts, updatedBy } }),
  ]);
  return { ok: true };
}
