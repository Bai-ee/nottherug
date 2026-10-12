# 014 S2 combined report

Branch award/s2, base main 096a66e (S1 shipped). Not merged to main, not deployed.
Evidence: plans/reports/014-S2-evidence/{baseline,w1,w2,w3,w3b,w4,gate}/. Gate detail: gate/gate.md.

## Result
- Mobile LCP target (< 2.5 s) NOT met. Proxy: 4.65 s -> 2.92 s (-37%). Not measured on a deployed build.
- A11y: axe 0 violations on 7 of 9 routes and the welcome modal at 390/1440. /book and /contact keep one rule (target-size on 5 step dots).
- Text contrast over photo layers: failing rows 586 -> 70 of ~1688 (residuals are decorative glyphs, now aria-hidden).
- Mobile video 22% smaller (v2 mp4). copy:extract runs again (output not byte-identical to the committed inventory; not committed).
- E2E 208 passed / 22 skipped / 0 failed. lint, tsc, vitest (700) clean.

## Deployed S2 baseline (main 096a66e, 3 cold runs, medians)
Mobile: Perf 79, LCP 5336 ms, FCP 1368, TBT 4, CLS 0, A11y 100, transfer 3336 KB, video 1794 KB.
Desktop: Perf 95, LCP 1221 ms, TBT 0, A11y 100, transfer 5183 KB, video 3466 KB.
/book and /contact A11y 94.

## LCP diagnosis (corrects S1)
- LCP element is figure#hero-polaroid-frame (paper-grain.png background), not the video.
- Cause: `.page.active { animation: fadeIn .4s }` on #page-home kept the hero from registering as painted until GSAP touched it. Intro overlay does not gate LCP.
- S1's "448 ms" Playwright figure had no network throttle; with slow-4G + 4x CPU Playwright and Lighthouse agree on the deployed site (~4.1-4.9 s / 3.7-5.4 s). Local loopback Lighthouse (~8 s) is a simulation artifact.
- Fix (W1/W1b): preload poster + texture, disable first-load page fade behind the intro (marker data-home-intro-ran), 12 KB walker silhouette instead of 83 KB, nav logo PNG 52 KB -> WebP 8 KB. Pre-first-paint bytes 572 KB -> 309 KB.
- Remaining ~3 s is bytes before first paint: fonts 162 KB, HTML 35, texture 35, poster 33, CSS 23. Options not shipped: drop 3 font preloads (-0.2 s, +0.025 CLS), texture webp (~-0.1 s, ~30 CSS selectors), font subsetting (unmeasured). Likely ~2.6-2.7 s combined; 2.5 s unproven.

## Gate (proxy 90 ms RTT / 40 Mbps, 3 interleaved cold runs, medians, base 096a66e -> award/s2)
| | Mobile | Desktop |
|---|---|---|
| Perf | 83 -> 94 | 95 -> 96 |
| LCP | 4648 -> 2920 ms | 1437 -> 1333 ms |
| TBT / CLS | 0 / 0 -> 0 / 0 | 0 / 0 -> 0 / 0 |
| Transfer | 3421 -> 2979 KB | 5136 -> 5106 KB |
| Video | 1873 -> 1461 KB | 3393 -> 3393 KB |
Proxy != deployed; use deltas. SEO 69 is a localhost artifact.

## Workers
- W1/W1b: LCP + v2 clip wiring + nav logo webp.
- W2/W2b: <main> on 9 routes, /book focus ring (all BookingForm panes), /book admin prefetch off (3 unused preloads gone), neighborhood row role=group, heading-order 0 via aria-level (+ footer h4 aria-level 2), modal row fix.
- W3/W3b: contrast tokens/alphas, four photo-layer opacity values, aria-hidden decorative glyphs, star rows role=img, Williamsburg h2 darker, !important removed.
- W4: video bytes explained (same file, request starts 0.5-0.8 s earlier, lab capture artifact), v2 mp4, copy tooling.

## Owner decisions / known gaps
1. Ship with target-size residual on /book + /contact step dots, or route a fix (BookingSteps.tsx).
2. Footer sits inside <main> on /, /signup, /walk-with-us: no contentinfo landmark there.
3. copy:extract output differs from committed inventory (299 vs 396 entries); regenerate + commit docs/copy only on your OK.
4. Next LCP levers (fonts, texture webp) vs accept ~3 s.
5. Home welcome sheet fields use inset shadow and no focus ring; not covered by W2's ring.
6. Williamsburg h2 and nav/footer text are visibly different (darker / brighter).
Not verified: deployed numbers for this branch, real devices/Safari/iOS, screen readers, home "Answer questions first" flow.
