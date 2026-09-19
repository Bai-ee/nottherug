import { test, expect, type Page } from '@playwright/test';

// Coverage for the in-page section nav: the desktop left rail (SectionRail)
// and the mobile jump control (SectionJump), both driven by the registry in
// lib/navigation/sections.ts. The two are one feature with one breakpoint —
// exactly one of them may be reachable at any width — so both projects run
// this file and each suite skips at the width it doesn't own.
//
// The landing assertion is the point of the feature: a destination must come
// to rest flush under the fixed nav, not under it.

const isWide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1280;

// The glide re-reads the target's live position every frame, and the section
// reveal animations are still settling as it lands, so "flush under the nav"
// is a few pixels wide in practice — but nowhere near the ~3800px a broken
// jump leaves on the table.
const LANDING_TOLERANCE_PX = 14;

async function navHeight(page: Page) {
  return page.locator('#main-nav').evaluate((el) => el.getBoundingClientRect().height);
}

async function sectionTop(page: Page, id: string) {
  return page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
}

test.describe('desktop section rail', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one engine is enough for layout chrome');

  test('lands a clicked section flush under the fixed nav', async ({ page }) => {
    test.skip(!isWide(page), 'rail is desktop-only');
    await page.goto('/');

    const rail = page.locator('#section-rail-shell');
    await expect(rail).toBeVisible();
    await expect(page.locator('#section-jump-root')).toBeHidden();

    await page.locator('#section-rail-marker-home-featured-reviews-section').click();

    const railTargetOffset = Math.round(await navHeight(page));
    await expect
      .poll(
        async () => Math.abs(Math.round(await sectionTop(page, 'home-featured-reviews-section')) - railTargetOffset),
        { timeout: 8_000 }
      )
      .toBeLessThanOrEqual(LANDING_TOLERANCE_PX);

    await expect(page.locator('#section-rail-marker-home-featured-reviews-section')).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  test('renders nothing on a route with no registered sections', async ({ page }) => {
    test.skip(!isWide(page), 'rail is desktop-only');
    await page.goto('/book');
    await expect(page.locator('#section-rail-shell')).toHaveCount(0);
    await expect(page.locator('#section-jump-root')).toHaveCount(0);
  });
});

test.describe('mobile section jump', () => {
  test('stays out of the way over the hero, then jumps to a section', async ({ page }) => {
    test.skip(isWide(page), 'jump control is mobile-only');
    await page.goto('/');

    const root = page.locator('#section-jump-root');
    const trigger = page.locator('#section-jump-trigger');
    await expect(root).toHaveAttribute('data-revealed', 'false');

    // Past the hero it fades in; the rail is never reachable at this width.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
    await expect(root).toHaveAttribute('data-revealed', 'true');
    await expect(page.locator('#section-rail-shell')).toBeHidden();

    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#section-jump-menu')).toBeVisible();

    await page.locator('#section-jump-item-home-featured-reviews-section').tap();

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const jumpTargetOffset = Math.round(await navHeight(page));
    await expect
      .poll(
        async () => Math.abs(Math.round(await sectionTop(page, 'home-featured-reviews-section')) - jumpTargetOffset),
        { timeout: 8_000 }
      )
      .toBeLessThanOrEqual(LANDING_TOLERANCE_PX);

    // The open state clips <html> to lock scrolling; closing must hand the
    // page back a working scroller, or every later jump silently no-ops.
    const overflow = await page.evaluate(() => document.documentElement.style.overflow);
    expect(overflow).toBe('');
  });

  test('closes on Escape and returns focus to the trigger', async ({ page }) => {
    test.skip(isWide(page), 'jump control is mobile-only');
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));

    const trigger = page.locator('#section-jump-trigger');
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });
});
