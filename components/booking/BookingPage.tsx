"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DurationMinutes } from "@/lib/types";
import { defaultDateStrip, formatChipLabel, formatWeekdayLabel, type DateChip } from "@/lib/client/dates";
import { fetchAvailability, fetchCourt6Availability, type AvailabilityHour } from "@/lib/client/api";
import { DateStrip } from "./DateStrip";
import { DurationSelector } from "./DurationSelector";
import { AvailabilityLegend } from "./AvailabilityLegend";
import { PoolHourRow } from "./PoolHourRow";
import { Court6Row } from "./Court6Row";
import { RequestSheet, type SheetTarget } from "./RequestSheet";

export function BookingPage() {
  const router = useRouter();
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
        : [...prev, { date: dateISO, label: formatWeekdayLabel(dateISO), dateLabel: formatChipLabel(dateISO) }]
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

  function scrollToCourt6() {
    document.getElementById("court-6")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-md pt-6 pb-24">
      <header
        className="relative mb-6 overflow-hidden bg-[url('/images/hero-bg.webp')] bg-cover bg-bottom px-4 pb-8 pt-2"
      >
        <div className="relative z-10 max-w-[65%]">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-deep">
            Find your court,
            <br />
            play your game.
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Pick a time, how long, and how many courts — we&apos;ll sort out the rest.
          </p>
        </div>
        <img
          src="/images/mascot.png"
          alt=""
          className="absolute -right-2 top-2 h-28 w-28 object-contain sm:h-32 sm:w-32"
        />
      </header>

      <div className="px-4">
        <div className="mb-3 flex justify-end">
          <label
            className="relative flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-brand-deep shadow-sm dark:bg-neutral-800 dark:text-neutral-200"
            aria-label="Pick a date"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2" y="3" width="12" height="11" rx="1.5" />
              <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
            </svg>
            Pick a date
            <input
              type="date"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                if (e.target.value) handlePickCustomDate(e.target.value);
              }}
            />
          </label>
        </div>

        <section className="mb-6">
          <DateStrip chips={chips} selectedDate={selectedDate} onSelect={setSelectedDate} />
        </section>

        <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <h2 className="mb-3 flex items-baseline gap-1.5 text-base font-semibold text-brand-deep">
            Courts 1–5
            <button type="button" onClick={scrollToCourt6} className="text-xs font-semibold text-brand-sport underline">
              (Court 6)
            </button>
          </h2>
          <div className="mb-3">
            <DurationSelector value={duration} onChange={setDuration} />
          </div>
          <div className="mb-3">
            <AvailabilityLegend />
          </div>
          {poolErrored && <p className="text-sm text-brand-red">Couldn&apos;t load availability. Try again in a moment.</p>}
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
                <PoolHourRow key={h.hour} hour={h} date={selectedDate} onSelect={handleSelectPoolHour} />
              ))}
            </div>
          )}
        </section>

        <section id="court-6" className="mb-6 scroll-mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <h2 className="mb-3 text-base font-semibold text-brand-deep">Court 6</h2>
          {court6Errored && <p className="text-sm text-brand-red">Couldn&apos;t load Court 6.</p>}
          {!court6Errored && court6Busy && (
            <Court6Row busyHours={court6Busy} date={selectedDate} onSelect={handleSelectCourt6Hour} />
          )}
        </section>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Court numbers are assigned automatically when you book. We keep your group&apos;s courts next to each other whenever we can.
        </p>
      </div>

      <RequestSheet
        key={sheetTarget ? `${sheetTarget.court}-${sheetTarget.hour}` : "closed"}
        target={sheetTarget}
        date={selectedDate}
        durationMinutes={duration}
        onClose={() => setSheetTarget(null)}
        onSuccess={(info) => {
          setSheetTarget(null);
          router.push(`/booking/${info.bookingId}`);
        }}
      />
    </div>
  );
}
