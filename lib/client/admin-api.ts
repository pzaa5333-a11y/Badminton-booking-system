import type { CourtSelection, DurationMinutes } from "@/lib/types";

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
