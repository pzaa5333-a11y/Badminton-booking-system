import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingHistory } from "@/lib/admin/queries";
import { createBookingRequest } from "@/lib/bookings/requests";
import { dateSchema, durationSchema, nameSchema, phoneSchema } from "@/lib/validation";
import { CLOSING_HOUR, OPENING_HOUR, POOL_SIZE, type DurationMinutes } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (date) {
    const parsed = dateSchema.safeParse(date);
    if (!parsed.success) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const bookings = await getBookingHistory({ date: date ?? undefined });
  return NextResponse.json({ bookings });
}

const walkInSchema = z.object({
  date: dateSchema,
  start_hour: z.coerce.number().int().min(OPENING_HOUR).max(CLOSING_HOUR - 1),
  duration_minutes: durationSchema,
  court_count: z.coerce.number().int().min(1).max(POOL_SIZE),
  court: z.enum(["pool", "court6"]),
  customer_name: nameSchema,
  customer_phone: phoneSchema,
});

/** Walk-in booking (§6.3): skips Pages 1–2, still runs through the
 * allocation engine, created paid/confirmed immediately. */
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = walkInSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid walk-in request" }, { status: 400 });
  }

  const body = parsed.data;
  const result = await createBookingRequest({
    date: body.date,
    startHour: body.start_hour,
    durationMinutes: body.duration_minutes as DurationMinutes,
    courtCount: body.court === "court6" ? 1 : body.court_count,
    court: body.court,
    customerName: body.customer_name,
    customerPhone: body.customer_phone,
    immediate: true,
    updatedBy: "admin",
  });

  if (result.kind === "conflict") {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }
  return NextResponse.json(
    { booking_id: result.bookingId, amount_due: result.amountDue, gap_policy_flag: result.gapPolicyFlag },
    { status: 201 }
  );
}
