# 013 Phase 3 review (e5e28c8..90da543), code-read only

## Verdict
Approve with conditions. Fix or explain the two mobile E2E failures (M1) before sign-off. Everything else is MEDIUM or lower. F06 headline/CTA gating, F08 redirect parity and static `/` check out by reading.

## Findings

### M1 (HIGH until explained) Two mobile E2E failures in the coordinator log
`plans/reports/013-P3-evidence/checks/e2e.log:249-256` (run in progress when read):
- `error-boundaries.spec.ts:80` "Tab is trapped inside the open menu" failed on both attempts (30.4s timeouts).
- `section-nav.spec.ts:101` "closes on Escape" failed once (30.6s).

Both call `page.goto('/')`, then immediately `window.scrollTo(0, 1.2*innerHeight)`, then `trigger.tap()`. Neither waits for the intro (`gotoSettled` is not used). Before P3 the `body{overflow:hidden}` lock and the `visibility:hidden` page made that path behave differently. Now scroll is unlocked and nothing is hidden, so the scroll lands mid-hydration.

I could not run it, so the cause is a hypothesis: the early scroll races hydration, the ScrollTrigger refresh, or SectionJump's IntersectionObserver state. Fix: rerun both on e5e28c8 and on 90da543 with `--repeat-each`. If they pass at the base, they are a P3 regression. The test fix is to wait for hydration or `data-home-intro=done`. If the product is at fault, that is a real mobile bug.

### M2 (MEDIUM) Intro timers use navigation start, CSS keyframes use the style/parse clock
`homeIntroTiming.ts:15-20`, `useHomeIntroSequence.ts:43-52` (`elapsedMs: performance.now()`) vs `globals.css` ~3814-3850 (keyframe delays start when `data-home-intro` is first styled).
- Scenario: on a slow phone the overlay styles at about 0.3-0.6s and the lift runs 0.4s to 1.15s after that. The logo drop ends around 1.2s after that.
- JS `done` fires at 1300ms of navigation time. It sets `data-home-intro=done` and unmounts the overlay while keyframes are mid-flight. The paper pops off, and the nav/logo snap to their final position instead of dropping.
- Late hydration has a second effect. Hydration at about 1.0-2.0s means the paper is already gone when `onReveal` fires. `shouldPlayEntrance` only skips above 2000ms (`useHomeHeroMotion.ts` entrance block). Between about 1.0s and 2.0s the headline, eyebrow and `.hero-p` are visible, then `gsap.set` hides them (opacity 0, `y:110%`) and re-animates them. That reads as a blink.
- This never blocks the CTA or headline for more than about 0.7s, and it needs GSAP loaded already. Minimal fix: end the intro on `animationend` of the logo-drop keyframe, with the timer as a fallback only. Or have the bootstrap script write `--home-intro-elapsed` and offset the delays. Optionally lower `ENTRANCE_CUTOFF_MS` to about 1200 so a late hydration skips the entrance.

### M3 (MEDIUM, evidence gap) The 30% image-transfer budget is not demonstrated in the diff
Only `perf-before*.md` is committed. The baseline is image 2045 KB on mobile and 3087 KB on desktop. There is no after-run table.
- Expected savings from the manifest: paw PNGs about 530 KB gone, team JPEG backgrounds about 1.4 MB gone until near the viewport.
- Run `scripts/perf/measure-home.mjs` as "after" and commit the table.
- The baseline also drifts between runs. Desktop CTA ready was 6.77s then 7.73s, so quote ranges.
- Initial image KB will drop, but the portraits still load at about 2400px scroll, so lazy loading moves bytes rather than removing them. Say so in the sign-off.

