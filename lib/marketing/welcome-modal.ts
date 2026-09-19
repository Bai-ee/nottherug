/**
 * Pure helpers for the first-visit walk-signup modal.
 *
 * No React, and no direct `window` access except in `openWelcomeWalkModal`
 * below: the rest of this file's exports take the caller's storage in, so
 * they stay unit-testable in the node-environment vitest setup and the
 * "have they already seen it?" rule lives in one place.
 */

/** Bump the suffix to re-show the modal to everyone after a campaign change. */
export const WELCOME_MODAL_STORAGE_KEY = 'ntr:welcome-walk-modal:v1';

/**
 * How long a first-time visitor has been on the home page before the modal
 * opens. A timer, not a scroll trigger: the popup must never land on a
 * control the visitor is about to tap, and it never interrupts the first
 * paint.
 */
export const WELCOME_MODAL_DELAY_MS = 20_000;

export type WelcomeModalStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Any element on the page can open the welcome modal by dispatching this
 * event — SiteNav's "Book a Walk" and the home hero's primary CTA both do.
 * Kept as a DOM event, and split into this dependency-free module, so that
 * opening the modal never requires importing the modal component itself:
 * WelcomeWalkModal.tsx (and everything it imports — SchedulingDialog,
 * onboarding-handoff, next/image, ...) then only has to load on the one
 * route that renders it (home), not on every route that merely offers a way
 * to open it.
 */
export const WELCOME_MODAL_OPEN_EVENT = 'ntr:open-welcome-modal';

/** Opens the welcome modal from anywhere on the page. No-op on the server. */
export function openWelcomeWalkModal(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WELCOME_MODAL_OPEN_EVENT));
}

/**
 * Fails CLOSED: if storage is unavailable (private mode, blocked cookies) we
 * report "already seen" so a visitor who cannot be remembered is never shown
 * the popup on every page view.
 */
export function hasSeenWelcomeModal(storage: WelcomeModalStorage | null | undefined): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(WELCOME_MODAL_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

/** Best-effort write — a storage failure must never break the page. */
export function markWelcomeModalSeen(storage: WelcomeModalStorage | null | undefined): void {
  if (!storage) return;
  try {
    storage.setItem(WELCOME_MODAL_STORAGE_KEY, new Date().toISOString());
  } catch {
    // Ignored: the visitor simply sees the modal again on a later visit.
  }
}
