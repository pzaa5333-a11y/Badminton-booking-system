"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { fetchBookingDetail, updateBookingEmail, uploadSlip, type BookingDetail } from "@/lib/client/api";
import { formatHourLabel } from "@/lib/client/dates";
import { PayWithPackageSection } from "./PayWithPackageSection";

interface PaymentPageProps {
  bookingId: string;
}

function useCountdown(target: string | null): number | null {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!target) return;
    const targetMs = new Date(target).getTime();
    const tick = () => setMsLeft(targetMs - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return msLeft;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PaymentPage({ bookingId }: PaymentPageProps) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBookingDetail(bookingId)
      .then((detail) => {
        if (!cancelled) setBooking(detail);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const msLeft = useCountdown(booking?.hold_expires_at ?? null);
  const expired = booking?.status === "held" && msLeft !== null && msLeft <= 0;

  async function handleSaveEmail(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    const updated = await updateBookingEmail(bookingId, email);
    setBooking(updated);
    setEmailSaved(true);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const result = await uploadSlip(bookingId, file);
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.message ?? "Upload failed. Please try again.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const refreshed = await fetchBookingDetail(bookingId);
    setBooking(refreshed);
    if (!result.verified) {
      setUploadError("We couldn't verify that slip automatically. Staff will check it shortly.");
    }
  }

  if (booking === null && !loadFailed) {
    return <div className="mx-auto max-w-md px-4 pt-10 text-center text-neutral-500">Loading…</div>;
  }

  if (loadFailed || booking === null) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="mb-2 text-lg font-semibold">Booking not found</p>
        <Link href="/" className="text-emerald-600 underline">
          Back to booking
        </Link>
      </div>
    );
  }

  const courtLabel = booking.court === "court6" ? "Court 6" : `${booking.court_count} court${booking.court_count > 1 ? "s" : ""}`;

  if (expired) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="mb-2 text-lg font-semibold">This hold has expired</p>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Your courts were released. Please make a new booking.
        </p>
        <Link href="/" className="inline-block rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white">
          Book again
        </Link>
      </div>
    );
  }

  if (booking.status === "confirmed" || booking.status === "paid") {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="mb-2 text-lg font-semibold">Booking confirmed</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {courtLabel} on {booking.date} at {formatHourLabel(booking.start_hour)}
        </p>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          {booking.duration_minutes / 60}h · ฿{booking.amount_due}
        </p>
        <Link href="/" className="inline-block rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white">
          Done
        </Link>
      </div>
    );
  }

  if (booking.status === "released" || booking.status === "cancelled") {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="mb-2 text-lg font-semibold">This booking is no longer active</p>
        <Link href="/" className="text-emerald-600 underline">
          Back to booking
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-16">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Complete your booking</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {courtLabel} · {booking.date} · {formatHourLabel(booking.start_hour)} · {booking.duration_minutes / 60}h
        </p>
      </header>

      {msLeft !== null && (
        <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-center dark:bg-amber-950">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Hold expires in <span className="font-semibold tabular-nums">{formatCountdown(msLeft)}</span>
          </p>
        </div>
      )}

      <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-2 text-sm font-semibold">Contact</h2>
        <p className="text-sm">
          {booking.customer.name} · {booking.customer.phone}
        </p>
        {booking.customer.email ? (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{booking.customer.email}</p>
        ) : (
          <form onSubmit={handleSaveEmail} className="mt-2 flex gap-2">
            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
            <button type="submit" className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium dark:bg-neutral-800">
              Save
            </button>
          </form>
        )}
        {emailSaved && <p className="mt-1 text-xs text-emerald-600">Saved.</p>}
      </section>

      <PayWithPackageSection
        bookingId={bookingId}
        onPaid={async () => {
          const refreshed = await fetchBookingDetail(bookingId);
          setBooking(refreshed);
        }}
      />

      <section className="mb-6 rounded-lg border border-neutral-200 p-4 text-center dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold">Or pay with PromptPay</h2>
        <div className="mx-auto mb-3 flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="px-4 text-center">
            <p className="text-xs text-neutral-400">PromptPay QR</p>
            <p className="mt-1 text-xs text-neutral-400">(placeholder — real QR coming soon)</p>
          </div>
        </div>
        <p className="text-lg font-semibold">฿{booking.amount_due}</p>
      </section>

      <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold">Upload payment slip</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm"
        />
        {uploading && <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Verifying…</p>}
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
      </section>
    </div>
  );
}