### L1 (LOW) Headline and `.hero-p` are transiently hidden by GSAP
`useHomeHeroMotion.ts` entrance: `.hero-eyebrow, .hero-p` get `autoAlpha:0` (so `visibility:hidden` too), and the headline words go to `y:110%` inside an overflow clip. This runs only after GSAP has loaded and the gate has opened, so it never waits on GSAP. It lasts about 0.7s. It is the stated design: the CTA only gets `y:16` and never opacity below 1. A throw mid-timeline reverts the context (`entranceCtx.revert()`). `splitIntoWords` DOM changes are not reverted, which was the case before P3 too.
- Visual changes for owner sign-off: entrance is about 0.4s shorter; the CTA now rises without a fade; the paper lift, walker exit and nav drop are CSS and no longer wait on assets; the 7s failsafe is now 2.5s.
- Opaque paper overlay: the headline and CTA sit under the opaque, `pointer-events:none` paper for roughly 0.4-1.2s. They are in the DOM, hit-testable and focusable, but not visible. E2E `expectCtaOperable` checks `elementFromPoint` only, so it cannot see this. It matches the audit wording ("not hidden or inert"), but say so in the sign-off.

### L2 (LOW) Containing block on `#main-nav` during the intro
CSS ~3829: the `translate` animation, with `both` fill, keeps `translate: 0 0` on `#main-nav` until `data-home-intro` is cleared (at most about 1.3s). A non-`none` translate makes the nav the containing block for fixed descendants (mobile menu, if it is inside the nav). Opening the hamburger inside that window could misplace the menu. Cheap check on a real phone.

### L3 (LOW) Stale comment in a test helper
`tests/e2e/public-routes.spec.ts:66-69` still says globals.css hides `#main-nav` and `#page-home` until `done` and that nothing can be clicked. The comment is false after P3. `gotoSettled` still works (the attribute is cleared) but is now only a wait.

### L4 (LOW) `public-routes` reduced-motion hero test and `trackCtaAvailability`
`home-entrance.spec.ts` skips `#page-home` when computing opacity because of the shared 0.4s `.page` fade-in (`globals.css:72`). That is a documented, asset-independent exception. Be aware that the CTA is therefore below opacity 1 for 0.4s via CSS, and the test cannot catch it.
- The reduced-motion test asserts `.word-wrap` count 0, which is a good "no GSAP split" proof.
- The GSAP-blocked test greps chunk bodies for `GreenSock|gsap.registerPlugin|ScrollTrigger`. It is brittle if bundling changes, but `expect(blocked).toBeGreaterThan(0)` guards against it silently testing nothing.
- The `<= 1500ms` CTA bound is generous against CI load, and I see no flakiness risk beyond M1.

### L5 (LOW) 540 clips are not produced by `build-assets.mjs`
They are documented as ffmpeg commands in the manifest only. Reproducibility depends on the master in `assets-src/video`. The `.gitignore` allowlist is correct (`!public/video/hero-mccarren-540.{mp4,webm}`), and `git ls-files` confirms they are tracked.
- Size: 1.71 MB mp4 and 1.92 MB webm, against 4.4 and 4.8 MB for 1080. That is about 60% smaller for mobile.
- webm is listed first, so Chrome and Firefox fetch the larger 1.9 MB file. A re-encode at a higher CRF would be a cheap win.

### L6 (LOW) Lint pipeline exit 1 in `checks/summary.txt`
`lint-pipeline.log` shows `no-undef` on `document`/`window`/`scrollTo` at lines 65-143 (16 errors) from linting a script, apparently `scripts/perf/measure-home.mjs` (its `page.evaluate` bodies). `lint` itself exits 0, so the repo `lint` script is fine. Confirm that the pipeline lint target is not part of CI. If it is, add `/* global document, window */` or an eslint override for `scripts/perf`.

### I1 (INFO) Repo weight
Added binaries come to about 8-9 MB:
- team derivatives, 24 files, about 2.4 MB
- hero 540 clips, 3.6 MB
- `assets-src` masters (team JPEGs plus paw PNGs), about 1.9 MB
- evidence, 4.0 MB: `screens-before` 2.3 MB, `screens-I` 1.3 MB, and two 2,743-line perf JSONs

`plans/reports` evidence is not needed in the repo for production. Consider committing only the `.md` tables and dropping the JPEGs and JSONs, or keeping them on the release branch only.

### I2 (INFO) Only provable on a device or Vercel
- iOS Safari: programmatic `play()` after `load()` on a muted, `playsInline` video with `preload=none` and no `autoplay` attribute (Low Power Mode leaves the poster, which is acceptable).
- `Cache-Control: s-maxage` and `x-vercel-cache: HIT` on `/`, and that each distinct UTM query string is its own cache key.
- Proxy redirect cost at the edge.
- Real LCP on a throttled phone, and the intro smoothness described in M2.
- No-JS: portraits never render (tradeoff documented), and the video never loads. The poster, headline and CTA are still there.

