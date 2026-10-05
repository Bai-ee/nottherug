import { expect, type Page } from '@playwright/test';

/**
 * Resolves once React has hydrated `selector`: React stamps every element it
 * has taken over with a `__reactProps$…` key, so the key's presence is the
 * real "event handlers are attached" signal. Interacting earlier is a race on
 * a slow runner: clicks on server-rendered controls are silently dropped and
 * typed values can be overwritten by the hydration render.
 */
export async function waitForHydration(page: Page, selector: string, timeout = 15_000): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps$'));
        }, selector),
      { timeout, message: `React never hydrated ${selector}` },
    )
    .toBe(true);
}

/**
 * `waitForHydration` resolves at React's render-phase stamp, which can be
 * before the commit and its passive effects. The home page's effects (the
 * hero video policy among them) have run once HomeSectionRevealShell's
 * `useScrollToTopOnLoad` effect has set `history.scrollRestoration = 'manual'`
 * (same tree, same commit; it restores 'auto' only on unmount). After that,
 * two animation frames and an idle callback with a timeout at or above the
 * hero's own (2000ms; Safari's fallback there is a 300ms timer) fire after the
 * hero's queued work, so whatever is read next is the hero's decision, not a
 * race against it.
 */
export async function waitForHomeEffectsAndHeroDecision(page: Page, timeout = 15_000): Promise<void> {
  await waitForHydration(page, '#hero-bg-video', timeout);
  await expect
    .poll(() => page.evaluate(() => window.history.scrollRestoration), { timeout, message: 'home effects never committed' })
    .toBe('manual');
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
}
