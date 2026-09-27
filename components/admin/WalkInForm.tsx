"use client";

import { useState, type FormEvent } from "react";
import { DURATION_OPTIONS, type CourtSelection, type DurationMinutes } from "@/lib/types";
import { createWalkIn, lookupCustomerByPhone } from "@/lib/client/admin-api";

interface WalkInFormProps {
  date: string;
  onClose: () => void;
  onCreated: () => void;
}

export function WalkInForm({ date, onClose, onCreated }: WalkInFormProps) {
  const [startHour, setStartHour] = useState(9);
  const [duration, setDuration] = useState<DurationMinutes>(60);
  const [court, setCourt] = useState<CourtSelection>("pool");
  const [courtCount, setCourtCount] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set when the typed phone already belongs to a customer under a
  // different name — the admin must pick which name to use before the
  // booking is actually created (§ walk-in name-conflict warning), rather
  // than either name silently winning.
  const [nameConflict, setNameConflict] = useState<{ existingName: string } | null>(null);

  async function submitWalkIn(resolution?: "keep" | "update") {
    setSubmitting(true);
    setError(null);
    const result = await createWalkIn({
      date,
      start_hour: startHour,
      duration_minutes: duration,
      court_count: court === "court6" ? 1 : courtCount,
      court,
      customer_name: name,
      customer_phone: phone,
      name_conflict: resolution,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Failed to create booking.");
      return;
    }
    onCreated();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const lookup = await lookupCustomerByPhone(phone).catch(() => null);
    setSubmitting(false);
    if (lookup?.found && lookup.name !== null && lookup.name !== name) {
      setNameConflict({ existingName: lookup.name });
      return;
    }
    await submitWalkIn();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">New walk-in booking</h2>

        <div className="flex gap-2">
          <select
            value={court}
            onChange={(e) => setCourt(e.target.value as CourtSelection)}
            className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
          >
            <option value="pool">Courts 1–5</option>
            <option value="court6">Court 6</option>
          </select>
          <select
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
          >
            {Array.from({ length: 15 }, (_, i) => 9 + i).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) as DurationMinutes)}
            className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d / 60}h
              </option>
            ))}
          </select>
          {court === "pool" && (
            <select
              value={courtCount}
              onChange={(e) => setCourtCount(Number(e.target.value))}
              className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} court{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameConflict(null);
          }}
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />
        <input
          required
          placeholder="Phone"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setNameConflict(null);
          }}
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        {nameConflict ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
            <p className="mb-2 text-amber-800 dark:text-amber-300">
              This phone number is already registered as <span className="font-semibold">{nameConflict.existingName}</span>.
              You typed <span className="font-semibold">{name}</span>. Which name should this booking use?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitWalkIn("keep")}
                className="flex-1 rounded-lg bg-neutral-100 py-2 text-sm font-medium dark:bg-neutral-800 disabled:opacity-60"
              >
                Use {nameConflict.existingName}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitWalkIn("update")}
                className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Use {name}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create booking"}
          </button>
        )}
      </form>
    </div>
  );
}
