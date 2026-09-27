"use client";

import { useState } from "react";
import { reassignBooking, type AdminBookingRow, type ReassignPayload } from "@/lib/client/admin-api";
import { formatHourLabel } from "@/lib/client/dates";
import { DURATION_OPTIONS, POOL_COURT_NUMBERS, type DurationMinutes } from "@/lib/types";

interface ReassignBookingModalProps {
  booking: AdminBookingRow & { date?: string };
  currentDate: string;
  onClose: () => void;
  onChanged: () => void;
}

/** One editor for date, time period and court(s) together (§ admin
 * "Reassign") — replaces the old separate override-courts and
 * swap-courts controls, which needed jumping between screens for what's
 * really one task. */
export function ReassignBookingModal({ booking, currentDate, onClose, onChanged }: ReassignBookingModalProps) {
  const [date, setDate] = useState(booking.date ?? currentDate);
  const [startHour, setStartHour] = useState(booking.startHour);
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(booking.durationMinutes as DurationMinutes);
  const [courtNumbers, setCourtNumbers] = useState<number[]>(booking.courtNumbers);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleCourt(c: number) {
    setCourtNumbers((prev) => (prev.includes(c) ? prev.filter((n) => n !== c) : [...prev, c].sort((a, b) => a - b)));
  }

  async function handleConfirm() {
    if (booking.court === "pool" && courtNumbers.length === 0) {
      setError("Pick at least one court.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload: ReassignPayload = {
      date,
      start_hour: startHour,
      duration_minutes: durationMinutes,
      court_numbers: courtNumbers,
    };
    const result = await reassignBooking(booking.id, payload);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't reassign this booking.");
      return;
    }
    onChanged();
    onClose();
  }

  const hours = Array.from({ length: 15 }, (_, i) => 9 + i);
  const courtLabel = booking.court === "court6" ? "Court 6" : courtNumbers.join(", ") || "none";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl dark:bg-neutral-900 sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold text-brand-deep">Reassign {booking.customerName}</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Start</label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {formatHourLabel(h)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) as DurationMinutes)}
                className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d / 60}h
                  </option>
                ))}
              </select>
            </div>
          </div>

          {booking.court === "pool" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Courts</label>
              <div className="flex gap-1.5">
                {POOL_COURT_NUMBERS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCourt(c)}
                    className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                      courtNumbers.includes(c)
                        ? "bg-brand-sport text-white"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-brand-soft p-3 text-sm dark:bg-neutral-800">
            <span className="font-medium">Preview:</span> {courtLabel} · {date} · {formatHourLabel(startHour)} ·{" "}
            {durationMinutes / 60}h
          </div>

          {error && <p className="text-sm text-brand-red">{error}</p>}

          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className="w-full rounded-xl bg-brand-sport py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Reassigning…" : "Confirm reassignment"}
          </button>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Any other booking that already occupies the new slot is left in place and flagged for review — it&apos;s
            never moved automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
