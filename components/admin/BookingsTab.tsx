"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminBookingsForMonth, paymentMethodLabel, type AdminHistoryBooking } from "@/lib/client/admin-api";
import { formatHourLabel } from "@/lib/client/dates";
import { BookingActionsPanel } from "./BookingActionsPanel";

type SortKey = "createdAt" | "date" | "name";
type SortDir = "asc" | "desc";
type View = "active" | "deleted";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function BookingsTab() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [bookings, setBookings] = useState<AdminHistoryBooking[]>([]);
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<View>("active");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<AdminHistoryBooking | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminBookingsForMonth(month).then((rows) => {
      if (!cancelled) setBookings(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [month, tick]);

  const rows = useMemo(() => {
    const filtered = bookings.filter((b) => (view === "deleted" ? b.status === "cancelled" : b.status !== "cancelled"));
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "createdAt") cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortKey === "date") cmp = `${a.date}T${a.startHour}`.localeCompare(`${b.date}T${b.startHour}`);
      else cmp = a.customerName.localeCompare(b.customerName);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [bookings, view, sortKey, sortDir]);

  const otherPoolBookings = selected
    ? bookings.filter((b) => b.court === "pool" && b.date === selected.date && b.status !== "cancelled")
    : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="rounded-lg bg-neutral-100 px-2 py-1 text-sm dark:bg-neutral-800"
          >
            ←
          </button>
          <span className="text-sm font-medium">{monthLabel(month)}</span>
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="rounded-lg bg-neutral-100 px-2 py-1 text-sm dark:bg-neutral-800"
          >
            →
          </button>
        </div>

        <div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setView("active")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${view === "active" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setView("deleted")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${view === "deleted" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            Deleted zone
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <label className="text-neutral-500 dark:text-neutral-400">Sort by</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
          >
            <option value="createdAt">Booked at</option>
            <option value="date">Session date</option>
            <option value="name">Name</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded-lg bg-neutral-100 px-2 py-1 dark:bg-neutral-800"
          >
            {sortDir === "asc" ? "↑ Oldest/A–Z" : "↓ Newest/Z–A"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {view === "deleted" ? "Nothing in the deleted zone this month." : "No bookings this month."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Court(s)</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <td className="px-3 py-2">{b.customerName}</td>
                  <td className="px-3 py-2">{b.court === "court6" ? "Court 6" : `${b.courtCount} court${b.courtCount > 1 ? "s" : ""}`}</td>
                  <td className="px-3 py-2">
                    {b.date} · {formatHourLabel(b.startHour)} · {b.durationMinutes / 60}h
                  </td>
                  <td className="px-3 py-2">
                    {b.status}
                    {b.needsAttention && " (needs attention)"}
                  </td>
                  <td className="px-3 py-2">{paymentMethodLabel(b.paymentMethod) ?? "—"}</td>
                  <td className="px-3 py-2">฿{b.amountDue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <BookingActionsPanel
          booking={selected}
          otherPoolBookings={otherPoolBookings}
          onClose={() => setSelected(null)}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  );
}
