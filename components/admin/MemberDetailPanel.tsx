"use client";

import { useEffect, useState } from "react";
import {
  fetchMemberDetail,
  fetchPackageTypes,
  assignPackageToMember,
  type AdminMemberDetail,
  type AdminPackageType,
} from "@/lib/client/admin-api";
import { formatHourLabel } from "@/lib/client/dates";

interface MemberDetailPanelProps {
  memberId: string;
  onClose: () => void;
  onChanged: () => void;
}

export function MemberDetailPanel({ memberId, onClose, onChanged }: MemberDetailPanelProps) {
  const [member, setMember] = useState<AdminMemberDetail | null>(null);
  const [packageTypes, setPackageTypes] = useState<AdminPackageType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchMemberDetail(memberId).then(setMember);
    fetchPackageTypes().then((types) => {
      setPackageTypes(types);
      if (types.length > 0) setSelectedTypeId(types[0].id);
    });
  }, [memberId]);

  async function handleAssign() {
    if (!selectedTypeId) return;
    setBusy(true);
    setError(null);
    const result = await assignPackageToMember(memberId, selectedTypeId);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Failed to assign package.");
      return;
    }
    const refreshed = await fetchMemberDetail(memberId);
    setMember(refreshed);
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-neutral-900 sm:rounded-2xl">
        {!member ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
        ) : (
          <>
            <h2 className="text-lg font-semibold">{member.name}</h2>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              @{member.username} · {member.phone}
            </p>

            <div className="mb-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <h3 className="mb-2 text-sm font-semibold">Assign a package</h3>
              <div className="flex gap-2">
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
                >
                  {packageTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.hours}h, {t.validityDays}d)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !selectedTypeId}
                  onClick={handleAssign}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Assign
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            </div>

            <h3 className="mb-2 text-sm font-semibold">Packages</h3>
            <div className="mb-4 space-y-2">
              {member.packages.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No packages yet.</p>}
              {member.packages.map((p) => (
                <div key={p.id} className="rounded-lg border border-neutral-200 p-2 text-sm dark:border-neutral-800">
                  <p className="font-medium">{p.packageTypeName}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {p.hoursRemaining}h remaining · expires {new Date(p.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="mb-2 text-sm font-semibold">Bookings paid from packages</h3>
            <div className="space-y-1">
              {member.bookingsPaidFromPackages.length === 0 && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">None yet.</p>
              )}
              {member.bookingsPaidFromPackages.map((b) => (
                <p key={b.id} className="text-xs text-neutral-500 dark:text-neutral-400">
                  {b.date} · {formatHourLabel(b.startHour)} · {b.durationMinutes / 60}h ·{" "}
                  {b.court === "court6" ? "Court 6" : "Pool"}
                </p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
