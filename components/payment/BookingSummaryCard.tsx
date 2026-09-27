import { formatHourLabel } from "@/lib/client/dates";

interface BookingSummaryCardProps {
  date: string;
  startHour: number;
  durationMinutes: number;
  courtLabel: string;
  amountDue: number;
  /** Formatted "m:ss" countdown — shown as a pill in the card header when
   * provided (only relevant on the still-held payment step, not the
   * confirm-slip or confirmed views that reuse this same card). */
  holdCountdown?: string | null;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-brand-sport" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-brand-sport" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CourtsIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-brand-sport" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="3" width="13" height="10" rx="1.2" />
      <path d="M8 3v10M1.5 8h13" />
    </svg>
  );
}

/** A deliberately large, hard-to-misread recap of what's being paid for —
 * reused across the still-held payment step, the confirm-slip step, and
 * the confirmed-booking screen so the customer sees the same clear
 * summary throughout (§ payment page redesign). */
export function BookingSummaryCard({ date, startHour, durationMinutes, courtLabel, amountDue, holdCountdown }: BookingSummaryCardProps) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 bg-brand-sport/5 px-4 py-2.5 dark:bg-brand-sport/10">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-deep">
          <CalendarIcon /> Booking summary
        </h2>
        {holdCountdown && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <ClockIcon /> Hold expires in <span className="tabular-nums">{holdCountdown}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-4 text-sm">
        <div className="flex items-start gap-2">
          <CalendarIcon />
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Date</p>
            <p className="font-semibold">{date}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CourtsIcon />
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Courts</p>
            <p className="font-semibold">{courtLabel}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <ClockIcon />
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Time</p>
            <p className="font-semibold">
              {formatHourLabel(startHour)} · {durationMinutes / 60}h
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Amount due</p>
          <p className="text-xl font-bold text-brand-deep">฿{amountDue}</p>
        </div>
      </div>
    </div>
  );
}
