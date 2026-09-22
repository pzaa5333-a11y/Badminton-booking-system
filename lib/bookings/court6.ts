import { prisma } from "@/lib/db";
import { bookingHourWindow } from "@/lib/types";
import { isActiveOccupancy } from "./shared";

const ACTIVE_STATUSES = ["held", "paid", "confirmed"] as const;

/** Court 6 is a plain single-court free/busy calendar — no allocation
 * logic, no count, entirely separate from the pool (§4.1). */
export async function getCourt6BusyHours(date: string, now: Date = new Date()): Promise<number[]> {
  const rows = await prisma.booking.findMany({
    where: { date, court: "court6", status: { in: [...ACTIVE_STATUSES] } },
  });
  const busy = new Set<number>();
  for (const row of rows) {
    if (!isActiveOccupancy(row, now)) continue;
    for (const hour of bookingHourWindow(row.startHour, row.durationMinutes)) {
      busy.add(hour);
    }
  }
  return [...busy].sort((a, b) => a - b);
}
