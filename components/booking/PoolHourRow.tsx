"use client";

import { POOL_SIZE } from "@/lib/types";
import { formatHourLabel } from "@/lib/client/dates";
import { availabilityLevel, LEVEL_BAR_CLASS } from "@/lib/client/availability-level";
import type { AvailabilityHour } from "@/lib/client/api";

interface PoolHourRowProps {
  hour: AvailabilityHour;
  onSelect: (hour: AvailabilityHour) => void;
}

export function PoolHourRow({ hour, onSelect }: PoolHourRowProps) {
  const level = availabilityLevel(hour.free_count);
  const disabled = hour.free_count <= 0;
  const pct = Math.round((hour.free_count / POOL_SIZE) * 100);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(hour)}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60 active:bg-neutral-100 dark:active:bg-neutral-800"
      }`}
    >
      <span className="w-12 shrink-0 text-sm font-medium tabular-nums">{formatHourLabel(hour.hour)}</span>
      <span className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <span className={`block h-full rounded-full ${LEVEL_BAR_CLASS[level]}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-20 shrink-0 text-right text-xs text-neutral-500 dark:text-neutral-400">
        {disabled ? "Full" : `${hour.free_count} open`}
      </span>
    </button>
  );
}
