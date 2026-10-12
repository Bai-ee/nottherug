# Cityscape parallax cost (useCityscapeParallax.ts), LOCAL build f057102, one machine
Method: 412x823, CDP CPU 4x, no network throttle, 3 runs per variant. "off" = the served JS chunk (chunks/2wdjtc41fusq8.js) rewritten in the browser by Playwright `page.route` so the hook's selector `[data-city-parallax]` matches nothing (`[data-city-parallax-off]`); no source edited. Verified: off leaves every art element with no inline transform / will-change; on has 9 transforms live (verify-patch.cjs). Note: in "off" the hero art is also not parked at opacity 0 and never fades up. Scripts: parallax.cjs, parallax-mount.cjs, parallax-hook-inclusive.cjs; raw: parallax-raw.json.

There are 9 scrubbed ScrollTriggers (9 `[data-city-parallax]` elements: hero-cityscape-art, home-services-cityscape-art, home-team-photo-art, home-closing-trust-photo-art, home-process-cityscape-art, home-contact-sheet-photo-art, home-contact-sheet-clipping-shell, footer-photo-art, footer-art-image), scrub 1.2 s.

## (a) Mount / creation time at load
- CPU profile, inclusive time of the hook's own functions (chunk line 130, cols 11900-14600, incl. the matchMedia callback and `gsap.fromTo`/`ScrollTrigger` creation beneath them): 1.61 / 0.23 / 0.16 ms (3 runs). Sampling resolution ~1 ms, so read as "about 1 ms or less".
- Differential, whole page load + 6 s idle (CDP Performance metrics): ScriptDuration on 323 ms vs off 320 ms (median, +3 ms); RecalcStyle 64 vs 54 ms (+10); Layout 138 vs 137 (+1). TaskDuration 2356 vs 2317 ms (+39, within run noise: on runs 2295-2410, off 2298-2318).
- No new long task: the longest-task list is the same set in both variants (1.45-1.5 s paw walk, ~110 ms x2, ~55 ms). Occasional 153-177 ms task on the first (program) entry appears in some "on" and one "off" run: noise.
- Verdict: mount cost is ~1-10 ms at 4x CPU, not a long-task contributor.

## (b) Per-scroll-frame cost (rAF-driven scroll, 8 px/frame, 749 frames, from y=600, after idle)
| median of 3 | parallax on | parallax off | delta |
|---|---|---|---|
| Script ms/frame | 0.103 | 0.084 | +0.019 |
| RecalcStyle ms/frame | 0.178 | 0.129 | +0.049 |
| Layout ms/frame | 0.005 | 0.006 | 0 |
| Main-thread task ms/frame | 1.075 | 0.929 | +0.146 |
| frame interval mean | 16.67 ms | 16.67 ms | 0 |
| frames >20 ms | 0 / 749 | 0 / 749 | 0 |
| frames >33 ms | 0 | 0 | 0 |
(All 3 runs per variant agree: gt20 = 0.) Cost of the parallax is ~0.15 ms/frame of main thread, about 0.9% of a 16.7 ms frame; no long frames. Layers use `will-change: transform`, transform-only (no layout).
Caveat: headless Chromium locks rAF to 60 Hz and does not model GPU raster/composite cost; no real touch scroll or real device. This measures main-thread scripting and style only.
