"use client";

import { DURATION_OPTIONS, type DurationMinutes } from "@/lib/types";

interface DurationSelectorProps {
  value: DurationMinutes;
  onChange: (v: DurationMinutes) => void;
}

const LABELS: Record<DurationMinutes, string> = { 60: "1h", 120: "2h", 180: "3h", 240: "4h" };

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <div className="flex gap-2">
      {DURATION_OPTIONS.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-emerald-600 text-white"
                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            }`}
          >
            {LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}
