import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setPackageHours } from "@/lib/admin/members";

const schema = z.object({ hours_remaining: z.coerce.number().int().min(0) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; packageId: string }> }) {
  const { packageId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid hours" }, { status: 400 });

  const result = await setPackageHours(packageId, parsed.data.hours_remaining, "admin");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
