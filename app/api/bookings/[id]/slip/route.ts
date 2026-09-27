import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getSlipVerifier } from "@/lib/payments/slip-verifier";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (booking.status !== "held") {
    return NextResponse.json({ error: `This booking is already ${booking.status}.` }, { status: 409 });
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
    return NextResponse.json({ error: "This booking's hold has expired. Please book again." }, { status: 409 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("slip");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No slip image provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Please upload a JPG, PNG, WEBP, or HEIC image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "slips");
  await mkdir(uploadsDir, { recursive: true });
  const filename = `${id}-${Date.now()}.${ext}`;
  await writeFile(path.join(uploadsDir, filename), bytes);
  const slipImageUrl = `/uploads/slips/${filename}`;

  const result = await getSlipVerifier().verify({ imagePath: slipImageUrl, expectedAmount: booking.amountDue });

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      slipImageUrl,
      slipVerificationResult: JSON.stringify(result),
      status: result.verified ? "confirmed" : booking.status,
      paymentMethod: result.verified ? "transfer" : booking.paymentMethod,
      paymentCheckStatus: result.verified ? "pending" : booking.paymentCheckStatus,
    },
  });

  return NextResponse.json({
    verified: result.verified,
    status: updated.status,
    slip_image_url: slipImageUrl,
  });
}
