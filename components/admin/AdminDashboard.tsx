"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateISO, formatHourLabel } from "@/lib/client/dates";
import {
  fetchAdminSchedule,
  fetchAdminHistory,
  fetchRecentBookings,
  type AdminScheduleBooking,
  type AdminHistoryBooking,
  type RecentBooking,
} from "@/lib/client/admin-api";
import { ScheduleGrid } from "./ScheduleGrid";
import { BookingActionsPanel } from "./BookingActionsPanel";
import { WalkInForm } from "./WalkInForm";
import { HistoryTable } from "./HistoryTable";
import { MembersTab } from "./MembersTab";
import { BookingsTab } from "./BookingsTab";
import { SettingsTab } from "./SettingsTab";

type Tab = "schedule" | "bookings" | "history" | "members" | "settings";

const NOTIFICATION_POLL_MS = 10_000;
const TOAST_LIFETIME_MS = 6_000;

interface Toast {
  id: string;
  text: string;
}

export function AdminDashboard() {
  const router = useRouter();
  const [date, setDate] = useState(() => formatDateISO(new Date()));
  const [tab, setTab] = useState<Tab>("schedule");

  const [schedule, setSchedule] = useState<AdminScheduleBooking[]>([]);
  const [scheduleTick, setScheduleTick] = useState(0);
  const [history, setHistory] = useState<AdminHistoryBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<AdminScheduleBooking | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const lastSeenAtRef = useRef(new Date().toISOString());

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

  // New-booking alerts (§ in-app notifications): poll regardless of which
  // tab is open, since a booking can land while the admin is looking at
  // Members or History. Toasts are best-effort feedback; the badge on the
  // Bookings tab is the durable "you have unseen bookings" signal.
  useEffect(() => {
    const interval = setInterval(async () => {
      const since = lastSeenAtRef.current;
      let recent: RecentBooking[];
      try {
        recent = await fetchRecentBookings(since);
      } catch {
        return;
      }
      lastSeenAtRef.current = new Date().toISOString();
      if (recent.length === 0) return;

      const newToasts = recent.map((b) => ({
        id: b.id,
        text: `${b.customerName} booked ${b.date} · ${formatHourLabel(b.startHour)}`,
      }));
      setToasts((t) => [...t, ...newToasts]);
      newToasts.forEach((toast) => {
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), TOAST_LIFETIME_MS);
      });
      if (tab !== "bookings") setUnseenCount((c) => c + recent.length);
    }, NOTIFICATION_POLL_MS);
    return () => clearInterval(interval);
  }, [tab]);

  function selectTab(next: Tab) {
    setTab(next);
    if (next === "bookings") setUnseenCount(0);
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const flagged = schedule.filter((b) => b.gapPolicyFlag);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Sevendays Badminton — Admin</h1>
        <button type="button" onClick={handleLogout} className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Log out
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => selectTab("schedule")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "schedule" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => selectTab("bookings")}
            className={`relative rounded-md px-3 py-1.5 text-sm font-medium ${tab === "bookings" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            Bookings
            {unseenCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unseenCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => selectTab("history")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "history" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => selectTab("members")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "members" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => selectTab("settings")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "settings" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            Settings
          </button>
        </div>

        {tab === "schedule" && (
          <>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
            />
            <button
              type="button"
              onClick={() => setShowWalkIn(true)}
              className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
            >
              + Walk-in
            </button>
          </>
        )}
      </div>

      {tab === "schedule" && (
        <>
          {flagged.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
              <p className="mb-1 font-semibold text-red-800 dark:text-red-300">Flagged for review (gap policy)</p>
              {flagged.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBooking(b)}
                  className="block text-red-700 underline dark:text-red-300"
                >
                  {b.customerName} · {String(b.startHour).padStart(2, "0")}:00 · courts {b.courtNumbers.join(", ") || "none"}
                </button>
              ))}
            </div>
          )}
          <ScheduleGrid bookings={schedule} onSelectBooking={setSelectedBooking} />
        </>
      )}

      {tab === "bookings" && <BookingsTab />}

      {tab === "history" && <HistoryTable bookings={history} />}

      {tab === "members" && <MembersTab />}

      {tab === "settings" && <SettingsTab />}

      {selectedBooking && (
        <BookingActionsPanel
          booking={selectedBooking}
          otherPoolBookings={schedule.filter((b) => b.court === "pool")}
          onClose={() => setSelectedBooking(null)}
          onChanged={() => setScheduleTick((t) => t + 1)}
        />
      )}

      {showWalkIn && (
        <WalkInForm date={date} onClose={() => setShowWalkIn(false)} onCreated={() => setScheduleTick((t) => t + 1)} />
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-white dark:text-neutral-900"
            >
              New booking: {toast.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
