const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export interface DateChip {
  date: string;
  label: string;
  /** "Sep 22" — shown beneath `label` (§2.2), so a chip always names both
   * the relative day and the actual date. */
  dateLabel: string;
}

export function formatHourLabel(hour: number): string {
  return `${String(hour % 24).padStart(2, "0")}:00`;
}

export function formatChipLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Weekday short name for a date outside the default 7-day strip (a
 * custom date picked via the calendar input). */
export function formatWeekdayLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return WEEKDAY_LABELS[d.getDay()];
}

/** Today, Tomorrow, then named weekdays out to 7 days total (§3.2). */
export function defaultDateStrip(today: Date): DateChip[] {
  const chips: DateChip[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : WEEKDAY_LABELS[d.getDay()];
    const dateISO = formatDateISO(d);
    chips.push({ date: dateISO, label, dateLabel: formatChipLabel(dateISO) });
  }
  return chips;
}
