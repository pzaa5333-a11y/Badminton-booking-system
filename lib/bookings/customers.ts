import { prisma, type DbClient } from "@/lib/db";

/**
 * Finds or creates a Customer by phone. Production keys identity to the
 * LINE user ID instead (§5) once LIFF is wired up (Milestone 9); this phone-
 * based lookup is the pre-LIFF dev-mode stand-in so repeat bookings from the
 * same number don't create duplicate Customer rows.
 */
export async function findOrCreateCustomer(
  input: { name: string; phone: string },
  client: DbClient = prisma
) {
  const existing = await client.customer.findFirst({ where: { phone: input.phone } });
  if (existing) return existing;
  return client.customer.create({ data: { name: input.name, phone: input.phone } });
}
