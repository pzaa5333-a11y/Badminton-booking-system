import type { CourtSelection, DurationMinutes } from "@/lib/types";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: "Bank Transfer",
  promptpay: "Bank Transfer", // legacy value from before the QR redesign
  package: "Package",
  cash: "Cash",
};

export function paymentMethodLabel(method: string | null): string | null {
  if (!method) return null;
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/** Fields every admin booking listing shares — the shape
 * `BookingActionsPanel` (lib/client/admin-api.ts's callers in
 * components/admin/) is built against, so the same popup works whether the
 * booking came from the Schedule grid or the Bookings tab. */
export interface AdminBookingRow {
  id: string;
  court: CourtSelection;
  courtNumbers: number[];
  startHour: number;
  durationMinutes: number;
  status: string;
  locked: boolean;
  gapPolicyFlag: boolean;
  needsAttention: boolean;
  cancelledAt: string | null;
  customerName: string;
  customerPhone: string;
  amountDue: number;
  paymentMethod: string | null;
  paymentCheckStatus: string | null;
  slipImageUrl: string | null;
  createdAt: string;
  reassigned: boolean;
}

export type AdminScheduleBooking = AdminBookingRow;

export async function fetchAdminSchedule(date: string): Promise<AdminScheduleBooking[]> {
  const res = await fetch(`/api/admin/schedule?date=${date}`);
  if (!res.ok) throw new Error("Failed to load schedule");
  const data = await res.json();
  return data.bookings;
}

export interface AdminHistoryBooking extends AdminBookingRow {
  date: string;
  courtCount: number;
  updatedBy: string | null;
}

export async function fetchAdminHistory(date?: string): Promise<AdminHistoryBooking[]> {
  const url = date ? `/api/admin/bookings?date=${date}` : "/api/admin/bookings";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load history");
  const data = await res.json();
  return data.bookings;
}

export async function fetchAdminBookingsForMonth(month: string): Promise<AdminHistoryBooking[]> {
  const res = await fetch(`/api/admin/bookings?month=${month}`);
  if (!res.ok) throw new Error("Failed to load bookings");
  const data = await res.json();
  return data.bookings;
}

export interface RecentBooking {
  id: string;
  date: string;
  startHour: number;
  customerName: string;
  createdAt: string;
}

export async function fetchRecentBookings(since: string): Promise<RecentBooking[]> {
  const res = await fetch(`/api/admin/notifications?since=${encodeURIComponent(since)}`);
  if (!res.ok) throw new Error("Failed to load notifications");
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
  name_conflict?: "keep" | "update";
}

/** Pre-check before submitting a walk-in (§ admin name-conflict warning) —
 * lets the form ask the admin to confirm before silently keeping or
 * overwriting an existing customer's name. */
export async function lookupCustomerByPhone(phone: string): Promise<{ found: boolean; name: string | null }> {
  const res = await fetch(`/api/admin/customers/lookup?phone=${encodeURIComponent(phone)}`);
  if (!res.ok) throw new Error("Failed to look up customer");
  return res.json();
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

export function markPaid(id: string) {
  return postAction(`/api/admin/bookings/${id}/mark-paid`);
}

export function setBookingLocked(id: string, locked: boolean) {
  return postAction(`/api/admin/bookings/${id}/lock`, { locked });
}

export function restoreBooking(id: string) {
  return postAction(`/api/admin/bookings/${id}/restore`);
}

export interface ReassignPayload {
  date: string;
  start_hour: number;
  duration_minutes: DurationMinutes;
  court_numbers: number[];
}

export function reassignBooking(id: string, payload: ReassignPayload) {
  return postAction(`/api/admin/bookings/${id}/reassign`, payload);
}

export function revertReassignment(id: string) {
  return postAction(`/api/admin/bookings/${id}/revert-reassignment`);
}

export function dismissAttention(id: string) {
  return postAction(`/api/admin/bookings/${id}/dismiss-attention`);
}

export function checkPayment(id: string) {
  return postAction(`/api/admin/bookings/${id}/check-payment`);
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
  packages: {
    id: string;
    packageTypeName: string;
    hoursRemaining: number;
    purchasedAt: string;
    expiresAt: string;
    revoked: boolean;
  }[];
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
  active: boolean;
}

type RawPackageType = { id: string; name: string; hours: number; validityDays: number; price: number | null; active: boolean };

function toAdminPackageType(p: RawPackageType): AdminPackageType {
  return { id: p.id, name: p.name, hours: p.hours, validityDays: p.validityDays, price: p.price, active: p.active };
}

export async function fetchPackageTypes(): Promise<AdminPackageType[]> {
  const res = await fetch("/api/admin/package-types");
  if (!res.ok) throw new Error("Failed to load package types");
  const data = await res.json();
  return data.packageTypes.map(toAdminPackageType);
}

/** Includes deactivated types — for the admin package-management list
 * (§ package type management). The assignment dropdown elsewhere keeps
 * using `fetchPackageTypes()` above, which stays active-only. */
export async function fetchAllPackageTypes(): Promise<AdminPackageType[]> {
  const res = await fetch("/api/admin/package-types/all");
  if (!res.ok) throw new Error("Failed to load package types");
  const data = await res.json();
  return data.packageTypes.map(toAdminPackageType);
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

export async function updatePackageType(
  id: string,
  payload: { name?: string; hours?: number; validity_days?: number; price?: number }
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/admin/package-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.error ?? "Couldn't update package type." };
  return { ok: true };
}

export function setPackageTypeActive(id: string, active: boolean) {
  return postAction(`/api/admin/package-types/${id}/active`, { active });
}

export async function assignPackageToMember(memberId: string, packageTypeId: string) {
  return postAction(`/api/admin/members/${memberId}/packages`, { package_type_id: packageTypeId });
}

export function revokeMemberPackage(memberId: string, packageId: string) {
  return postAction(`/api/admin/members/${memberId}/packages/${packageId}/revoke`);
}

export function setMemberPackageHours(memberId: string, packageId: string, hoursRemaining: number) {
  return postAction(`/api/admin/members/${memberId}/packages/${packageId}/hours`, { hours_remaining: hoursRemaining });
}

// --- Payment settings (QR image) -------------------------------------------

export async function fetchAdminPaymentQrUrl(): Promise<string | null> {
  const res = await fetch("/api/admin/payment-settings");
  if (!res.ok) throw new Error("Failed to load payment settings");
  const data = await res.json();
  return data.qr_image_url ?? null;
}

export async function uploadPaymentQr(file: File): Promise<{ ok: boolean; message?: string; qrImageUrl?: string }> {
  const formData = new FormData();
  formData.append("qr_image", file);
  const res = await fetch("/api/admin/payment-settings", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.error ?? "Couldn't upload image." };
  return { ok: true, qrImageUrl: data.qr_image_url };
}

// --- Summary / analytics ----------------------------------------------------

export interface AdminSummary {
  revenue: {
    totalConfirmed: number;
    totalCancelled: number;
    byPaymentMethod: { method: string; label: string; amount: number }[];
  };
  peak: {
    heatmap: number[][];
    busiestHours: { hour: number; count: number }[];
  };
  topCustomers: { customerId: string; name: string; sessionCount: number; amountSpent: number }[];
}

export async function fetchAdminSummary(from: string, to: string): Promise<AdminSummary> {
  const res = await fetch(`/api/admin/summary?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Failed to load summary");
  const data = await res.json();
  return { revenue: data.revenue, peak: data.peak, topCustomers: data.top_customers };
}
