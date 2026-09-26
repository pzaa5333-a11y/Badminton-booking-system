import { prisma } from "@/lib/db";
import { verifyPassword } from "./auth";

export type PayWithPackageResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Step 2 of "Pay with package" (Page 2): verifies the member's password,
 * finds their soonest-expiring package with enough remaining hours, and —
 * in one transaction — decrements it and confirms the booking. No slip
 * needed for this path.
 */
export async function payBookingWithPackage(
  bookingId: string,
  username: string,
  password: string
): Promise<PayWithPackageResult> {
  const customer = await prisma.customer.findUnique({ where: { username } });
  if (!customer || !customer.passwordHash || !customer.passwordSalt) {
    return { ok: false, error: "Invalid username or password." };
  }
  if (!verifyPassword(password, customer.passwordHash, customer.passwordSalt)) {
    return { ok: false, error: "Invalid username or password." };
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status !== "held") {
    return { ok: false, error: `This booking is already ${booking.status}.` };
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
    return { ok: false, error: "This booking's hold has expired. Please book again." };
  }

  const courtNumbers = Array.isArray(booking.courtNumbers) ? (booking.courtNumbers as unknown[]) : [];
  const actualCourtCount = booking.court === "court6" ? 1 : courtNumbers.length;
  const hoursNeeded = actualCourtCount * (booking.durationMinutes / 60);

  const eligiblePackage = await prisma.memberPackage.findFirst({
    where: {
      customerId: customer.id,
      expiresAt: { gt: new Date() },
      revoked: false,
      hoursRemaining: { gte: hoursNeeded },
    },
    orderBy: { expiresAt: "asc" },
  });
  if (!eligiblePackage) {
    return { ok: false, error: "Not enough package hours available for this booking." };
  }

  await prisma.$transaction([
    prisma.memberPackage.update({
      where: { id: eligiblePackage.id },
      data: { hoursRemaining: { decrement: hoursNeeded } },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed", paymentMethod: "package", memberPackageId: eligiblePackage.id },
    }),
  ]);

  return { ok: true };
}
