"use client";

import { CLOSING_HOUR, OPENING_HOUR } from "@/lib/types";
import { formatHourLabel } from "@/lib/client/dates";

interface Court6RowProps {
  busyHours: number[];
  onSelect: (hour: number) => void;
}

export function Court6Row({ busyHours, onSelect }: Court6RowProps) {
  const hours = Array.from({ length: CLOSING_HOUR - OPENING_HOUR }, (_, i) => OPENING_HOUR + i);
  const busy = new Set(busyHours);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
      {hours.map((h) => {
        const isBusy = busy.has(h);
        return (
          <button
            key={h}
            type="button"
            disabled={isBusy}
            onClick={() => onSelect(h)}
            className={`shrink-0 rounded-md px-2.5 py-2 text-xs font-medium tabular-nums transition-colors ${
              isBusy
                ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            {formatHourLabel(h)}
          </button>
        );
      })}
    </div>
  );
}
