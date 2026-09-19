import type { Page } from '@playwright/test';
import { WELCOME_MODAL_STORAGE_KEY } from '@/lib/marketing/welcome-modal';

/**
 * The home page's welcome-walk modal opens 20s into a first visit
 * (lib/marketing/welcome-modal.ts). A slow or retried journey would otherwise
 * have the dialog land on top of the control it is about to click. Marking
 * it "seen" before the page loads keeps it closed; explicit opens (the nav
 * Book CTA, the hero) still work because they bypass the seen check.
 */
export async function suppressWelcomeModal(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Storage unavailable: the modal simply behaves as for a first visit.
      }
    },
    [WELCOME_MODAL_STORAGE_KEY, new Date().toISOString()] as const,
  );
}
