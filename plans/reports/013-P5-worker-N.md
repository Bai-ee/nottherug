# Plan 013 P5 (worker N): two mobile-WebKit E2E flakes

Source: GitHub Actions run 37359972154 (mobile project, each failed once, passed on retry). Test-only change; no product code touched.

## 1. booking.spec.ts "phone consultation checked" (page.check timeout)

Root cause (reproduced): the test interacted with /book before React hydrated. Pre-hydration, `fill` works on server HTML but the "Next" click is silently dropped, so the form never leaves "Step 1 of 5". Every later `fill` still succeeds (fields in off-screen panels are attached and visible), the three further Next clicks are also dropped, and `page.check` on the step-5 checkbox then waits forever: its panel is clipped by `#book-tab-meetgreet-carousel-row` (overflow hidden), so the call log reads "`#book-tab-meetgreet-carousel-row` intercepts pointer events" until the 30s test timeout. P3 made hydration later (deferred hero/intro work), so a slow runner now loses the race.

Reproduction: delaying `_next/static/chunks/**/*.js` by 2.5s reproduced the exact failure ("Step 1 of 5", checkbox intercepted by the carousel row). Without delay, 60x (6 workers) and 100x (14 workers + 8 CPU burners) mobile runs never failed, so contention alone did not reproduce it; delaying hydration did, deterministically. Same probe with the fix passes ("Step 5 of 5").

Fix (test-only): new `tests/e2e/helpers/hydration.ts` `waitForHydration(page, selector)` polls for React's `__reactProps$` stamp on the element (the real "handlers attached" signal, no sleep). `/book` is opened through `openBookingForm`, which waits for it, in all booking tests. `fillThroughWrapUpStep` also asserts "Step 2 of" and "Step 5 of" so any dropped click fails at the step that dropped it, with a clear message.

Product defect? No. Clicks before hydration being ignored is normal SSR behaviour.

## 2. home-entrance.spec.ts "video request aborted" (1500ms predicate timeout)

Root cause: the test asserted a wall-clock bound (1.5s, Playwright-side poll after `load`) as the oracle for "CTA does not depend on the video". On a slow shared runner the bound measures runner speed. Each poll is also a CDP round trip.

Redesign: an in-page probe (init script) samples `#hero-cta-primary` on every rendered frame: exists, visible (no `visibility:hidden`/`display:none` ancestor), effective opacity 1 (excluding the shared `#page-home` fade), non-zero box, and `elementFromPoint` at its centre is the CTA. It counts frames, not milliseconds, so runner slowness cannot skew it. It also records any `loadedmetadata/loadeddata/canplay/canplaythrough/playing/progress` event from `#hero-bg-video`.

The video test now runs twice: video request **held forever** (route handler never fulfils/continues) and **aborted**. In each: the route handler fired (request provably made and blocked); the probe was told "blocked" at that moment; the test waits for >= 30 frames rendered after the block; then asserts zero inoperable frames since the block and over the whole load, no `requestfinished` for the video, no video data events, `video.readyState === 0`, poster still set, and (aborted) a `requestfailed` was seen. If the CTA waited on the video, the never-completing request would leave it inoperable and the test would hang to the guard and fail. The only time value left is a 15s hang guard.

## Same weakness elsewhere, fixed consistently

home-entrance.spec.ts:
- "within 1.5s of DOMContentLoaded" test: now "from the first frame": every frame the CTA existed it was operable (`inoperableFrames === 0`), across the whole intro (until `data-home-intro="done"`) plus 30 more frames. Stronger than the old minOpacity/everHidden pair plus a time bound, and clock-free.
- GSAP-blocked (4000ms), keyboard (1500/5000ms), overflow (4000ms + 1500ms sleep), video-after-load (8000ms): timeouts raised to the 15s guard; the overflow sleep became 90 rendered frames.
- Reduced-motion and data-saving: the `waitForTimeout(2500)` before "no video request" is replaced by `waitForHeroVideoDecision` (hydration, then two rAFs and an idle callback queued after the hero's own, mirroring HomeHero's scheduling) plus a state assertion that `#hero-bg-video` has zero `<source>` children, besides the no-request assertion.

home-image-delivery.spec.ts: the 1500ms sleep before "no portrait requested" is replaced by hydration plus the same post-load idle point; the 5s default expect timeouts on image load/visibility polls are raised to the 15s guard.

