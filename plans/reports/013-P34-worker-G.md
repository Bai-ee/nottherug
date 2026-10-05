# Plan 013 P3 — Worker G: performance measurement (before baseline)

Base e5e28c8, branch `013/p34-g`. No application code changed. Local production build only (never the live site).

## Rerun (one command per set; build + serve first)
```
source <ci-env.sh> && npx next build && FIRESTORE_EMULATOR_HOST=127.0.0.1:1 ANALYTICS_TRACKING_DISABLED=true npx next start --hostname 127.0.0.1 --port 3610 &
node scripts/perf/measure-home.mjs --base http://127.0.0.1:3610 --runs 5 --label after --out plans/reports/013-P3-evidence --screens plans/reports/013-P3-evidence/screens-after
```
Writes `perf-<label>.json` (per-run + medians) and `perf-<label>.md`. `--screens` is optional (375/768/1440 full-page JPEG q70, also prints horizontal overflow). Keep the build and machine load comparable between before and after.

## Methodology (identical for before/after)
- Fresh browser context per run, HTTP cache disabled (CDP), one cold navigation.
- **Fixed window: 15 000 ms after navigation commit**, not network idle. All numbers are "state at t=15 s".
- Mobile: 375x812, DPR 3, isMobile + touch, CPU throttle 4x, network latency 150 ms, down 1.6 Mbps (200 000 B/s), up 750 kbps.
- Desktop: 1440x900, DPR 1, no CPU throttle, latency 40 ms, down 10 Mbps, up 10 Mbps.
- Bytes: CDP `encodedDataLength` at `loadingFinished` (wire size incl. headers); unfinished requests use body bytes received so far. **Video (Media type) is reported separately**, and its value is "bytes received by t=15 s" (mobile video is still downloading at cutoff; desktop completes).
- LCP: PerformanceObserver (buffered), final candidate at cutoff. CLS: layout-shift without recent input.
- **CTA ready** = `#hero-cta-primary` (HomeHero.tsx) has non-zero box, effective opacity (product over ancestors) >= 0.99, visibility visible, center inside the viewport, and `document.elementFromPoint(center)` is it or a descendant; checked every animation frame. **Headline visible** = same test on `#hero-headline`.
- Console errors, page errors collected; fonts from CDP Font requests plus `document.fonts`.
- Audit's unthrottled 5.18/5.44 s CTA numbers are not comparable to these (different throttling).

## Before medians (5 cold runs each, `perf-before.*`)
| profile | CTA ready | headline | LCP | LCP element | CLS | image KB | font KB | JS KB | CSS KB | non-video total KB | video KB | errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mobile | 8.10 s | 8.10 s | 8.17 s | `#hero-polaroid-frame` (paper-grain.png 34 KB, a texture on the frame) | 0.000 | 2045 | 239 | 223 | 22 | 2564 | 295 (partial, in flight) | 0 |
| desktop | 6.77 s | 4.75 s | 4.32 s | `#home-hero-section` (/img/hero-walker-strip.webp, 195 KB) | 0.000 | 3087 | 239 | 295 | 22 | 3692 | 4662 (complete, WebM) | 0 |

Mobile image bytes are lower than desktop partly because the team portraits below the fold are still in flight (5 team JPEGs and bg-section-graphic-2 show as partial at 15 s on slow 4G), so the mobile figure is a lower bound that will move with throughput. Compare "comparable initial image transfer" using the same profile and cutoff.

Largest images (desktop, KB): pawl.png 259, pawr.png 259 (the two paw PNGs, ~518 KB), bg-section-graphic-1.webp 286, team jpgs 112-329 (six, ~1.37 MB), hero-walker-strip.webp 195, 3Top.png 95 + 3Top-flipped.png 93, bg-section-1-cover 133, bg-section-graphic-2 136, bg-section-2-cover 112, poster 32.

## Variance (before vs before-rerun, same build, back to back)
| metric | set 1 range | set 2 range |
|---|---|---|
| mobile CTA ready | 8.08-8.20 s | 8.07-8.22 s |
| mobile LCP | 8.12-8.25 s | 8.10-8.32 s |
| mobile non-video KB | 2542-2576 | 2556-2570 |
| desktop CTA ready | 6.00-6.95 s (median 6.77) | 7.45-7.89 s (median 7.73) |
| desktop LCP | 3.54-4.52 s (median 4.32) | 5.04-5.46 s (median 5.30) |
| desktop non-video KB | 3692-3693 | 3692-3693 |

