import { NextRequest, NextResponse } from "next/server";
import { getMemberSummaryByUsername } from "@/lib/members/queries";

/** Public, no-password lookup — step 1 of "Pay with package". */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const summary = await getMemberSummaryByUsername(username);
  if (!summary) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  return NextResponse.json(summary);
}
