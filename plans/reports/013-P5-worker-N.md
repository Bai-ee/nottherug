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
