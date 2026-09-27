import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/members/auth";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function listMembers() {
  const members = await prisma.customer.findMany({
    where: { username: { not: null } },
    include: {
      memberPackages: {
        where: { expiresAt: { gt: new Date() }, revoked: false },
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

/** Includes deactivated types too — for the admin management list, where
 * a deactivated type still needs to be visible (and reactivatable). The
 * assignment dropdown keeps using `listPackageTypes()` above, which stays
 * active-only. */
export async function listPackageTypesAll() {
  return prisma.packageType.findMany({ orderBy: { hours: "asc" } });
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

export async function updatePackageType(
  id: string,
  input: { name?: string; hours?: number; validityDays?: number; price?: number }
): Promise<ActionResult> {
  const packageType = await prisma.packageType.findUnique({ where: { id } });
  if (!packageType) return { ok: false, error: "Package type not found." };

  await prisma.packageType.update({
    where: { id },
    data: {
      name: input.name,
      hours: input.hours,
      validityDays: input.validityDays,
      price: input.price,
    },
  });
  return { ok: true, data: undefined };
}

/** Soft "delete" (§ admin ask, confirmed: deactivate rather than a hard
 * delete): existing member packages purchased under this type keep
 * working exactly as before — only new assignments are affected, since
 * `listPackageTypes()` (the assignment dropdown's source) filters to
 * `active: true`. */
export async function setPackageTypeActive(id: string, active: boolean): Promise<ActionResult> {
  const packageType = await prisma.packageType.findUnique({ where: { id } });
  if (!packageType) return { ok: false, error: "Package type not found." };

  await prisma.packageType.update({ where: { id }, data: { active } });
  return { ok: true, data: undefined };
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
      revoked: p.revoked,
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

/**
 * Soft "unassign" a package (§ admin ask): the record stays — existing
 * bookings' memberPackageId references stay valid, and it still shows in
 * the member's history — but it's marked revoked and zeroed out so it can
 * no longer be looked up (lib/members/queries.ts) or spent from
 * (lib/members/checkout.ts). The UI requires a two-click confirm before
 * calling this, since it's easy to pick the wrong package by mistake.
 */
export async function revokePackage(memberPackageId: string, updatedBy: string): Promise<ActionResult> {
  const pkg = await prisma.memberPackage.findUnique({ where: { id: memberPackageId } });
  if (!pkg) return { ok: false, error: "Package not found." };
  if (pkg.revoked) return { ok: false, error: "Already revoked." };

  await prisma.memberPackage.update({
    where: { id: memberPackageId },
    data: { revoked: true, revokedAt: new Date(), hoursRemaining: 0, updatedBy },
  });
  return { ok: true, data: undefined };
}

/**
 * Manually set an active package's remaining hours — for on-site usage
 * that didn't go through a booking, or a refund/correction. A direct set
 * rather than a delta: simpler to reason about from the admin UI, and
 * matches how the rest of the app favors explicit values over deltas.
 */
export async function setPackageHours(
  memberPackageId: string,
  hoursRemaining: number,
  updatedBy: string
): Promise<ActionResult> {
  if (!Number.isInteger(hoursRemaining) || hoursRemaining < 0) {
    return { ok: false, error: "Hours must be a non-negative whole number." };
  }
  const pkg = await prisma.memberPackage.findUnique({ where: { id: memberPackageId } });
  if (!pkg) return { ok: false, error: "Package not found." };
  if (pkg.revoked) return { ok: false, error: "Can't adjust a revoked package." };

  await prisma.memberPackage.update({
    where: { id: memberPackageId },
    data: { hoursRemaining, updatedBy },
  });
  return { ok: true, data: undefined };
}
