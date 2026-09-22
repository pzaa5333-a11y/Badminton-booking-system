import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/bookings/pool";
import { dateSchema, durationSchema } from "@/lib/validation";
import type { DurationMinutes } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateResult = dateSchema.safeParse(searchParams.get("date"));
  const durationResult = durationSchema.safeParse(searchParams.get("duration"));

  if (!dateResult.success || !durationResult.success) {
    return NextResponse.json({ error: "Invalid date or duration" }, { status: 400 });
  }

  const date = dateResult.data;
  const durationMinutes = durationResult.data as DurationMinutes;

  const hours = await getAvailability(date, durationMinutes);

  return NextResponse.json({
    date,
    duration_minutes: durationMinutes,
    hours: hours.map((h) => ({
      hour: h.hour,
      free_count: h.freeCount,
      separated_at: h.separatedAt,
    })),
  });
}