Interpretation: bytes are deterministic (<1 %). Mobile timing is stable (~±0.1 s) because 4x CPU plus slow network dominates. Desktop timing shifted by about +1 s between the two sets (run in the same session while other workers were building/serving on this machine), so desktop timing differences under ~1 s are not meaningful unless the before/after sets are interleaved or rerun; trust desktop bytes and mobile timing. Recommended: for the after set, also rerun `before` right beforehand, or run after/before alternately.

## Screenshots
`plans/reports/013-P3-evidence/screens-before/home-375.jpg|768|1440` (full page, DPR 1, JPEG q70, 7 s settle plus a scroll pass to trigger lazy content): total about 2.3 MB (0.54 + 0.72 + 1.06 MB). Horizontal overflow at all three widths: 0 px.

## Fonts audit
All from `app/layout.tsx` via `next/font/google`, root layout, so every public route preloads all of these (all 7 `latin` files are `<link rel=preload as=font>` on `/contact`, and requested on home):

| family | file | bytes | used on home (rendered text census, chars) |
|---|---|---|---|
| Fraunces normal, variable 100-900, opsz axis | 791bf8c4... | 67.9 KB | w400 377, w700 118 (display) |
| Fraunces italic | 8010b10d... | 82.2 KB | **0 chars on home** at rest |
| Outfit variable 100-900 | 1b99372b... | 32.7 KB | w400/500/600/700 (body, ~2760) |
| Oswald variable 200-700 | 9a800f17... | 29.0 KB | w400/500/600 (~1370) |
| Bebas Neue 400 | fabcf92b... | 9.1 KB | 208 |
| Courier Prime 400 | 87d3ffff... | 11.7 KB | 2616 |
| Courier Prime 700 | 5f440d3e... | 12.1 KB | **0 chars on home** at rest |
Total 239 KB (7 files, matches the audit's ~243 KB). Weights inside variable families are free (single file), so no weight pruning applies. Courier Prime italic text (478 chars: `.proof-quote` etc.) is browser-synthesized (no italic face loaded), not an extra font file.

Evidence-based observations (not implemented):
1. Fraunces italic (82 KB, 34 % of font bytes) is preloaded on home but no rendered home text uses it. It IS used elsewhere (`.label` on /contact and /book, `NeighborhoodDetail`, `#founder-quote-text` which is only in `DisabledHomeSections`). Possible change: stop preloading/loading the italic on routes that do not use it. This needs a second `next/font` instance (italic with `preload: false`) or route-scoped font loading, so it is a code change with a visual-flash risk on /contact and /book; recommend only if the after-numbers still need it, and verify those routes. Do not remove the family.
2. Courier Prime 700 (12 KB) has no rendered use on home; usage elsewhere not established (`<strong>`/`font-weight:700` rules inherit it). Weak evidence; low value; leave unless a grep of the other routes shows no bold Courier.
3. Space Mono is already correctly scoped to admin (not on public routes). No other unused or duplicate family found. No evidence for dropping any family.

## Initial JS audit
Measured wire bytes (brotli), 15 s window: mobile 223 KB over 17 script requests, desktop 295 KB over 20 (desktop-only chunks are the lazily loaded GSAP/ScrollTrigger consumers). Top chunks (KB): 35lzrzzu 72.1 (react-dom), 34bug6qw 42.4 (framework/next client), 1elfxn6v 27.5 (desktop-only, gsap+ScrollTrigger), 0l7-q732 24.1 (gsap+ScrollTrigger core), 2p2jd75i 17.6 (desktop, gsap), 1gq3by6x 12.8 / 06cyatoo 10.1 / 13gblmg0 9.0 (gsap+ScrollTrigger consumers), 05elwcebu 12.4, 1lvbas7r 11.6, 0nwbn_6yl 10.2, 3jyvles9 8.8, 2i51e627 8.7, 06_xokng 6.8, turbopack runtime 4.8. The home route is dynamic, so the build output has no per-route size table and `/` has no static HTML to inspect; the table above is the measured, comparable view.
Recommendation: GSAP is ~35 % of initial JS but it is the existing motion system, which the plan says to keep (and the P3 item is to stop gating CTA on it, not remove it). No unused-chunk evidence; make no JS change. The JS check for "after" is simply that script KB does not rise.

## Notes / risks
- On mobile at t=15 s the hero video is only 295 KB into its download; any mobile-video strategy change will show mainly in the video column and in contention for image bandwidth.
- CTA ready on mobile is 8.1 s and the headline tracks it exactly (both gated by the same intro overlay); desktop headline appears ~2 s before the CTA.
- Measurement used FIRESTORE_EMULATOR_HOST=127.0.0.1:1 and a throwaway Firebase config; no external requests besides localhost.
