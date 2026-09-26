import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listMembers, createMember } from "@/lib/admin/members";
import { nameSchema, phoneSchema } from "@/lib/validation";

export async function GET() {
  const members = await listMembers();
  return NextResponse.json({ members });
}

const schema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(4),
  name: nameSchema,
  phone: phoneSchema,
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid member details" }, { status: 400 });

  const result = await createMember(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ id: result.data.id }, { status: 201 });
}
