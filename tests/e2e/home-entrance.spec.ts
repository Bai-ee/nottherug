import { test, expect, type Page } from '@playwright/test';
import { suppressWelcomeModal } from './helpers/welcomeModal';
import { waitForHydration } from './helpers/hydration';

// Plan 013 P3 / audit F06 + F07 (video part): the homepage headline and the
// primary booking CTA must be visible and operable without waiting for the
// decorative intro, the hero video, fonts or GSAP, and every failure path
// must leave them that way.

const CTA = '#hero-cta-primary';
const HEADLINE = '#hero-headline';
const VIDEO = '#hero-bg-video';
const VIDEO_URL = /\/video\/hero-mccarren-.*\.(webm|mp4)(\?|$)/;
// Hang guard only. Nothing here asserts "within N ms": a wall-clock bound
// measured on a shared CI runner proves the runner's speed, not the page's
// independence from the video. The properties are checked as state, counted
// in rendered frames, inside the page (see CtaProbe).
const HANG_GUARD_MS = 15_000;
const FRAMES_TO_OBSERVE = 30;

test.beforeEach(async ({ page }) => {
  await suppressWelcomeModal(page);
  await installCtaProbe(page);
});

interface CtaProbe {
  /** Frames in which #hero-cta-primary existed. */
  seenFrames: number;
  /** Of those, frames in which it was visible, fully opaque and what a pointer hits at its centre. */
  operableFrames: number;
  /** Of those, frames in which it was not (hidden, transparent or covered). */
  inoperableFrames: number;
  /** Set by the test once the hero video request is held or aborted. */
  videoBlocked: boolean;
  /** Frames seen, and frames operable, since videoBlocked was set. */
  framesSinceBlocked: number;
  inoperableFramesSinceBlocked: number;
  /** Media events the hero <video> fired (loadeddata, canplay, ...): bytes arrived. */
  videoDataEvents: string[];
}

/**
 * Samples the CTA on every rendered frame from the first script of the
 * document. #page-home is skipped for opacity: the shared 0.4s `.page`
 * fade-in (globals.css, every route, independent of assets) is not part of
 * the hero entrance. The probe lives in the page, so it counts frames, not
 * milliseconds, and cannot be skewed by how slow the test runner is.
 */
