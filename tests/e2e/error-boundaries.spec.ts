import { test, expect } from '@playwright/test';
import { suppressWelcomeModal } from './helpers/welcomeModal';

// Covers plans/010-production-final-mile-optimization.md P5:
// - the intentional 404 boundary (app/not-found.tsx)
// - keyboard open/close + focus restore for the welcome-walk modal and the
//   mobile section-jump sheet (SectionJump's own Escape/focus-restore case is
//   already covered in section-nav.spec.ts; this file adds the Tab-trap this
//   phase introduced, and the welcome modal's equivalent, which had no
//   keyboard coverage before)
// - reduced-motion content visibility for the welcome modal
//
// Not covered here: an injected render-time error hitting error.tsx/
// global-error.tsx. No dev-only error-trigger route exists in this app, and
// plan 010 P5 explicitly forbids adding one to a production build — so
// app/(marketing)/error.tsx and app/admin/error.tsx are verified by reading
// the component (Next's documented error.tsx contract: retry()/error props,
// no error.message rendered) rather than by triggering a real crash here.

test.describe('404 boundary', () => {
  test('an unknown path renders the intentional 404 page with a 404 status', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('#not-found-heading')).toBeVisible();
    await expect(page.locator('#not-found-heading')).toHaveText("We couldn't find that page.");
    await expect(page.locator('#not-found-actions a[href="/"]')).toBeVisible();
    await expect(page.locator('#not-found-actions a[href="/contact"]')).toBeVisible();
    // Root SiteNav/SiteFooter render around it — same chrome as every other page.
    await expect(page.locator('#main-nav')).toBeVisible();
  });
});

test.describe('welcome-walk modal keyboard journey', () => {
  test('Escape closes the modal and returns focus to the control that opened it', async ({ page, isMobile }) => {
    await suppressWelcomeModal(page);
    await page.goto('/');

    // On mobile, opening the modal from the hamburger menu's "Book a Walk"
    // link also closes that menu (SiteNav.handleBookClick) — which hides the
    // very link that was clicked. WelcomeWalkModal's focus-restore falls back
    // to the hamburger toggle in that case (see the offsetParent check in its
    // focus-trap cleanup), since the original opener is no longer focusable.
    async function openModal() {
      if (!isMobile) {
        await page.locator('#main-nav .nav-cta').click();
        return page.locator('#main-nav .nav-cta');
      }
      await page.locator('#nav-hamburger-toggle').click();
      await page.locator('#mobile-menu-book-cta').click();
      return page.locator('#nav-hamburger-toggle');
    }

    const opener = await openModal();
    const modal = page.locator('#welcome-walk-modal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#welcome-walk-modal-close')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('Tab is trapped inside the modal', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop-only: exercising the trap once is enough coverage');
    await suppressWelcomeModal(page);
    await page.goto('/');
    await page.locator('#main-nav .nav-cta').click();
    await expect(page.locator('#welcome-walk-modal')).toBeVisible();

    // Shift+Tab from the first focusable element (the close button, which
    // also receives initial focus) must wrap to the dialog's last focusable
    // element, never escaping to the page behind it.
    await page.keyboard.press('Shift+Tab');
    const active = await page.evaluate(() => document.activeElement?.closest('#welcome-walk-modal') !== null);
    expect(active).toBe(true);
  });
});

test.describe('mobile section-jump keyboard journey', () => {
  test('Tab is trapped inside the open menu', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'section-jump is mobile-only');
    await suppressWelcomeModal(page);
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));

    const trigger = page.locator('#section-jump-trigger');
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Shift+Tab from the first item (which receives initial focus) must wrap
    // to the last item inside #section-jump-menu, not escape to the dimmed
    // page content behind the scrim.
    await page.keyboard.press('Shift+Tab');
    const activeInMenu = await page.evaluate(
      () => document.activeElement?.closest('#section-jump-menu') !== null
    );
    expect(activeInMenu).toBe(true);
  });
});

test.describe('prefers-reduced-motion', () => {
  test('welcome-walk modal is fully visible immediately, with no fade/rise animation', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await suppressWelcomeModal(page);
    await page.goto('/');
    if (isMobile) {
      await page.locator('#nav-hamburger-toggle').click();
      await page.locator('#mobile-menu-book-cta').click();
    } else {
      await page.locator('#main-nav .nav-cta').click();
    }

    const modal = page.locator('#welcome-walk-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveCSS('opacity', '1');
    // #welcome-walk-modal-shell carries welcomeModalRise, which the
    // component's own reduced-motion block disables (`animation: none !important`).
    await expect(page.locator('#welcome-walk-modal-shell')).toHaveCSS('animation-name', 'none');
  });
});
