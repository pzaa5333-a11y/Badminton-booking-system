"use client";

import { Fragment, useEffect, useState } from "react";
import { fetchAdminSummary, type AdminSummary } from "@/lib/client/admin-api";
import { formatDateISO } from "@/lib/client/dates";
import { CLOSING_HOUR, OPENING_HOUR } from "@/lib/types";

type RangePreset = "day" | "week" | "month" | "custom";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function rangeForPreset(preset: RangePreset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date();
  const to = formatDateISO(today);
  if (preset === "day") return { from: to, to };
  if (preset === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: formatDateISO(start), to };
  }
  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: formatDateISO(start), to };
  }
  return { from: customFrom, to: customTo };
}

/** Simple horizontal bar list — single brand color, direct value labels,
 * so no legend is needed for a one-series list (§dataviz form heuristic). */
function BarList({ items, max, formatValue }: { items: { label: string; value: number }[]; max: number; formatValue: (v: number) => string }) {
  if (items.length === 0) return <p className="text-sm text-neutral-500 dark:text-neutral-400">No data for this range.</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-0.5 flex items-baseline justify-between text-xs">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.label}</span>
            <span className="font-semibold">{formatValue(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-brand-sport"
              style={{ width: max > 0 ? `${Math.max(4, (item.value / max) * 100)}%` : "0%" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SummaryTab() {
  const [preset, setPreset] = useState<RangePreset>("month");
  const [customFrom, setCustomFrom] = useState(formatDateISO(new Date()));
  const [customTo, setCustomTo] = useState(formatDateISO(new Date()));
  const [result, setResult] = useState<{ key: string; summary: AdminSummary } | null>(null);

  const { from, to } = rangeForPreset(preset, customFrom, customTo);
  const rangeKey = `${from}|${to}`;
  const summary = result?.key === rangeKey ? result.summary : null;
  const loading = summary === null;

  useEffect(() => {
    let cancelled = false;
    fetchAdminSummary(from, to).then((s) => {
      if (!cancelled) setResult({ key: `${from}|${to}`, summary: s });
    });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const hours = Array.from({ length: CLOSING_HOUR - OPENING_HOUR }, (_, i) => OPENING_HOUR + i);
  const maxHeat = summary ? Math.max(1, ...summary.peak.heatmap.flatMap((row) => row.slice(OPENING_HOUR, CLOSING_HOUR))) : 1;

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-brand-deep">Summary</h2>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          {(["day", "week", "month", "custom"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={`rounded-lg px-3 py-1 text-sm font-medium capitalize ${preset === p ? "bg-white text-brand-deep shadow dark:bg-neutral-700" : ""}`}
            >
              {p}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-xl border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
            />
            <span className="text-neutral-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-xl border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
            />
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>}

      {!loading && summary && (
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Revenue &amp; audit trail</h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-3 text-center">
                <p className="text-xl font-bold text-brand-green">฿{summary.revenue.totalConfirmed}</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">confirmed</p>
              </div>
              <div className="rounded-2xl border border-brand-red/30 bg-brand-red/5 p-3 text-center">
                <p className="text-xl font-bold text-brand-red">฿{summary.revenue.totalCancelled}</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">cancelled</p>
              </div>
            </div>
            <p className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">By payment method</p>
            <BarList
              items={summary.revenue.byPaymentMethod.map((m) => ({ label: m.label, value: m.amount }))}
              max={Math.max(1, ...summary.revenue.byPaymentMethod.map((m) => m.amount))}
              formatValue={(v) => `฿${v}`}
            />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Peak times</h3>
            <div className="overflow-x-auto">
              <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `2.5rem repeat(${hours.length}, 1.1rem)` }}>
                <div />
                {hours.map((h) => (
                  <div key={h} className="text-center text-[8px] text-neutral-400">
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
                {DAY_LABELS.map((day, dow) => (
                  <Fragment key={day}>
                    <div className="pr-1 text-[10px] text-neutral-500 dark:text-neutral-400">{day}</div>
                    {hours.map((h) => {
                      const v = summary.peak.heatmap[dow][h];
                      const intensity = v / maxHeat;
                      return (
                        <div
                          key={`${day}-${h}`}
                          title={`${day} ${h}:00 — ${v} court-hour${v === 1 ? "" : "s"}`}
                          className="h-4 w-4 rounded-sm bg-brand-sport"
                          style={{ opacity: v === 0 ? 0.06 : 0.15 + intensity * 0.85 }}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
            <p className="mt-2 mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Busiest hours</p>
            <BarList
              items={summary.peak.busiestHours.map((h) => ({ label: `${String(h.hour).padStart(2, "0")}:00`, value: h.count }))}
              max={Math.max(1, ...summary.peak.busiestHours.map((h) => h.count))}
              formatValue={(v) => `${v}`}
            />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Top customers</h3>
            {summary.topCustomers.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No confirmed bookings in this range.</p>
            ) : (
              <div className="space-y-1.5">
                {summary.topCustomers.map((c, i) => (
                  <div
                    key={c.customerId}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-400">#{i + 1}</span>
                      <span className="font-medium">{c.name}</span>
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {c.sessionCount} session{c.sessionCount > 1 ? "s" : ""} · <span className="font-semibold text-brand-deep">฿{c.amountSpent}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
