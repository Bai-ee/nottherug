import { test, expect } from '@playwright/test';
import { suppressWelcomeModal } from './helpers/welcomeModal';
import { waitForHydration } from './helpers/hydration';

// Hang guard only: these assert what was or was not requested and what
// painted, never how fast a shared runner got there.
const HANG_GUARD_MS = 15_000;

// Plan 013 P3 (F07): the paw walk ships 104px WebP prints (not the 444px
// PNGs) and the six team portraits are lazy, so none is fetched before the
// team band nears the viewport.

const PAW_PNG = /\/img\/paw[lr]\.png/;
const TEAM_PORTRAIT = /\/img\/team\/(luis|lincoln|marcus|christian|shawn|yenny)[^/]*\.(jpg|webp|avif)/;

test.describe('home image delivery', () => {
  test.beforeEach(async ({ page }) => {
    await suppressWelcomeModal(page);
  });

  test('team portraits are not requested until scrolled near, then load and show', async ({ page }) => {
    const portraitRequests: string[] = [];
    const pawPngRequests: string[] = [];
    const consoleErrors: string[] = [];
    page.on('request', (req) => {
      if (TEAM_PORTRAIT.test(req.url())) portraitRequests.push(req.url());
      if (PAW_PNG.test(req.url())) pawPngRequests.push(req.url());
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/', { waitUntil: 'load' });
    // Hydrated and past the page's own post-load work (two frames, then idle),
    // so "not requested yet" is read after the point eager loading would have
    // happened, not after a guessed delay.
    await waitForHydration(page, '#home-team-scroller');
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => resolve(), { timeout: 2500 });
              else window.setTimeout(resolve, 600);
            }),
          );
        }),
    );
    expect(portraitRequests).toEqual([]);

    const scroller = page.locator('#home-team-scroller');
    await scroller.scrollIntoViewIfNeeded();
    const luis = page.locator('#home-team-chip-photo-luis img');
    await expect(luis).toBeVisible({ timeout: HANG_GUARD_MS });
    await expect.poll(() => luis.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: HANG_GUARD_MS }).toBe(true);
    await expect.poll(() => portraitRequests.length, { timeout: HANG_GUARD_MS }).toBeGreaterThan(0);
    // Every chip's portrait paints once it is near.
    for (const name of ['luis', 'lincoln', 'marcus', 'christian', 'shawn', 'yenny']) {
      const img = page.locator(`#home-team-chip-photo-${name} img`);
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.currentSrc !== '' && el.complete && el.naturalWidth > 0), { timeout: HANG_GUARD_MS }).toBe(true);
    }

    expect(pawPngRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('paw walk renders from WebP prints with no horizontal overflow', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.goto('/', { waitUntil: 'load' });
    const layer = page.locator('#home-paw-walk-layer');
    await expect(layer).toBeAttached({ timeout: HANG_GUARD_MS });
    const srcs = await page.locator('.home-paw-step').evaluateAll((els) =>
      Array.from(new Set(els.map((el) => (el as HTMLImageElement).getAttribute('src')))),
    );
    expect(srcs.sort()).toEqual(['/img/paw-walk-left.webp', '/img/paw-walk-right.webp']);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(consoleErrors).toEqual([]);
  });
});
