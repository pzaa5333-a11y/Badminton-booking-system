import { prisma } from "@/lib/db";

const SINGLETON_ID = "singleton";

/** The customer-facing payment QR (§ payment page redesign) — a single
 * admin-uploaded image, no PromptPay integration behind it. */
export async function getPaymentQrUrl(): Promise<string | null> {
  const settings = await prisma.paymentSettings.findUnique({ where: { id: SINGLETON_ID } });
  return settings?.qrImageUrl ?? null;
}

export async function setPaymentQrUrl(qrImageUrl: string, updatedBy: string): Promise<void> {
  await prisma.paymentSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, qrImageUrl, updatedBy },
    update: { qrImageUrl, updatedBy },
  });
}
