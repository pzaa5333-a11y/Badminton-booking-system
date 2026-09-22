import { prisma } from "@/lib/db";
import { repackDate } from "@/lib/allocation/engine";
import { getPoolBookingsForDate } from "./pool";

/**
 * Releases holds past their 15-minute window and repacks any pool dates
 * that freed up as a result. Availability reads already exclude expired-
 * but-not-yet-swept holds defensively (see lib/bookings/shared.ts), so this
 * sweep is about DB hygiene and admin visibility, not read-path correctness
 * — safe to run on a schedule (e.g. a Vercel Cron hitting the route below
 * once a minute) rather than needing to be exactly on time.
 */
export async function sweepExpiredHolds(now: Date = new Date()): Promise<{ releasedCount: number; datesRepacked: string[] }> {
  const expired = await prisma.booking.findMany({
    where: { status: "held", holdExpiresAt: { lte: now } },
    select: { id: true, date: true, court: true },
  });
  if (expired.length === 0) return { releasedCount: 0, datesRepacked: [] };

  await prisma.booking.updateMany({
    where: { id: { in: expired.map((b) => b.id) } },
    data: { status: "released" },
  });

  const affectedPoolDates = [...new Set(expired.filter((b) => b.court === "pool").map((b) => b.date))];
  for (const date of affectedPoolDates) {
    const bookings = await getPoolBookingsForDate(date, now);
    const changes = repackDate(bookings);
    for (const change of changes) {
      await prisma.booking.update({
        where: { id: change.id },
        data: { courtNumbers: change.courtNumbers, gapPolicyFlag: change.gapPolicyFlag },
      });
    }
  }

  return { releasedCount: expired.length, datesRepacked: affectedPoolDates };
}
