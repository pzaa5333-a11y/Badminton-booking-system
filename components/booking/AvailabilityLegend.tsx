import { LEVEL_BAR_CLASS, LEVEL_LABEL, type AvailabilityLevel } from "@/lib/client/availability-level";

const LEVELS: AvailabilityLevel[] = ["plenty", "filling", "last", "full"];

export function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
      {LEVELS.map((level) => (
        <span key={level} className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${LEVEL_BAR_CLASS[level]}`} />
          {LEVEL_LABEL[level]}
        </span>
      ))}
    </div>
  );
}
