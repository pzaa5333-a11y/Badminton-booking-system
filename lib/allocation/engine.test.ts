import { describe, expect, it } from "vitest";
import { placeBooking, findFeasibleStart, repackDate, computeHourAvailability } from "./engine";
import type { PoolBooking } from "./types";

let nextId = 0;
function booking(overrides: Partial<PoolBooking> = {}): PoolBooking {
  nextId += 1;
  return {
    id: overrides.id ?? `b${nextId}`,
    startHour: 9,
    durationMinutes: 60,
    courtCount: 1,
    courtNumbers: [],
    locked: false,
    gapPolicyFlag: false,
    priority: nextId,
    ...overrides,
  };
}

describe("placeBooking — normal edge-first placement", () => {
  it("places into an empty pool at the low edge by default", () => {
    const result = placeBooking({ startHour: 10, durationMinutes: 60, courtCount: 2 }, []);
    expect(result).toEqual({ status: "placed", courtNumbers: [1, 2], gapPolicyFlag: false });
  });

  it("extends the existing booked block outward rather than starting fresh", () => {
    const existing = [booking({ startHour: 10, durationMinutes: 60, courtCount: 2, courtNumbers: [1, 2] })];
    const result = placeBooking({ startHour: 10, durationMinutes: 60, courtCount: 1 }, existing);
    expect(result).toEqual({ status: "placed", courtNumbers: [3], gapPolicyFlag: false });
  });

  it("keeps a booking's courts fixed across its whole multi-hour window", () => {
    // A 3-hour booking must get courts free for all three hours, not just the first.
    const blocker = booking({ startHour: 11, durationMinutes: 60, courtCount: 5, courtNumbers: [1, 2, 3, 4, 5] });
    const result = placeBooking({ startHour: 10, durationMinutes: 180, courtCount: 1 }, [blocker]);
    // Hour 11 is fully booked, so nothing fits for the whole 10-12 window.
    expect(result.status).toBe("infeasible");
  });
});

describe("placeBooking — batch-aware edge reservation", () => {
  it("places a short booking at the far edge when a bigger booking is known to start right after", () => {
    const shortBooking = { startHour: 9, durationMinutes: 60, courtCount: 1 };
    const biggerSuccessor = booking({ startHour: 10, durationMinutes: 180, courtCount: 3, courtNumbers: [] });

    const shortResult = placeBooking(shortBooking, [], { lookahead: [biggerSuccessor] });
    expect(shortResult).toEqual({ status: "placed", courtNumbers: [5], gapPolicyFlag: false });

    // Placing the short booking at the far edge left the low courts clear, so
    // the bigger booking gets a clean contiguous block when it's placed for real.
    const placedShort = booking({ ...shortBooking, courtNumbers: shortResult.status === "placed" ? shortResult.courtNumbers : [] });
    const biggerResult = placeBooking(
      { startHour: 10, durationMinutes: 180, courtCount: 3 },
      [placedShort]
    );
    expect(biggerResult).toEqual({ status: "placed", courtNumbers: [1, 2, 3], gapPolicyFlag: false });
  });

  it("defaults to the low edge when no bigger successor is known", () => {
    const result = placeBooking({ startHour: 9, durationMinutes: 60, courtCount: 1 }, []);
    expect(result).toEqual({ status: "placed", courtNumbers: [1], gapPolicyFlag: false });
  });
});

describe("placeBooking — genuine capacity shortfall", () => {
  // 4 of 5 courts are tied up for the rest of the operating day.
  const longBlocker = booking({
    startHour: 9,
    durationMinutes: 15 * 60, // hours 9..23
    courtCount: 4,
    courtNumbers: [1, 2, 3, 4],
  });

  it("finds no later start once the shortfall holds for the rest of the day", () => {
    const start = findFeasibleStart({ startHour: 15, durationMinutes: 60, courtCount: 2 }, [longBlocker]);
    expect(start).toBeNull();
  });

  it("falls back to the gap policy, flagged, with fewer courts than requested", () => {
    const result = placeBooking({ startHour: 15, durationMinutes: 60, courtCount: 2 }, [longBlocker]);
    expect(result).toEqual({ status: "gap-policy", courtNumbers: [5], gapPolicyFlag: true });
  });

  it("still offers a later start when one genuinely exists", () => {
    // Only busy through hour 12 this time.
    const shortBlocker = booking({ startHour: 9, durationMinutes: 4 * 60, courtCount: 4, courtNumbers: [1, 2, 3, 4] });
    const start = findFeasibleStart({ startHour: 10, durationMinutes: 60, courtCount: 2 }, [shortBlocker]);
    expect(start).toBe(13);
  });
});

describe("repackDate — cancellation triggers reassignment", () => {
  it("slides an unlocked booking over to close the gap left by a cancellation", () => {
    const x = booking({ id: "x", startHour: 9, durationMinutes: 60, courtCount: 1, courtNumbers: [1], locked: true, priority: 1 });
    // `y` (courts 2-3) is cancelled and removed before repacking.
    const z = booking({ id: "z", startHour: 9, durationMinutes: 60, courtCount: 2, courtNumbers: [4, 5], locked: false, priority: 3 });

    const changes = repackDate([x, z]);

    expect(changes).toEqual([{ id: "z", courtNumbers: [2, 3], gapPolicyFlag: false }]);
  });
});

describe("repackDate — locked bookings resist reassignment", () => {
  it("never moves a locked booking, even when it would improve packing", () => {
    // Deliberately non-ideal historical state: L sits in the middle of the
    // pool (as if placed by a since-resolved gap policy event), stranding
    // free courts on both sides. A full repack could only "fix" this by
    // moving L — which must never happen once it's locked.
    const locked = booking({ id: "L", startHour: 9, durationMinutes: 60, courtCount: 2, courtNumbers: [3, 4], locked: true, priority: 1 });
    const movable = booking({ id: "M", startHour: 9, durationMinutes: 60, courtCount: 1, courtNumbers: [], locked: false, priority: 2 });

    const changes = repackDate([locked, movable]);

    expect(changes.some((c) => c.id === "L")).toBe(false);
  });
});

describe("computeHourAvailability", () => {
  it("reports free_count and a null separated_at when the free courts are contiguous", () => {
    const existing = [booking({ startHour: 9, durationMinutes: 60, courtCount: 2, courtNumbers: [1, 2] })];
    const availability = computeHourAvailability(existing, 9, 60);
    expect(availability).toEqual({ hour: 9, freeCount: 3, separatedAt: null });
  });

  it("reports separated_at when free courts are split across two runs", () => {
    // Free courts {1} and {5} only — two separate single-court runs.
    const existing = [booking({ startHour: 9, durationMinutes: 60, courtCount: 3, courtNumbers: [2, 3, 4] })];
    const availability = computeHourAvailability(existing, 9, 60);
    expect(availability.freeCount).toBe(2);
    expect(availability.separatedAt).toBe(1); // requesting 1 is clean; 2 forces separation
  });
});
