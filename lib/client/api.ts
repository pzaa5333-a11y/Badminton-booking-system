import type { CourtSelection, DurationMinutes } from "@/lib/types";

export interface AvailabilityHour {
  hour: number;
  free_count: number;
  separated_at: number | null;
}

export async function fetchAvailability(date: string, duration: DurationMinutes): Promise<AvailabilityHour[]> {
  const res = await fetch(`/api/availability?date=${date}&duration=${duration}`);
  if (!res.ok) throw new Error("Failed to load availability");
  const data = await res.json();
  return data.hours as AvailabilityHour[];
}

export async function fetchCourt6Availability(date: string): Promise<number[]> {
  const res = await fetch(`/api/court6-availability?date=${date}`);
  if (!res.ok) throw new Error("Failed to load Court 6 availability");
  const data = await res.json();
  return data.busy_hours as number[];
}

export interface BookingRequestPayload {
  date: string;
  start_hour: number;
  duration_minutes: DurationMinutes;
  court_count: number;
  court: CourtSelection;
  customer_name: string;
  customer_phone: string;
}

export interface BookingRequestSuccess {
  ok: true;
  booking_id: string;
  amount_due: number;
}

export interface BookingRequestConflict {
  ok: false;
  status: 409;
  message: string;
  alternative: { start_hour: number } | null;
}

export interface BookingRequestError {
  ok: false;
  status: number;
  message: string;
  alternative: null;
}

export async function submitBookingRequest(
  payload: BookingRequestPayload
): Promise<BookingRequestSuccess | BookingRequestConflict | BookingRequestError> {
  const res = await fetch("/api/booking-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    return { ok: true, booking_id: data.booking_id, amount_due: data.amount_due };
  }
  if (res.status === 409) {
    return { ok: false, status: 409, message: data.error ?? "That slot is no longer available.", alternative: data.alternative ?? null };
  }
  return { ok: false, status: res.status, message: data.error ?? "Something went wrong. Please try again.", alternative: null };
}

export interface BookingDetail {
  booking_id: string;
  date: string;
  start_hour: number;
  duration_minutes: DurationMinutes;
  court: CourtSelection;
  court_count: number;
  status: "held" | "paid" | "confirmed" | "released" | "cancelled";
  hold_expires_at: string | null;
  amount_due: number;
  slip_image_url: string | null;
  customer: { name: string; phone: string; email: string | null };
}

export async function fetchBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  const res = await fetch(`/api/bookings/${bookingId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load booking");
  return res.json();
}

export async function updateBookingEmail(bookingId: string, email: string): Promise<BookingDetail> {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Failed to save email");
  return res.json();
}

export interface SlipUploadResult {
  ok: boolean;
  verified?: boolean;
  status?: BookingDetail["status"];
  message?: string;
}

export async function uploadSlip(bookingId: string, file: File): Promise<SlipUploadResult> {
  const formData = new FormData();
  formData.append("slip", file);
  const res = await fetch(`/api/bookings/${bookingId}/slip`, { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: data.error ?? "Couldn't verify that slip. Please try again." };
  }
  return { ok: true, verified: data.verified, status: data.status };
}

export interface MemberSummary {
  name: string;
  packages: { id: string; packageTypeName: string; hoursRemaining: number; expiresAt: string }[];
}

/** Step 1 of "Pay with package" — no password needed, just confirms who this is. */
export async function fetchMemberSummary(username: string): Promise<MemberSummary | null> {
  const res = await fetch(`/api/members/${encodeURIComponent(username)}/summary`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load member");
  return res.json();
}

/** The admin-uploaded QR image customers scan to pay (§ payment page
 * redesign — replaces the old PromptPay placeholder). Public, no auth. */
export async function fetchPaymentQrUrl(): Promise<string | null> {
  const res = await fetch("/api/payment-settings");
  if (!res.ok) return null;
  const data = await res.json();
  return data.qr_image_url ?? null;
}

export interface PayWithPackageResult {
  ok: boolean;
  message?: string;
}

/** Step 2 — the actual password-checked charge. */
export async function payWithPackage(bookingId: string, username: string, password: string): Promise<PayWithPackageResult> {
  const res = await fetch(`/api/bookings/${bookingId}/pay-with-package`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.error ?? "Couldn't complete payment. Please try again." };
  return { ok: true };
}
