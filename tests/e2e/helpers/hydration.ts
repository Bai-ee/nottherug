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
