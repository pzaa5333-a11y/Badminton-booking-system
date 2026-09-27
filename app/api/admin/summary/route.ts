import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRevenueBreakdown, getPeakAnalysis, getTopCustomers } from "@/lib/admin/summary";
import { dateSchema } from "@/lib/validation";

const schema = z.object({ from: dateSchema, to: dateSchema });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({ from: searchParams.get("from"), to: searchParams.get("to") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid range" }, { status: 400 });

  const { from, to } = parsed.data;
  const [revenue, peak, topCustomers] = await Promise.all([
    getRevenueBreakdown(from, to),
    getPeakAnalysis(from, to),
    getTopCustomers(from, to),
  ]);

  return NextResponse.json({ revenue, peak, top_customers: topCustomers });
}
