'use client';

// Pseudonymous, sessionStorage-backed session handling for the browser
// tracker (lib/analytics/track.ts). A "session" here is a rolling-expiry
// bucket of events from one tab, not a person — see events.ts's SourceKind
// comment and plans/003-admin-dashboard-and-tracking.md decision 8.
//
// Every sessionStorage/crypto/DOM access below is wrapped so a throw (Safari
// private mode, a disabled storage API, a locked-down embed) degrades this
// whole module to "tracking is off for this visit" — never to a crash that
// reaches the page it's supposed to be quietly measuring.

import {
  ENGAGEMENT_DWELL_MS,
  ENGAGEMENT_SCROLL_RATIO,
  SESSION_TIMEOUT_MS,
  isCampaignSlug,
  isOpaqueId,
  type CampaignSlug,
  type SourceKind,
} from './events';

const STORAGE_KEY = 'ntr_analytics_session';

interface StoredSession {
  id: string;
  startedAt: number;
  lastActivityAt: number;
  src: SourceKind;
  ref?: string;
  camp?: CampaignSlug;
  attributionSent: boolean;
  engaged: boolean;
  engagementSent: boolean;
}

export interface SessionAttribution {
  src: SourceKind;
  ref?: string;
  camp?: CampaignSlug;
}

export interface SessionSnapshot {
  id: string;
  /** Present only on the call that first observes this session (decision 8:
   *  attribution is fixed once, at session start). Every later event in the
   *  same session omits this. */
  attribution?: SessionAttribution;
}

function hasSessionStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch {
    // Some locked-down embeds throw just *accessing* the property.
    return false;
  }
}

function isValidStoredSession(v: unknown): v is StoredSession {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    isOpaqueId(s.id) &&
    typeof s.startedAt === 'number' &&
    typeof s.lastActivityAt === 'number' &&
    (s.src === 'campaign' || s.src === 'referral' || s.src === 'direct')
  );
}

// Deliberately let these throw rather than swallowing internally: getSession()
// below is the single point that decides what a storage failure means (full
// tracking-disabled for this call), and it can only make that call correctly
// if a failure here actually reaches it instead of being silently absorbed
// into "no existing session" / "write silently skipped".
function readStoredSession(): StoredSession | null {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  return isValidStoredSession(parsed) ? parsed : null;
}

function writeStoredSession(session: StoredSession): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

// Used only for a follow-up write after getSession() has already proven
// storage usable once this call (flipping attributionSent/engagementSent).
// Losing *that* particular persist (a rare second failure, e.g. quota hit
// between the two writes) should not throw away the in-memory result this
// call already computed — the caller still returns a correct one-shot value.
function safeWriteStoredSession(session: StoredSession): void {
  try {
    writeStoredSession(session);
  } catch {
    // Next call may re-derive this same flag flip; not persisting it now
    // just means that decision is made again later, not silently lost.
  }
}

/**
 * Campaign slug from an allowlisted `?c=` param if present, else the
 * referrer's hostname when it points off-site, else direct. Never a full
 * referrer URL or arbitrary query text — see "Tracking and storage design
 * constraints" in the plan.
 */
function computeAttribution(): SessionAttribution {
  try {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    if (isCampaignSlug(c)) return { src: 'campaign', camp: c };
  } catch {
    // fall through to referral/direct
  }

  try {
    const referrer = document.referrer;
    if (referrer) {
      const referrerHost = new URL(referrer).hostname.toLowerCase();
      const hereHost = window.location.hostname.toLowerCase();
      if (referrerHost && referrerHost !== hereHost) {
        return { src: 'referral', ref: referrerHost };
      }
    }
  } catch {
    // malformed/blocked referrer — fall through to direct
  }

  return { src: 'direct' };
}

/**
 * A crypto.randomUUID() id, defensively checked against events.ts's
 * isOpaqueId (the exact shape the server requires) with a manual fallback
 * for a context where randomUUID is unavailable. Used for both session ids
 * and, by track.ts, per-event ids.
 */
