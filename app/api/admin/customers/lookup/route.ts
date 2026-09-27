import { NextRequest, NextResponse } from "next/server";
import { findCustomerByPhone } from "@/lib/bookings/customers";

/** Used by the walk-in form to detect a name conflict *before* submitting
 * — a plain lookup, no side effects. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  const customer = await findCustomerByPhone(phone);
  return NextResponse.json({ found: Boolean(customer), name: customer?.name ?? null });
}
