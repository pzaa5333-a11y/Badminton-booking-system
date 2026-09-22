import { NextRequest, NextResponse } from "next/server";
import { getCourt6BusyHours } from "@/lib/bookings/court6";
import { dateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateResult = dateSchema.safeParse(searchParams.get("date"));

  if (!dateResult.success) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const date = dateResult.data;
  const busyHours = await getCourt6BusyHours(date);

  return NextResponse.json({ date, busy_hours: busyHours });
}