export function newOpaqueId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      const id = crypto.randomUUID();
      if (isOpaqueId(id)) return id;
    }
  } catch {
    // fall through to the manual fallback
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function createSession(now: number): StoredSession {
  return {
    id: newOpaqueId(),
    startedAt: now,
    lastActivityAt: now,
    attributionSent: false,
    engaged: false,
    engagementSent: false,
    ...computeAttribution(),
  };
}

/**
 * Gets the current session, starting a new one if none exists or the
 * existing one has been idle past SESSION_TIMEOUT_MS (rolling expiry: every
 * call that finds a live session extends it). Returns null when
 * sessionStorage isn't usable at all — callers must treat that as
 * tracking-disabled for this event, not retry or throw.
 */
function getSession(): StoredSession | null {
  if (!hasSessionStorage()) return null;
  try {
    const now = Date.now();
    const existing = readStoredSession();
    const session =
      existing && now - existing.lastActivityAt <= SESSION_TIMEOUT_MS ? existing : createSession(now);
    session.lastActivityAt = now;
    writeStoredSession(session);
    return session;
  } catch {
    return null;
  }
}

/**
 * One call per outgoing event. Returns the session id always, and the
 * session's attribution only the first time this is called for the session
 * (decision 8) — every later event in the session gets attribution omitted,
 * which track.ts simply leaves off the wire event.
 */
export function getSessionSnapshot(): SessionSnapshot | null {
  const session = getSession();
  if (!session) return null;

  if (session.attributionSent) return { id: session.id };

  session.attributionSent = true;
  safeWriteStoredSession(session);

  const attribution: SessionAttribution = { src: session.src };
  if (session.src === 'referral' && session.ref) attribution.ref = session.ref;
  if (session.src === 'campaign' && session.camp) attribution.camp = session.camp;
  return { id: session.id, attribution };
}

/**
 * Marks the session engaged (decision 2) and returns true exactly once per
 * session — the first call that qualifies. Every later call, and every call
 * once sessionStorage is unusable, returns false. Both the scroll/dwell
 * watcher below and track.ts's cta_click handling use the return value to
 * decide whether to actually send the 'engagement' event.
 */
export function noteEngagementSignal(): boolean {
  const session = getSession();
  if (!session || session.engagementSent) return false;
  session.engaged = true;
  session.engagementSent = true;
  safeWriteStoredSession(session);
  return true;
}

/** True once noteEngagementSignal has already fired for this session — lets
 *  watchEngagement skip re-arming listeners on a later page view when
 *  there's nothing left for them to do. */
function isEngagementAlreadySent(): boolean {
  const session = getSession();
  return !!session?.engagementSent;
}

/**
 * Attaches the scroll/dwell half of decision 2's engaged-visit signals (the
 * click half is handled in track.ts, since a click is already routed
 * through track() as a cta_click). Calls `onEngaged` at most once, ever, for
 * the session — see noteEngagementSignal. Always returns a cleanup function,
 * safe to use as a React effect's return value.
 */
export function watchEngagement(onEngaged: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (isEngagementAlreadySent()) return () => {};

  let settled = false;

  function cleanup() {
    window.removeEventListener('scroll', handleScroll);
    clearTimeout(dwellTimer);
  }

  function fire() {
    if (settled) return;
    settled = true;
    cleanup();
    if (noteEngagementSignal()) onEngaged();
  }

  function handleScroll() {
    try {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 1;
      if (ratio >= ENGAGEMENT_SCROLL_RATIO) fire();
    } catch {
      // A measurement error here must not break scrolling itself.
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  // Declared const, assigned at the one place it's set: `cleanup` (defined
  // above) is only ever called after this line runs, so its closure over
  // `dwellTimer` always sees the real timer id by the time it clears it.
  const dwellTimer: ReturnType<typeof setTimeout> = setTimeout(fire, ENGAGEMENT_DWELL_MS);

  return cleanup;
}
