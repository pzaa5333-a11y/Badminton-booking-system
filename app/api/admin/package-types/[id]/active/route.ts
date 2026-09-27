import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setPackageTypeActive } from "@/lib/admin/members";

const schema = z.object({ active: z.boolean() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await setPackageTypeActive(id, parsed.data.active);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
