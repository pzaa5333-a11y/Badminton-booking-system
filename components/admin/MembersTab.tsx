"use client";

import { useEffect, useState } from "react";
import { fetchMembers, fetchPackageTypes, type AdminMember, type AdminPackageType } from "@/lib/client/admin-api";
import { NewMemberForm } from "./NewMemberForm";
import { NewPackageTypeForm } from "./NewPackageTypeForm";
import { MemberDetailPanel } from "./MemberDetailPanel";

export function MembersTab() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [packageTypes, setPackageTypes] = useState<AdminPackageType[]>([]);
  const [tick, setTick] = useState(0);
  const [showNewMember, setShowNewMember] = useState(false);
  const [showNewPackageType, setShowNewPackageType] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers().then(setMembers);
    fetchPackageTypes().then(setPackageTypes);
  }, [tick]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowNewMember(true)}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
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
        <div className="flex flex-wrap gap-2">
          {packageTypes.map((t) => (
            <span key={t.id} className="rounded-full bg-neutral-100 px-3 py-1 text-xs dark:bg-neutral-800">
              {t.name} · {t.hours}h · {t.validityDays}d
            </span>
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
            className="block w-full rounded-lg border border-neutral-200 p-3 text-left text-sm dark:border-neutral-800"
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
