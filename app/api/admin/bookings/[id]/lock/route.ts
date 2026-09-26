import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setBookingLocked } from "@/lib/admin/actions";

const schema = z.object({ locked: z.boolean() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await setBookingLocked(id, parsed.data.locked, "admin");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
