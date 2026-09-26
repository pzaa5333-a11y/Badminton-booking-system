import { POOL_COURT_NUMBERS, POOL_SIZE, CLOSING_HOUR, bookingHourWindow } from "@/lib/types";
import type { HourAvailability, NewBookingWindow, PlaceResult, PoolBooking } from "./types";

// ---------------------------------------------------------------------------
// Occupancy
// ---------------------------------------------------------------------------

function occupiedAtHour(bookings: PoolBooking[], hour: number, excludeId?: string): Set<number> {
  const occupied = new Set<number>();
  for (const b of bookings) {
    if (b.id === excludeId) continue;
    if (bookingHourWindow(b.startHour, b.durationMinutes).includes(hour)) {
      for (const c of b.courtNumbers) occupied.add(c);
    }
  }
  return occupied;
}

function freeAtHour(bookings: PoolBooking[], hour: number, excludeId?: string): number[] {
  const occupied = occupiedAtHour(bookings, hour, excludeId);
  return POOL_COURT_NUMBERS.filter((c) => !occupied.has(c));
}

/**
 * Courts free for *every* hour in the window — the only courts a booking
 * spanning that whole window could actually use, since a booking keeps the
 * same courts for its entire duration (it never switches mid-session).
 */
export function commonFreeForWindow(
  bookings: PoolBooking[],
  window: number[],
  excludeId?: string
): number[] {
  if (window.length === 0) return [...POOL_COURT_NUMBERS];
  const free = new Set(freeAtHour(bookings, window[0], excludeId));
  for (let i = 1; i < window.length; i++) {
    const hourFree = new Set(freeAtHour(bookings, window[i], excludeId));
    for (const c of [...free]) {
      if (!hourFree.has(c)) free.delete(c);
    }
  }
  return [...free].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Contiguity helpers
// ---------------------------------------------------------------------------

function contiguousRuns(courts: number[]): number[][] {
  const sorted = [...courts].sort((a, b) => a - b);
  const runs: number[][] = [];
  let current: number[] = [];
  for (const c of sorted) {
    if (current.length === 0 || c === current[current.length - 1] + 1) {
      current.push(c);
    } else {
      runs.push(current);
      current = [c];
    }
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

/** Size of the largest unbroken run within `free` — the point past which
 * requesting more courts forces a non-contiguous ("separated") placement. */
function longestRun(free: number[]): number {
  return contiguousRuns(free).reduce((max, run) => Math.max(max, run.length), 0);
}

/**
 * Picks which specific courts a booking gets out of `free` (the courts free
 * for its whole window), always returning a genuinely contiguous sub-run so
 * a new placement never itself creates fragmentation. Returns null if no run
 * of the requested length exists (caller falls back to the gap policy).
 *
 * When `free` spans the entire pool (nothing at all occupies this window)
 * there's a real choice of where to anchor — that's the "batch-aware" hook
 * (§4.4): `reserveLowSlots` leaves that many courts at the low edge
 * untouched, for another known booking that overlaps this window and
 * outlasts it (see `findLowEdgeReservation`) to claim as ITS low-anchored
 * block once this one ends. In every other (normal) case `free` is a
 * single run touching exactly one edge of the pool, and the only placement
 * that keeps the "one booked run, one free run" invariant (§4.3) is
 * immediately adjacent to the existing booked block — so there's no real
 * choice, and `reserveLowSlots` is moot.
 */
function chooseCourtRun(free: number[], courtCount: number, reserveLowSlots: number): number[] | null {
  const runs = contiguousRuns(free);
  const candidates = runs.filter((r) => r.length >= courtCount).sort((a, b) => a[0] - b[0]);
  if (candidates.length === 0) return null;

  if (free.length === POOL_SIZE) {
    const run = candidates[0]; // the whole pool, as one run
    if (reserveLowSlots > 0 && reserveLowSlots + courtCount <= POOL_SIZE) {
      return run.slice(reserveLowSlots, reserveLowSlots + courtCount);
    }
    return run.slice(0, courtCount);
  }

  // Lowest-positioned run big enough. The normal case has exactly one
  // candidate; more than one only happens after a prior gap-policy
  // fragmentation, and picking the lowest is a reasonable default there.
  const run = candidates[0];
  const touchesLowPoolEdge = run[0] === POOL_COURT_NUMBERS[0];
  const touchesHighPoolEdge = run[run.length - 1] === POOL_COURT_NUMBERS[POOL_COURT_NUMBERS.length - 1];

  if (touchesLowPoolEdge && !touchesHighPoolEdge) {
    // Existing block is high-anchored; sit at the end of the free run closest to it.
    return run.slice(run.length - courtCount);
  }
  if (touchesHighPoolEdge && !touchesLowPoolEdge) {
    // Existing block is low-anchored; sit at the end of the free run closest to it.
    return run.slice(0, courtCount);
  }
  // Isolated free run touching neither pool edge — only possible after prior
  // fragmentation. No clear "adjacent" side; default to the low end.
  return run.slice(0, courtCount);
}

/**
 * True if `other` actually shares an hour with `request`'s window (not
 * just touches — a booking starting exactly when this one ends never
 * coexists with it, so there's never a real court conflict between them
 * regardless of position, and reserving for it would be pure overhead) and
 * keeps running past `request`'s own end.
 */
function overlapsAndOutlasts(request: NewBookingWindow, other: PoolBooking): boolean {
  const myEnd = request.startHour + request.durationMinutes / 60;
  const otherEnd = other.startHour + other.durationMinutes / 60;
  if (otherEnd <= myEnd) return false;

  const myWindow = bookingHourWindow(request.startHour, request.durationMinutes);
  const otherWindow = bookingHourWindow(other.startHour, other.durationMinutes);
  return myWindow.some((h) => otherWindow.includes(h));
}

/**
 * How many courts, at the low edge, this booking should leave untouched
 * for another known booking to claim (§4.4's batch-awareness, generalized
 * beyond the narrow "starts exactly when I end" case): a booking that's
 * genuinely simultaneously active with this one for at least one hour, and
 * keeps running after this one ends, will want a clean low-anchored block
 * once this one vacates — so this booking steps aside by exactly that many
 * courts. When several such bookings exist, reserves for the largest (a
 * conservative approximation, not an exact multi-booking reservation).
 * Bookings that merely touch (back-to-back, no shared hour) are excluded —
 * they never coexist with this one, so no reservation is needed for them.
 */
function findLowEdgeReservation(request: NewBookingWindow, others: PoolBooking[]): number {
  let reservation = 0;
  for (const other of others) {
    if (overlapsAndOutlasts(request, other)) {
      reservation = Math.max(reservation, other.courtCount);
    }
  }
  return reservation;
}

// ---------------------------------------------------------------------------
// Placement (§4.4) and the gap policy (§4.5.1)
// ---------------------------------------------------------------------------

/**
 * Places one new booking against the pool bookings already on the books for
 * that date. `options.lookahead` lets a caller pass other known-but-not-yet-
 * placed bookings (e.g. the rest of a batch being repacked) purely so the
 * batch-aware edge choice can see them — it does not affect capacity.
 */
export function placeBooking(
  request: NewBookingWindow,
  existingBookings: PoolBooking[],
  options: { lookahead?: PoolBooking[] } = {}
): PlaceResult {
  const window = bookingHourWindow(request.startHour, request.durationMinutes);
  const free = commonFreeForWindow(existingBookings, window);

  if (free.length >= request.courtCount) {
    const reserveLowSlots = findLowEdgeReservation(request, [...existingBookings, ...(options.lookahead ?? [])]);
    const run = chooseCourtRun(free, request.courtCount, reserveLowSlots);
    if (run) return { status: "placed", courtNumbers: run, gapPolicyFlag: false };
  }

  // Genuine shortfall (or, rarely, a fragmented free set with no run long
  // enough): give the booking the largest contiguous block the pool can
  // actually offer for this exact window and flag it for admin review
  // (§4.5.1) rather than failing outright. The single `court_numbers` field
  // can't represent an hour-varying assignment, so this is scoped to the
  // whole window rather than per-hour — a deliberate simplification of the
  // spec's per-hour scoping, acceptable since this path is a flagged,
  // manually-reviewed last resort, not silent behavior.
  const fallbackSize = longestRun(free);
  if (fallbackSize === 0) return { status: "infeasible" };
  const run = chooseCourtRun(free, fallbackSize, 0) ?? [];
  return { status: "gap-policy", courtNumbers: run, gapPolicyFlag: true };
}

/**
 * Searches forward from just after `request.startHour` for the first later
 * start where the full requested quantity fits contiguously (§4.5's "offer a
 * later start" escape hatch, used when validating a booking request — not
 * during placement itself). Returns null if nothing later in the operating
 * day works either.
 */
export function findFeasibleStart(
  request: NewBookingWindow,
  existingBookings: PoolBooking[]
): number | null {
  const hours = request.durationMinutes / 60;
  for (let start = request.startHour + 1; start + hours <= CLOSING_HOUR; start++) {
    const window = bookingHourWindow(start, request.durationMinutes);
    const free = commonFreeForWindow(existingBookings, window);
    if (free.length >= request.courtCount && chooseCourtRun(free, request.courtCount, 0)) {
      return start;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Availability (backs GET /availability)
// ---------------------------------------------------------------------------

export function computeHourAvailability(
  bookings: PoolBooking[],
  startHour: number,
  durationMinutes: number
): HourAvailability {
  const window = bookingHourWindow(startHour, durationMinutes);
  const free = commonFreeForWindow(bookings, window);
  const freeCount = free.length;
  const maxContiguous = longestRun(free);
  // separated_at holds the largest quantity that's still clean — the
  // frontend warns when the requested quantity exceeds it (§3.3: "2 means
  // requesting 1 or 2 courts is clean, but 3 would split").
  const separatedAt = maxContiguous < freeCount ? maxContiguous : null;
  return { hour: startHour, freeCount, separatedAt };
}

// ---------------------------------------------------------------------------
// Reassignment (§4.6) — triggered after a new placement or a cancellation
// ---------------------------------------------------------------------------

/**
 * Recomputes `court_numbers` for every unlocked booking on a date from
 * scratch, given the locked bookings as fixed anchors. This is a full
 * defragmentation pass rather than a minimal diff: since court numbers are
 * never shown to customers (§3.5), there's no UX cost to moving more
 * bookings than strictly necessary, and a full repack is far simpler to
 * keep correct than a true minimal-diff algorithm. Locked bookings are
 * never touched (§4.7) — kept exactly as given, contributing only to what's
 * "occupied" for everyone else. Unlocked bookings are repacked in priority
 * order (earliest booked first, §4.5.1), so a booking that no longer needs
 * a gap-policy placement automatically slides back into a clean block.
 *
 * Returns only the bookings whose assignment actually changed, for the
 * caller to persist.
 */
export function repackDate(
  allBookings: PoolBooking[]
): { id: string; courtNumbers: number[]; gapPolicyFlag: boolean }[] {
  const locked = allBookings.filter((b) => b.locked);
  const unlocked = [...allBookings.filter((b) => !b.locked)].sort((a, b) => a.priority - b.priority);

  const placed: PoolBooking[] = [...locked];
  const changes: { id: string; courtNumbers: number[]; gapPolicyFlag: boolean }[] = [];

  for (const booking of unlocked) {
    const result = placeBooking(
      { startHour: booking.startHour, durationMinutes: booking.durationMinutes, courtCount: booking.courtCount },
      placed,
      { lookahead: unlocked }
    );
    const courtNumbers = result.status === "infeasible" ? [] : result.courtNumbers;
    const gapPolicyFlag = result.status === "gap-policy";
    placed.push({ ...booking, courtNumbers, gapPolicyFlag });

    const sameLength = courtNumbers.length === booking.courtNumbers.length;
    const sameCourts = sameLength && courtNumbers.every((c, i) => c === booking.courtNumbers[i]);
    if (!sameCourts || gapPolicyFlag !== booking.gapPolicyFlag) {
      changes.push({ id: booking.id, courtNumbers, gapPolicyFlag });
    }
  }

  return changes;
}
