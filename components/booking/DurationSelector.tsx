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
            className={`flex-1 rounded-2xl py-3 text-base font-bold transition-colors ${
              active
                ? "bg-brand-sport text-white shadow-sm"
                : "bg-brand-soft text-brand-deep dark:bg-neutral-800 dark:text-neutral-200"
            }`}
          >
            {LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}
