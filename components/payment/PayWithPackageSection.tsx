"use client";

import { useState, type FormEvent } from "react";
import { fetchMemberSummary, payWithPackage, type MemberSummary } from "@/lib/client/api";

interface PayWithPackageSectionProps {
  bookingId: string;
  onPaid: () => void;
}

export function PayWithPackageSection({ bookingId, onPaid }: PayWithPackageSectionProps) {
  const [username, setUsername] = useState("");
  const [summary, setSummary] = useState<MemberSummary | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [password, setPassword] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (!username) return;
    setLookingUp(true);
    setLookupError(null);
    setSummary(null);
    const result = await fetchMemberSummary(username);
    setLookingUp(false);
    if (!result) {
      setLookupError("No member found with that username.");
      return;
    }
    setSummary(result);
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setPaying(true);
    setPayError(null);
    const result = await payWithPackage(bookingId, username, password);
    setPaying(false);
    if (!result.ok) {
      setPayError(result.message ?? "Payment failed.");
      return;
    }
    onPaid();
  }

  return (
    <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold">Pay with package</h2>

      {!summary ? (
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          />
          <button
            type="submit"
            disabled={lookingUp}
            className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium dark:bg-neutral-800 disabled:opacity-60"
          >
            {lookingUp ? "Looking up…" : "Look up"}
          </button>
        </form>
      ) : (
        <div>
          <p className="mb-2 text-sm">
            Welcome, <span className="font-medium">{summary.name}</span>
          </p>
          {summary.packages.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">No active packages found on this account.</p>
          ) : (
            <div className="mb-3 space-y-1">
              {summary.packages.map((p) => (
                <p key={p.id} className="text-xs text-neutral-500 dark:text-neutral-400">
                  {p.packageTypeName}: {p.hoursRemaining}h remaining, expires {new Date(p.expiresAt).toLocaleDateString()}
                </p>
              ))}
            </div>
          )}
          {summary.packages.length > 0 && (
            <form onSubmit={handlePay} className="flex gap-2">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              />
              <button
                type="submit"
                disabled={paying}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {paying ? "Paying…" : "Pay"}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => {
              setSummary(null);
              setUsername("");
              setPassword("");
            }}
            className="mt-2 text-xs text-neutral-500 underline dark:text-neutral-400"
          >
            Not you? Switch account
          </button>
        </div>
      )}

      {lookupError && <p className="mt-2 text-sm text-red-600">{lookupError}</p>}
      {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
    </section>
  );
}
