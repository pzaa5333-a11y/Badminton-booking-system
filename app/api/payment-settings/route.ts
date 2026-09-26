import { NextResponse } from "next/server";
import { getPaymentQrUrl } from "@/lib/admin/payment-settings";

/** Public, unauthenticated — Page 2 needs the current payment QR image
 * without a customer session. */
export async function GET() {
  const qrImageUrl = await getPaymentQrUrl();
  return NextResponse.json({ qr_image_url: qrImageUrl });
}
