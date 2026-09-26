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

function statusClass(status: string, gapFlag: boolean): string {
  if (gapFlag) return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  if (status === "confirmed" || status === "paid") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  }
  return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"; // held
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
                        className={`relative w-16 truncate rounded px-1 py-1.5 text-left ${statusClass(booking.status, booking.gapPolicyFlag)}`}
                        title={`${booking.customerName} · ${booking.status}${booking.locked ? " · locked" : ""}`}
                      >
                        {booking.locked && (
                          <svg
                            viewBox="0 0 12 12"
                            className="absolute right-0.5 top-0.5 h-2.5 w-2.5 opacity-70"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          >
                            <rect x="2.5" y="5.5" width="7" height="5" rx="0.5" />
                            <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
                          </svg>
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
