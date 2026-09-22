import type { Booking } from "@/generated/prisma/client";

/** A booking still occupies its courts/hour while held (until its hold
 * expires), paid, or confirmed. Cancelled and released bookings don't. This
 * is checked at read time — not just relied on from the hold-expiry sweep
 * (Milestone 6) — so a not-yet-swept expired hold never blocks availability. */
export function isActiveOccupancy(
  booking: Pick<Booking, "status" | "holdExpiresAt">,
  now: Date
): boolean {
  if (booking.status === "cancelled" || booking.status === "released") return false;
  if (booking.status === "held" && booking.holdExpiresAt && booking.holdExpiresAt <= now) return false;
  return true;
}
