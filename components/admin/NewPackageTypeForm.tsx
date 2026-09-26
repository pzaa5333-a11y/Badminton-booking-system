"use client";

import { useState, type FormEvent } from "react";
import { createPackageType } from "@/lib/client/admin-api";

interface NewPackageTypeFormProps {
  onClose: () => void;
  onCreated: () => void;
}

export function NewPackageTypeForm({ onClose, onCreated }: NewPackageTypeFormProps) {
  const [name, setName] = useState("");
  const [hours, setHours] = useState(10);
  const [validityDays, setValidityDays] = useState(30);
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createPackageType({
      name,
      hours,
      validity_days: validityDays,
      price: price ? Number(price) : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Failed to create package type.");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">New package type</h2>

        <input
          required
          placeholder="Name (e.g. 10 Hours)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-neutral-500 dark:text-neutral-400">
            Hours
            <input
              required
              type="number"
              min={1}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
          </label>
          <label className="flex-1 text-xs text-neutral-500 dark:text-neutral-400">
            Valid for (days)
            <input
              required
              type="number"
              min={1}
              value={validityDays}
              onChange={(e) => setValidityDays(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
          </label>
        </div>
        <input
          placeholder="Price (THB, optional — record only)"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create package type"}
        </button>
      </form>
    </div>
  );
}
