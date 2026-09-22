import { prisma, type DbClient } from "@/lib/db";
import { isEffectivelyLocked } from "@/lib/allocation/lock";
import { computeHourAvailability } from "@/lib/allocation/engine";
import type { HourAvailability, PoolBooking } from "@/lib/allocation/types";
import { CLOSING_HOUR, OPENING_HOUR, type DurationMinutes } from "@/lib/types";
import { isActiveOccupancy } from "./shared";

const ACTIVE_STATUSES = ["held", "paid", "confirmed"] as const;

function toCourtNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === "number");
}

type PoolBookingRow = {
  id: string;
  date: string;
  startHour: number;
  durationMinutes: number;
  courtCount: number;
  courtNumbers: unknown;
  status: string;
  locked: boolean;
  gapPolicyFlag: boolean;
  holdExpiresAt: Date | null;
  createdAt: Date;
};

export function toPoolBooking(row: PoolBookingRow, now: Date): PoolBooking {
  return {
    id: row.id,
    startHour: row.startHour,
    durationMinutes: row.durationMinutes,
    courtCount: row.courtCount,
    courtNumbers: toCourtNumbers(row.courtNumbers),
    locked: isEffectivelyLocked({ date: row.date, startHour: row.startHour, locked: row.locked }, now),
    gapPolicyFlag: row.gapPolicyFlag,
    priority: row.createdAt.getTime(),
  };
}

/** All pool (courts 1–5) bookings for a date that still occupy courts, as
 * PoolBooking[] ready for the allocation engine. `excludeId` leaves out one
 * booking (e.g. the one currently being re-validated). */
export async function getPoolBookingsForDate(
  date: string,
  now: Date,
  excludeId?: string,
  client: DbClient = prisma
): Promise<PoolBooking[]> {
  const rows = await client.booking.findMany({
    where: {
      date,
      court: "pool",
      status: { in: [...ACTIVE_STATUSES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return rows.filter((r) => isActiveOccupancy(r, now)).map((r) => toPoolBooking(r, now));
}

/** Every valid start hour for a duration within the 09:00–00:00 operating window. */
export function startHoursForDuration(durationMinutes: number): number[] {
  const hours = durationMinutes / 60;
  const hoursList: number[] = [];
  for (let start = OPENING_HOUR; start + hours <= CLOSING_HOUR; start++) {
    hoursList.push(start);
  }
  return hoursList;
}

export async function getAvailability(
  date: string,
  durationMinutes: DurationMinutes,
  now: Date = new Date()
): Promise<HourAvailability[]> {
  const bookings = await getPoolBookingsForDate(date, now);
  return startHoursForDuration(durationMinutes).map((hour) =>
    computeHourAvailability(bookings, hour, durationMinutes)
  );
}
