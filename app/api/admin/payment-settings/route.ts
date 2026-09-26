import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPaymentQrUrl, setPaymentQrUrl } from "@/lib/admin/payment-settings";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET() {
  const qrImageUrl = await getPaymentQrUrl();
  return NextResponse.json({ qr_image_url: qrImageUrl });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("qr_image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Please upload a JPG, PNG, or WEBP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "payment");
  await mkdir(uploadsDir, { recursive: true });
  const filename = `qr-${Date.now()}.${ext}`;
  await writeFile(path.join(uploadsDir, filename), bytes);
  const qrImageUrl = `/uploads/payment/${filename}`;

  await setPaymentQrUrl(qrImageUrl, "admin");
  return NextResponse.json({ ok: true, qr_image_url: qrImageUrl });
}
