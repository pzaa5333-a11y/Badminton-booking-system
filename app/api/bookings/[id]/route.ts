import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getBookingDetail } from "@/lib/bookings/detail";

function serialize(detail: NonNullable<Awaited<ReturnType<typeof getBookingDetail>>>) {
  return {
    booking_id: detail.bookingId,
    date: detail.date,
    start_hour: detail.startHour,
    duration_minutes: detail.durationMinutes,
    court: detail.court,
    court_count: detail.courtCount,
    status: detail.status,
    hold_expires_at: detail.holdExpiresAt ? detail.holdExpiresAt.toISOString() : null,
    amount_due: detail.amountDue,
    slip_image_url: detail.slipImageUrl,
    customer: detail.customer,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getBookingDetail(id);
  if (!detail) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json(serialize(detail));
}

const patchSchema = z.object({ email: z.string().email() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  await prisma.customer.update({ where: { id: booking.customerId }, data: { email: parsed.data.email } });

  const detail = await getBookingDetail(id);
  return NextResponse.json(serialize(detail!));
}
