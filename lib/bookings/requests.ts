import { prisma } from "@/lib/db";
import { findOrCreateCustomer } from "./customers";
import { getPoolBookingsForDate } from "./pool";
import { getCourt6BusyHours } from "./court6";
import { placeBooking, findFeasibleStart, repackDate } from "@/lib/allocation/engine";
import {
  bookingHourWindow,
  CLOSING_HOUR,
  COURT6,
  HOLD_DURATION_MINUTES,
  type CourtSelection,
  type DurationMinutes,
} from "@/lib/types";
import { computeAmountDue } from "@/lib/pricing";

export interface BookingRequestInput {
  date: string;
  startHour: number;
  durationMinutes: DurationMinutes;
  courtCount: number;
  court: CourtSelection;
  customerName: string;
  customerPhone: string;
  /** Admin walk-in (§6.3): skips the hold/payment flow, created paid/confirmed
   * immediately, still runs through the same allocation engine. */
  immediate?: boolean;
  updatedBy?: string;
  /** How to resolve an existing customer record under this phone having a
   * different name than `customerName` — "keep" (default) leaves it
   * untouched, "update" overwrites it. Only the admin walk-in flow passes
   * "update", and only after the admin has explicitly confirmed it. */
  nameConflict?: "keep" | "update";
}

export type CreateBookingResult =
  | { kind: "created"; bookingId: string; amountDue: number; gapPolicyFlag: boolean }
  | { kind: "conflict"; message: string; alternativeStartHour: number | null };

function findLaterCourt6Start(busy: Set<number>, afterHour: number, durationMinutes: number): number | null {
  const hours = durationMinutes / 60;
  for (let start = afterHour + 1; start + hours <= CLOSING_HOUR; start++) {
    if (bookingHourWindow(start, durationMinutes).every((h) => !busy.has(h))) return start;
  }
  return null;
}

/**
 * Re-validates and creates a booking request (§3.3, §4.8). Wrapped in a
 * transaction so the read-then-write can't race a concurrent request for
 * the same date — the frontend's numbers can already be stale by the time
 * this runs, and we don't want two submissions to both see the same free
 * courts and both succeed.
 */
export async function createBookingRequest(input: BookingRequestInput): Promise<CreateBookingResult> {
  const now = new Date();
  const window = bookingHourWindow(input.startHour, input.durationMinutes);

  if (window[window.length - 1] + 1 > CLOSING_HOUR) {
    return { kind: "conflict", message: "That session runs past closing time.", alternativeStartHour: null };
  }

  return prisma.$transaction(async (tx) => {
    const customer = await findOrCreateCustomer(
      { name: input.customerName, phone: input.customerPhone },
      tx,
      input.nameConflict
    );

    if (input.court === "court6") {
      const busy = new Set(await getCourt6BusyHours(input.date, now, tx));
      if (window.some((h) => busy.has(h))) {
        return {
          kind: "conflict",
          message: "Court 6 is no longer free at that time.",
          alternativeStartHour: findLaterCourt6Start(busy, input.startHour, input.durationMinutes),
        };
      }

      const amountDue = computeAmountDue({
        date: input.date,
        startHour: input.startHour,
        durationMinutes: input.durationMinutes,
        court: "court6",
        courtCount: 1,
      });
      const booking = await tx.booking.create({
        data: {
          customerId: customer.id,
          date: input.date,
          startHour: input.startHour,
          durationMinutes: input.durationMinutes,
          court: "court6",
          courtCount: 1,
          courtNumbers: [COURT6],
          status: input.immediate ? "confirmed" : "held",
          holdExpiresAt: input.immediate ? null : new Date(now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000),
          amountDue,
          paymentMethod: input.immediate ? "cash" : null,
          updatedBy: input.updatedBy,
        },
      });
      return { kind: "created", bookingId: booking.id, amountDue, gapPolicyFlag: false };
    }

    // Pool (courts 1–5) — §4.8's order of operations.
    const existing = await getPoolBookingsForDate(input.date, now, undefined, tx);
    const placement = placeBooking(
      { startHour: input.startHour, durationMinutes: input.durationMinutes, courtCount: input.courtCount },
      existing
    );

    if (placement.status !== "placed") {
      const laterStart = findFeasibleStart(
        { startHour: input.startHour, durationMinutes: input.durationMinutes, courtCount: input.courtCount },
        existing
      );
      if (laterStart !== null) {
        // Fits later, just not now — offer it rather than silently booking
        // a different time or applying the gap policy (§4.5, §3.3).
        return {
          kind: "conflict",
          message: "That many courts aren't free at that time.",
          alternativeStartHour: laterStart,
        };
      }
      if (placement.status === "infeasible") {
        return { kind: "conflict", message: "That time is fully booked.", alternativeStartHour: null };
      }
      // Doesn't fit now, and no later start works either — the gap policy
      // result already computed above is the best the pool can offer
      // (§4.8 step 2c); proceed to create it, flagged for admin review.
    }

    // Charge for what's actually assigned — the gap policy can hand out
    // fewer courts than requested; the customer shouldn't pay for courts
    // they didn't get.
    const actualCourtCount = placement.courtNumbers.length;
    const amountDue = computeAmountDue({
      date: input.date,
      startHour: input.startHour,
      durationMinutes: input.durationMinutes,
      court: "pool",
      courtCount: actualCourtCount,
    });

    const booking = await tx.booking.create({
      data: {
        customerId: customer.id,
        date: input.date,
        startHour: input.startHour,
        durationMinutes: input.durationMinutes,
        court: "pool",
        courtCount: input.courtCount,
        courtNumbers: placement.courtNumbers,
        status: input.immediate ? "confirmed" : "held",
        gapPolicyFlag: placement.gapPolicyFlag,
        holdExpiresAt: input.immediate ? null : new Date(now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000),
        amountDue,
        paymentMethod: input.immediate ? "cash" : null,
        updatedBy: input.updatedBy,
      },
    });

    // Repack the whole date, not just this one booking: a fresh arrival
    // gives repackDate's batch-aware lookahead (findLowEdgeReservation) a
    // chance to fire retroactively for *earlier* unlocked bookings too —
    // e.g. an earlier, smaller booking can now move to the far edge to
    // free the near edge for this new, bigger one, rather than leaving the
    // pool fragmented until someone happens to cancel something.
    const allForDate = await getPoolBookingsForDate(input.date, now, undefined, tx);
    const repackChanges = repackDate(allForDate);
    for (const change of repackChanges) {
      // The new booking is processed last in repackDate's priority order,
      // so its own placement can also differ from the one-shot result
      // above once earlier bookings have potentially shifted — apply it too.
      await tx.booking.update({
        where: { id: change.id },
        data: { courtNumbers: change.courtNumbers, gapPolicyFlag: change.gapPolicyFlag },
      });
    }
    const finalPlacement = repackChanges.find((c) => c.id === booking.id);

    return {
      kind: "created",
      bookingId: booking.id,
      amountDue,
      gapPolicyFlag: finalPlacement?.gapPolicyFlag ?? placement.gapPolicyFlag,
    };
  });
}
