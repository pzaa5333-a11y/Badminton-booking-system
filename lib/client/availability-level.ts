import { POOL_SIZE } from "@/lib/types";

export type AvailabilityLevel = "plenty" | "filling" | "last" | "full";

export function availabilityLevel(freeCount: number): AvailabilityLevel {
  if (freeCount <= 0) return "full";
  if (freeCount === 1) return "last";
  if (freeCount <= POOL_SIZE - 2) return "filling";
  return "plenty";
}

export const LEVEL_LABEL: Record<AvailabilityLevel, string> = {
  plenty: "Plenty open",
  filling: "Filling up",
  last: "1 left",
  full: "Full",
};

export const LEVEL_BAR_CLASS: Record<AvailabilityLevel, string> = {
  plenty: "bg-emerald-500",
  filling: "bg-amber-500",
  last: "bg-orange-500",
  full: "bg-neutral-300 dark:bg-neutral-700",
};
