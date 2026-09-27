import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reassignBooking } from "@/lib/admin/actions";
import { dateSchema, durationSchema } from "@/lib/validation";
import { CLOSING_HOUR, OPENING_HOUR } from "@/lib/types";

const schema = z.object({
  date: dateSchema,
  start_hour: z.coerce.number().int().min(OPENING_HOUR).max(CLOSING_HOUR - 1),
  duration_minutes: durationSchema,
  court_numbers: z.array(z.number().int()),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid reassignment request" }, { status: 400 });

  const result = await reassignBooking(
    id,
    {
      date: parsed.data.date,
      startHour: parsed.data.start_hour,
      durationMinutes: parsed.data.duration_minutes,
      courtNumbers: parsed.data.court_numbers,
    },
    "admin"
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