## Evidence (local, production build, port 3680)
- home-entrance + home-image-delivery + booking, `--repeat-each=50 --workers=4 --retries=0`: mobile 750 passed, 50 skipped (keyboard test is desktop-only by design), 0 failed, 0 flaky; desktop 800 passed, 0 failed, 0 flaky.
- Full E2E `CI=1 E2E_PORT=3680 npm run test:e2e`: 201 passed, 21 skipped, 0 failed, 0 flaky.
- Unit/emulator suite: 797 passed, 0 skipped (102 emulator-backed). `npm run lint` clean. `tsc --noEmit` clean.

Not verified: behaviour on the actual GitHub runner (no push).

## Review fixes (branch 013/p5-n2, test files only)

1. Intro ceiling restored, clock-free. The in-page probe now stamps `performance.now()` (ms from navigation start, the origin `INTRO_CEILING_MS` uses) when `data-home-intro` is first "loading" and "done" (MutationObserver plus per-frame read). `expectIntroEndedWithinCeiling` asserts done <= `INTRO_CEILING_MS` (imported from homeIntroTiming.ts) + 1500ms margin, on the page's own clock; the margin only absorbs a timer firing late behind main-thread work, and an intro regressing to ~10s fails. Used in the first home test, the GSAP-blocked test (failsafe path) and the three overflow tests. The 15s remains only as hang guard.
2. Commit-aware hydration wait. New `waitForHomeEffectsAndHeroDecision` (helpers/hydration.ts): React stamp, then `history.scrollRestoration === 'manual'` (set by `useScrollToTopOnLoad` in the same tree's passive effects, so effects have committed), then two rAFs and an idle callback with timeout 2500 >= the hero's 2000 (600ms timer fallback vs the hero's 300). Used by the reduced-motion, data-saving and portrait tests. No product attribute added.
   Non-vacuity: temporarily removed the `reducedMotion` and `saveData` early returns in heroVideoPolicy.ts, rebuilt: the reduced-motion and data-saving tests failed 20 of 20 runs (`--repeat-each=5`, expected 0 sources/requests, received 2). Break reverted, not committed.
3. First home test now asserts `#page-home` `toHaveCSS('opacity','1')`.
4. The in-page blocked-marking `evaluate` in the route handler is try/catch'd; the test asserts the `markFailed` flag is false.

Proof: home-entrance + home-image-delivery + booking, `--repeat-each=50 --workers=4 --retries=0`: mobile 750 passed / 50 skipped (desktop-only keyboard test), desktop 800 passed, 0 failed, 0 flaky. Full `CI=1` E2E: 201 passed, 21 skipped, 0 failed, 0 flaky. Lint and tsc clean. (One earlier full run showed spurious failures from ENOSPC, the host disk was full; it passed after clearing .next/cache and test-results.)

## Linux WebKit video block (branch 013/p5-n3)

CI run 37388262982: on Linux WebKit the hero video request completed despite `page.route` (GStreamer's media loader bypasses Playwright interception), failing `expect(finished).toEqual([])`. The two video tests now block the video in the page (`blockHeroVideoInPage`): `HTMLSourceElement.src` for hero-video URLs is recorded, not applied (nothing for any engine to fetch), `load()` on `#hero-bg-video` is a counted no-op, and "aborted" mode dispatches a real `error` event on the source. `page.route` stays as a second line. Asserted on every engine: hero tried to attach (`blockedSources`), no data events, `readyState 0`, `networkState != LOADING`, nothing buffered, no source got a URL, errors dispatched (aborted); no `request`/`requestfinished` only on Chromium. CTA frame assertions unchanged. Locally the home-entrance file passed on macOS WebKit/Chromium; the full repeat runs were stopped on operator instruction, so CI is the proof.

Open item found while repeating (not caused by this change, introduced by the earlier intro-ceiling check): in the GSAP-chunk-blocked test on mobile, about 1 run in 50 ends with `data-home-intro` absent (null) rather than "done", so `introDoneAt` stays null and `expectIntroEndedWithinCeiling` times out. Debug output showed `introLoadingAt` set, attribute null, page alive. Likely the attribute is dropped when hydration is disturbed by the aborted chunk. Needs a decision: accept an absent attribute as "intro cleared" in that test.