## Verified OK
**F06 gating**
- No `visibility:hidden` or `overflow:hidden` on body/page remains. The `data-home-intro` CSS only animates the overlay, nav, logo and walker.
- The nav is never hidden, only translated.
- The overlay has `pointer-events:none`, `aria-hidden`, and is `visibility:hidden` at the end of its keyframes via `both` fill, even if the script never runs.
- Failsafe: the inline script clears the state at 2.5s, the hook at 1.3s, and the gate safety is 1s.
- A background tab short-circuits to `done`. Reduced motion never sets the attribute, so the hook finds no state and releases the gate immediately.
- Hydration: the overlay is always server-rendered (`mounted` starts true) and is `display:none` without the attribute. The attribute is set by script before hydration, as before, with no new server/client divergence.

**Video**
- `pickHeroVideo` returns null for reduced motion, saveData, slow-2g and 2g, and the effect returns before scheduling anything, so there is no video request.
- The 768px breakpoint matches the CSS.
- The poster stays as the attribute. `muted`, `loop` and `playsInline` are kept, and `autoplay` was dropped in favour of `play()` from an IntersectionObserver, which is correct for iOS.
- No layout shift: the element box is CSS-sized and sources are only appended.
- Cleanup cancels rAF, idle, timeout and observer. StrictMode double-run is safe because `cancelled` is per-run.
- A failed load leaves the poster. There is no `error` handler, which is not needed.

**F07**
- The crop math in `teamChipPhoto` is exact for a square window: width is `size%`, left is `(100-size)*x/100 %`, top is `(100-heightPct)*y/100 %`.
- Layout: the chip photo is `aspect-ratio:1/1` with `position:relative; overflow:hidden`. The img is absolute with `max-width:none; height:auto`, and the ID selector beats the global `img{width/height:100%; object-fit:cover}`.
- The filter is not double-applied.
- `srcset`/`sizes` never upscale beyond the source. The small variants equal `ceil(zoom*150)` at 1x. At 1x desktop, a window wider than 150px would be slightly soft, but I judge that within 1920px (`--max-w` capped) to be negligible.
- Source order is AVIF, WebP, then the JPEG `<img>`. The alt is empty and the wrapper stays `aria-hidden`.
- The IntersectionObserver is SSR-safe: state starts false, the effect guards for no IO, and it disconnects after the first hit and on cleanup.
- Paw: 104x111 at a maximum render of 52 CSS px gives a 2x ceiling, and the intrinsic ratio is preserved with `height:auto`. The PNGs are retained and only referenced in `SectionRail` comments.
- `.gitignore` allowlist: every avif/webp/mp4/webm is tracked, and masters are retained in `assets-src`.
- Manifest entries exist for all 26 new assets.

**F08**
- Parity with the old `page.tsx`:
  - hood beats page.
  - Duplicates: first wins (`URLSearchParams.get`).
  - Unknown hood falls through to page.
  - Empty values give none.
  - `page=home` gives none (no loop).
  - Hash targets are kept and the query is dropped.
  - 307 matches `redirect()`.
- `Object.hasOwn` fixes the `constructor`/`toString` inherited-key bug.
- Ordering: the LAUNCH_MODE gate runs first, then the legacy check. `noindex` is applied on redirects.
- Matcher cost: unchanged. The legacy path returns immediately unless pathname is `/` with a non-empty search.
- Dead `resolveLegacyMarketingPath` was removed, and the tables are untouched.
- Static `/`: no `searchParams`, `headers`, `cookies` or `useSearchParams` anywhere in the home tree or the marketing layout (grep). The `build.log` route list shows `○ /`. All `/api` routes stay `ƒ`, and admin pages' static or dynamic status is unchanged.
- No booking, settings or admin route gained caching. I did not diff `next.config.ts`, which is untouched in the file list.

**Tests**
- No existing assertions were weakened. The diff only adds (546 insertions, 0 deletions in `tests/`).
- The new unit tests are meaningful. The `team-chip-photo` crop test restates the formula (tautological), but the on-disk derivative check is valuable.
- The `legacy-redirects-proxy` tests mutate `process.env` and restore it in `afterEach`.
- Skips: worker J reported 20 skipped, the same as before. No skips were added, apart from the intentional desktop-only keyboard test.

