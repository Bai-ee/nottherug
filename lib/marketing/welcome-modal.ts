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
 * How far the visitor must scroll DOWN the home page before the modal opens.
 * The popup is a response to engagement, not a timer: it waits for the reader
 * to start moving down the page, and never interrupts the first paint.
 */
export const WELCOME_MODAL_SCROLL_TRIGGER_PX = 120;

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

/**
 * True once the visitor has scrolled DOWN past the trigger distance from
 * wherever they started.
 *
 * Measured against `startY` rather than 0 for two reasons: a reload can
 * restore a mid-page offset, which must not count as scrolling, and a
 * visitor who lands on a `#section` link starts partway down. The subtraction
 * also means scrolling UP never reaches the threshold.
 */
export function hasScrolledPastTrigger(
  currentY: number,
  startY: number,
  threshold: number = WELCOME_MODAL_SCROLL_TRIGGER_PX,
): boolean {
  return currentY - startY >= threshold;
}
