import { NextResponse } from "next/server";
import { revokePackage } from "@/lib/admin/members";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; packageId: string }> }) {
  const { packageId } = await params;
  const result = await revokePackage(packageId, "admin");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
