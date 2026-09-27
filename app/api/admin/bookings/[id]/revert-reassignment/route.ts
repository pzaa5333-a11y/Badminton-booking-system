import { NextResponse } from "next/server";
import { revertReassignment } from "@/lib/admin/actions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await revertReassignment(id, "admin");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
