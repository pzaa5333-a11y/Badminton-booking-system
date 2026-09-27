"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateISO, formatHourLabel } from "@/lib/client/dates";
import { CLOSING_HOUR, OPENING_HOUR } from "@/lib/types";
import {
  fetchAdminSchedule,
  fetchAdminHistory,
  fetchRecentBookings,
  type AdminScheduleBooking,
  type AdminHistoryBooking,
} from "@/lib/client/admin-api";
import { ScheduleGrid } from "./ScheduleGrid";
import { BookingActionsPanel } from "./BookingActionsPanel";
import { WalkInForm } from "./WalkInForm";
import { HistoryTable } from "./HistoryTable";
import { MembersTab } from "./MembersTab";
import { BookingsTab } from "./BookingsTab";
import { SettingsTab } from "./SettingsTab";
import { SummaryTab } from "./SummaryTab";
import { AdminBottomNav, type AdminTab } from "./AdminBottomNav";

const NOTIFICATION_POLL_MS = 10_000;
const TOAST_LIFETIME_MS = 6_000;

interface Toast {
  id: string;
  text: string;
}

export function AdminDashboard() {
  const router = useRouter();
  const [date, setDate] = useState(() => formatDateISO(new Date()));
  const [tab, setTab] = useState<AdminTab>("schedule");

  const [schedule, setSchedule] = useState<AdminScheduleBooking[]>([]);
  const [scheduleTick, setScheduleTick] = useState(0);
  const [history, setHistory] = useState<AdminHistoryBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<AdminScheduleBooking | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  // Booking ids the admin hasn't looked at yet — drives both the History
  // nav badge (its count) and the "New" highlight on cards in the
  // Bookings panel embedded under Schedule (§1.2). A card clears itself
  // when opened; History clears the whole set when opened.
  const [unseenIds, setUnseenIds] = useState<Set<string>>(new Set());
  const lastPolledAtRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (tab !== "schedule") return;
    let cancelled = false;
    fetchAdminSchedule(date).then((bookings) => {
      if (!cancelled) setSchedule(bookings);
    });
    return () => {
      cancelled = true;
    };
  }, [date, tab, scheduleTick]);

  useEffect(() => {
    if (tab !== "history") return;
    let cancelled = false;
    fetchAdminHistory().then((bookings) => {
      if (!cancelled) setHistory(bookings);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, scheduleTick]);

  // New-booking alerts: poll regardless of which tab is open, since a
  // booking can land while the admin is looking at Members or Settings.
  useEffect(() => {
    const interval = setInterval(async () => {
      const since = lastPolledAtRef.current;
      let recent;
      try {
        recent = await fetchRecentBookings(since);
      } catch {
        return;
      }
      lastPolledAtRef.current = new Date().toISOString();
      if (recent.length === 0) return;

      const newToasts = recent.map((b) => ({
        id: b.id,
        text: `${b.customerName} booked ${b.date} · ${formatHourLabel(b.startHour)}`,
      }));
      setToasts((t) => [...t, ...newToasts]);
      newToasts.forEach((toast) => {
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), TOAST_LIFETIME_MS);
      });
      setUnseenIds((prev) => {
        const next = new Set(prev);
        for (const b of recent) next.add(b.id);
        return next;
      });
    }, NOTIFICATION_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  function selectTab(next: AdminTab) {
    setTab(next);
    if (next === "history") setUnseenIds(new Set());
  }

  function markSeen(id: string) {
    setUnseenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const flagged = schedule.filter((b) => b.gapPolicyFlag);
  const todayBookings = schedule.length;
  // Booked court-hours (courts × duration, summed) over the day's total
  // possible court-hours — replaces the old "distinct courts used / 6"
  // stat, which didn't reflect that a court can be double-booked across
  // different hours in the same day (§ capacity stat).
  const todayCourtHours = schedule.reduce((sum, b) => {
    const courts = b.court === "court6" ? 1 : b.courtNumbers.length;
    return sum + courts * (b.durationMinutes / 60);
  }, 0);
  const maxCourtHours = 6 * (CLOSING_HOUR - OPENING_HOUR);
  const todayRevenue = schedule
    .filter((b) => b.status === "confirmed" || b.status === "paid")
    .reduce((sum, b) => sum + b.amountDue, 0);

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-deep">Sevendays Badminton — Admin</h1>
        <button type="button" onClick={handleLogout} className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Log out
        </button>
      </header>

      {tab === "schedule" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
            />
            <button
              type="button"
              onClick={() => setShowWalkIn(true)}
              className="ml-auto rounded-lg bg-brand-sport px-3 py-1.5 text-sm font-semibold text-white"
            >
              + Walk-in
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-1.5">
            <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-2 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="truncate text-base font-bold text-brand-deep">{todayBookings}</p>
              <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">bookings</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-2 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="truncate text-base font-bold text-brand-deep">
                {todayCourtHours}/{maxCourtHours}
              </p>
              <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">court-hours booked</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-2 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="truncate text-base font-bold text-brand-deep">฿{todayRevenue}</p>
              <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">revenue</p>
            </div>
          </div>

          {flagged.length > 0 && (
            <div className="mb-4 rounded-2xl border border-brand-red/30 bg-brand-red/5 p-3 text-sm">
              <p className="mb-1 font-semibold text-brand-red">Flagged for review (gap policy)</p>
              {flagged.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBooking(b)}
                  className="block text-brand-red underline"
                >
                  {b.customerName} · {String(b.startHour).padStart(2, "0")}:00 · courts {b.courtNumbers.join(", ") || "none"}
                </button>
              ))}
            </div>
          )}

          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow/70" /> Held
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-green" /> Confirmed (online)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-sport" /> Walk-in (cash)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-red" /> Flagged
            </span>
          </div>

          <ScheduleGrid bookings={schedule} onSelectBooking={setSelectedBooking} />

          <div className="mt-6">
            <BookingsTab unseenIds={unseenIds} onOpenBooking={markSeen} date={date} />
          </div>
        </>
      )}

      {tab === "summary" && <SummaryTab />}

      {tab === "history" && <HistoryTable bookings={history} onChanged={() => setScheduleTick((t) => t + 1)} />}

      {tab === "members" && <MembersTab />}

      {tab === "settings" && <SettingsTab />}

      {selectedBooking && (
        <BookingActionsPanel
          booking={selectedBooking}
          currentDate={date}
          onClose={() => setSelectedBooking(null)}
          onChanged={() => setScheduleTick((t) => t + 1)}
        />
      )}

      {showWalkIn && (
        <WalkInForm date={date} onClose={() => setShowWalkIn(false)} onCreated={() => setScheduleTick((t) => t + 1)} />
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div key={toast.id} className="rounded-lg bg-brand-deep px-4 py-2.5 text-sm text-white shadow-lg">
              New booking: {toast.text}
            </div>
          ))}
        </div>
      )}

      <AdminBottomNav active={tab} onSelect={selectTab} historyBadgeCount={unseenIds.size} />
    </div>
  );
}
