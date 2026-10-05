# Plan 013 P3 — Worker I report (F07 image delivery)

Branch `013/p34-i`, base e5e28c8. Scope: paw prints + home team portraits only.

## What changed
- **Paw walk** (`HomePawWalk.tsx`): prints now load `/img/paw-walk-left.webp` / `paw-walk-right.webp` (104x111, transparent WebP, alpha quality 100, q90) instead of `pawl.png`/`pawr.png` (444x475, ~265 KB each). Max render is `clamp(34px,4vw,52px)` => 52 CSS px => 104 px at 2x. `paw-rail-*.webp` are the same art but 48x51 (too small for 52px at 2x, and owned by SectionRail), so new files were cut. WebP only, no PNG fallback — same convention as `paw-rail-*.webp` (SectionRail). `width/height` attrs updated 444x475 -> 104x111 (ratio 0.9369 vs 0.9347: <0.2px height difference at 52px).
- **Team portraits** (`TeamScroller.tsx`, `lib/content/team.ts`, `globals.css`): CSS `background-image` div replaced by `<picture>` (AVIF, WebP, JPEG fallback) with `<img>` placed to reproduce `background-size` (% of window width, height auto) and `background-position` (%) exactly; helper `teamChipPhoto()` computes width/left/top. Per portrait two widths: a 1x desktop one and the source width (2x/mobile need exceeds the source, no upscale). `sizes` hint matches the grid (>900px) and swipe-strip (<=900px) windows. `/about` (TeamGrid) and the hover preview are untouched and keep using the JPEGs.
- **Lazy loading — why an IntersectionObserver, not `loading="lazy"`**: first tried native lazy. The band sits ~2400 px down the page and Chromium's lazy threshold is 1250-2500 px, so all six portraits were still fetched on load (measured). Replaced with a small observer (`rootMargin 300px 0px`, one-shot, immediate load if IntersectionObserver is missing). Smallest change preserving the look; the chip window keeps its paper fill until the portraits mount. Tradeoff: with JS disabled the portraits do not render (images are decorative `alt=""`; the page's GSAP intro already requires JS).
- **Tooling**: `scripts/build-assets.mjs` gained `PAW_JOBS` and `TEAM_PORTRAITS` (sharp, reproducible; existing derivatives regenerate byte-identically). Masters copied to `assets-src/img/{pawl,pawr}.png` and `assets-src/img/team/*.jpg`. Original `pawl/pawr.png` and team JPEGs stay in `public/` (rollback + /about/preview + fallback); nothing on the homepage loads the PNGs.
- **Manifest**: 26 entries added to `docs/asset-manifest.json` (maxCssBox, DPR, intrinsic, bytes, loading, replaced source). Full-width team variants carry a "source-capped" exception. `npm run verify:assets` passes.

## Mappings (source -> derivative; dimensions; bytes before -> after)
| Source | Derivative | Dim | Source bytes | Derivative bytes |
|---|---|---|---|---|
| `/img/pawl.png` | `/img/paw-walk-left.webp` | 104x111 | 264,569 | 7,754 |
| `/img/pawr.png` | `/img/paw-walk-right.webp` | 104x111 | 264,721 | 7,660 |
| `/img/team/luis.jpg` | `/img/team/luis-w225.webp` | 225x300 | 225,685 | 18,148 |
| `/img/team/luis.jpg` | `/img/team/luis-w225.avif` | 225x300 | 225,685 | 12,422 |
| `/img/team/luis.jpg` | `/img/team/luis-w675.webp` | 675x900 | 225,685 | 120,144 |
| `/img/team/luis.jpg` | `/img/team/luis-w675.avif` | 675x900 | 225,685 | 81,044 |
| `/img/team/lincoln.jpg` | `/img/team/lincoln-w413.webp` | 413x735 | 243,223 | 104,758 |
| `/img/team/lincoln.jpg` | `/img/team/lincoln-w413.avif` | 413x735 | 243,223 | 65,028 |
| `/img/team/lincoln.jpg` | `/img/team/lincoln-w506.webp` | 506x900 | 243,223 | 150,548 |
| `/img/team/lincoln.jpg` | `/img/team/lincoln-w506.avif` | 506x900 | 243,223 | 93,725 |
| `/img/team/marcus.jpg` | `/img/team/marcus-w413.webp` | 413x551 | 248,773 | 50,728 |
| `/img/team/marcus.jpg` | `/img/team/marcus-w413.avif` | 413x551 | 248,773 | 34,985 |
| `/img/team/marcus.jpg` | `/img/team/marcus-w675.webp` | 675x900 | 248,773 | 135,464 |
| `/img/team/marcus.jpg` | `/img/team/marcus-w675.avif` | 675x900 | 248,773 | 95,613 |
| `/img/team/christian.jpg` | `/img/team/christian-w255.webp` | 255x454 | 113,693 | 18,114 |
| `/img/team/christian.jpg` | `/img/team/christian-w255.avif` | 255x454 | 113,693 | 12,516 |
| `/img/team/christian.jpg` | `/img/team/christian-w506.webp` | 506x900 | 113,693 | 50,194 |
| `/img/team/christian.jpg` | `/img/team/christian-w506.avif` | 506x900 | 113,693 | 37,344 |
| `/img/team/shawn.jpg` | `/img/team/shawn-w435.webp` | 435x580 | 241,928 | 59,852 |
| `/img/team/shawn.jpg` | `/img/team/shawn-w435.avif` | 435x580 | 241,928 | 39,966 |
| `/img/team/shawn.jpg` | `/img/team/shawn-w675.webp` | 675x900 | 241,928 | 128,102 |
| `/img/team/shawn.jpg` | `/img/team/shawn-w675.avif` | 675x900 | 241,928 | 89,270 |
| `/img/team/yenny.jpg` | `/img/team/yenny-w398.webp` | 398x531 | 336,041 | 61,910 |
| `/img/team/yenny.jpg` | `/img/team/yenny-w398.avif` | 398x531 | 336,041 | 40,171 |
| `/img/team/yenny.jpg` | `/img/team/yenny-w750.webp` | 750x1000 | 336,041 | 200,300 |
| `/img/team/yenny.jpg` | `/img/team/yenny-w750.avif` | 750x1000 | 336,041 | 131,629 |

