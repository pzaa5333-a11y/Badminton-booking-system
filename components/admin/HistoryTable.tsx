import { paymentMethodLabel, type AdminHistoryBooking } from "@/lib/client/admin-api";
import { formatHourLabel } from "@/lib/client/dates";

interface HistoryTableProps {
  bookings: AdminHistoryBooking[];
}

export function HistoryTable({ bookings }: HistoryTableProps) {
  if (bookings.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No bookings yet.</p>;
  }

  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="font-medium">{b.customerName}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {b.status}
              {b.gapPolicyFlag ? " · flagged" : ""}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {b.date} · {formatHourLabel(b.startHour)} · {b.durationMinutes / 60}h ·{" "}
            {b.court === "court6" ? "Court 6" : `${b.courtCount} court${b.courtCount > 1 ? "s" : ""}`} · ฿{b.amountDue}
            {paymentMethodLabel(b.paymentMethod) && ` · ${paymentMethodLabel(b.paymentMethod)}`}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{b.customerPhone}</p>
          {b.slipImageUrl && (
            <a href={b.slipImageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-emerald-600 underline">
              View slip
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
