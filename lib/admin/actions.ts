import { prisma } from "@/lib/db";
import { repackDate } from "@/lib/allocation/engine";
import { getPoolBookingsForDate } from "@/lib/bookings/pool";
import { POOL_COURT_NUMBERS } from "@/lib/types";

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

  await prisma.booking.update({ where: { id }, data: { status: "cancelled", updatedBy } });

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

  await prisma.booking.update({ where: { id }, data: { status: "confirmed", updatedBy } });
  return { ok: true };
}
