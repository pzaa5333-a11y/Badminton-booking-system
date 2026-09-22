import { prisma } from "@/lib/db";

/**
 * Customer-facing booking detail. Deliberately leaves `court_numbers` out
 * entirely (not just unrendered) — court numbers are an internal/admin
 * concept only (§3.5, §5). `courtCount` here is the number of courts
 * actually assigned, which can be fewer than what was requested if the
 * booking landed on the gap policy (§4.5.1).
 */
export async function getBookingDetail(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!booking) return null;

  const courtNumbers = Array.isArray(booking.courtNumbers)
    ? (booking.courtNumbers as unknown[]).filter((n): n is number => typeof n === "number")
    : [];
  const assignedCourtCount = booking.court === "court6" ? 1 : courtNumbers.length;

  return {
    bookingId: booking.id,
    date: booking.date,
    startHour: booking.startHour,
    durationMinutes: booking.durationMinutes,
    court: booking.court as "pool" | "court6",
    courtCount: assignedCourtCount,
    status: booking.status,
    holdExpiresAt: booking.holdExpiresAt,
    amountDue: booking.amountDue,
    slipImageUrl: booking.slipImageUrl,
    customer: {
      name: booking.customer.name,
      phone: booking.customer.phone,
      email: booking.customer.email,
    },
  };
}

export type BookingDetail = NonNullable<Awaited<ReturnType<typeof getBookingDetail>>>;
