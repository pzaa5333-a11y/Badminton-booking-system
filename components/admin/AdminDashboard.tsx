"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateISO } from "@/lib/client/dates";
import {
  fetchAdminSchedule,
  fetchAdminHistory,
  type AdminScheduleBooking,
  type AdminHistoryBooking,
} from "@/lib/client/admin-api";
import { ScheduleGrid } from "./ScheduleGrid";
import { BookingActionsPanel } from "./BookingActionsPanel";
import { WalkInForm } from "./WalkInForm";
import { HistoryTable } from "./HistoryTable";
import { MembersTab } from "./MembersTab";

type Tab = "schedule" | "history" | "members";

export function AdminDashboard() {
  const router = useRouter();
  const [date, setDate] = useState(() => formatDateISO(new Date()));
  const [tab, setTab] = useState<Tab>("schedule");

  const [schedule, setSchedule] = useState<AdminScheduleBooking[]>([]);
  const [scheduleTick, setScheduleTick] = useState(0);
  const [history, setHistory] = useState<AdminHistoryBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<AdminScheduleBooking | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);

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
            onClick={() => setTab("schedule")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "schedule" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "history" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setTab("members")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "members" ? "bg-white shadow dark:bg-neutral-700" : ""}`}
          >
            Members
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

      {tab === "history" && <HistoryTable bookings={history} />}

      {tab === "members" && <MembersTab />}

      {selectedBooking && (
        <BookingActionsPanel
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onChanged={() => setScheduleTick((t) => t + 1)}
        />
      )}

      {showWalkIn && (
        <WalkInForm date={date} onClose={() => setShowWalkIn(false)} onCreated={() => setScheduleTick((t) => t + 1)} />
      )}
    </div>
  );
}
