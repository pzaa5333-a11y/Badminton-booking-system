"use client";

import type { DateChip } from "@/lib/client/dates";

interface DateStripProps {
  chips: DateChip[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

export function DateStrip({ chips, selectedDate, onSelect }: DateStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
      {chips.map((chip) => {
        const active = chip.date === selectedDate;
        return (
          <button
            key={chip.date}
            type="button"
            onClick={() => onSelect(chip.date)}
            className={`shrink-0 rounded-2xl px-4 py-2 text-center text-sm font-semibold transition-colors ${
              active ? "bg-brand-sport text-white" : "bg-white text-brand-deep shadow-sm dark:bg-neutral-800 dark:text-neutral-200"
            }`}
          >
            <span className="block">{chip.label}</span>
            <span className={`block text-xs font-normal ${active ? "text-white/80" : "text-neutral-500 dark:text-neutral-400"}`}>
              {chip.dateLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
