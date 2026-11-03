import { createHmac, timingSafeEqual } from 'node:crypto';
import { SITE_URL } from '@/lib/content/site';
import type { ConsentKind } from './consent';

/**
 * Signed links for the "we have your email" message. Each link names one
 * capture row and one choice; the signature (HMAC-SHA256 with
 * EMAIL_LINK_SECRET) proves the link came from that email, so nobody can
 * record consent for an address by guessing a URL.
 *
 * The link only opens a page with a Confirm button — consent is recorded on
 * that POST, never on the GET, because mail security scanners open links.
 */
export const EMAIL_LINK_SECRET_ENV = 'EMAIL_LINK_SECRET';
const CAPTURE_ID = /^capture_[a-f0-9]{32}$/;

function secret(): string | null {
  const s = process.env[EMAIL_LINK_SECRET_ENV]?.trim();
  return s && s.length >= 16 ? s : null;
}

function sign(id: string, kind: ConsentKind, key: string): string {
  return createHmac('sha256', key).update(`consent|${id}|${kind}`).digest('base64url').slice(0, 43);
}

/** Null when the secret is not configured: the email then asks for a reply instead. */
export function consentLink(id: string, kind: ConsentKind): string | null {
  const key = secret();
  if (!key || !CAPTURE_ID.test(id)) return null;
  const q = new URLSearchParams({ id, a: kind, t: sign(id, kind, key) });
  return `${SITE_URL}/email-preferences?${q.toString()}`;
}

export function isConsentKind(v: unknown): v is ConsentKind {
  return v === 'newsletter' || v === 'contact';
}

export function verifyConsentLink(id: unknown, kind: unknown, token: unknown): id is string {
  const key = secret();
  if (!key || typeof id !== 'string' || !CAPTURE_ID.test(id) || !isConsentKind(kind) || typeof token !== 'string') return false;
  const expected = Buffer.from(sign(id, kind, key));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
