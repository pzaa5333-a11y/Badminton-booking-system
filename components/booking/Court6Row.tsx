"use client";

import { CLOSING_HOUR, OPENING_HOUR } from "@/lib/types";
import { formatHourLabel } from "@/lib/client/dates";
import { hourlyRate } from "@/lib/pricing";

interface Court6RowProps {
  busyHours: number[];
  date: string;
  onSelect: (hour: number) => void;
}

export function Court6Row({ busyHours, date, onSelect }: Court6RowProps) {
  const hours = Array.from({ length: CLOSING_HOUR - OPENING_HOUR }, (_, i) => OPENING_HOUR + i);
  const busy = new Set(busyHours);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
      {hours.map((h) => {
        const isBusy = busy.has(h);
        const price = hourlyRate(date, h, "court6");
        return (
          <button
            key={h}
            type="button"
            disabled={isBusy}
            onClick={() => onSelect(h)}
            className={`shrink-0 rounded-xl px-2.5 py-2 text-center text-xs font-medium tabular-nums transition-colors ${
              isBusy
                ? "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed"
                : "bg-brand-soft text-brand-deep hover:bg-brand-sport/10 dark:bg-neutral-800 dark:text-neutral-200"
            }`}
          >
            <span className="block">{formatHourLabel(h)}</span>
            {!isBusy && <span className="block text-[10px] opacity-70">฿{price}</span>}
          </button>
        );
      })}
    </div>
  );
}
