import { prisma } from "@/lib/db";

/**
 * Public, no-password lookup by username — step 1 of the "Pay with
 * package" flow on Page 2. Returns only display info (name, active
 * packages) so the customer can confirm "yes, that's me" before typing
 * their password. Never returns password fields.
 */
export async function getMemberSummaryByUsername(username: string) {
  const customer = await prisma.customer.findUnique({
    where: { username },
    include: {
      memberPackages: {
        where: { expiresAt: { gt: new Date() } },
        include: { packageType: true },
        orderBy: { expiresAt: "asc" },
      },
    },
  });
  if (!customer) return null;

  return {
    name: customer.name,
    packages: customer.memberPackages.map((p) => ({
      id: p.id,
      packageTypeName: p.packageType.name,
      hoursRemaining: p.hoursRemaining,
      expiresAt: p.expiresAt.toISOString(),
    })),
  };
}