## Scope drift
- No debug leftovers.
- The CSS edits are inside the intro block and the team-chip block.
- A stale "P3" comment in `HomeIntroOverlay` (about converting to next/image) is untouched. It is acceptable, but should be updated since the intro was rewritten.

## Re-review of integration fix (8163537..HEAD, code-read only)

Verdict: approve. M1 and M2 are resolved by reading. L6 and I1 are acknowledged as done in 8163537; I did not re-inspect them.

### M1: `useScrollToTopOnLoad` skip on a fresh `navigate` (resolved, one LOW note)
- History: the hook comes from 1d4a5c3 "land at the top on reload". Its stated purpose is undoing browser scroll restoration on reload and bfcache return, so section reveals do not replay under a mid-page visitor. The ScrollTrigger/pin protection is not mentioned.
- The fix leaves that purpose intact. A `reload` or `back_forward` entry still calls `toTop()` (the condition is only `isFirstMount && type==='navigate'`). `pageshow` with `persisted` still re-pins. `scrollRestoration='manual'` is still set. Hash handling is unchanged: the hash-strip for non-`navigate` entries runs before it, and `toTop` already no-ops on a hash.
- A fresh `navigate` has no restored offset (restoration applies only to reload and history traversal), so nothing is lost. The visitor's early scroll is now kept, which is the intended behaviour.
- SSR safety: the code is inside `useEffect`, so `performance` and `window` are client-only. `getEntriesByType('navigation')[0]` is optional-chained, and a missing entry (old Safari) gives `navEntry?.type` undefined, so `toTop()` runs, the old behaviour.
- LOW: `firstMountOfDocument` is module state. In dev StrictMode the effect runs twice, so the second run sees `isFirstMount=false` and forces `toTop`. The skip is production-only, and the E2E runs against a production server, so tests are unaffected.
- LOW: if the document began on another route via a `navigate`, and the visitor then client-navigates to home, that mount counts as first and skips `toTop`. A client-side navigation already resets scroll itself, so I see no practical harm.

### M2: `homeIntroClock` (resolved)
- Safari: `document.getAnimations`, `CSSAnimation.animationName`, `.finished` and `startTime` are all in Safari 13.1+. The helper feature-detects, and with no animations found it returns empty, so the 2.5s navigation-start ceiling takes over (the old safe behaviour).
- Leaks: `Promise.allSettled` over `finished` handles cancellation, since the animations are cancelled when `data-home-intro` is cleared. `finish` is idempotent and clears the ceiling timer, and the teardown sets `finished=true` and clears both timers, so there are no stale `onDone` calls. The leftover promises are small and GC-able.
- Already-finished animations (late hydration): `finished` resolves at once, so the intro ends at once. That is correct.
- `startTime` null (animation pending): the code falls back to `performance.now()`. That is benign.
- Entrance cutoff 800ms on the keyframe clock: normal loads start the entrance at about 400ms. Late hydration gets the static hero, with no blink, which fixes my M2 blink scenario.
- One quirk: after the intro is cleared, `introElapsedMs()` falls back to `performance.now()`, which is large, so a late entrance is skipped. That is consistent with the cutoff.
- Reduced motion: the hook's early branch (attribute not `loading`) runs before any of this, so there is no change. The CTA is still never gated: `.hero-actions` still gets only `y`, and the clock code touches no styles.

### H's reduced-motion bound 500 to 1500ms (acceptable, LOW)
- Reduced motion has no overlay and no GSAP split, and the test still asserts overlay count 0 and zero `.word-wrap`, so the non-gating invariant stays pinned by structure.
- The loosened bound only weakens the "immediately" claim, and H observed one flake at 4 workers. If tightening is wanted later, assert the computed opacity/visibility at first frame instead of a wall-clock bound.
- It is not a hit-test regression, since the 1500ms matches the `CTA_BOUND_MS` used elsewhere.

### Still only provable on a device
- On a throttled phone: the paper lift and nav drop now complete without truncation.
- The iOS early-scroll-before-hydration behaviour.
