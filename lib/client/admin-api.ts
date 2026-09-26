import type { CourtSelection, DurationMinutes } from "@/lib/types";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  promptpay: "PromptPay",
  package: "Package",
  cash: "Cash",
};

export function paymentMethodLabel(method: string | null): string | null {
  if (!method) return null;
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export interface AdminScheduleBooking {
  id: string;
  court: CourtSelection;
  courtNumbers: number[];
  startHour: number;
  durationMinutes: number;
  status: string;
  locked: boolean;
  gapPolicyFlag: boolean;
  customerName: string;
  customerPhone: string;
  amountDue: number;
  paymentMethod: string | null;
}

export async function fetchAdminSchedule(date: string): Promise<AdminScheduleBooking[]> {
  const res = await fetch(`/api/admin/schedule?date=${date}`);
  if (!res.ok) throw new Error("Failed to load schedule");
  const data = await res.json();
  return data.bookings;
}

export interface AdminHistoryBooking {
  id: string;
  date: string;
  startHour: number;
  durationMinutes: number;
  court: CourtSelection;
  courtCount: number;
  courtNumbers: number[];
  status: string;
  gapPolicyFlag: boolean;
  amountDue: number;
  slipImageUrl: string | null;
  paymentMethod: string | null;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  updatedBy: string | null;
}

export async function fetchAdminHistory(date?: string): Promise<AdminHistoryBooking[]> {
  const url = date ? `/api/admin/bookings?date=${date}` : "/api/admin/bookings";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load history");
  const data = await res.json();
  return data.bookings;
}

export interface WalkInPayload {
  date: string;
  start_hour: number;
  duration_minutes: DurationMinutes;
  court_count: number;
  court: CourtSelection;
  customer_name: string;
  customer_phone: string;
}

export async function createWalkIn(payload: WalkInPayload): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/admin/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.error ?? "Couldn't create walk-in booking." };
  return { ok: true };
}

async function postAction(path: string, body?: unknown): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.error ?? "Action failed." };
  return { ok: true };
}

export function cancelBooking(id: string) {
  return postAction(`/api/admin/bookings/${id}/cancel`);
}

export function overrideCourtNumbers(id: string, courtNumbers: number[]) {
  return postAction(`/api/admin/bookings/${id}/override-courts`, { court_numbers: courtNumbers });
}

export function markPaid(id: string) {
  return postAction(`/api/admin/bookings/${id}/mark-paid`);
}

export function setBookingLocked(id: string, locked: boolean) {
  return postAction(`/api/admin/bookings/${id}/lock`, { locked });
}

// --- Members / packages ---------------------------------------------------

export interface AdminMember {
  id: string;
  username: string;
  name: string;
  phone: string;
  activePackages: { id: string; packageTypeName: string; hoursRemaining: number; expiresAt: string }[];
}

export async function fetchMembers(): Promise<AdminMember[]> {
  const res = await fetch("/api/admin/members");
  if (!res.ok) throw new Error("Failed to load members");
  const data = await res.json();
  return data.members;
}

export interface AdminMemberDetail extends Omit<AdminMember, "activePackages"> {
  packages: { id: string; packageTypeName: string; hoursRemaining: number; purchasedAt: string; expiresAt: string }[];
  bookingsPaidFromPackages: { id: string; date: string; startHour: number; durationMinutes: number; court: string }[];
}

export async function fetchMemberDetail(id: string): Promise<AdminMemberDetail> {
  const res = await fetch(`/api/admin/members/${id}`);
  if (!res.ok) throw new Error("Failed to load member");
  return res.json();
}

export async function createMember(payload: {
  username: string;
  password: string;
  name: string;
  phone: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/admin/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.error ?? "Couldn't create member." };
  return { ok: true };
}

export interface AdminPackageType {
  id: string;
  name: string;
  hours: number;
  validityDays: number;
  price: number | null;
}

export async function fetchPackageTypes(): Promise<AdminPackageType[]> {
  const res = await fetch("/api/admin/package-types");
  if (!res.ok) throw new Error("Failed to load package types");
  const data = await res.json();
  return data.packageTypes.map((p: { id: string; name: string; hours: number; validityDays: number; price: number | null }) => ({
    id: p.id,
    name: p.name,
    hours: p.hours,
    validityDays: p.validityDays,
    price: p.price,
  }));
}

export async function createPackageType(payload: {
  name: string;
  hours: number;
  validity_days: number;
  price?: number;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/admin/package-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.error ?? "Couldn't create package type." };
  return { ok: true };
}

export async function assignPackageToMember(memberId: string, packageTypeId: string) {
  return postAction(`/api/admin/members/${memberId}/packages`, { package_type_id: packageTypeId });
}
