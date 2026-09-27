import { prisma, type DbClient } from "@/lib/db";

/** Plain lookup by phone, no create — used to detect a name conflict
 * before actually submitting a booking (§ admin walk-in name-conflict
 * warning) without side effects. */
export async function findCustomerByPhone(phone: string, client: DbClient = prisma) {
  return client.customer.findFirst({ where: { phone } });
}

/**
 * Finds or creates a Customer by phone. Production keys identity to the
 * LINE user ID instead (§5) once LIFF is wired up (Milestone 9); this phone-
 * based lookup is the pre-LIFF dev-mode stand-in so repeat bookings from the
 * same number don't create duplicate Customer rows.
 *
 * If a customer with that phone already exists under a *different* name,
 * the caller must say what to do via `nameConflict` — silently keeping the
 * old name (or silently overwriting it) both surprise someone later, so
 * this only updates the name when explicitly told to ("update"); the
 * default ("keep", or omitted) preserves the existing behavior other
 * callers (the customer-facing booking flow) rely on.
 */
export async function findOrCreateCustomer(
  input: { name: string; phone: string },
  client: DbClient = prisma,
  nameConflict: "keep" | "update" = "keep"
) {
  const existing = await client.customer.findFirst({ where: { phone: input.phone } });
  if (existing) {
    if (nameConflict === "update" && existing.name !== input.name) {
      return client.customer.update({ where: { id: existing.id }, data: { name: input.name } });
    }
    return existing;
  }
  return client.customer.create({ data: { name: input.name, phone: input.phone } });
}
