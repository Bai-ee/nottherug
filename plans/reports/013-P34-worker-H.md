# Plan 013 P3 — Worker H (F06 homepage entrance, F07 hero video)

Branch `013/p34-h`, base e5e28c8. Presentation/sequence only; copy, composition and brand unchanged.

## Before / after sequence (derived from code, not guessed)

Before (`useHomeIntroSequence`, `useHomeHeroMotion`, globals.css):
- `html[data-home-intro=loading]` set `visibility:hidden` on `#main-nav` and `#page-home` and `overflow:hidden` on body: nothing usable until release.
- Reveal start = `race(fonts+video canplay, 2500 ms)` **then +800 ms** (additive floor) = 800 ms (assets instant) to 3300 ms (stalled) before the paper even lifts; also needed GSAP loaded.
- Overlay timeline after that: walker 0.7 s, wipe 0.9 s (-0.35), so paper gone ≈ reveal + 1.25 s.
- Hero entrance gated on the same release, `delay 0.12`, then eyebrow/p/**actions set to opacity 0** and rebuilt on a ~2.3 s timeline (CTA row last, `-=0.5` after p). Best case CTA final ≈ 0.8 + 0.12 + ~2.3 s; the audit measured **~5.2 s mobile / ~5.4 s desktop** unthrottled.
- Failure paths: watchdog 6 s, gate safety 4 s, inline failsafe 7 s.

After:
- Intro is pure CSS keyframes keyed off `data-home-intro` (walker exit 0.15–0.7 s, paper lift 0.4–1.15 s, nav band 0.52–1.12 s, wordmark 0.5–1.2 s). No GSAP, video, font, or asset dependency; fixed length.
- `homeIntroTiming.ts`: reveal at 400 ms and done at 1300 ms, **both from navigation start, concurrent**; no floor, no asset wait. Max 1.3 s, never additive.
- Page and nav are never hidden; overlay is `pointer-events:none`, `aria-hidden`. Body scroll no longer locked.
- Hero entrance (GSAP, decorative): starts at the reveal tick, only if GSAP already loaded and page is within 2 s of nav start; otherwise skipped (no late hide-then-animate). Visual wipe 0.8 s, headline words 0.6 s/0.04 stagger, eyebrow/p fades. **CTA row never has opacity changed** (small 16 px rise over 0.45 s only). Total entrance ≈ 1.0 s from reveal.
- Failure: GSAP missing/throws -> hero static, entrance reverted; video error -> poster; inline failsafe 2.5 s; gate safety 1 s.
- Reduced motion: no loading attribute, no overlay, no entrance, no video.
- Measured (local prod build, unthrottled, one run each): CTA visible, opacity 1 at 64 ms (desktop) / 69 ms (mobile) performance time, DCL 113/29 ms; `data-home-intro` done at ~1.31 s. Compare audit 5.2–5.4 s. Not a Lighthouse/field number.
- Note: the shared global `.page{animation:fadeIn .4s}` on `#page-home` (all routes, not asset dependent) is untouched; it is a 0.4 s fade.
- Residual: headline words slide up between ~0.4 and ~1.0 s (decorative, brief, element never display/visibility hidden). Owner can drop the word-in entirely if "headline visible" must be literal opacity 1 from first paint.

## Files / ids
- `HomeIntroOverlay.tsx` (refs removed, bootstrap failsafe 7000->2500 ms), `hooks/useHomeIntroSequence.ts` (timers only), new `hooks/homeIntroTiming.ts`, `hooks/homeIntroGate.ts` (safety 4000->1000 ms), `hooks/useHomeHeroMotion.ts`, `HomeHero.tsx`, new `hooks/heroVideoPolicy.ts`, `app/globals.css` (HOME LOADING SCREEN block only), `.gitignore` + `docs/asset-manifest.json` (new video entries).
- Ids: no new containers; existing ids used and kept: `home-intro-overlay`, `home-intro-walker-shell`, `home-intro-walker-silhouette`, `home-intro-bootstrap`, `hero-bg-video`, `hero-actions-row`, `hero-cta-primary`, `hero-headline`.

## F07 video strategy
- Markup ships the `<video>` with `preload="none"`, poster only, no `<source>`, no `autoplay`.
- `pickHeroVideo` -> null (poster only, zero video bytes) for reduced motion, `navigator.connection.saveData`, `effectiveType` 2g/slow-2g.
- Otherwise after 2 rAF (first paint) + `requestIdleCallback` (timeout 2 s; 300 ms timer fallback) sources are attached and `load()` called; viewport <=768 px gets the 540 pair, else the 1080 pair. Plays only while >=10% visible; never blocks the CTA.
- ffmpeg present (/opt/homebrew/bin/ffmpeg). Commands (run in `public/video/`, originals kept):
  - `ffmpeg -y -i hero-mccarren-1080.mp4 -an -vf "scale=540:540:flags=lanczos,fps=24" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p hero-mccarren-540.webm`
  - `ffmpeg -y -i hero-mccarren-1080.mp4 -an -vf "scale=540:540:flags=lanczos,fps=24" -c:v libx264 -profile:v main -crf 29 -preset slow -pix_fmt yuv420p -movflags +faststart hero-mccarren-540.mp4`
  - Sizes: 540.webm 1,917,181 B (vs 4,773,718, -60%), 540.mp4 1,711,801 B (vs 4,468,914, -62%). 1:1 crop kept, 24 fps, 39.5 s loop.
- Not eyeballed frame-by-frame; owner should glance at the mobile clip.
- Poster (32 KB) still loads as before.

## Tests
- Unit: `tests/unit/home-intro-timing.test.ts` (6: no additive floor, concurrent timers, elapsed subtraction, throwing reveal still finishes, cancel, entrance cutoff), `tests/unit/hero-video-policy.test.ts` (3: size pick, reduced motion, saveData/2g).
- E2E: `tests/e2e/home-entrance.spec.ts` (x2 projects): CTA/headline within 1.5 s of DCL with hit-test and opacity/visibility sampling every frame; reduced motion (no overlay, no split headline, no video request); saveData (no video request); video after load + correct size; GSAP chunk aborted (route-fetch + abort of chunk containing GSAP); video aborted; keyboard Tab+Enter (desktop); no overflow 375/768/1440; no console/page errors.
- Commands: `npx tsc --noEmit` (clean), `npm run lint` (0 errors; the 1 pre-existing SchedulingDialog warning is P4's), `npm run build`, `CI=1 E2E_PORT=3620 npm run test:e2e`, emulator suite via firebase emulators:exec.
- Results: unit/emulator suite 78 files, 725 tests passed, 0 skipped (102 emulator-backed, 11 suites). Full E2E on local prod build (port 3620): 174 passed, 21 skipped (pre-existing device-specific skips), 0 failed, 1 flaky that passed on retry (`public-routes` "/ at 1440px no horizontal overflow", seen once while machine load average was ~40; 12/12 on isolated repeat). New `home-entrance.spec.ts` stable at 5x repeat on both projects (95 passed + 5 desktop-only skips).
- An earlier full run showed `error-boundaries` mobile "Tab is trapped inside the open menu" failing once; that run overlapped a second Playwright run on the same port, and it passed in the clean runs.

## Risks / parked
- Nav drop and paper lift are now CSS keyframes (pure CSS `translate` on nav/logo); visually equivalent but timing is ~0.4 s shorter than before and the walker holds only ~0.15 s. Needs a visual pass by the owner.
- Intro visuals start from first style recalc, JS timers from navigation start; offsets are tens of ms.
- Hero entrance is skipped on slow GSAP (static hero) by design.
- Before/after Lighthouse-style 3-run medians are the coordinator's job (Worker G measure script); only code-derived and single-run values are here.
- A hydration disturbance (e.g. blocked app chunk) can clear `data-home-intro`; harmless (nothing is hidden by it).

## Integration fix (branch 013/p34-h-fix, from 90da543)

Root cause of the mobile `error-boundaries:80` / `section-nav:101` flake: not the intro transform. The tests `scrollTo(1.2*innerHeight)` right after `load`; ~25 ms later hydration ran `useScrollToTopOnLoad` (HomeSectionRevealShell), which forced `scrollTo(0)` and left `scrollY=0`, so `SectionJump` never revealed. At the P2 base the intro's longer, JS-blocked load meant hydration had finished before the test scrolled. Traced with a scrollTo hook (stack pointed at that hook). Fix: `useScrollToTopOnLoad` skips the forced top on the first mount of a fresh `navigate` load (nothing restored to undo, and it must not discard an early user scroll); reload, back/forward, bfcache and later mounts still pin to the top, hash handling unchanged.
Reviewer's transform hypothesis checked: `#section-jump-root` is not a descendant of `#main-nav`, and `nav` already has `backdrop-filter` (a containing block for fixed children, e.g. `.mobile-menu`) so the intro's `translate` adds no new trap; left as is.

M2 (two clocks): intro now ends when the CSS keyframes actually finish (`homeIntroClock.ts`: `document.getAnimations()` for the home-intro keyframes, `Promise.allSettled(finished)`), with a 2.5 s ceiling timer as fallback. Reveal and the entrance cutoff are measured on the keyframes' own clock (startTime), falling back to navigation start. `ENTRANCE_CUTOFF_MS` 2000 -> 800 (paper is mostly lifted past that, so a late GSAP entrance would blink); late hydration gets the static hero. CTA never gated.

Files: `hooks/useScrollToTopOnLoad.ts`, `hooks/homeIntroClock.ts` (new), `hooks/homeIntroTiming.ts`, `hooks/useHomeIntroSequence.ts`, `hooks/useHomeHeroMotion.ts`, unit test, stale comment in `tests/e2e/public-routes.spec.ts`, and the reduced-motion hit-test bound in `home-entrance.spec.ts` (500 -> 1500 ms, observed once at 4 workers). No ids added; CSS untouched.

Proof: the two tests 16/16 (repeat 8, 4 workers; failed 1/16 before the fix) plus 40/40 at repeat 20; `home-entrance.spec.ts` mobile repeat 20: 180 passed, 20 desktop-only skips; full E2E 199 passed, 21 skipped, 0 failed/flaky; emulator suite 80 files, 758 tests passed; tsc clean; lint 0 errors (1 existing warning).
