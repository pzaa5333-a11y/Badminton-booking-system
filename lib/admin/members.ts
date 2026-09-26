import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/members/auth";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function listMembers() {
  const members = await prisma.customer.findMany({
    where: { username: { not: null } },
    include: {
      memberPackages: {
        where: { expiresAt: { gt: new Date() } },
        include: { packageType: true },
        orderBy: { expiresAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return members.map((m) => ({
    id: m.id,
    username: m.username!,
    name: m.name,
    phone: m.phone,
    activePackages: m.memberPackages.map((p) => ({
      id: p.id,
      packageTypeName: p.packageType.name,
      hoursRemaining: p.hoursRemaining,
      expiresAt: p.expiresAt.toISOString(),
    })),
  }));
}

export async function createMember(input: {
  username: string;
  password: string;
  name: string;
  phone: string;
}): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.customer.findUnique({ where: { username: input.username } });
  if (existing) return { ok: false, error: "That username is already taken." };

  const { hash, salt } = hashPassword(input.password);
  const customer = await prisma.customer.create({
    data: {
      username: input.username,
      passwordHash: hash,
      passwordSalt: salt,
      name: input.name,
      phone: input.phone,
    },
  });
  return { ok: true, data: { id: customer.id } };
}

export async function listPackageTypes() {
  return prisma.packageType.findMany({ where: { active: true }, orderBy: { hours: "asc" } });
}

export async function createPackageType(
  input: { name: string; hours: number; validityDays: number; price?: number }
): Promise<ActionResult<{ id: string }>> {
  const packageType = await prisma.packageType.create({
    data: {
      name: input.name,
      hours: input.hours,
      validityDays: input.validityDays,
      price: input.price ?? null,
    },
  });
  return { ok: true, data: { id: packageType.id } };
}

export async function assignPackage(
  input: { customerId: string; packageTypeId: string },
  updatedBy: string
): Promise<ActionResult<{ id: string }>> {
  const packageType = await prisma.packageType.findUnique({ where: { id: input.packageTypeId } });
  if (!packageType) return { ok: false, error: "Package type not found." };

  const purchasedAt = new Date();
  const expiresAt = new Date(purchasedAt.getTime() + packageType.validityDays * 24 * 60 * 60 * 1000);

  const memberPackage = await prisma.memberPackage.create({
    data: {
      customerId: input.customerId,
      packageTypeId: input.packageTypeId,
      purchasedAt,
      expiresAt,
      hoursRemaining: packageType.hours,
      updatedBy,
    },
  });
  return { ok: true, data: { id: memberPackage.id } };
}

export async function getMemberDetail(id: string) {
  const member = await prisma.customer.findUnique({
    where: { id },
    include: {
      memberPackages: {
        include: { packageType: true },
        orderBy: { purchasedAt: "desc" },
      },
    },
  });
  if (!member || !member.username) return null;

  const bookings = await prisma.booking.findMany({
    where: { memberPackageId: { in: member.memberPackages.map((p) => p.id) } },
    orderBy: { createdAt: "desc" },
  });

  return {
    id: member.id,
    username: member.username,
    name: member.name,
    phone: member.phone,
    packages: member.memberPackages.map((p) => ({
      id: p.id,
      packageTypeName: p.packageType.name,
      hoursRemaining: p.hoursRemaining,
      purchasedAt: p.purchasedAt.toISOString(),
      expiresAt: p.expiresAt.toISOString(),
    })),
    bookingsPaidFromPackages: bookings.map((b) => ({
      id: b.id,
      date: b.date,
      startHour: b.startHour,
      durationMinutes: b.durationMinutes,
      court: b.court,
    })),
  };
}
