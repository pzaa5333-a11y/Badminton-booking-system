"use client";

import { useState, type FormEvent } from "react";
import type { CourtSelection, DurationMinutes } from "@/lib/types";
import { formatHourLabel } from "@/lib/client/dates";
import { submitBookingRequest } from "@/lib/client/api";

export interface SheetTarget {
  court: CourtSelection;
  hour: number;
  maxCourtCount: number; // 1 for court6
  separatedAt: number | null; // null for court6
}

interface RequestSheetProps {
  target: SheetTarget | null;
  date: string;
  durationMinutes: DurationMinutes;
  onClose: () => void;
  onSuccess: (info: { bookingId: string; amountDue: number; court: CourtSelection; hour: number; courtCount: number }) => void;
}

export function RequestSheet({ target, date, durationMinutes, onClose, onSuccess }: RequestSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!target) return null;

  const isCourt6 = target.court === "court6";
  // Live: reacts to every stepper change, not just computed once at sheet-open (§3.4).
  const showWarning = !isCourt6 && target.separatedAt !== null && quantity > target.separatedAt;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    setError(null);
    const result = await submitBookingRequest({
      date,
      start_hour: target.hour,
      duration_minutes: durationMinutes,
      court_count: isCourt6 ? 1 : quantity,
      court: target.court,
      customer_name: name,
      customer_phone: phone,
    });
    setSubmitting(false);
    if (result.ok) {
      onSuccess({
        bookingId: result.booking_id,
        amountDue: result.amount_due,
        court: target.court,
        hour: target.hour,
        courtCount: isCourt6 ? 1 : quantity,
      });
      return;
    }
    if (result.status === 409 && result.alternative) {
      setError(`${result.message} Try ${formatHourLabel(result.alternative.start_hour)} instead.`);
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white dark:bg-neutral-900 p-5 pb-8 shadow-xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <h2 className="text-lg font-semibold">
          {formatHourLabel(target.hour)} · {durationMinutes / 60}h · {isCourt6 ? "Court 6" : "Courts 1–5"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!isCourt6 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Number of courts</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-lg font-semibold"
                  aria-label="Decrease court count"
                >
                  −
                </button>
                <span className="w-8 text-center text-lg font-semibold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(target.maxCourtCount, q + 1))}
                  className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-lg font-semibold"
                  aria-label="Increase court count"
                >
                  +
                </button>
              </div>
              {showWarning && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  Some of these courts won&apos;t be right next to the others for part of this session.
                </p>
              )}
            </div>
          )}

          {isCourt6 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Court 6 is booked and paid separately, at a slightly higher rate.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="customer-name">
              Name
            </label>
            <input
              id="customer-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="customer-phone">
              Phone
            </label>
            <input
              id="customer-phone"
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2.5"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 py-3 text-center font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Booking…" : "Request booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
