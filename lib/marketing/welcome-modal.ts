/**
 * Pure helpers for the first-visit walk-signup modal.
 *
 * No React and no direct `window` access: the component passes its storage in,
 * so this stays unit-testable in the node-environment vitest setup and the
 * "have they already seen it?" rule lives in one place.
 */

/** Bump the suffix to re-show the modal to everyone after a campaign change. */
export const WELCOME_MODAL_STORAGE_KEY = 'ntr:welcome-walk-modal:v1';

/** Delay before the modal opens, so it never interrupts the first paint. */
export const WELCOME_MODAL_DELAY_MS = 10_000;

export type WelcomeModalStorage = Pick<Storage, 'getItem' | 'setItem'>;

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
