import { formatHourLabel } from "@/lib/client/dates";

interface BookingSummaryCardProps {
  date: string;
  startHour: number;
  durationMinutes: number;
  courtLabel: string;
  amountDue: number;
}

/** A deliberately large, hard-to-misread recap of what's being paid for —
 * replaces the previous one-line header, and is reused inside both
 * payment confirm steps so the customer sees the same clear summary right
 * before paying (§ payment page redesign). */
export function BookingSummaryCard({ date, startHour, durationMinutes, courtLabel, amountDue }: BookingSummaryCardProps) {
  return (
    <div className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-neutral-500 dark:text-neutral-400">Date</dt>
        <dd className="text-right text-base font-semibold">{date}</dd>

        <dt className="text-neutral-500 dark:text-neutral-400">Time</dt>
        <dd className="text-right text-base font-semibold">
          {formatHourLabel(startHour)} · {durationMinutes / 60}h
        </dd>

        <dt className="text-neutral-500 dark:text-neutral-400">Courts</dt>
        <dd className="text-right text-base font-semibold">{courtLabel}</dd>

        <dt className="text-neutral-500 dark:text-neutral-400">Amount due</dt>
        <dd className="text-right text-xl font-bold">฿{amountDue}</dd>
      </dl>
    </div>
  );
}
