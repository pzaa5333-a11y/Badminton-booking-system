/**
 * Lock point (§4.7): a booking becomes locked at check-in, or automatically
 * at a fixed cutoff before its start time, whichever comes first. Kept
 * separate from engine.ts so the engine stays a pure function of already-
 * resolved `locked` booleans, with no wall-clock or timezone concerns of its
 * own — callers compute `isEffectivelyLocked` when building PoolBooking[]
 * from the database.
 */
export const LOCK_CUTOFF_MINUTES_BEFORE_START = 60;

export function lockCutoffTime(date: string, startHour: number): Date {
  const start = new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00Z`);
  return new Date(start.getTime() - LOCK_CUTOFF_MINUTES_BEFORE_START * 60 * 1000);
}

export function isEffectivelyLocked(
  booking: { date: string; startHour: number; locked: boolean },
  now: Date
): boolean {
  return booking.locked || now >= lockCutoffTime(booking.date, booking.startHour);
}
