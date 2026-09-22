import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { overrideCourtNumbers } from "@/lib/admin/actions";

const schema = z.object({ court_numbers: z.array(z.number().int()).min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid court numbers" }, { status: 400 });

  const result = await overrideCourtNumbers(id, parsed.data.court_numbers, "admin");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
