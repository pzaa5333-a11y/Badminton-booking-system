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
            <th className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left dark:bg-neutral-950">Court</th>
            {hours.map((h) => (
              <th key={h} className="px-1 py-1.5 text-center font-normal text-neutral-500 dark:text-neutral-400">
                {formatHourLabel(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COURTS.map((court) => (
            <tr key={court}>
              <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium dark:bg-neutral-950">{court}</td>
              {hours.map((h) => {
                const booking = cellMap.get(`${court}-${h}`);
                return (
                  <td key={h} className="p-0.5">
                    {booking ? (
                      <button
                        type="button"
                        onClick={() => onSelectBooking(booking)}
                        className={`w-16 truncate rounded px-1 py-1.5 text-left ${statusClass(booking.status, booking.gapPolicyFlag)}`}
                        title={`${booking.customerName} · ${booking.status}`}
                      >
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
