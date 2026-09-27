import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updatePackageType } from "@/lib/admin/members";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  hours: z.coerce.number().int().min(1).optional(),
  validity_days: z.coerce.number().int().min(1).optional(),
  price: z.coerce.number().int().min(0).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid package type update" }, { status: 400 });

  const result = await updatePackageType(id, {
    name: parsed.data.name,
    hours: parsed.data.hours,
    validityDays: parsed.data.validity_days,
    price: parsed.data.price,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
