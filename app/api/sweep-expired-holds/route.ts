import { NextResponse } from "next/server";
import { sweepExpiredHolds } from "@/lib/bookings/sweep";

/** Intended to be hit on a schedule in production (e.g. a Vercel Cron job
 * every minute) rather than called from the app itself. */
export async function POST() {
  const result = await sweepExpiredHolds();
  return NextResponse.json(result);
}
