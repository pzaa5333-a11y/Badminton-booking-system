"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminBookingsForMonth, fetchAdminHistory, paymentMethodLabel, type AdminHistoryBooking } from "@/lib/client/admin-api";
import { DISPLAY_LOCALE, formatHourLabel } from "@/lib/client/dates";
import { BookingActionsPanel } from "./BookingActionsPanel";

type SortKey = "createdAt" | "date" | "name";
type SortDir = "asc" | "desc";
type View = "active" | "deleted";
type Range = "daily" | "monthly";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(DISPLAY_LOCALE, { month: "long", year: "numeric" });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface BookingsTabProps {
  /** Ids of bookings the admin hasn't opened yet — cards for these get a
   * "New" highlight (§1.2) instead of the old badge-dot treatment, since
   * this panel no longer has its own nav slot to badge. */
  unseenIds?: Set<string>;
  onOpenBooking?: (id: string) => void;
  /** The Schedule grid's currently-selected date — Daily view fetches this
   * exact date so the two stay in sync (§ Daily/Monthly toggle). */
  date: string;
}

export function BookingsTab({ unseenIds, onOpenBooking, date }: BookingsTabProps) {
  const [range, setRange] = useState<Range>("daily");
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
    const fetchRows = range === "daily" ? fetchAdminHistory(date) : fetchAdminBookingsForMonth(month);
    fetchRows.then((rows) => {
      if (!cancelled) setBookings(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [range, date, month, tick]);

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

  function handleOpen(b: AdminHistoryBooking) {
    setSelected(b);
    onOpenBooking?.(b.id);
  }

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-brand-deep">Bookings</h2>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setRange("daily")}
            className={`rounded-lg px-3 py-1 text-sm font-medium ${range === "daily" ? "bg-white text-brand-deep shadow dark:bg-neutral-700" : ""}`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setRange("monthly")}
            className={`rounded-lg px-3 py-1 text-sm font-medium ${range === "monthly" ? "bg-white text-brand-deep shadow dark:bg-neutral-700" : ""}`}
          >
            Monthly
          </button>
        </div>

        {range === "daily" ? (
          <span className="text-sm font-medium">{date}</span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="rounded-xl bg-neutral-100 px-2 py-1 text-sm dark:bg-neutral-800"
            >
              ←
            </button>
            <span className="text-sm font-medium">{monthLabel(month)}</span>
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              className="rounded-xl bg-neutral-100 px-2 py-1 text-sm dark:bg-neutral-800"
            >
              →
            </button>
          </div>
        )}

        <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setView("active")}
            className={`rounded-lg px-3 py-1 text-sm font-medium ${view === "active" ? "bg-white text-brand-deep shadow dark:bg-neutral-700" : ""}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setView("deleted")}
            className={`rounded-lg px-3 py-1 text-sm font-medium ${view === "deleted" ? "bg-white text-brand-deep shadow dark:bg-neutral-700" : ""}`}
          >
            Deleted zone
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <label className="text-neutral-500 dark:text-neutral-400">Sort</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
          >
            <option value="createdAt">Booked at</option>
            <option value="date">Session date</option>
            <option value="name">Name</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded-xl bg-neutral-100 px-2 py-1 dark:bg-neutral-800"
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {view === "deleted"
            ? `Nothing in the deleted zone ${range === "daily" ? "today" : "this month"}.`
            : `No bookings ${range === "daily" ? "today" : "this month"}.`}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((b) => {
            const isNew = unseenIds?.has(b.id) ?? false;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleOpen(b)}
                className={`block w-full rounded-2xl border p-3 text-left shadow-sm transition-colors ${
                  isNew
                    ? "border-brand-yellow bg-brand-yellow/10"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-semibold">{b.customerName}</span>
                  <div className="flex items-center gap-1.5">
                    {isNew && (
                      <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-semibold text-brand-deep">
                        New
                      </span>
                    )}
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Booked {new Date(b.createdAt).toLocaleDateString(DISPLAY_LOCALE, { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
                <div className="mb-1.5 flex flex-wrap items-center gap-1">
                  {b.court === "court6" ? (
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-deep dark:bg-neutral-800">
                      Court 6
                    </span>
                  ) : (
                    b.courtNumbers.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-deep dark:bg-neutral-800"
                      >
                        {c}
                      </span>
                    ))
                  )}
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {b.date} · {formatHourLabel(b.startHour)}–{formatHourLabel(b.startHour + b.durationMinutes / 60)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {b.status}
                    {b.needsAttention && " · needs review"}
                    {paymentMethodLabel(b.paymentMethod) && ` · ${paymentMethodLabel(b.paymentMethod)}`}
                  </span>
                  <span className="font-semibold">฿{b.amountDue}</span>
                </div>
                {view === "deleted" && (
                  <span className="mt-1.5 inline-block text-xs font-medium text-brand-sport">Tap to restore</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <BookingActionsPanel
          booking={selected}
          currentDate={selected.date}
          onClose={() => setSelected(null)}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  );
}
