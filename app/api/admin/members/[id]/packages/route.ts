import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assignPackage } from "@/lib/admin/members";

const schema = z.object({ package_type_id: z.string().min(1) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await assignPackage({ customerId: id, packageTypeId: parsed.data.package_type_id }, "admin");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ id: result.data.id }, { status: 201 });
}
