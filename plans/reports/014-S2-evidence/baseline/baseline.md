# 014 S2 deployed baseline

URL https://nottherug-ten.vercel.app/ (main 096a66e, dpl_7bhxt5n65KcUuqRuHgjNZwSWEsfz). Lighthouse 12.8.2, headless Chrome, 3 cold runs each, sequential, run alone. Date 2026-10-12. Raw JSON: lighthouse-raw.tar.gz (m1-3 mobile, d1-3 desktop, book, contact).

## Medians (/)
| Metric | Mobile | Desktop |
|---|---|---|
| Perf | 79 (83/79/72) | 95 (94/98/95) |
| LCP | 5336 ms (4368/5336/7254) | 1221 ms (1535/1009/1221) |
| FCP | 1368 ms | 448 ms |
| TBT | 4 ms | 0 ms |
| CLS | 0 | 0 |
| SI | 3649 ms | 1132 ms |
| A11y / BP / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| Transfer | 3336 KB (2601/3336/3416) | 5183 KB (3374/5183/5239) |
| Video | 1794 KB (1075/1794/1873) | 3466 KB (1641/3466/3521) |

## Mobile LCP per run
| Run | LCP element | TTFB | Load delay | Load time | Render delay |
|---|---|---|---|---|---|
| 1 | figure#hero-polaroid-frame | 768 | 2316 | 1083 | 201 |
| 2 | figure#hero-polaroid-frame | 686 | 1700 | 2565 | 385 |
| 3 | video#hero-bg-video (poster) | 780 | 0 | 1402 | 5072 |

Desktop LCP element: div#hero-cityscape-art (all 3 runs); phases run 2: 249/208/497/55 ms.
LCP element varies run to run on mobile; the polaroid and the video poster compete.

## Other pages (mobile, 1 run)
| Page | Perf | A11y | LCP |
|---|---|---|---|
| /book | 77 | 94 | 5876 ms |
| /contact | n/a (NO_LCP error) | 94 | n/a |
