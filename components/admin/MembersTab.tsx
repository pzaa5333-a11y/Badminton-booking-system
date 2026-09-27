"use client";

import { useEffect, useState } from "react";
import {
  fetchMembers,
  fetchAllPackageTypes,
  setPackageTypeActive,
  type AdminMember,
  type AdminPackageType,
} from "@/lib/client/admin-api";
import { NewMemberForm } from "./NewMemberForm";
import { NewPackageTypeForm } from "./NewPackageTypeForm";
import { EditPackageTypeForm } from "./EditPackageTypeForm";
import { MemberDetailPanel } from "./MemberDetailPanel";

export function MembersTab() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [packageTypes, setPackageTypes] = useState<AdminPackageType[]>([]);
  const [tick, setTick] = useState(0);
  const [showNewMember, setShowNewMember] = useState(false);
  const [showNewPackageType, setShowNewPackageType] = useState(false);
  const [editingPackageType, setEditingPackageType] = useState<AdminPackageType | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers().then(setMembers);
    fetchAllPackageTypes().then(setPackageTypes);
  }, [tick]);

  async function handleToggleActive(pt: AdminPackageType) {
    await setPackageTypeActive(pt.id, !pt.active);
    setTick((t) => t + 1);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowNewMember(true)}
          className="rounded-lg bg-brand-sport px-3 py-1.5 text-sm font-semibold text-white"
        >
          + New member
        </button>
        <button
          type="button"
          onClick={() => setShowNewPackageType(true)}
          className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium dark:bg-neutral-800"
        >
          + New package type
        </button>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">Package types</h2>
        <div className="space-y-2">
          {packageTypes.map((pt) => (
            <div
              key={pt.id}
              className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
                pt.active
                  ? "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                  : "border-neutral-200 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900"
              }`}
            >
              <div>
                <span className="font-medium">{pt.name}</span>
                <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {pt.hours}h · {pt.validityDays}d{pt.price !== null ? ` · ฿${pt.price}` : ""}
                  {!pt.active && " · deactivated"}
                </span>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingPackageType(pt)}
                  className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium dark:bg-neutral-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(pt)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    pt.active
                      ? "bg-brand-red/10 text-brand-red"
                      : "bg-brand-green/10 text-brand-green"
                  }`}
                >
                  {pt.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          ))}
          {packageTypes.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No package types yet.</p>}
        </div>
      </div>

      <div className="space-y-2">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedMemberId(m.id)}
            className="block w-full rounded-lg border border-neutral-200 bg-white p-3 text-left text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{m.name}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">@{m.username}</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {m.activePackages.length === 0
                ? "No active packages"
                : m.activePackages.map((p) => `${p.packageTypeName}: ${p.hoursRemaining}h left`).join(" · ")}
            </p>
          </button>
        ))}
        {members.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No members yet.</p>}
      </div>

      {showNewMember && (
        <NewMemberForm onClose={() => setShowNewMember(false)} onCreated={() => setTick((t) => t + 1)} />
      )}
      {showNewPackageType && (
        <NewPackageTypeForm onClose={() => setShowNewPackageType(false)} onCreated={() => setTick((t) => t + 1)} />
      )}
      {editingPackageType && (
        <EditPackageTypeForm
          packageType={editingPackageType}
          onClose={() => setEditingPackageType(null)}
          onSaved={() => setTick((t) => t + 1)}
        />
      )}
      {selectedMemberId && (
        <MemberDetailPanel
          memberId={selectedMemberId}
          onClose={() => setSelectedMemberId(null)}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  );
}
