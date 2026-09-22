/**
 * A pool booking (courts 1–5 only — Court 6 never enters this engine).
 * `courtNumbers` may be empty for a booking that hasn't been placed yet.
 */
export interface PoolBooking {
  id: string;
  startHour: number;
  durationMinutes: number;
  courtCount: number;
  courtNumbers: number[];
  locked: boolean;
  gapPolicyFlag: boolean;
  /** Earlier = higher priority ("whoever booked first", §4.5.1). Use createdAt.getTime(). */
  priority: number;
}

export interface NewBookingWindow {
  startHour: number;
  durationMinutes: number;
  courtCount: number;
}

export type PlaceResult =
  | { status: "placed"; courtNumbers: number[]; gapPolicyFlag: false }
  | { status: "gap-policy"; courtNumbers: number[]; gapPolicyFlag: true }
  | { status: "infeasible" };

export interface HourAvailability {
  hour: number;
  freeCount: number;
  separatedAt: number | null;
}
