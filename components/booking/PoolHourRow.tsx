"use client";

import { POOL_SIZE } from "@/lib/types";
import { formatHourLabel } from "@/lib/client/dates";
import { availabilityLevel, LEVEL_BAR_CLASS } from "@/lib/client/availability-level";
import { hourlyRate } from "@/lib/pricing";
import type { AvailabilityHour } from "@/lib/client/api";

interface PoolHourRowProps {
  hour: AvailabilityHour;
  date: string;
  onSelect: (hour: AvailabilityHour) => void;
}

export function PoolHourRow({ hour, date, onSelect }: PoolHourRowProps) {
  const level = availabilityLevel(hour.free_count);
  const disabled = hour.free_count <= 0;
  const pct = Math.round((hour.free_count / POOL_SIZE) * 100);
  const price = hourlyRate(date, hour.hour, "pool");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(hour)}
      className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-brand-soft dark:hover:bg-neutral-800/60 active:bg-brand-soft/70 dark:active:bg-neutral-800"
      }`}
    >
      <span className="w-14 shrink-0 rounded-full bg-brand-soft px-2 py-1 text-center text-sm font-semibold text-brand-deep tabular-nums dark:bg-neutral-800 dark:text-neutral-200">
        {formatHourLabel(hour.hour)}
      </span>
      <span className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <span className={`block h-full rounded-full ${LEVEL_BAR_CLASS[level]}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-24 shrink-0 text-right">
        <span className="block text-xs text-neutral-500 dark:text-neutral-400">{disabled ? "Full" : `${hour.free_count} open`}</span>
        <span className="block text-[11px] text-neutral-400 dark:text-neutral-500">฿{price}/court</span>
      </span>
    </button>
  );
}
