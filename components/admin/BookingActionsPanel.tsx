"use client";

import { useState } from "react";
import {
  cancelBooking,
  markPaid,
  overrideCourtNumbers,
  setBookingLocked,
  paymentMethodLabel,
  type AdminScheduleBooking,
} from "@/lib/client/admin-api";
import { formatHourLabel } from "@/lib/client/dates";

interface BookingActionsPanelProps {
  booking: AdminScheduleBooking;
  onClose: () => void;
  onChanged: () => void;
}

export function BookingActionsPanel({ booking, onClose, onChanged }: BookingActionsPanelProps) {
  const [overrideInput, setOverrideInput] = useState(booking.courtNumbers.join(", "));
  const [confirmingOverride, setConfirmingOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Action failed.");
      return;
    }
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl dark:bg-neutral-900 sm:rounded-2xl">
        <h2 className="text-lg font-semibold">{booking.customerName}</h2>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          {booking.court === "court6" ? "Court 6" : `Courts ${booking.courtNumbers.join(", ")}`} ·{" "}
          {formatHourLabel(booking.startHour)} · {booking.durationMinutes / 60}h · {booking.status}
          {paymentMethodLabel(booking.paymentMethod) && ` · ${paymentMethodLabel(booking.paymentMethod)}`}
          {booking.locked && " · locked"}
          {booking.gapPolicyFlag && " · flagged (gap policy)"}
        </p>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => cancelBooking(booking.id))}
            className="w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            Cancel booking
          </button>

          {booking.status !== "confirmed" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => markPaid(booking.id))}
              className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              Mark as paid
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => setBookingLocked(booking.id, !booking.locked))}
            className="w-full rounded-lg bg-neutral-100 py-2.5 font-semibold dark:bg-neutral-800 disabled:opacity-60"
          >
            {booking.locked ? "Unlock court" : "Lock court"}
          </button>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {booking.locked
              ? "Unlocking clears a manual lock. If this booking is also within the automatic pre-start window, it'll still show as locked."
              : "Locks this booking early, before the automatic 60-minutes-before-start cutoff — e.g. to keep a VIP's court from being reassigned by later bookings."}
          </p>

          {booking.court === "pool" && (
            <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Override courts (comma-separated, 1–5)
                {booking.locked && " — locked booking, requires confirmation"}
              </label>
              <input
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
              />
              {!confirmingOverride ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmingOverride(true)}
                  className="mt-2 w-full rounded-lg bg-neutral-100 py-2 text-sm font-medium dark:bg-neutral-800"
                >
                  Override…
                </button>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {booking.locked
                      ? "This booking is locked — overriding will move a customer already checked in or about to start."
                      : "This bypasses automatic placement."}{" "}
                    Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          overrideCourtNumbers(
                            booking.id,
                            overrideInput
                              .split(",")
                              .map((s) => Number(s.trim()))
                              .filter((n) => Number.isInteger(n))
                          )
                        )
                      }
                      className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Confirm override
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingOverride(false)}
                      className="flex-1 rounded-lg bg-neutral-100 py-2 text-sm font-medium dark:bg-neutral-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
