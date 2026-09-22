// Shared domain types. SQLite has no native enum support, so these are
// plain string/number unions enforced at the app layer (Prisma stores the
// backing columns as String/Json — see prisma/schema.prisma).

export type BookingStatus =
  | "held"
  | "paid"
  | "confirmed"
  | "released"
  | "cancelled";

export type CourtSelection = "pool" | "court6";

export type DurationMinutes = 60 | 120 | 180 | 240;

export const DURATION_OPTIONS: DurationMinutes[] = [60, 120, 180, 240];

/** Operating window is 09:00–00:00. Hours are the integer clock hour a
 * session can *start* at; the window itself runs through hour 24 (midnight). */
export const OPENING_HOUR = 9;
export const CLOSING_HOUR = 24; // exclusive upper bound (00:00 next day)

export const POOL_COURT_NUMBERS = [1, 2, 3, 4, 5] as const;
export const POOL_SIZE = POOL_COURT_NUMBERS.length;
export const COURT6 = 6 as const;

/** §5: a booking's hold on its courts expires 15 minutes after acceptance if unpaid. */
export const HOLD_DURATION_MINUTES = 15;

export function hoursForDuration(durationMinutes: DurationMinutes): number {
  return durationMinutes / 60;
}

/** Every hour a booking occupies, e.g. start=13, duration=120 -> [13, 14]. */
export function bookingHourWindow(startHour: number, durationMinutes: number): number[] {
  const hours = durationMinutes / 60;
  return Array.from({ length: hours }, (_, i) => startHour + i);
}
