"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { fetchAdminPaymentQrUrl, uploadPaymentQr } from "@/lib/client/admin-api";

export function SettingsTab() {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAdminPaymentQrUrl().then(setQrImageUrl);
  }, []);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const result = await uploadPaymentQr(file);
    setUploading(false);
    if (!result.ok) {
      setError(result.message ?? "Upload failed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setQrImageUrl(result.qrImageUrl ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="max-w-sm">
      <h2 className="mb-2 text-sm font-semibold">Payment QR</h2>
      <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
        This image shows on Page 2 for customers to scan and pay. Upload a new one to replace it at any time.
      </p>

      {qrImageUrl && (
        <img
          src={qrImageUrl}
          alt="Current payment QR"
          className="mb-3 h-48 w-48 rounded-lg border border-neutral-200 object-contain dark:border-neutral-800"
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm"
      />
      {uploading && <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Uploading…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