## Transfer measurement (local production build, ports 3630; Playwright + CDP `encodedDataLength`, images only: png/jpg/webp/avif + `/_next/image`)
Method: fresh context, welcome modal suppressed, wait for networkidle + 4 s ("initial"), then scroll to the bottom and into the team band ("after scroll"). DPR 2 at 375/768, 1 at 1440. Single cold run each (Worker G's harness is the official one).

| Viewport | Initial images before | Initial images after | Reduction | After full scroll before -> after |
|---|---|---|---|---|
| 375 | 3,052,030 | 1,125,741 | 63.1% | 4,514,296 -> 3,119,691 (30.9%) |
| 768 | 3,052,030 | 1,125,741 | 63.1% | 4,711,983 -> 3,317,378 (29.6%) |
| 1440 | 3,249,010 | 1,322,721 | 59.3% | 4,652,545 -> 2,934,398 (36.9%) |

Paw prints: 530,310 -> 16,430 bytes. Team portraits: 1,412,409 (eager) -> 0 initial; after reaching the band 531,685 (375/768, DPR2 picks full widths) / 208,142 (1440, DPR1 picks small widths), AVIF. Target (>=30% initial image transfer) met at all three widths. Note the whole-page-scrolled figure at 768 is 29.6% (other lazy images dominate; out of this worker's scope).

## Visual check
Before/after JPEGs (q70, committed, 12 files) in `plans/reports/013-P3-evidence/screens-I/`: team chips at 375/768/1440 and paw walk at scrollY 1400 for each width (baseline built from the unmodified base in the same worktree).
- Crops/positions identical (visually and by geometry). Pixel diff (mean absolute channel difference 0-255): team 375 = 4.1, 768 = 3.3, 1440 = 2.4 (2.4-3.4% of channels differ by >24, from AVIF re-encoding smoothing of already-soft portraits, e.g. Lincoln, plus the up-to-1px subpixel placement); paw walk 0.00-0.46 (sub-pixel print height from 111 vs 111.26 px source height). AVIF q62 / WebP q84 chosen after q52 looked visibly softer.
- Double filter avoided: `.polaroid-window img` filter would have stacked on the window's own filter; `#home-team-scroller .home-team-chip-photo img { filter: none }`.

## DOM ids added
`#home-team-chip-photo-{luis,lincoln,marcus,christian,shawn,yenny}` (the chip photo windows). Existing ids reused: `#home-team-scroller`, `#home-paw-walk-layer`, `.home-paw-step`/`#home-paw-step-N`.

## Tests
- New unit `tests/unit/team-chip-photo.test.ts` (4 tests: crop geometry, srcsets, derivatives exist/width = source, bad crop rejected).
- New E2E `tests/e2e/home-image-delivery.spec.ts` (desktop + mobile): no portrait requests before scrolling; portraits requested and painted after scrolling to the band; no paw PNG requests; paw walk uses the two WebP srcs; no horizontal overflow; no console errors.
- Full E2E: 160 passed, 20 skipped (existing skips), 0 failed. Emulator unit suite: 77 files / 720 tests passed. `tsc --noEmit` clean; lint: 0 errors, 1 pre-existing warning (SchedulingDialog, P4); lint:pipeline: 1 pre-existing warning; `verify:assets` passes.

## Parked / notes
- `public/img/pawl.png`, `pawr.png` now unreferenced by the app but kept for rollback ("retain previous asset URLs through the release"); removal candidate after release.
- Dev-only paw tuner sizes above 52 px would show the 104 px prints slightly soft; shipped size unaffected.
- No-JS: portraits absent (see above).
- Hero/intro/video, page.tsx, proxy.ts, layout.tsx untouched. globals.css edits confined to `.home-team-chip-photo` rules.
