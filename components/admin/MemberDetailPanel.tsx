"use client";

import { useEffect, useState } from "react";
import {
  fetchMemberDetail,
  fetchPackageTypes,
  assignPackageToMember,
  revokeMemberPackage,
  setMemberPackageHours,
  type AdminMemberDetail,
  type AdminPackageType,
} from "@/lib/client/admin-api";
import { DISPLAY_LOCALE, formatHourLabel } from "@/lib/client/dates";

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
  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null);
  const [editingHoursId, setEditingHoursId] = useState<string | null>(null);
  const [hoursInput, setHoursInput] = useState("");

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

  async function handleRevoke(packageId: string) {
    setBusy(true);
    setError(null);
    const result = await revokeMemberPackage(memberId, packageId);
    setBusy(false);
    setConfirmingRevokeId(null);
    if (!result.ok) {
      setError(result.message ?? "Failed to revoke package.");
      return;
    }
    const refreshed = await fetchMemberDetail(memberId);
    setMember(refreshed);
    onChanged();
  }

  async function handleSaveHours(packageId: string) {
    const hours = Number(hoursInput);
    if (!Number.isInteger(hours) || hours < 0) {
      setError("Hours must be a non-negative whole number.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await setMemberPackageHours(memberId, packageId, hours);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Failed to update hours.");
      return;
    }
    setEditingHoursId(null);
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
                  className="rounded-lg bg-brand-sport px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
                  <p className="font-medium">
                    {p.packageTypeName}
                    {p.revoked && <span className="ml-1 text-xs font-normal text-red-600">(revoked)</span>}
                  </p>

                  {editingHoursId === p.id ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                        className="w-20 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
                      />
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        h remaining · expires {new Date(p.expiresAt).toLocaleDateString(DISPLAY_LOCALE)}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSaveHours(p.id)}
                        className="rounded-lg bg-brand-sport px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingHoursId(null)}
                        className="text-xs text-neutral-500 underline dark:text-neutral-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {p.hoursRemaining}h remaining · expires {new Date(p.expiresAt).toLocaleDateString(DISPLAY_LOCALE)}
                    </p>
                  )}

                  {!p.revoked && (
                    <div className="mt-1.5 flex gap-3">
                      {editingHoursId !== p.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHoursId(p.id);
                            setHoursInput(String(p.hoursRemaining));
                          }}
                          className="text-xs text-neutral-500 underline dark:text-neutral-400"
                        >
                          Edit hours
                        </button>
                      )}
                      {confirmingRevokeId === p.id ? (
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-amber-600 dark:text-amber-400">Revoke this package?</span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRevoke(p.id)}
                            className="font-semibold text-red-600 underline disabled:opacity-60"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingRevokeId(null)}
                            className="text-neutral-500 underline dark:text-neutral-400"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingRevokeId(p.id)}
                          className="text-xs text-red-600 underline"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  )}
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
