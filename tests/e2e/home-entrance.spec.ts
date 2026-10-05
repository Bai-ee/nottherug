import { test, expect, type Page } from '@playwright/test';
import { suppressWelcomeModal } from './helpers/welcomeModal';

// Plan 013 P3 / audit F06 + F07 (video part): the homepage headline and the
// primary booking CTA must be visible and operable without waiting for the
// decorative intro, the hero video, fonts or GSAP, and every failure path
// must leave them that way.

const CTA = '#hero-cta-primary';
const HEADLINE = '#hero-headline';
const CTA_BOUND_MS = 1500;
const VIDEO_URL = /\/video\/hero-mccarren-.*\.(webm|mp4)(\?|$)/;

test.beforeEach(async ({ page }) => {
  await suppressWelcomeModal(page);
});

/**
 * Records the CTA's effective opacity / visibility every frame. #page-home is
 * skipped for opacity: the shared 0.4s `.page` fade-in (globals.css, every
 * route, independent of assets) is not part of the hero entrance.
 */
async function trackCtaAvailability(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __ctaMinOpacity: number; __ctaEverHidden: boolean };
    w.__ctaMinOpacity = 1;
    w.__ctaEverHidden = false;
    const sample = () => {
      const el = document.getElementById('hero-cta-primary');
      if (el) {
        let opacity = 1;
        for (let n: Element | null = el; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (n.id !== 'page-home') opacity *= parseFloat(cs.opacity);
          if (cs.visibility === 'hidden' || cs.display === 'none') w.__ctaEverHidden = true;
        }
        w.__ctaMinOpacity = Math.min(w.__ctaMinOpacity, opacity);
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function expectCtaOperable(page: Page, timeout = CTA_BOUND_MS) {
  await expect(page.locator(CTA)).toBeVisible({ timeout });
  // Operable = the CTA is what a pointer actually hits at its centre, in the
  // viewport as loaded (no scrolling): nothing (an overlay, a veil) covers it.
  await expect
    .poll(
      () =>
        page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!hit && el.contains(hit);
        }, CTA),
      { timeout },
    )
    .toBe(true);
}

test('headline and primary CTA are visible and operable within 1.5s of DOMContentLoaded', async ({ page }) => {
  const errors = collectErrors(page);
  await trackCtaAvailability(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator(HEADLINE)).toBeVisible({ timeout: CTA_BOUND_MS });
  await expectCtaOperable(page);

  // Over the whole intro window the CTA was never transparent or hidden.
  await page.waitForTimeout(2000);
  const { minOpacity, everHidden } = await page.evaluate(() => {
    const w = window as unknown as { __ctaMinOpacity: number; __ctaEverHidden: boolean };
    return { minOpacity: w.__ctaMinOpacity, everHidden: w.__ctaEverHidden };
  });
  expect(everHidden).toBe(false);
  expect(minOpacity).toBe(1);
  expect(errors).toEqual([]);
});

test('reduced motion: final state at once, no intro, no video request', async ({ page }) => {
  const errors = collectErrors(page);
  const videoRequests: string[] = [];
  page.on('request', (r) => {
    if (VIDEO_URL.test(r.url())) videoRequests.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });

  await expectCtaOperable(page);
  await expect(page.locator('#home-intro-overlay')).toHaveCount(0);
  await expect(page.locator(`${HEADLINE} .word-wrap`)).toHaveCount(0);
  await page.waitForTimeout(2500);
  expect(videoRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('data-saving signal: poster only, no video request', async ({ page }) => {
  const videoRequests: string[] = [];
  page.on('request', (r) => {
    if (VIDEO_URL.test(r.url())) videoRequests.push(r.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true });
  });
  await page.goto('/', { waitUntil: 'load' });
  await expectCtaOperable(page);
  await page.waitForTimeout(2500);
  expect(videoRequests).toEqual([]);
});

test('video is requested only after load and the viewport picks the right size', async ({ page }) => {
  const video: string[] = [];
  page.on('request', (r) => {
    if (VIDEO_URL.test(r.url())) video.push(r.url());
  });
  await page.goto('/', { waitUntil: 'load' });
  await expect.poll(() => video.length, { timeout: 8000 }).toBeGreaterThan(0);
  const narrow = (page.viewportSize()?.width ?? 0) <= 768;
  expect(video.every((u) => (narrow ? u.includes('-540.') : u.includes('-1080.')))).toBe(true);
});

test('GSAP chunk blocked: CTA and headline stay visible and the page has no entrance', async ({ page }) => {
  let blocked = 0;
  await page.route('**/_next/static/chunks/**/*.js', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (/GreenSock|gsap\.registerPlugin|ScrollTrigger/.test(body) && /gsap/i.test(body)) {
      blocked += 1;
      await route.abort();
      return;
    }
    await route.fulfill({ response, body });
  });
  await trackCtaAvailability(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Every chunk is proxied through the test here, so allow for that latency.
  await expectCtaOperable(page, 4000);
  await expect(page.locator(HEADLINE)).toBeVisible();
  // The intro state is never left at "loading" (the fixed timer or, if
  // hydration itself was disturbed, the inline failsafe clears it), and the
  // headline was never split/hidden.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.homeIntro ?? 'none'), { timeout: 4000 })
    .not.toBe('loading');
  await expect(page.locator(`${HEADLINE} .word-wrap`)).toHaveCount(0);
  expect(blocked).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as { __ctaMinOpacity: number }).__ctaMinOpacity)).toBe(1);
});

test('video request aborted: CTA still visible and operable', async ({ page }) => {
  await page.route(VIDEO_URL, (route) => route.abort());
  await page.goto('/', { waitUntil: 'load' });
  await expectCtaOperable(page);
  await page.waitForTimeout(2500);
  await expectCtaOperable(page);
  await expect(page.locator('#hero-bg-video')).toHaveAttribute('poster', /hero-mccarren-poster\.webp/);
});

test('keyboard can reach and activate the primary CTA', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, 'keyboard path exercised on the desktop project');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(CTA)).toBeVisible({ timeout: CTA_BOUND_MS });
  let reached = false;
  for (let i = 0; i < 25 && !reached; i += 1) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => document.activeElement?.id === 'hero-cta-primary');
  }
  expect(reached).toBe(true);
  await page.keyboard.press('Enter');
  // Hydrated: the welcome dialog opens. Not yet hydrated: the real /contact
  // href is followed. Either way Enter on the CTA does something.
  await expect
    .poll(async () => (await page.locator('[role="dialog"]').count()) > 0 || page.url().endsWith('/contact'), { timeout: 5000 })
    .toBe(true);
});

for (const width of [375, 768, 1440]) {
  test(`no horizontal overflow at ${width}px after the intro`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-home-intro', 'done', { timeout: 4000 });
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
