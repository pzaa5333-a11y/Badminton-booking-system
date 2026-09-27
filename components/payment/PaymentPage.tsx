"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchBookingDetail, fetchPaymentQrUrl, updateBookingEmail, uploadSlip, type BookingDetail } from "@/lib/client/api";
import { PayWithPackageSection } from "./PayWithPackageSection";
import { BookingSummaryCard } from "./BookingSummaryCard";

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
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"package" | "scan">("scan");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
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
    fetchPaymentQrUrl().then((url) => {
      if (!cancelled) setQrImageUrl(url);
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setSlipFile(file);
    setSlipPreviewUrl(URL.createObjectURL(file));
  }

  function handleChooseDifferentPhoto() {
    setSlipFile(null);
    setSlipPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirmSlip() {
    if (!slipFile) return;
    setUploading(true);
    setUploadError(null);
    const result = await uploadSlip(bookingId, slipFile);
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.message ?? "Upload failed. Please try again.");
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
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">We&apos;ll see you on the court.</p>
        <BookingSummaryCard
          date={booking.date}
          startHour={booking.start_hour}
          durationMinutes={booking.duration_minutes}
          courtLabel={courtLabel}
          amountDue={booking.amount_due}
        />
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
    <div className="mx-auto w-full min-w-0 max-w-md px-4 pt-6 pb-16">
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-brand-deep">Complete your booking</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Almost there! Choose your payment method and finish the booking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-1 shrink-0 text-xs text-neutral-500 underline dark:text-neutral-400"
        >
          Cancel &amp; go back
        </button>
      </header>

      <BookingSummaryCard
        date={booking.date}
        startHour={booking.start_hour}
        durationMinutes={booking.duration_minutes}
        courtLabel={courtLabel}
        amountDue={booking.amount_due}
        holdCountdown={msLeft !== null ? formatCountdown(msLeft) : null}
      />

      <section className="mb-6 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setContactExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 p-4 text-left"
        >
          <span className="flex items-center gap-2 text-sm">
            <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="8" cy="5.5" r="2.5" />
              <path d="M2.5 14c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5" strokeLinecap="round" />
            </svg>
            <span>
              <span className="font-medium">Contact</span> · {booking.customer.name} · {booking.customer.phone}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-neutral-400">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M11.5 2.5l2 2-7.5 7.5-2.5.5.5-2.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg
              viewBox="0 0 16 16"
              className={`h-3.5 w-3.5 transition-transform ${contactExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {contactExpanded && (
          <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
            {booking.customer.email ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{booking.customer.email}</p>
            ) : (
              <form onSubmit={handleSaveEmail} className="flex gap-2">
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
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-brand-deep">
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-brand-sport" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="1.5" y="3.5" width="13" height="9.5" rx="1.5" />
            <path d="M1.5 6.5h13" />
          </svg>
          Choose payment method
        </h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("package")}
            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
              paymentMethod === "package"
                ? "border-brand-sport bg-brand-sport/5"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-sport/10 text-brand-sport">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="8" width="14" height="9" rx="1.2" />
                <path d="M3 11.5h14M10 8v9M6.5 8c0-1.8 1.4-3.5 3.5-3.5S13.5 6.2 13.5 8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Pay with package</span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                Use your existing package to pay for this booking.
              </span>
            </span>
            <span
              className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                paymentMethod === "package" ? "border-brand-sport bg-brand-sport" : "border-neutral-300 dark:border-neutral-700"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("scan")}
            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
              paymentMethod === "scan" ? "border-brand-sport bg-brand-sport/5" : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-sport/10 text-brand-sport">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="5" height="5" rx="0.8" />
                <rect x="12" y="3" width="5" height="5" rx="0.8" />
                <rect x="3" y="12" width="5" height="5" rx="0.8" />
                <rect x="12" y="12" width="5" height="5" rx="0.8" />
              </svg>
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Scan to pay</span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                Scan the QR code and pay directly (bank transfer / mobile banking).
              </span>
            </span>
            <span
              className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                paymentMethod === "scan" ? "border-brand-sport bg-brand-sport" : "border-neutral-300 dark:border-neutral-700"
              }`}
            />
          </button>
        </div>
      </section>

      {paymentMethod === "package" && (
        <PayWithPackageSection
          bookingId={bookingId}
          summary={{
            date: booking.date,
            startHour: booking.start_hour,
            durationMinutes: booking.duration_minutes,
            courtCount: booking.court_count,
            courtLabel,
            amountDue: booking.amount_due,
          }}
          onPaid={async () => {
            const refreshed = await fetchBookingDetail(bookingId);
            setBooking(refreshed);
          }}
        />
      )}

      {paymentMethod === "scan" && (
        <>
          <section className="mb-6 rounded-lg border border-neutral-200 p-4 text-center dark:border-neutral-800">
            <h2 className="mb-3 text-sm font-semibold">Scan QR to pay</h2>
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="Payment QR code" className="mx-auto mb-3 h-48 w-48 rounded-lg object-contain" />
            ) : (
              <div className="mx-auto mb-3 flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
                <p className="px-4 text-center text-xs text-neutral-400">QR not set up yet — please contact us.</p>
              </div>
            )}
            <p className="text-lg font-semibold">฿{booking.amount_due}</p>
          </section>

          <section className="mb-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="mb-3 text-sm font-semibold">Upload payment slip</h2>

            {!slipPreviewUrl ? (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm"
              />
            ) : (
              <div>
                <img
                  src={slipPreviewUrl}
                  alt="Slip preview"
                  className="mb-3 max-h-64 w-full rounded-lg border border-neutral-200 object-contain dark:border-neutral-800"
                />
                <BookingSummaryCard
                  date={booking.date}
                  startHour={booking.start_hour}
                  durationMinutes={booking.duration_minutes}
                  courtLabel={courtLabel}
                  amountDue={booking.amount_due}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleConfirmSlip}
                    className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-60"
                  >
                    {uploading ? "Submitting…" : "Confirm and submit"}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleChooseDifferentPhoto}
                    className="rounded-lg bg-neutral-100 px-3 py-2.5 text-sm font-medium dark:bg-neutral-800"
                  >
                    Choose a different photo
                  </button>
                </div>
              </div>
            )}
            {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
          </section>
        </>
      )}
    </div>
  );
}
