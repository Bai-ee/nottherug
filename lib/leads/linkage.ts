import { isOpaqueId } from '@/lib/analytics/events';

/**
 * Server-side read of the optional `linkage` object a form submission carries
 * (lib/analytics/identity.ts → getSubmissionLinkage). Every value must be an
 * opaque id; anything else is dropped, never repaired. Stored on the record as
 * `sid` (analytics session), `vid` (browser) and `testDeviceId`.
 */
export type StoredLinkage = { sid?: string; vid?: string; testDeviceId?: string };

export function readLinkage(input: unknown): StoredLinkage {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const out: StoredLinkage = {};
  if (isOpaqueId(raw.sid)) out.sid = raw.sid;
  if (isOpaqueId(raw.vid)) out.vid = raw.vid;
  if (isOpaqueId(raw.td)) out.testDeviceId = raw.td;
  return out;
}

/** Lowercased, trimmed email — the one key that links records about the same contact. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
