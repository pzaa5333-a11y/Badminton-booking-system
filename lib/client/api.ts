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
