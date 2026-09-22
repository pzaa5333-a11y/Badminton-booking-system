import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { computeAmountDue } from "../lib/pricing";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const today = isoDate(0);

  const somchai = await prisma.customer.upsert({
    where: { lineUserId: "dev-somchai" },
    update: {},
    create: {
      lineUserId: "dev-somchai",
      name: "Somchai Jaidee",
      phone: "081-234-5678",
    },
  });

  const nok = await prisma.customer.upsert({
    where: { lineUserId: "dev-nok" },
    update: {},
    create: {
      lineUserId: "dev-nok",
      name: "Nok Suksawat",
      phone: "089-876-5432",
    },
  });

  await prisma.booking.deleteMany({ where: { date: today } });

  // Two adjacent courts, clean contiguous placement.
  await prisma.booking.create({
    data: {
      customerId: somchai.id,
      date: today,
      startHour: 10,
      durationMinutes: 60,
      court: "pool",
      courtCount: 2,
      courtNumbers: [1, 2],
      status: "confirmed",
      locked: false,
      amountDue: computeAmountDue({ date: today, startHour: 10, durationMinutes: 60, court: "pool", courtCount: 2 }),
    },
  });

  // Single court, 2 hours, paid but not yet confirmed.
  await prisma.booking.create({
    data: {
      customerId: nok.id,
      date: today,
      startHour: 10,
      durationMinutes: 120,
      court: "pool",
      courtCount: 1,
      courtNumbers: [3],
      status: "paid",
      locked: false,
      amountDue: computeAmountDue({ date: today, startHour: 10, durationMinutes: 120, court: "pool", courtCount: 1 }),
    },
  });

  // Gap-policy example: non-contiguous courts, flagged for admin review (§4.5.1).
  await prisma.booking.create({
    data: {
      customerId: somchai.id,
      date: today,
      startHour: 14,
      durationMinutes: 60,
      court: "pool",
      courtCount: 2,
      courtNumbers: [2, 4],
      status: "confirmed",
      locked: false,
      gapPolicyFlag: true,
      amountDue: computeAmountDue({ date: today, startHour: 14, durationMinutes: 60, court: "pool", courtCount: 2 }),
    },
  });

  // Locked booking (checked in) — must resist reassignment (§4.7).
  await prisma.booking.create({
    data: {
      customerId: nok.id,
      date: today,
      startHour: 9,
      durationMinutes: 60,
      court: "pool",
      courtCount: 1,
      courtNumbers: [5],
      status: "confirmed",
      locked: true,
      amountDue: computeAmountDue({ date: today, startHour: 9, durationMinutes: 60, court: "pool", courtCount: 1 }),
    },
  });

  // Court 6 — fully separate calendar, own rate.
  await prisma.booking.create({
    data: {
      customerId: somchai.id,
      date: today,
      startHour: 11,
      durationMinutes: 60,
      court: "court6",
      courtCount: 1,
      courtNumbers: [6],
      status: "confirmed",
      locked: false,
      amountDue: computeAmountDue({ date: today, startHour: 11, durationMinutes: 60, court: "court6", courtCount: 1 }),
    },
  });

  // A held (unpaid) booking still inside its 15-minute hold window.
  await prisma.booking.create({
    data: {
      customerId: nok.id,
      date: today,
      startHour: 18,
      durationMinutes: 60,
      court: "pool",
      courtCount: 1,
      courtNumbers: [1],
      status: "held",
      locked: false,
      holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      amountDue: computeAmountDue({ date: today, startHour: 18, durationMinutes: 60, court: "pool", courtCount: 1 }),
    },
  });

  console.log(`Seeded bookings for ${today}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
