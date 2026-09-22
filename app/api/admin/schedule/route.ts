import { NextRequest, NextResponse } from "next/server";
import { getAdminScheduleForDate } from "@/lib/admin/queries";
import { dateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = dateSchema.safeParse(searchParams.get("date"));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const bookings = await getAdminScheduleForDate(parsed.data);
  return NextResponse.json({ date: parsed.data, bookings });
}
