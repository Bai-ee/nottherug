'use client';

// First-party identifiers for linking records to the analytics session and
// browser they came from, and for test devices:
//
//   session / visitor id — owned by lib/analytics/session.ts (the random
//                 visitor id already used for unique-visitor counts). Never
//                 derived from the device: no fingerprinting.
//   test device — present only after an admin explicitly marks this browser
//                 as a test device from the dashboard. The id is minted by
//                 the server (app/api/admin/test-devices) and checked against
//                 Firestore at report time, so a hand-made value classifies
//                 nothing.
//
// Every storage access is guarded: blocked storage means "no id", never a crash.

import { isOpaqueId } from './events';
import { peekSession } from './session';

const TEST_DEVICE_KEY = 'ntr:test-device:v1';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readKey(key: string): string | null {
  try {
    const v = storage()?.getItem(key) ?? null;
    return isOpaqueId(v) ? v : null;
  } catch {
    return null;
  }
}

function analyticsOn(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
}

/** The browser's visitor id (lib/analytics/session.ts owns it). Null when tracking is off or storage is blocked. */
export function getVisitorId(): string | null {
  if (!analyticsOn()) return null;
  try {
    return peekSession()?.vid ?? null;
  } catch {
    return null;
  }
}

/** The admin-issued test-device id for this browser, if any. */
export function getTestDeviceId(): string | null {
  return readKey(TEST_DEVICE_KEY);
}

export function setTestDeviceId(id: string): boolean {
  if (!isOpaqueId(id)) return false;
  try {
    storage()?.setItem(TEST_DEVICE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export function clearTestDeviceId(): void {
  try {
    storage()?.removeItem(TEST_DEVICE_KEY);
  } catch {
    // Nothing to do: the flag simply stays until storage is cleared.
  }
}

/**
 * The identifiers a form submission carries so the server can link the
 * record to the analytics session it came from. Opaque ids only: nothing
 * here is, or is derived from, what the visitor typed.
 */
export type SubmissionLinkage = { sid?: string; vid?: string; td?: string };

export function getSubmissionLinkage(): SubmissionLinkage {
  const out: SubmissionLinkage = {};
  try {
    const session = analyticsOn() ? peekSession() : null;
    if (session?.id) out.sid = session.id;
    if (session?.vid) out.vid = session.vid;
  } catch {
    // Linkage is best effort.
  }
  const td = getTestDeviceId();
  if (td) out.td = td;
  return out;
}
