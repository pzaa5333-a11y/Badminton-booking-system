"use client";

import { CLOSING_HOUR, OPENING_HOUR } from "@/lib/types";
import { formatHourLabel } from "@/lib/client/dates";
import type { AdminScheduleBooking } from "@/lib/client/admin-api";

interface ScheduleGridProps {
  bookings: AdminScheduleBooking[];
  onSelectBooking: (booking: AdminScheduleBooking) => void;
}

const COURTS = [1, 2, 3, 4, 5, 6];

function bookingHours(b: AdminScheduleBooking): number[] {
  const hours = b.durationMinutes / 60;
  return Array.from({ length: hours }, (_, i) => b.startHour + i);
}

/** Walk-ins (paid cash, confirmed immediately at the counter) get their
 * own color, distinct from a web booking that's also confirmed (paid
 * online via transfer/package) — so admin can tell at a glance which
 * courts were booked in person vs online, not just what's paid vs not.
 *
 * The customer name itself always renders in a fixed high-contrast color
 * (see the button's className below) — status is conveyed by the cell's
 * background tint plus the lock/needs-review icons, which still use this
 * status color, rather than by the name text color (§ name legibility). */
function statusBgClass(status: string, gapFlag: boolean, paymentMethod: string | null): string {
  if (gapFlag) return "bg-brand-red/10";
  if (status === "confirmed" || status === "paid") {
    if (paymentMethod === "cash") return "bg-brand-sport/10";
    return "bg-brand-green/10";
  }
  return "bg-brand-yellow/25"; // held
}

function statusIconClass(status: string, gapFlag: boolean, paymentMethod: string | null): string {
  if (gapFlag) return "text-brand-red";
  if (status === "confirmed" || status === "paid") {
    if (paymentMethod === "cash") return "text-brand-sport";
    return "text-brand-green";
  }
  return "text-brand-deep"; // held
}

export function ScheduleGrid({ bookings, onSelectBooking }: ScheduleGridProps) {
  const hours = Array.from({ length: CLOSING_HOUR - OPENING_HOUR }, (_, i) => OPENING_HOUR + i);

  const cellMap = new Map<string, AdminScheduleBooking>();
  for (const b of bookings) {
    const courts = b.court === "court6" ? [6] : b.courtNumbers;
    for (const c of courts) {
      for (const h of bookingHours(b)) {
        cellMap.set(`${c}-${h}`, b);
      }
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left dark:bg-neutral-950">Time</th>
            {COURTS.map((court) => (
              <th key={court} className="px-1 py-1.5 text-center font-normal text-neutral-500 dark:text-neutral-400">
                {court}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h}>
              <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium dark:bg-neutral-950">{formatHourLabel(h)}</td>
              {COURTS.map((court) => {
                const booking = cellMap.get(`${court}-${h}`);
                return (
                  <td key={court} className="p-0.5">
                    {booking ? (
                      <button
                        type="button"
                        onClick={() => onSelectBooking(booking)}
                        className={`relative w-16 truncate rounded px-1 py-1.5 text-left text-neutral-900 dark:text-neutral-100 ${statusBgClass(booking.status, booking.gapPolicyFlag, booking.paymentMethod)}`}
                        title={`${booking.customerName} · ${booking.status}${booking.locked ? " · locked" : ""}`}
                      >
                        {booking.locked && (
                          <svg
                            viewBox="0 0 12 12"
                            className={`absolute right-0.5 top-0.5 h-2.5 w-2.5 opacity-80 ${statusIconClass(booking.status, booking.gapPolicyFlag, booking.paymentMethod)}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          >
                            <rect x="2.5" y="5.5" width="7" height="5" rx="0.5" />
                            <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
                          </svg>
                        )}
                        {booking.needsAttention && (
                          <span
                            className="absolute left-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-brand-yellow"
                            title="Needs review"
                          />
                        )}
                        {booking.customerName}
                      </button>
                    ) : (
                      <div className="w-16 rounded bg-neutral-50 px-1 py-1.5 dark:bg-neutral-900">&nbsp;</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
