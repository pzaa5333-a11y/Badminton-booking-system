import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listPackageTypes, createPackageType } from "@/lib/admin/members";

export async function GET() {
  const packageTypes = await listPackageTypes();
  return NextResponse.json({ packageTypes });
}

const schema = z.object({
  name: z.string().min(1).max(100),
  hours: z.coerce.number().int().min(1),
  validity_days: z.coerce.number().int().min(1),
  price: z.coerce.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid package type" }, { status: 400 });

  const result = await createPackageType({
    name: parsed.data.name,
    hours: parsed.data.hours,
    validityDays: parsed.data.validity_days,
    price: parsed.data.price,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ id: result.data.id }, { status: 201 });
}
