"use client";

import { useState } from "react";
import {
  cancelBooking,
  markPaid,
  setBookingLocked,
  restoreBooking,
  revertReassignment,
  dismissAttention,
  checkPayment,
  paymentMethodLabel,
  type AdminBookingRow,
} from "@/lib/client/admin-api";
import { formatHourLabel } from "@/lib/client/dates";
import { ReassignBookingModal } from "./ReassignBookingModal";

interface BookingActionsPanelProps {
  booking: AdminBookingRow & { date?: string; reassigned?: boolean };
  currentDate: string;
  onClose: () => void;
  onChanged: () => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="shrink-0 text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function BookingActionsPanel({ booking, currentDate, onClose, onChanged }: BookingActionsPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReassign, setShowReassign] = useState(false);

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

  const courtLabel = booking.court === "court6" ? "Court 6" : `Courts ${booking.courtNumbers.join(", ") || "none"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-neutral-900 sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-brand-deep">{booking.customerName}</h2>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-deep dark:bg-neutral-800">
            {booking.status}
          </span>
          {paymentMethodLabel(booking.paymentMethod) && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-deep dark:bg-neutral-800">
              {paymentMethodLabel(booking.paymentMethod)}
            </span>
          )}
          {booking.paymentCheckStatus === "pending" && (
            <span className="rounded-full bg-brand-yellow/30 px-2 py-0.5 text-xs font-medium text-brand-deep">
              Pending review
            </span>
          )}
          {booking.locked && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">locked</span>
          )}
          {booking.gapPolicyFlag && (
            <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-medium text-brand-red">
              flagged (gap policy)
            </span>
          )}
          {booking.needsAttention && (
            <span className="rounded-full bg-brand-yellow/30 px-2 py-0.5 text-xs font-medium text-brand-deep">
              needs review
            </span>
          )}
        </div>

        {booking.slipImageUrl && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">Payment slip</p>
            <a href={booking.slipImageUrl} target="_blank" rel="noreferrer">
              <img
                src={booking.slipImageUrl}
                alt="Payment slip"
                className="max-h-56 w-full rounded-xl border border-neutral-200 object-contain dark:border-neutral-800"
              />
            </a>
          </div>
        )}

        <div className="mb-4 divide-y divide-neutral-100 rounded-xl border border-neutral-200 px-3 dark:divide-neutral-800 dark:border-neutral-800">
          <DetailRow label="Booked at" value={new Date(booking.createdAt).toLocaleString()} />
          <DetailRow
            label="Session"
            value={`${booking.date ?? currentDate} · ${formatHourLabel(booking.startHour)}–${formatHourLabel(
              booking.startHour + booking.durationMinutes / 60
            )}`}
          />
          <DetailRow label="Court" value={courtLabel} />
          <DetailRow label="Customer" value={`${booking.customerName} · ${booking.customerPhone}`} />
          {booking.cancelledAt && <DetailRow label="Cancelled" value={new Date(booking.cancelledAt).toLocaleString()} />}
        </div>

        {error && <p className="mb-3 text-sm text-brand-red">{error}</p>}

        {booking.status === "cancelled" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => restoreBooking(booking.id))}
            className="w-full rounded-xl bg-brand-green py-2.5 font-semibold text-white disabled:opacity-60"
          >
            Restore booking
          </button>
        ) : (
          <div className="space-y-2">
            {booking.paymentCheckStatus === "pending" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => checkPayment(booking.id))}
                className="w-full rounded-xl bg-brand-green py-2.5 font-semibold text-white disabled:opacity-60"
              >
                Check payment
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => setShowReassign(true)}
              className="w-full rounded-xl bg-brand-sport py-2.5 font-semibold text-white disabled:opacity-60"
            >
              Reassign…
            </button>

            {booking.reassigned && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => revertReassignment(booking.id))}
                className="w-full rounded-xl bg-neutral-100 py-2.5 text-sm font-medium dark:bg-neutral-800 disabled:opacity-60"
              >
                Revert to original
              </button>
            )}

            {booking.needsAttention && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => dismissAttention(booking.id))}
                className="w-full rounded-xl bg-neutral-100 py-2.5 text-sm font-medium dark:bg-neutral-800 disabled:opacity-60"
              >
                Dismiss &ldquo;needs review&rdquo;
              </button>
            )}

            {booking.status !== "confirmed" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => markPaid(booking.id))}
                className="w-full rounded-xl bg-brand-green py-2.5 font-semibold text-white disabled:opacity-60"
              >
                Mark as paid
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => setBookingLocked(booking.id, !booking.locked))}
              className="w-full rounded-xl bg-neutral-100 py-2.5 text-sm font-medium dark:bg-neutral-800 disabled:opacity-60"
            >
              {booking.locked ? "Unlock court" : "Lock court"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => cancelBooking(booking.id))}
              className="w-full rounded-xl bg-brand-red py-2.5 font-semibold text-white disabled:opacity-60"
            >
              Move to deleted
            </button>
          </div>
        )}
      </div>

      {showReassign && (
        <ReassignBookingModal
          booking={booking}
          currentDate={currentDate}
          onClose={() => setShowReassign(false)}
          onChanged={() => {
            onChanged();
            onClose();
          }}
        />
      )}
    </div>
  );
}
