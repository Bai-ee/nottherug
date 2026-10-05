import { test, expect, type Page } from '@playwright/test';
import { suppressWelcomeModal } from './helpers/welcomeModal';
import { waitForHomeEffectsAndHeroDecision } from './helpers/hydration';
import { INTRO_CEILING_MS } from '@/components/marketing/hooks/homeIntroTiming';

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
  /** performance.now() (ms from navigation start) when data-home-intro first read "loading" / "done". */
  introLoadingAt: number | null;
  introDoneAt: number | null;
  /** In-page video block (blockHeroVideoInPage): URLs the hero tried to attach, load() calls, error events dispatched. */
  blockedSources: string[];
  loadCalls: number;
  sourceErrors: number;
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
      introLoadingAt: null,
      introDoneAt: null,
      blockedSources: [],
      loadCalls: 0,
      sourceErrors: 0,
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
    // The intro attribute is set by an inline script during parse and cleared
    // by a timer or the keyframes' end; stamp both moments on the page's own
    // clock (performance.now() is relative to navigation start, the same
    // origin INTRO_CEILING_MS is measured from).
    const readIntro = () => {
      const v = document.documentElement?.dataset.homeIntro;
      if (v === 'loading' && probe.introLoadingAt === null) probe.introLoadingAt = performance.now();
      if (v === 'done' && probe.introDoneAt === null) probe.introDoneAt = performance.now();
    };
    new MutationObserver(readIntro).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-home-intro'] });
    readIntro();
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
      readIntro();
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

// Margin over the product's ceiling, on the page's own clock: absorbs a timer
// firing late behind main-thread work on a loaded runner (hydration, a GC),
// while an intro that regresses to seconds past the ceiling still fails.
const INTRO_CEILING_MARGIN_MS = 1500;

/**
 * The intro ended by its ceiling: measured in-page from navigation start, so
 * the runner's speed to deliver this assertion does not matter. `done` is the
 * ceiling timer or the keyframes' end, whichever fires first (the inline
 * failsafe is the same 2500ms); the GSAP-blocked page ends the same way.
 */
async function expectIntroEndedWithinCeiling(page: Page) {
  await expect.poll(async () => (await readProbe(page)).introDoneAt, { timeout: HANG_GUARD_MS }).not.toBeNull();
  const probe = await readProbe(page);
  expect(probe.introLoadingAt).not.toBeNull();
  expect(probe.introDoneAt!).toBeLessThanOrEqual(INTRO_CEILING_MS + INTRO_CEILING_MARGIN_MS);
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
  await expectIntroEndedWithinCeiling(page);
  // The shared page fade-in (excluded from the per-frame CTA opacity) is not stuck.
  await expect(page.locator('#page-home')).toHaveCSS('opacity', '1', { timeout: HANG_GUARD_MS });
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
  await waitForHomeEffectsAndHeroDecision(page);
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
  await waitForHomeEffectsAndHeroDecision(page);
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
  await expectIntroEndedWithinCeiling(page);
  await expect(page.locator(`${HEADLINE} .word-wrap`)).toHaveCount(0);
  expect(blocked).toBeGreaterThan(0);
  await expectCtaNeverWithheld(page);
});

/**
 * Blocks the hero video IN THE PAGE, so "the video never loads" holds on every
 * engine. Network interception is not enough: Linux WebKit's media loader
 * (GStreamer) does not go through Playwright's `page.route`, so a routed video
 * request can still complete there.
 *
 * HomeHero attaches `<source>` elements with `source.src = ...` and calls
 * `video.load()`. A source that never receives its `src` gives the media
 * element nothing to fetch, on any engine. The intended URL is recorded
 * instead (the test reads it to prove the hero really tried), and in "aborted"
 * mode a real `error` event is dispatched on the source, as a failed fetch
 * would. `video.load()` is a counted no-op for the hero video.
 */
