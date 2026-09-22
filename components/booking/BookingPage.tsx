"use client";

import { useEffect, useMemo, useState } from "react";
import type { DurationMinutes } from "@/lib/types";
import { defaultDateStrip, formatChipLabel, formatHourLabel, type DateChip } from "@/lib/client/dates";
import { fetchAvailability, fetchCourt6Availability, type AvailabilityHour } from "@/lib/client/api";
import { DateStrip } from "./DateStrip";
import { DurationSelector } from "./DurationSelector";
import { AvailabilityLegend } from "./AvailabilityLegend";
import { PoolHourRow } from "./PoolHourRow";
import { Court6Row } from "./Court6Row";
import { RequestSheet, type SheetTarget } from "./RequestSheet";

export function BookingPage() {
  const baseChips = useMemo(() => defaultDateStrip(new Date()), []);
  const [extraChips, setExtraChips] = useState<DateChip[]>([]);
  const chips = [...baseChips, ...extraChips];

  const [selectedDate, setSelectedDate] = useState(baseChips[0].date);
  const [duration, setDuration] = useState<DurationMinutes>(60);

  const poolKey = `${selectedDate}|${duration}`;
  const [poolResult, setPoolResult] = useState<{ key: string; hours: AvailabilityHour[] } | null>(null);
  const [poolError, setPoolError] = useState<{ key: string } | null>(null);
  const poolHours = poolResult?.key === poolKey ? poolResult.hours : null;
  const poolErrored = poolError?.key === poolKey;

  const [court6Result, setCourt6Result] = useState<{ key: string; busy: number[] } | null>(null);
  const [court6ErrorState, setCourt6ErrorState] = useState<{ key: string } | null>(null);
  const court6Busy = court6Result?.key === selectedDate ? court6Result.busy : null;
  const court6Errored = court6ErrorState?.key === selectedDate;

  const [sheetTarget, setSheetTarget] = useState<SheetTarget | null>(null);
  const [confirmation, setConfirmation] = useState<{
    court: string;
    hour: number;
    courtCount: number;
    amountDue: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAvailability(selectedDate, duration)
      .then((hours) => {
        if (!cancelled) setPoolResult({ key: poolKey, hours });
      })
      .catch(() => {
        if (!cancelled) setPoolError({ key: poolKey });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, duration, poolKey]);

  useEffect(() => {
    let cancelled = false;
    fetchCourt6Availability(selectedDate)
      .then((busy) => {
        if (!cancelled) setCourt6Result({ key: selectedDate, busy });
      })
      .catch(() => {
        if (!cancelled) setCourt6ErrorState({ key: selectedDate });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function handlePickCustomDate(dateISO: string) {
    setExtraChips((prev) =>
      prev.some((c) => c.date === dateISO) || baseChips.some((c) => c.date === dateISO)
        ? prev
        : [...prev, { date: dateISO, label: formatChipLabel(dateISO) }]
    );
    setSelectedDate(dateISO);
  }

  function handleSelectPoolHour(hour: AvailabilityHour) {
    if (hour.free_count <= 0) return;
    setSheetTarget({ court: "pool", hour: hour.hour, maxCourtCount: hour.free_count, separatedAt: hour.separated_at });
  }

  function handleSelectCourt6Hour(hour: number) {
    setSheetTarget({ court: "court6", hour, maxCourtCount: 1, separatedAt: null });
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Sevendays Badminton</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Pick a time, how long, and how many courts — we&apos;ll sort out the rest.
        </p>
      </header>

      <section className="mb-6">
        <DateStrip chips={chips} selectedDate={selectedDate} onSelect={setSelectedDate} onPickCustomDate={handlePickCustomDate} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">Courts 1–5</h2>
        <div className="mb-3">
          <DurationSelector value={duration} onChange={setDuration} />
        </div>
        <div className="mb-3">
          <AvailabilityLegend />
        </div>
        {poolErrored && <p className="text-sm text-red-600">Couldn&apos;t load availability. Try again in a moment.</p>}
        {!poolErrored && !poolHours && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        )}
        {poolHours && (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {poolHours.map((h) => (
              <PoolHourRow key={h.hour} hour={h} onSelect={handleSelectPoolHour} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">Court 6</h2>
        {court6Errored && <p className="text-sm text-red-600">Couldn&apos;t load Court 6.</p>}
        {!court6Errored && court6Busy && <Court6Row busyHours={court6Busy} onSelect={handleSelectCourt6Hour} />}
      </section>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Court numbers are assigned automatically when you book. We keep your group&apos;s courts next to each other whenever we can.
      </p>

      <RequestSheet
        key={sheetTarget ? `${sheetTarget.court}-${sheetTarget.hour}` : "closed"}
        target={sheetTarget}
        date={selectedDate}
        durationMinutes={duration}
        onClose={() => setSheetTarget(null)}
        onSuccess={(info) => {
          setSheetTarget(null);
          setConfirmation({ court: info.court, hour: info.hour, courtCount: info.courtCount, amountDue: info.amountDue });
        }}
      />

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-neutral-900">
            <p className="mb-1 text-lg font-semibold">Request received</p>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {confirmation.court === "court6" ? "Court 6" : `${confirmation.courtCount} court${confirmation.courtCount > 1 ? "s" : ""}`} at{" "}
              {formatHourLabel(confirmation.hour)}. Amount due: ฿{confirmation.amountDue}.
            </p>
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">Payment step is coming soon — hold on to this.</p>
            <button
              type="button"
              onClick={() => setConfirmation(null)}
              className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
