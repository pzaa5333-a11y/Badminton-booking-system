"use client";

import { useState } from "react";
import { checkPayment, paymentMethodLabel, type AdminHistoryBooking } from "@/lib/client/admin-api";
import { formatHourLabel } from "@/lib/client/dates";

interface HistoryTableProps {
  bookings: AdminHistoryBooking[];
  onChanged: () => void;
}

/** Color-coded left edge (§1.6 reference) — confirmed green, cancelled
 * red, everything else neutral — so the log stays skimmable in one
 * thumb-scroll without reading every line. */
function edgeClass(status: string): string {
  if (status === "confirmed" || status === "paid") return "border-l-brand-green";
  if (status === "cancelled") return "border-l-brand-red";
  return "border-l-neutral-300 dark:border-l-neutral-700";
}

export function HistoryTable({ bookings, onChanged }: HistoryTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCheckPayment(id: string) {
    setBusyId(id);
    await checkPayment(id);
    setBusyId(null);
    onChanged();
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No bookings yet.</p>;
  }

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-brand-deep">History</h2>
      <div className="space-y-2">
        {bookings.map((b) => (
          <div
            key={b.id}
            className={`rounded-2xl border-l-4 border border-neutral-200 bg-white p-3 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${edgeClass(b.status)}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{b.customerName}</span>
              <div className="flex items-center gap-1.5">
                {b.paymentCheckStatus === "pending" && (
                  <span className="rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[10px] font-semibold text-brand-deep">
                    Pending review
                  </span>
                )}
                {b.paymentCheckStatus === "checked" && (
                  <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-semibold text-brand-green">
                    Checked
                  </span>
                )}
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {b.status}
                  {b.gapPolicyFlag ? " · flagged" : ""}
                  {b.needsAttention ? " · needs review" : ""}
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {b.date} · {formatHourLabel(b.startHour)} · {b.durationMinutes / 60}h ·{" "}
              {b.court === "court6" ? "Court 6" : `${b.courtCount} court${b.courtCount > 1 ? "s" : ""}`} · ฿{b.amountDue}
              {paymentMethodLabel(b.paymentMethod) && ` · ${paymentMethodLabel(b.paymentMethod)}`}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{b.customerPhone}</p>
            <div className="mt-1.5 flex items-center gap-3">
              {b.slipImageUrl && (
                <a href={b.slipImageUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-sport underline">
                  View slip
                </a>
              )}
              {b.paymentCheckStatus === "pending" && (
                <button
                  type="button"
                  disabled={busyId === b.id}
                  onClick={() => handleCheckPayment(b.id)}
                  className="rounded-full bg-brand-green px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {busyId === b.id ? "Checking…" : "Check payment"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
