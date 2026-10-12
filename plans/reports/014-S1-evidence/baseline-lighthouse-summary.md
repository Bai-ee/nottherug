# S1 baseline Lighthouse (commit 4bd4292, live; HTML contains city-parallax)

### mobile
| run | Perf | LCP ms | TBT | TTI | CLS | FCP | SI | A11y | SEO | BP | transfer KB | video KB |
|--|--|--|--|--|--|--|--|--|--|--|--|--|
| 1 | 45 | 8623 | 855 | 8796 | 0 | 2361 | 7154 | 95 | 100 | 100 | 3498 | 1874 |
| 2 | 61 | 4819 | 769 | 8217 | 0 | 1369 | 4383 | 95 | 100 | 100 | 3482 | 1874 |
| 3 | 60 | 4708 | 825 | 8172 | 0 | 1258 | 4716 | 95 | 100 | 100 | 1642 | 35 |
| **median** | 60 | 4819 | 825 | 8217 | 0 | 1369 | 4716 | 95 | 100 | 100 | 3482 | 1874 |

LCP element / breakdown:
- run 1: `div#hero-visual-video-shell > figure#hero-polaroid-frame > div#hero-polaroid-window > video#hero-bg-video` | TTFB:708 Load Delay:28 Load Time:650 Render Delay:7237
- run 2: `div#page-home > section#home-hero-section > div#hero-visual-video-shell > figure#hero-polaroid-frame` | TTFB:769 Load Delay:2477 Load Time:1248 Render Delay:325
- run 3: `div#page-home > section#home-hero-section > div#hero-visual-video-shell > figure#hero-polaroid-frame` | TTFB:658 Load Delay:2596 Load Time:1114 Render Delay:340

### desktop
| run | Perf | LCP ms | TBT | TTI | CLS | FCP | SI | A11y | SEO | BP | transfer KB | video KB |
|--|--|--|--|--|--|--|--|--|--|--|--|--|
| 1 | 92 | 1335 | 132 | 1941 | 0 | 587 | 1691 | 95 | 100 | 100 | 5297 | 3481 |
| 2 | 92 | 1174 | 134 | 1740 | 0 | 426 | 1737 | 95 | 100 | 100 | 1928 | 129 |
| 3 | 92 | 1255 | 138 | 1852 | 0 | 582 | 1672 | 95 | 100 | 100 | 3531 | 1732 |
| **median** | 92 | 1255 | 134 | 1852 | 0 | 582 | 1691 | 95 | 100 | 100 | 3531 | 1732 |

LCP element / breakdown:
- run 1: `div#page-home > section#home-hero-section > div#hero-cityscape-frame > div#hero-cityscape-art` | TTFB:467 Load Delay:136 Load Time:645 Render Delay:86
- run 2: `div#page-home > section#home-hero-section > div#hero-cityscape-frame > div#hero-cityscape-art` | TTFB:306 Load Delay:646 Load Time:158 Render Delay:63
- run 3: `div#page-home > section#home-hero-section > div#hero-cityscape-frame > div#hero-cityscape-art` | TTFB:367 Load Delay:202 Load Time:609 Render Delay:77

## vs S0 medians
| | S0 | S1 base | delta |
|--|--|--|--|
| Mobile Perf | 52 | 60 | +8 |
| Mobile LCP ms | 8319 | 4819 | -3500 |
| Mobile TBT | 858 | 825 | -33 |
| Mobile A11y | 95 | 95 | 0 |
| Desktop Perf | 89 | 92 | +3 |
| Desktop LCP ms | 1747 | 1255 | -492 |
| Desktop TBT | 135 | 134 | -1 |
| Desktop A11y | 95 | 95 | 0 |

Note: mobile run 1 was an outlier (cold edge/video fetched, LCP 8623, render delay 7237 ms on the hero video poster). Runs 2-3 LCP is figure#hero-polaroid-frame (~4.7-4.8 s, load delay ~2.5 s).