async function blockHeroVideoInPage(page: Page, mode: 'held' | 'aborted') {
  await page.addInitScript((m) => {
    const probe = (window as unknown as { __ctaProbe: CtaProbe }).__ctaProbe;
    const heroVideoUrl = /\/video\/hero-mccarren-.*\.(webm|mp4)(\?|$)/;
    const desc = Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'src')!;
    Object.defineProperty(HTMLSourceElement.prototype, 'src', {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set(value: string) {
        if (!heroVideoUrl.test(String(value))) return desc.set!.call(this, value);
        probe.blockedSources.push(String(value));
        probe.videoBlocked = true; // the probe counts frames from here
        if (m === 'aborted') {
          const source = this as HTMLSourceElement;
          setTimeout(() => {
            probe.sourceErrors += 1;
            source.dispatchEvent(new Event('error'));
          }, 0);
        }
      },
    });
    const load = HTMLMediaElement.prototype.load;
    HTMLMediaElement.prototype.load = function (this: HTMLMediaElement) {
      if (this.id === 'hero-bg-video') {
        probe.loadCalls += 1;
        return;
      }
      return load.call(this);
    };
  }, mode);
}

// The property: the CTA does not depend on the hero video. Proven by making
// the video unable to load (held: nothing is ever fetched; aborted: the
// source reports a load error), and showing that once the hero has tried to
// load it, and no video data has arrived, the CTA is visible, opaque and
// hit-testable in every rendered frame. If the CTA waited on the video this
// would hang to the guard and fail. page.route stays on as a second line of
// defence where the engine honours it.
for (const mode of ['held', 'aborted'] as const) {
  test(`video ${mode} in the page: CTA stays visible and operable`, async ({ page, browserName }) => {
    const finished: string[] = [];
    const requested: string[] = [];
    page.on('request', (r) => {
      if (VIDEO_URL.test(r.url())) requested.push(r.url());
    });
    page.on('requestfinished', (r) => {
      if (VIDEO_URL.test(r.url())) finished.push(r.url());
    });
    await page.route(VIDEO_URL, (route) => (mode === 'aborted' ? route.abort() : undefined));
    await blockHeroVideoInPage(page, mode);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The hero really tried to load the video, and the block took effect in this engine.
    await expect.poll(async () => (await readProbe(page)).blockedSources.length, { timeout: HANG_GUARD_MS }).toBeGreaterThan(0);
    // The CTA stayed operable across a stretch of frames rendered *after* the block.
    await expect
      .poll(async () => (await readProbe(page)).framesSinceBlocked, { timeout: HANG_GUARD_MS })
      .toBeGreaterThanOrEqual(FRAMES_TO_OBSERVE);

    const probe = await readProbe(page);
    expect(probe.inoperableFramesSinceBlocked).toBe(0);
    await expectCtaOperable(page);
    await expectCtaNeverWithheld(page);

    // The video really never loaded: no data event, nothing buffered, no
    // source ever received a URL, and the media element is not fetching.
    expect(probe.videoDataEvents).toEqual([]);
    expect(probe.loadCalls).toBeGreaterThan(0);
    const media = await page.locator(VIDEO).evaluate((v: HTMLVideoElement) => ({
      readyState: v.readyState,
      networkState: v.networkState,
      buffered: v.buffered.length,
      sourcesWithUrl: Array.from(v.querySelectorAll('source')).filter((el) => el.getAttribute('src')).length,
    }));
    expect(media.readyState).toBe(0);
    expect(media.networkState).not.toBe(2); // NETWORK_LOADING
    expect(media.buffered).toBe(0);
    expect(media.sourcesWithUrl).toBe(0);
    if (mode === 'aborted') expect(probe.sourceErrors).toBeGreaterThan(0);
    // Where the engine honours interception (Chromium) the page-level block
    // also means no request ever left the page.
    if (browserName === 'chromium') {
      expect(requested).toEqual([]);
      expect(finished).toEqual([]);
    }
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
    await expectIntroEndedWithinCeiling(page);
    // Let the page settle after the intro: a stretch of rendered frames, not a sleep.
    await page.evaluate(
      (n) => new Promise<void>((resolve) => { let left = n; const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick)); tick(); }),
      FRAMES_TO_OBSERVE * 3,
    );
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
