"use client";

import { useState, type FormEvent } from "react";
import { fetchMemberSummary, payWithPackage, type MemberSummary } from "@/lib/client/api";
import { DISPLAY_LOCALE } from "@/lib/client/dates";
import { BookingSummaryCard } from "./BookingSummaryCard";

interface BookingSummaryForConfirm {
  date: string;
  startHour: number;
  durationMinutes: number;
  courtCount: number;
  courtLabel: string;
  amountDue: number;
}

interface PayWithPackageSectionProps {
  bookingId: string;
  summary: BookingSummaryForConfirm;
  onPaid: () => void;
}

export function PayWithPackageSection({ bookingId, summary, onPaid }: PayWithPackageSectionProps) {
  const [username, setUsername] = useState("");
  const [memberSummary, setMemberSummary] = useState<MemberSummary | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (!username) return;
    setLookingUp(true);
    setLookupError(null);
    setMemberSummary(null);
    const result = await fetchMemberSummary(username);
    setLookingUp(false);
    if (!result) {
      setLookupError("No member found with that username.");
      return;
    }
    setMemberSummary(result);
  }

  function handleReviewPayment(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setPayError(null);
    setConfirming(true);
  }

  async function handleConfirmPay() {
    setPaying(true);
    setPayError(null);
    const result = await payWithPackage(bookingId, username, password);
    setPaying(false);
    if (!result.ok) {
      setPayError(result.message ?? "Payment failed.");
      setConfirming(false);
      return;
    }
    onPaid();
  }

  // Best-effort estimate for the confirm step's copy — the server is
  // authoritative on which package actually gets charged and for how much
  // (a pool booking's *actual* assigned courts can differ from what was
  // requested under the gap policy).
  const hoursNeeded = summary.courtCount * (summary.durationMinutes / 60);
  const eligiblePackage = memberSummary?.packages.find((p) => p.hoursRemaining >= hoursNeeded) ?? null;

  function handleSwitchAccount() {
    setMemberSummary(null);
    setUsername("");
    setPassword("");
    setConfirming(false);
    setPayError(null);
  }

  return (
    <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold">Pay with package</h2>

      {!memberSummary ? (
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
      ) : confirming ? (
        <div>
          <BookingSummaryCard
            date={summary.date}
            startHour={summary.startHour}
            durationMinutes={summary.durationMinutes}
            courtLabel={summary.courtLabel}
            amountDue={summary.amountDue}
          />
          <p className="mb-3 text-sm">
            {eligiblePackage ? (
              <>
                This will use <span className="font-semibold">{hoursNeeded}h</span> from{" "}
                <span className="font-semibold">{eligiblePackage.packageTypeName}</span>, leaving{" "}
                <span className="font-semibold">{eligiblePackage.hoursRemaining - hoursNeeded}h</span> remaining. No
                slip needed for this payment method.
              </>
            ) : (
              "We'll check your package balance when you confirm."
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={paying}
              onClick={handleConfirmPay}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {paying ? "Paying…" : "Confirm and pay"}
            </button>
            <button
              type="button"
              disabled={paying}
              onClick={() => setConfirming(false)}
              className="rounded-lg bg-neutral-100 px-3 py-2.5 text-sm font-medium dark:bg-neutral-800"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm">
            Welcome, <span className="font-medium">{memberSummary.name}</span>
          </p>
          {memberSummary.packages.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">No active packages found on this account.</p>
          ) : (
            <div className="mb-3 space-y-1">
              {memberSummary.packages.map((p) => (
                <p key={p.id} className="text-xs text-neutral-500 dark:text-neutral-400">
                  {p.packageTypeName}: {p.hoursRemaining}h remaining, expires{" "}
                  {new Date(p.expiresAt).toLocaleDateString(DISPLAY_LOCALE)}
                </p>
              ))}
            </div>
          )}
          {memberSummary.packages.length > 0 && (
            <form onSubmit={handleReviewPayment} className="flex gap-2">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Continue
              </button>
            </form>
          )}
          <button type="button" onClick={handleSwitchAccount} className="mt-2 text-xs text-neutral-500 underline dark:text-neutral-400">
            Not you? Switch account
          </button>
        </div>
      )}

      {lookupError && <p className="mt-2 text-sm text-red-600">{lookupError}</p>}
      {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
    </section>
  );
}
