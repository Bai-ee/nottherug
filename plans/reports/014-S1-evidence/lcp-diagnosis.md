# LCP diagnosis, home, LOCAL build f057102, one machine
412x823, CDP CPU 4x, no network throttle, 3 runs (lcp.cjs, lcp-raw.json). Filmstrip: filmstrip/ (every 250 ms to 4 s, from the trace's screenshot events, unperturbed) and filmstrip-contact-sheet.jpg.

## LCP entries (identical in all 3 runs, +-5 ms)
1. 144-232 ms: IMG#home-intro-walker-silhouette (/img/3Top.png, the loading-screen walker)
2. **2168 / 2172 / 2168 ms (final LCP): VIDEO#hero-bg-video poster `/video/hero-mccarren-poster.webp`** (69430 px area, 32 KB)

## Phase breakdown for the final LCP (run 2)
- TTFB: ~4 ms (localhost; real network will add)
- Load delay: ~25 ms (poster request starts 29 ms)
- Load time: ~5 ms (poster response end 34 ms)
- **Render delay: ~2134 ms (99% of LCP)**. The poster was in the browser by 34 ms; it simply was not painted visibly until 2168 ms.

## What gates the paint of #home-hero-section (ranked)
1. **Main thread blocked 663-2188 ms by `layoutPawWalk`** (useHomePawWalk.ts:66, 1401-sample loop 84-93; GAIT.samples 1400 at :31; invoked at :318 inside the gsap load callback). In the trace the compositor produced no new frame between 1432 ms and 2250 ms, and my 50 ms sampler recorded nothing between 377 ms and 2171 ms.
2. **Intro overlay** (HomeIntroOverlay.tsx:21-26 sets data-home-intro=loading; globals.css:3928-3940 `home-intro-paper-lift` 0.75 s after 0.4 s delay). The sheet is opaque paper over the whole viewport (globals.css:3908-3926) and its keyframes toggle `visibility`, which does not run on the compositor, so the stalled main thread freezes it on screen: filmstrip 1000-2000 ms shows only paper + dashed line, no hero. The overlay does not wait for assets (useHomeIntroSequence.ts:104-134, homeIntroTiming.ts:17 reveal at 400 ms), so alone it would clear by ~1.15-1.3 s nominal; the blocked thread is what stretches it to ~2.2 s. State at 2171 ms: homeIntro still "loading", overlay present; at 2220 ms "done", overlay removed.
3. NOT gating: hero motion. useHomeHeroMotion.ts:114 skips the entrance when `introElapsedMs() > ENTRANCE_CUTOFF_MS` (800, homeIntroTiming.ts:27); measured: clip-path stays `none`, eyebrow opacity 1, 0 `.word-inner` spans, so no hidden/clipped hero. Hero text is fully visible under the overlay.
4. NOT gating: fonts (document.fonts.status "loaded" by 377 ms; 6+ woff2 done by 32 ms), background image (hero-walker-strip.webp done at 73 ms, not an LCP candidate), poster itself (34 ms).
5. Parallax layer (useCityscapeParallax.ts:127-131 parks #hero-cityscape-art at opacity 0, then :133-140 fades to 0.2 over 1.8 s after the gate): decorative only. At 2171 ms it is 0.02, reaching 0.19 at ~2.9 s and 0.2 at ~3.7 s. It does not affect LCP (the wash is not the LCP element), but the "complete" look settles later than the LCP.

## Counterfactual (browser-side only, no source edit: `getPointAtLength` call in the 1400-sample loop stubbed in the served chunk, lcp-counterfactual.cjs, 3 runs)
Final LCP drops to **740 / 752 / 736 ms** (still the poster). So ~1.43 s of the 2.17 s is the paw-walk block; the remaining ~0.74 s is the intro paper lift (0.4 s delay + 0.75 s wipe).

## Hero first looks complete
Filmstrip: t=250-750 walker on paper; 1000-2000 paper only (frozen); t=2250 hero text, nav and CTA visible with the video box black; t=2500 poster visible. So hero first looks complete at ~2.25-2.5 s (cityscape wash still fading to ~3.7 s).

## Recommendation (for S2, no edits here)
Move/defer the paw-walk layout off the load path (idle callback after LCP, or compute with fewer samples/precomputed path) and, as a second step, make the paper lift compositor-only (avoid `visibility` in the keyframes) so it cannot be frozen by main-thread work. Expect LCP ~0.75 s locally from the first alone; the intro's 1.15 s nominal lift is then the floor.
