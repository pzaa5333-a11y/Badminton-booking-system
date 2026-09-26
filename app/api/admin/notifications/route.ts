import { NextRequest, NextResponse } from "next/server";
import { getRecentBookings } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(0);
  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: "Invalid since" }, { status: 400 });
  }
  const bookings = await getRecentBookings(sinceDate);
  return NextResponse.json({ bookings });
}
