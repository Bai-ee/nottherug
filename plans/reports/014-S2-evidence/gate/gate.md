# 014 S2 gate (award/s2 @ db0c569 vs base main 096a66e)

Verdict: no blockers. 0 E2E failures, 0 flakes hit. One residual pre-existing a11y rule (target-size on /book + /contact step dots) is reduced from 4 rules to 1 but not cleared.
Date 2026-10-12. Local prod builds. award/s2 on :3020, base 096a66e (git archive, APFS-cloned node_modules) on :3030; latency proxies :3021 -> 3020 and :3031 -> 3030 (90 ms RTT, 40 Mbps, `slowproxy.cjs` from w1/measurement-scripts.tar.gz).

## 1. Static gates
| Gate | Result |
|---|---|
| npm run build | pass |
| npx tsc --noEmit | pass (0 errors) |
| npm run lint | pass |
| npx vitest run | 83 files pass; 700 passed, 102 skipped, 0 failed (802) |
| npm run verify:assets | pass |

## 2. Full public E2E (E2E_PORT=3020, npm run test:e2e)
208 passed, 22 skipped, 0 failed (40.8 s). Identical to S1 baseline (208/22/0); W2 net test count change is zero. None of the known flakes fired, so no 5x reruns were needed.

## 3. axe-core (wcag2a/2aa/21a/21aa/22aa + best-practice), 9 routes x {390,1440} + welcome modal
| Surface | Violations |
|---|---|
| /, /about, /safety, /reviews, /signup, /walk-with-us, /neighborhoods/williamsburg at 390 and 1440 | 0 |
| Welcome modal opened on / at 390 and 1440 | 0 |
| /book and /contact at 390 and 1440 | 1 rule each: `target-size` x5 (step dots `button[aria-label="Go to step N: ..."]`) |

Expected 0; /book and /contact miss it. NOT a regression: base 096a66e on the same pages has 4 rules (heading-order, landmark-one-main, region, target-size). W2/W3b cleared three; target-size on the BookingForm step-indicator buttons remains (WCAG 2.2 2.5.8, wcag22aa tag only). Lighthouse a11y agrees: /book 96, /contact 96 (deployed baseline 94), the sole failing audit is target-size. Suggested follow-up: enlarge hit area of the 5 step dots in components/booking/BookingSteps.tsx (min 24x24 or spacing).

## 4. Console / hydration / reduced motion
- Console errors and warnings on all 9 routes at 390 and 1440 (award/s2): 0. No hydration warnings. (Base /book logs 3 unused-preload warnings at both widths; award/s2 has none.)
- prefers-reduced-motion on / at 390 and 1440: intro overlay not displayed (display none), h1 "Your peace of mind. Their favorite part of the day" opacity 1 and laid out, primary CTA opacity 1, 0 console messages. Screenshots rm-390.jpg, rm-1440.jpg.

