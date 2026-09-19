/**
 * Pure helpers for the booking-first onboarding handoff.
 *
 * The welcome modal lets a visitor book a free Meet & Greet on Calendly
 * before they ever fill out the questionnaire. To carry their email across
 * that same-tab trip to `/book`, we stash a small, short-lived draft in
 * `sessionStorage` — never a name, phone, dog detail, provider payload,
 * token, or credential, and never anything that lands in a site URL.
 *
 * `bookingObserved` is set only when the Calendly iframe's own verified
 * `postMessage` completion fires in THIS browser tab. That is a client-side
 * signal we cannot cryptographically prove to a server: nothing calls home
 * when it flips, and nothing here writes a lead or fires completion
 * analytics. Treat it strictly as a UI hint — it may soften copy or hide the
 * phone-consult offer on `/book`, but it must never be read as proof of a
 * booking, an authorization to skip validation, or a substitute for the
 * existing complete-lead submission that a server actually persists.
 *
 * No React and no top-level `window` access: every function takes its
 * storage in (or is pure), so this stays unit-testable in the node-
 * environment vitest setup and every accessor is guarded against the
 * exceptions private browsing / blocked site data can throw on access,
 * read, or write.
 */
import { LEAD_FIELD_LIMITS } from '@/lib/leads/contract';
import { isValidEmail } from '@/lib/leads/validation';

/** Bump the suffix to invalidate any in-flight drafts after a shape change. */
export const ONBOARDING_HANDOFF_STORAGE_KEY = 'ntr:booking-onboarding:v1';

export const ONBOARDING_HANDOFF_VERSION = 1;

/** How long a draft survives before it is treated as gone. */
export const ONBOARDING_HANDOFF_TTL_MS = 30 * 60 * 1000;

/** Only entry points on this allowlist may create a handoff. */
export const ONBOARDING_HANDOFF_SOURCES = ['welcome-modal'] as const;

/** Query param that scopes `/book` to an explicit onboarding handoff. */
export const ONBOARDING_SCOPE_PARAM = 'onboarding';
export const ONBOARDING_SCOPE_VALUE = 'welcome';

export type OnboardingHandoffSource = (typeof ONBOARDING_HANDOFF_SOURCES)[number];

export type HandoffStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type OnboardingHandoff = {
  v: number;
  email: string;
  source: OnboardingHandoffSource;
  attemptId: string;
  createdAt: number;
  bookingObserved: boolean;
};

function isOnboardingHandoffSource(value: unknown): value is OnboardingHandoffSource {
  return typeof value === 'string' && (ONBOARDING_HANDOFF_SOURCES as readonly string[]).includes(value);
}

/** Trims, lowercases, and rejects anything that isn't a valid, in-limit email. */
function normalizeEmail(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > LEAD_FIELD_LIMITS.email) return null;
  if (!isValidEmail(trimmed)) return null;
  return trimmed.toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Type-checks every field of a parsed JSON value; never assumes storage wrote it. */
function parseStoredHandoff(value: unknown): OnboardingHandoff | null {
  if (!isPlainObject(value)) return null;
  const { v, email, source, attemptId, createdAt, bookingObserved } = value;
  if (v !== ONBOARDING_HANDOFF_VERSION) return null;
  if (typeof email !== 'string' || email.length === 0) return null;
  if (!isOnboardingHandoffSource(source)) return null;
  if (typeof attemptId !== 'string' || attemptId.length === 0) return null;
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null;
  if (typeof bookingObserved !== 'boolean') return null;
  return { v, email, source, attemptId, createdAt, bookingObserved };
}

/** Validates + normalizes. Returns null for an invalid email or a non-allowlisted source. */
export function createOnboardingHandoff(input: {
  email: string;
  source: string;
  attemptId: string;
  bookingObserved: boolean;
  now?: number;
}): OnboardingHandoff | null {
  const email = normalizeEmail(input.email);
  if (!email) return null;
  if (!isOnboardingHandoffSource(input.source)) return null;

  return {
    v: ONBOARDING_HANDOFF_VERSION,
    email,
    source: input.source,
    attemptId: input.attemptId,
    createdAt: input.now ?? Date.now(),
    bookingObserved: input.bookingObserved,
  };
}

/** Best-effort write; false when storage is unavailable or throws. Never throws. */
export function writeOnboardingHandoff(storage: HandoffStorage | null | undefined, payload: OnboardingHandoff): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ONBOARDING_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** Null for missing / malformed / wrong-version / expired / unreadable. Never throws. */
export function readOnboardingHandoff(storage: HandoffStorage | null | undefined, now: number = Date.now()): OnboardingHandoff | null {
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(ONBOARDING_HANDOFF_STORAGE_KEY);
  } catch {
    return null;
  }
  if (typeof raw !== 'string' || raw.length === 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const handoff = parseStoredHandoff(parsed);
  if (!handoff) return null;

  if (now - handoff.createdAt >= ONBOARDING_HANDOFF_TTL_MS) return null;
  return handoff;
}

/** Best-effort remove; a storage failure here must never break navigation. */
export function clearOnboardingHandoff(storage: HandoffStorage | null | undefined): void {
  if (!storage) return;
  try {
    storage.removeItem(ONBOARDING_HANDOFF_STORAGE_KEY);
  } catch {
    // Ignored: worst case the draft lingers until it expires on its own.
  }
}

/**
 * `window.sessionStorage` guarded against throwing accessors; null when
 * unusable or non-browser. The only place in this module that touches
 * `window`, and only when called — never at module load.
 */
export function getOnboardingHandoffStorage(): HandoffStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.sessionStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

/** crypto.randomUUID when available, otherwise a non-crypto fallback id. Never throws. */
export function newOnboardingAttemptId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the non-crypto fallback below.
  }
  return `onboarding-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** True only for `?onboarding=welcome` (accepts a raw search string or URLSearchParams). */
export function isOnboardingScope(search: string | URLSearchParams | null | undefined): boolean {
  if (search == null) return false;
  try {
    const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
    return params.get(ONBOARDING_SCOPE_PARAM) === ONBOARDING_SCOPE_VALUE;
  } catch {
    return false;
  }
}
