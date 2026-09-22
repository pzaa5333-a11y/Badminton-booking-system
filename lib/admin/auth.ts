import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Single-shared-password admin auth (§6.1) — an HMAC-signed cookie, no
 * session store needed. Swap for per-staff logins once more than one
 * person uses the write actions, per the spec's own note.
 */
export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminSessionCookieValue(): string {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function isValidAdminSession(cookieValue: string | undefined | null): boolean {
  if (!cookieValue) return false;
  const [issuedAt, signature] = cookieValue.split(".");
  if (!issuedAt || !signature) return false;

  const expected = sign(issuedAt);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return false;
  }

  const age = Date.now() - Number(issuedAt);
  return age >= 0 && age < ADMIN_COOKIE_MAX_AGE_SECONDS * 1000;
}