async function installCtaProbe(page: Page) {
  await page.addInitScript(() => {
    const probe: CtaProbe = {
      seenFrames: 0,
      operableFrames: 0,
      inoperableFrames: 0,
      videoBlocked: false,
      framesSinceBlocked: 0,
      inoperableFramesSinceBlocked: 0,
      videoDataEvents: [],
    };
    (window as unknown as { __ctaProbe: CtaProbe }).__ctaProbe = probe;
    for (const type of ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'progress']) {
      document.addEventListener(
        type,
        (e) => {
          if ((e.target as Element | null)?.id === 'hero-bg-video') probe.videoDataEvents.push(type);
        },
        true,
      );
    }
    const operable = (el: HTMLElement) => {
      let opacity = 1;
      for (let n: Element | null = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        if (n.id !== 'page-home') opacity *= parseFloat(cs.opacity);
      }
      if (opacity < 0.999) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && el.contains(hit);
    };
    const sample = () => {
      const el = document.getElementById('hero-cta-primary');
      if (el) {
        const ok = operable(el);
        probe.seenFrames += 1;
        if (ok) probe.operableFrames += 1;
        else probe.inoperableFrames += 1;
        if (probe.videoBlocked) {
          probe.framesSinceBlocked += 1;
          if (!ok) probe.inoperableFramesSinceBlocked += 1;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

function readProbe(page: Page): Promise<CtaProbe> {
  return page.evaluate(() => ({ ...(window as unknown as { __ctaProbe: CtaProbe }).__ctaProbe }));
}

/**
 * Operable = in at least one rendered frame the CTA was visible, opaque and
 * what a pointer actually hits at its centre, in the viewport as loaded (no
 * scrolling). Never operable would mean a hang, hence the generous guard.
 */
async function expectCtaOperable(page: Page) {
  await expect(page.locator(CTA)).toBeVisible({ timeout: HANG_GUARD_MS });
  await expect
    .poll(async () => (await readProbe(page)).operableFrames, { timeout: HANG_GUARD_MS })
    .toBeGreaterThan(0);
}

/**
 * The CTA was never withheld: from the first frame it existed, every frame had
 * it visible, opaque and uncovered. State, not speed.
 */
async function expectCtaNeverWithheld(page: Page) {
  const probe = await readProbe(page);
  expect(probe.operableFrames).toBeGreaterThan(0);
  expect(probe.inoperableFrames).toBe(0);
}

/**
 * Resolves once the hero's own post-load decision about the video has run:
 * after hydration, the hero attaches sources two animation frames in, on
 * requestIdleCallback (timeout 2s) or a 300ms timer where unsupported
 * (Safari). A callback queued now fires after it, so what is read next is the
 * decision itself, not a guess at elapsed time.
 */
async function waitForHeroVideoDecision(page: Page) {
  await waitForHydration(page, VIDEO);
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

function videoSourceCount(page: Page) {
  return page.locator(`${VIDEO} source`).count();
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test('headline and primary CTA are visible and operable from the first frame, without waiting for the intro', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator(HEADLINE)).toBeVisible({ timeout: HANG_GUARD_MS });
  await expectCtaOperable(page);

  // Let the whole intro play out (it ends in data-home-intro="done"), then
  // observe a further stretch of frames: across all of it the CTA was never
  // transparent, hidden or covered.
  await expect(page.locator('html')).toHaveAttribute('data-home-intro', 'done', { timeout: HANG_GUARD_MS });
  const framesAtDone = (await readProbe(page)).seenFrames;
  await expect.poll(async () => (await readProbe(page)).seenFrames, { timeout: HANG_GUARD_MS }).toBeGreaterThan(framesAtDone + FRAMES_TO_OBSERVE);
  await expectCtaNeverWithheld(page);
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
  await waitForHeroVideoDecision(page);
  expect(await videoSourceCount(page)).toBe(0);
  expect(videoRequests).toEqual([]);
  await expectCtaNeverWithheld(page);
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
  await waitForHeroVideoDecision(page);
  expect(await videoSourceCount(page)).toBe(0);
  expect(videoRequests).toEqual([]);
});

test('video is requested only after load and the viewport picks the right size', async ({ page }) => {
  const video: string[] = [];
  page.on('request', (r) => {
    if (VIDEO_URL.test(r.url())) video.push(r.url());
  });
  await page.goto('/', { waitUntil: 'load' });
  await expect.poll(() => video.length, { timeout: HANG_GUARD_MS }).toBeGreaterThan(0);
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
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expectCtaOperable(page);
  await expect(page.locator(HEADLINE)).toBeVisible();
  // The intro state is never left at "loading" (the fixed timer or, if
  // hydration itself was disturbed, the inline failsafe clears it), and the
  // headline was never split/hidden.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.homeIntro ?? 'none'), { timeout: HANG_GUARD_MS })
    .not.toBe('loading');
  await expect(page.locator(`${HEADLINE} .word-wrap`)).toHaveCount(0);
  expect(blocked).toBeGreaterThan(0);
  await expectCtaNeverWithheld(page);
});

// The property: the CTA does not depend on the hero video. Proven by
// blocking the video request so it can never complete (held forever, or
// aborted), and showing that while it is provably blocked, and no video data
// has arrived, the CTA is visible, opaque and hit-testable in every rendered
// frame. If the CTA waited on the video this would hang to the guard and fail.
for (const mode of ['held and never fulfilled', 'aborted'] as const) {
  test(`video request ${mode}: CTA stays visible and operable`, async ({ page }) => {
    const blockedRequests: string[] = [];
    const finished: string[] = [];
    const failed: string[] = [];
    page.on('requestfinished', (r) => {
      if (VIDEO_URL.test(r.url())) finished.push(r.url());
    });
    page.on('requestfailed', (r) => {
      if (VIDEO_URL.test(r.url())) failed.push(r.url());
    });
    await page.route(VIDEO_URL, async (route) => {
      blockedRequests.push(route.request().url());
      // The probe starts counting frames from the moment the request is blocked.
      await page.evaluate(() => {
        (window as unknown as { __ctaProbe: CtaProbe }).__ctaProbe.videoBlocked = true;
      });
      if (mode === 'aborted') await route.abort();
      // held: neither fulfilled nor continued, so no byte is ever delivered.
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Hero video was really requested, and the route handler fired for it.
    await expect.poll(() => blockedRequests.length, { timeout: HANG_GUARD_MS }).toBeGreaterThan(0);
    // The CTA stayed operable across a stretch of frames rendered *after* the block.
    await expect
      .poll(async () => (await readProbe(page)).framesSinceBlocked, { timeout: HANG_GUARD_MS })
      .toBeGreaterThanOrEqual(FRAMES_TO_OBSERVE);

    const probe = await readProbe(page);
    expect(probe.inoperableFramesSinceBlocked).toBe(0);
    await expectCtaOperable(page);
    await expectCtaNeverWithheld(page);

    // And the video really was blocked throughout: nothing finished, no data.
    expect(finished).toEqual([]);
    expect(probe.videoDataEvents).toEqual([]);
    expect(await page.locator(VIDEO).evaluate((v: HTMLVideoElement) => v.readyState)).toBe(0);
    if (mode === 'aborted') await expect.poll(() => failed.length, { timeout: HANG_GUARD_MS }).toBeGreaterThan(0);
    else expect(failed).toEqual([]);
    await expect(page.locator(VIDEO)).toHaveAttribute('poster', /hero-mccarren-poster\.webp/);
  });
}

test('keyboard can reach and activate the primary CTA', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, 'keyboard path exercised on the desktop project');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(CTA)).toBeVisible({ timeout: HANG_GUARD_MS });
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
    .poll(async () => (await page.locator('[role="dialog"]').count()) > 0 || page.url().endsWith('/contact'), { timeout: HANG_GUARD_MS })
    .toBe(true);
});

for (const width of [375, 768, 1440]) {
  test(`no horizontal overflow at ${width}px after the intro`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-home-intro', 'done', { timeout: HANG_GUARD_MS });
    // Let the page settle after the intro: a stretch of rendered frames, not a sleep.
    await page.evaluate(
      (n) => new Promise<void>((resolve) => { let left = n; const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick)); tick(); }),
      FRAMES_TO_OBSERVE * 3,
    );
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
