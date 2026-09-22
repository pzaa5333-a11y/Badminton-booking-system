import type { CourtSelection, DurationMinutes } from "@/lib/types";

/**
 * Rate table confirmed for Sevendays Badminton (THB/hour). Court 6 is
 * consistently 20 THB/hour above courts 1–5 in the same bracket, but the
 * table is written out explicitly rather than derived, since that's a
 * business decision, not a formula the code should assume will always hold.
 */
const RATE_TABLE = {
  weekday: {
    // 09:00–16:00
    day: { pool: 180, court6: 200 },
    // 16:00–24:00
    evening: { pool: 200, court6: 220 },
  },
  weekend: {
    // 09:00–24:00, single bracket
    allDay: { pool: 200, court6: 220 },
  },
} as const;

const WEEKDAY_EVENING_START_HOUR = 16;

function isWeekend(date: string): boolean {
  // Parse as UTC midnight so the calendar date isn't shifted by the
  // server's local timezone — `date` is a plain YYYY-MM-DD, not an instant.
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

/** THB/hour for one specific clock hour, for the given court type. */
export function hourlyRate(date: string, hour: number, court: CourtSelection): number {
  const key = court === "court6" ? "court6" : "pool";
  if (isWeekend(date)) {
    return RATE_TABLE.weekend.allDay[key];
  }
  return hour < WEEKDAY_EVENING_START_HOUR
    ? RATE_TABLE.weekday.day[key]
    : RATE_TABLE.weekday.evening[key];
}

/**
 * Total amount due for a booking. Sums per-hour rates rather than
 * `rate * duration`, since a session can span the weekday day/evening
 * bracket boundary (e.g. start 15:00, 3h -> hours 15, 16, 17 at two rates).
 * `courtCount` multiplies every hour's rate (always 1 for court6).
 */
export function computeAmountDue(params: {
  date: string;
  startHour: number;
  durationMinutes: DurationMinutes;
  court: CourtSelection;
  courtCount: number;
}): number {
  const { date, startHour, durationMinutes, court, courtCount } = params;
  const hours = durationMinutes / 60;
  let total = 0;
  for (let i = 0; i < hours; i++) {
    total += hourlyRate(date, startHour + i, court) * courtCount;
  }
  return total;
}
