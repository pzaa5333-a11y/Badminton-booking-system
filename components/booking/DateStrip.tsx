"use client";

import type { DateChip } from "@/lib/client/dates";

interface DateStripProps {
  chips: DateChip[];
  selectedDate: string;
  onSelect: (date: string) => void;
  onPickCustomDate: (date: string) => void;
}

export function DateStrip({ chips, selectedDate, onSelect, onPickCustomDate }: DateStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
      {chips.map((chip) => {
        const active = chip.date === selectedDate;
        return (
          <button
            key={chip.date}
            type="button"
            onClick={() => onSelect(chip.date)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-600 text-white"
                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
      <label
        className="relative shrink-0 flex items-center justify-center rounded-full w-10 h-10 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer text-base"
        aria-label="Pick a date"
      >
        <span aria-hidden>📅</span>
        <input
          type="date"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => {
            if (e.target.value) onPickCustomDate(e.target.value);
          }}
        />
      </label>
    </div>
  );
}
