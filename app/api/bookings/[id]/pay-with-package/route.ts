import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { payBookingWithPackage } from "@/lib/members/checkout";

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await payBookingWithPackage(id, parsed.data.username, parsed.data.password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
