# W1 mobile LCP: measurements (local prod builds unless noted)

Lighthouse 12.8.2, mobile default (simulated slow 4G, 4x CPU), cold runs. Machine load 15-60 from other workers: interleaved A/B.

## Root cause (traced, not inferred)
- Final LCP element on the deployed site is FIGURE#hero-polaroid-frame (its `paper-grain.png` background, 94,927 px), not the video poster (S1 was wrong). Deployed Playwright with CDP slow-4G + 4x CPU, 3 runs: poster paints 2.7-3.6 s, texture (final LCP) 4.1 / 4.3 / 4.9 s. Lighthouse deployed: 3659 / 4294 / 5410 ms, median 4294. They agree; S1's Playwright run had no network throttle (448 ms was a CPU-only number).
- Lighthouse's simulated LCP = time to download everything that finished before the OBSERVED LCP timestamp (Lantern takes the max end time of those nodes). Observed LCP is taken on a fast, unthrottled trace, so it is bimodal: ~370-420 ms puts ~16-22 requests in the graph (3.0-4.5 s simulated); ~790-850 ms pulls in ~45 requests incl. the 1.9 MB video and background art (7.4-8.3 s simulated).
- Local `next start` on loopback (no latency) lands in the second mode for the baseline too (8.3 s), which is why S1's local 8 s did not match deployed 4.8 s. It is an artifact of loopback, not a site problem. A latency/bandwidth proxy (90 ms RTT, 40 Mbps) reproduces deployed phases (TTFB 540, load delay ~2.5 s, load time ~1.0 s, render ~0.3 s).
- Why the observed LCP slid to ~0.8 s when the poster/texture were preloaded: `.page.active { animation: fadeIn .4s }` (globals.css:72) fades #page-home from opacity 0. The browser does not record the hero as painted during that compositor fade, and nothing repaints it until GSAP touches the hero (~0.83 s), so the candidate registers then. In the baseline the texture arrived late (~0.4 s) and its arrival repainted the figure, hiding the problem. Evidence: injecting a style change at 450 ms registers the poster at 571 ms; `animation:none` on #page-home registers the figure at the first paint (~360 ms).
- The intro overlay does NOT gate LCP (injecting `display:none` on it, or an alpha background, changes nothing).

## Lighthouse mobile, simulated (LCP ms)
| Setup | runs | median |
|---|---|---|
| deployed baseline (nottherug-ten.vercel.app) | 4294, 5410, 3659 | 4294 |
| local base, loopback | 8344, 8730, 8347 | 8347 |
| local base via 90ms/40Mbps proxy (deployed-like) | 4222, 4384, 4647, 4617, 4384, 4615 | ~4500 |
| local fix via same proxy, interleaved | 3278, 3185, 3035, 3035, 3277, 3035 | ~3110 |
| local fix, loopback | 7434, 7432, 7431 | 7432 (artifact, see above) |

Perf score via proxy: base 82-85 -> fix 91-94. Desktop preset (proxy, 3 runs each): LCP 1437/1436/1429 -> 1397/1398/1397 ms, perf 95 -> 95, CLS 0.

## Real-conditions probe (Playwright, CDP slow 4G 1.6 Mbps/150 ms + 4x CPU, HTTP/2 via local TLS proxy, 3 interleaved runs)
base 3972 / 3988 / 3980 ms -> fix 2824 / 2856 / 2824 ms (final LCP both runs: the paper-grain figure). FCP 2036 -> 2012.

## What each change bought (proxy, simulated)
- walker 3Top.png (95 KB, High) -> 11.7 KB webp alpha mask: ~0.5 s
- preload paper-grain.png + poster at high priority: ~1.2 s real (texture was queued behind fonts/art); ~0 simulated by itself
- drop the page fade-in during the intro (so the hero registers at first paint): without it the preloads make the simulated LCP worse (7.4-7.7 s, observed LCP 0.79 s); with it 3.0-3.3 s
- NOT shipped: dropping next/font preloads for Oswald/Bebas/Courier: sim -0.23 s, real -0.25 s, but delays those fonts' swap on slow networks.