## 5. Visual sanity (screenshots/)
Full-page diff, base vs award/s2, 7 routes x 390/768/1440 (>24 luma delta): /book 0.00% differing pixels at all widths; every other route 0.05-0.35%, confined to text rows (nav links, footer, W3 text lightening). No layout shifts: full-page heights are identical on all 21 pairs.
- Nav and footer text: brighter in award/s2 (diff-home1440-nav.jpg, diff-home1440-footer.jpg, diff-contact-nav.jpg; top = base, bottom = award/s2). Footer column links, headings and copyright read clearly lighter on the olive band. Intentional (W3).
- W3 calmer photo bands: home 1440 band at y~1380 (diff-home1440-1380.jpg) shows the lightened closing line text; photo bands themselves are subtly calmer, no clipping or seams seen. Montages `<route>-<w>-base-left-s2-right.jpg` (1600 px cap makes these overview only; use the diff-* crops for detail).
- Williamsburg h2 accent span ("Williamsburg"): computed colour rgb(125,158,140) on base -> oklab(0.415 -0.026 0.009) (a dark olive-grey, color-mix 62% with black) on award/s2; axe color-contrast 0 violations. PASS, much darker, matches W3b intent. (The h2's own text colour rgb(36,35,33) is unchanged.)
- Focus ring via keyboard Tab (focus-computed-style.json, focus-*.jpg):
  - /book name/phone/email inputs: base outline none (3px, style none); award/s2 outline 2px solid olive rgb(79,90,61). Next button: shadow ring. PASS.
  - /contact first field (contact-tab-meetgreet-owner-name) at 390 and 1440: base none; award/s2 2px solid olive. PASS (focus-s2-contact-1440.jpg).
  - Home booking surface (Book a Walk welcome modal): email field unchanged between builds (outline none, inset box-shadow field style, button 1px frame). Visible but subtle; not part of W2's pane rule (not a BookingForm pane). Not regressed.
- Hero video network on / (award/s2): 390 requests hero-mccarren-540-v2.mp4 only (plus poster, walker strip); no old 540 files. 1440 requests hero-mccarren-1080.webm as before. Base 390 requested hero-mccarren-540.webm.

## 6. Lighthouse 12.8.2 via 90 ms / 40 Mbps proxy, `/`, 3 cold interleaved runs (base,s2 alternating, mobile and desktop alternating)
Medians (per-run values in lighthouse-metrics.json):
| Metric | Mobile base | Mobile s2 | Delta | Desktop base | Desktop s2 | Delta |
|---|---|---|---|---|---|---|
| Perf | 83 (82/83/85) | 94 (94/94/94) | +11 | 95 (94/95/95) | 96 (96/96/96) | +1 |
| LCP ms | 4648 (4274/4648/4652) | 2920 (2918/2920/2920) | -1728 | 1437 (1437/1437/1477) | 1333 (1316/1333/1357) | -104 |
| FCP ms | 1235 | 1235 | 0 | 465 | 464 | 0 |
| TBT ms | 0 | 0 | 0 | 0 | 0 | 0 |
| CLS | 0 | 0 | 0 | 0 | 0 | 0 |
| SI ms | 3061 | 3058 | -3 | 1123 | 1144 | +21 (noise, run spread 1122-1225 base, 1142-1179 s2) |
| A11y / BP / SEO | 100/100/69 | 100/100/69 | 0 | 100/100/69 | 100/100/69 | 0 |
| Transfer KB | 3421 | 2979 | -442 (-13%) | 5136 | 5106 | -30 (video lazy-load timing varies 1934-5168 run to run in both builds) |
| Video KB | 1873 | 1461 | -412 | 3393 | 3393 | 0 |

- Desktop LCP "flat or slightly worse" concern (W1b): REFUTED with 3 interleaved runs, award/s2 is 80-120 ms better in every run (1316/1333/1357 vs 1437/1437/1477). LCP element unchanged (div#hero-cityscape-art).
- Mobile LCP element: figure#hero-polaroid-frame both builds; award/s2 now `main#home-main` ancestor (W-landmark change).
- SEO 69 is the localhost artifact: `is-crawlable` fails (noindex off-production); deployed is 100.

## 6b. Plain localhost Lighthouse (single run each; loopback artifact, label as such)
| | Perf | LCP | FCP | TBT | CLS | SI | Transfer KB | Video KB |
|---|---|---|---|---|---|---|---|---|
| mobile base | 75 | 8409 | 1054 | 8 | 0 | 2395 | 3420 | 1873 |
| mobile s2 | 76 | 7206 | 1054 | 4 | 0 | 2497 | 2979 | 1461 |
| desktop base | 93 | 1756 | 284 | 0 | 0 | 874 | 5075 | 3332 |
| desktop s2 | 96 | 1368 | 284 | 0 | 0 | 854 | 4982 | 3268 |
S1 gate numbers were mobile LCP 8268 / desktop 1757: base reproduces them (8409 / 1756). Mobile LCP on loopback sits in the bimodal slow mode (see w1/metrics-summary.md) and is an artifact; the proxy numbers above are the meaningful comparison.

## 6c. Lighthouse A11y on other routes (award/s2, mobile, 1 run)
/book 96 (perf 78), /contact 96 (perf n/a: NO_LCP, same as deployed baseline). Deployed baseline 94 and 94. Only failing audit: target-size.

## 7. Versus the DEPLOYED S2 baseline (baseline/baseline.md)
Not apples-to-apples: the baseline is the Vercel deployment measured over the real network; these runs are local builds behind a synthetic proxy. Use deltas from the proxy base-vs-s2 rows, not absolute comparison. For orientation only:
| Metric | Deployed baseline | Proxy base (stand-in) | Proxy s2 |
|---|---|---|---|
| Mobile Perf / LCP | 79 / 5336 | 83 / 4648 | 94 / 2920 |
| Mobile TBT / A11y | 4 / 100 | 0 / 100 | 0 / 100 |
| Desktop Perf / LCP | 95 / 1221 | 95 / 1437 | 96 / 1333 |
| Transfer mobile / desktop KB | 3336 / 5183 | 3421 / 5136 | 2979 / 5106 |
| Video mobile / desktop KB | 1794 / 3466 | 1873 / 3393 | 1461 / 3393 |
The proxy base lands near the deployed numbers (mobile LCP 4648 vs 5336, desktop 1437 vs 1221), so it is a reasonable stand-in, with the desktop proxy slightly pessimistic.
Regressions flagged: none in the proxy A/B. Perf, LCP, transfer, video, A11y, console, E2E all equal or better.

## Files
build.log tsc.log lint.log vitest.log verify-assets.log e2e.log, axe-console.json (award/s2), axe-base-bookcontact.json (base), focus-computed-style.json, lighthouse-metrics.json (per-run), lighthouse-driver.sh.txt, lighthouse-summarize.py.txt, axe-runner.js.txt, screenshots/. Raw Lighthouse JSON (12 MB gz) not committed.
