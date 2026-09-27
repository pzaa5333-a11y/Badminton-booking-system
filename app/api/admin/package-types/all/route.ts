import { NextResponse } from "next/server";
import { listPackageTypesAll } from "@/lib/admin/members";

export async function GET() {
  const packageTypes = await listPackageTypesAll();
  return NextResponse.json({ packageTypes });
}
