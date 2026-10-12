# 014 / S0 — Re-measure, verify, rank (no code changed)

SHA / branch: `award/s0` = `0e7658f` (origin/main) + `5100036` (plan 014 commit). Node v24.7.0, Next 16.3.8 (Turbopack).
Production: https://nottherug-ten.vercel.app, deployment `dpl_3AUh5PDnm7HiwQ88J27tr1hpxhU5`, READY, commit `0e7658f` (verified via Vercel MCP, read-only).
Evidence: `plans/reports/014-S0-evidence/` (the 15 MB `trace-home-4x.json` is left local, not committed).

**Honesty notes.** Lighthouse = deployed URL, 3 cold runs per form factor, one machine/network, Lighthouse 12.8.2 default throttling. Chunk list and long tasks = LOCAL production build (dummy Firebase env, shell only) in Playwright Chromium with CDP 4x CPU, one run, no network throttle (not Lighthouse). No real-phone or iOS Safari run (P7 partly unverified).

## 1. Lighthouse medians (deployed)

| Metric | Mobile | Desktop |
|---|---|---|
| Performance | **52** | 89 |
| LCP | **8.3 s** | 1.75 s |
| TBT | **858 ms** | 135 ms |
| TTI | 8.8 s | 1.8 s |
| CLS | 0 | 0 |
| FCP / Speed Index | 1.28 s / 5.2 s | 0.40 s / 1.6 s |
| A11y / SEO / BP | **95** / 100 / 100 | **95** / 100 / 100 |
| Transfer (video separate) | 3.5 MB total, 1.9 MB video (range 1.6–3.5 MB, noisy: M2 loaded no video) | 5.2 MB total, 3.4 MB video |

LCP element: 5 of 6 runs `body > div#page-home > section#home-hero-section` (the `section.hero`); 1 mobile run `video#hero-bg-video`. LCP is not an `<img>`, so P3 as written (preload an image) is probably moot. Mobile FCP is 1.3 s but LCP 8.3 s: the gap is main-thread/late paint, not network.
Cache (P7): `/` is `x-vercel-cache: HIT`, `cache-control: public, max-age=0, must-revalidate`.

## 2. Biggest finding: one long task owns mobile TBT

4x CPU, local prod build, only 5 tasks > 50 ms:

| # | ms | Owner |
|---|---|---|
| 1 | **1534** | ScrollTrigger chunk evaluates, then `layoutPawWalk` (`components/marketing/hooks/useHomePawWalk.ts`) = **1398 ms self time**: samples the SVG path 1401x with `getPointAtLength` (`GAIT.samples=1400`) as soon as gsap resolves |
| 2 | 180 | first layout/paint (138 ms layout) |
| 3, 4 | 116, 113 | react-dom |
| 5 | 61 | microtasks, small shared chunk |

Eager JS for `/`: 14 chunks, 716 KB raw / 222 KB gz (react-dom 73 KB gz, Next runtime 43 KB gz, home client code incl. intro + paw walk 25 KB gz, welcome modal ~12+10+6 KB gz, 3 gsap-consumer chunks ~33 KB gz). GSAP core + ScrollTrigger (114 KB raw / 45 KB gz) load lazily after load via `gsapLoader.ts`. Firebase is not in any `/` chunk. Polyfill chunk (39 KB gz) is nomodule, never fetched by Chromium.

## 3. Accessibility (A11y 95, target 100)

Failing Lighthouse audits on `/`: color-contrast, heading-order, label-content-name-mismatch. Selectors:
- Contrast 3.31:1 (needs 4.5), `#F3ECD9` on `#C4674B`: `.btn-accent` (`globals.css:470-476`) on `#nav-book-cta`, `#footer-book-luis-cta`, `#reviews-leave-review-cta`, `#home-reviews-leave-review-cta`, the `.btn` in `#home-group-walk-feature-form`; `#home-contact-sheet-header .stamp-label` (`globals.css:3180`). Candidate bg: `#A9503A` = 4.57, `#A64B32` = 4.85 (`#B5573B` = 4.06 fails).
- Heading skips: `GroupWalkFeatureCard.tsx:481` (h1→h3), `HowItWorksStrip.tsx:100,112` (h2→h4); similar on `/book /signup /contact /about /safety /reviews /neighborhoods/williamsburg` footers.
- Label-in-name: `#home-group-walk-feature-details-btn` (name "Dog Walking: full details and rates", `GroupWalkFeatureCard.tsx:472`); `#home-rate-sticker-puppy-walks`, `-boarding-dog-sitting`, `-senior-special-needs-walks` show "Puppy Pace" / "7+ Day Discounts" / "Gentle Pace" but are named "<Title>: full details and rates" (`ServicesPreview.tsx:67`, labels `:21-25`).
- axe did not reproduce the home contrast failures (likely reveal animations); Lighthouse did.

## 4. Seed backlog verdicts

| ID | Verdict | Evidence |
|---|---|---|
| P1 | done | sections 1–2 |
| P2 | PARTLY TRUE | GSAP lazy (not eager). `WelcomeWalkModal` (1430 lines) statically imported `HomePageContent.tsx:12`; `WelcomeModalHost` loads it dynamically but returns null on `/`. `HomeIntroOverlay`, `HomePawWalk` static. Real cost is the paw-walk computation (§2), not bundle size |
| P3 | PARTLY TRUE / likely moot | no `priority`/preload on hero assets; LCP is the hero section, not an image; hero video `preload="none"` with 32 KB webp poster |
| P4 | TRUE | `app/layout.tsx:11-16` Fraunces `style: ["normal","italic"]`; 7 woff2 preloaded (~241 KB). Italic still used in modal, `ContactDialog`, `ServiceDetailDialog`, `NeighborhoodDetail` → needs second instance with `preload:false`, not removal. 82 KB figure not independently mapped to a hash |
| P5 | TRUE, mostly off public routes | `logos/ntr_offwhite_horiz.png` 2,102,412 B: zero code consumers (legacy `index.html`/style-guide only). `img/backgorund_dogs.png` 1,338,454 B: `ContactSheetSection.tsx:37`, plain lazy `<img>`. `logos/notRugYellow.png` 702,558 B: admin generator only. No derivatives exist. `build-assets.mjs` is JOBS-driven (WebP+AVIF, new filenames); has a comment deliberately excluding `ntr_offwhite_horiz.png` |
| P6 | TRUE | 540p: WebM 1,917,181 B vs MP4 1,711,801 B (+12%); WebM listed first in `heroVideoPolicy.ts:24-30`; hand-built, no `build-assets` job |
| P7 | PARTLY | edge HIT confirmed. iOS Safari `preload="none"` start and real-phone LCP NOT verified |
| P8 | MOSTLY FALSE | `next/image` uses have `sizes`; only gap `TeamScroller.tsx:145` |
| A1 | TRUE | §3 |
| A2 | TRUE | §3 |
| A3 | TRUE | §3 |
| A4 | PARTLY | 90 tab stops on `/` all showed a focus indicator. `/book` `.form-control` has `outline:none` (`globals.css:1938`), border-colour-only focus (`:1940`) |
| A5 | MOSTLY FALSE | `prefersReducedMotion()` honoured by 6 hooks, intro skipped, video→poster. Gaps are CSS: `.proof-track` marquee (`globals.css:1224`), `.hero-eyebrow-dot` pulse (`:2392`) |
| H1 | TRUE (5 gates, not 1) | `HomePageContent.tsx:109,122-125`; import `:18-23`; `DisabledHomeSections.tsx` (168 lines) exports exactly those 5, sole importer |
| H2 | TRUE | `HowItWorksPageContent.tsx` no importer; also orphaned: `ProcessSteps.tsx`, `hooks/useHowItWorksPawTrail.ts` (knip agrees). Keep `SampleWalkReportCard` |
| H3 | MOSTLY ALREADY FIXED | `app/playground/service-cards/page.tsx:17` `notFound()` in prod; E2E asserts 404 (`public-routes.spec.ts:244`); `PawWalkTuner` gated off in prod. Route still compiled (own chunks, not in `/`) |
| H4 | TRUE | `globals.css:963` (wrong) and `:1290` cite nonexistent `app/page.tsx`; same in ~10 other files; `WelcomeWalkModal.tsx:134` cites nonexistent `plans/005-...` |
| H5 | FALSE | cron `console.log` are intentional `[cron:…]` idempotency/sent logs; no stray `console.log`/`debugger` in app/components/lib |
| H6 | FALSE, do NOT delete | `scripts/build-assets.mjs:70-71` uses `pawl.png`/`pawr.png` as masters for `paw-walk-*.webp` |
| H7 | inventory only | see §6 |
| H8 | done | knip: no unused deps; real dead files = H2 trio; 74 unused exports mostly noise; `CTA_IDS` duplicate export in `lib/analytics/events.ts` (analytics, Parked) |
| H9 | TRUE | sole consumer `ContactSheetSection.tsx:37`; rename only with P5 |
| H10 | TRUE | README says 013 in progress (closed 2026-10-12); 014 missing; 002/006/007/008/009 stale; 7 plan files unindexed |
| H11 | PASS | lint 0 errors / 0 warnings; `tsc --noEmit` 0 errors; vitest 83 files, 700 passed, 102 skipped. Playwright E2E not run in S0 |

## 5. New issues

| ID | Item | Evidence |
|---|---|---|
| N1 | Paw-walk path sampling blocks main thread ~1.4 s at 4x | §2 |
| N2 | No `<main>` landmark on `/book /contact /walk-with-us /signup /about /safety /reviews /neighborhoods/*` | `app/(marketing)/layout.tsx:33`; home passes (adding `<main>` in the layout would duplicate on home → needs care) |
| N3 | Booking step dots 8x8 px (target size) | `BookingForm.tsx:535` (booking component → Parked) |
| N4 | `.stamp-label-dark` (`/signup`, `globals.css:2581`) and 4 `#walk-with-us-term-* .stamp-label` fail contrast 3.3 | A1 family |
| N5 | duplicate CSS blocks (`.hero-h1` `globals.css:1064` and `:2380`) | cleanup |
| N6 | `public/logos/Not the rug logo design.png` (365 KB), `logo_horiz.png` (183 KB) consumers unchecked | Suspected |

## 6. Ranked backlog (Impact / Effort / Risk / Certainty)

**Tier 1 (S1)**
| Rank | Item | Score | Files |
|---|---|---|---|
| 1 | A1 contrast (+N4 `.stamp-label*` same token) | H / S / Med (screenshots 390/768/1440) / Known | `app/globals.css` only |
| 2 | A2 heading order | H / S / Low / Known | `GroupWalkFeatureCard.tsx`, `HowItWorksStrip.tsx` |
| 3 | A3 label-in-name | H / S / Low / Known | `ServicesPreview.tsx`, `GroupWalkFeatureCard.tsx` |
| 4 | P4 Fraunces italic `preload:false` instance | M / S / Low-Med / Known | `app/layout.tsx` + `--font-italic` wiring in `globals.css` (via CSS owner) |
| 5 | H1 remove 5 disabled gates + `DisabledHomeSections.tsx` | M / S / Low / Known | `HomePageContent.tsx`, `DisabledHomeSections.tsx` (delete) + comment tidy |
| 6 | H2 delete 3 orphans (keep `SampleWalkReportCard`) | M / S / Low / Known | `HowItWorksPageContent.tsx`, `ProcessSteps.tsx`, `useHowItWorksPawTrail.ts` (delete); `scripts/copy/*`, `docs/copy/*` regenerate |
| 7 | H4 stale-comment sweep | L / S / Low / Known | see split |
| 8 | H10 `plans/README.md` refresh | M / S / Low / Known | `plans/README.md` |

**Tier 2 (S2)**
| Item | Score | Note |
|---|---|---|
| **N1 paw-walk sampling** (defer to idle/after first paint, or compute once/cached; output identical) | **H / S–M / Low / Known (single 4x run)** | `useHomePawWalk.ts` (+ maybe `HomePawWalk.tsx`). **Biggest single lever on TBT 858 ms / LCP 8.3 s. Recommend reviewer promotes to S1** (Effort S–M, so it misses the Tier 1 definition by the plan's letter) |
| P2 modal dynamic/idle mount | M-H / M / Med / Suspected (small bundle) | `HomePageContent.tsx`, `WelcomeWalkModal.tsx`, `WelcomeModalHost.tsx`; first-visit auto-open timing risk, **Parked if it alters booking/analytics behaviour** |
| P5 `backgorund_dogs` → WebP/AVIF under new name (+H9 rename) | M / S–M / Low / Known | `scripts/build-assets.mjs`, `ContactSheetSection.tsx`, `docs/asset-manifest.json`, new `public/img/*` |
| P6 540p WebM re-encode / source order | M / S–M / Low / Known | `public/video/*`, `heroVideoPolicy.ts`, `docs/asset-manifest.json`; needs visual check |
| N2 `<main>` landmark on non-home routes | M / S / Low / Known | `app/(marketing)/layout.tsx` (check home duplication first) |
| A4 `/book` `.form-control` focus ring | M / S / Med / Known | `globals.css` (CSS owner) |

**Tier 3**
P3 (re-test after N1; likely moot), P8 `TeamScroller.tsx:145` `sizes`, A5 CSS reduced-motion gaps (`.proof-track`, `.hero-eyebrow-dot`), N5 duplicate CSS, N6, H6-safe path (move paw masters to `assets-src/img`, repoint `build-assets.mjs`, delete `public/img` copies, 528 KB), H3b (delete playground, owner call), H8 unused exports, `ntr_offwhite_horiz.png` delete (unreferenced, needs manifest update).

**Parked (owner decision / High risk / out of scope)**
H7 repo-root inventory (below), `CTA_IDS` duplicate export (analytics), N3 booking step dots (booking component), `notRugYellow.png` (admin), cron logs (keep, intentional), P7 real-phone/iOS check (owner device), plus all plan "Out of Track S" items.

H7 inventory (all tracked): `index.html` 168K legacy prototype, only trace-exclude/doc refs → delete/archive w/ OK; `optimize_video.py` 8K → move to `scripts/`; `Not-The-Rug-Platform-Setup-Guide.docx` 20K → `docs/`; `misc/` 128K old prototype (stale path at `asset-manifest.json:211`) → delete w/ OK; `not-the-rug-brief/` 340K live pipeline → KEEP; `dogs/` 9.2M used only by `index.html` → archive/delete with it; `logos/` 137M raw masters, biggest repo bloat → move to `assets-src` or archive, owner call; `app-assets/` 3.9M → KEEP (`generator-logos/` read at runtime `lib/generator/types.ts:55`); `style-guide/` 48K keep/move; `assets-src/` 41M KEEP.

## 7. Proposed S1 split (3 Sonnet workers, no file overlap)

`app/globals.css` has exactly one owner (W1). Other workers route CSS needs through the orchestrator. If the reviewer promotes N1, add it to W2 (`useHomePawWalk.ts` is not owned by anyone else).

| Worker | Items | Owned files |
|---|---|---|
| **S1-W1 (CSS + fonts)** | A1 (+N4 stamp labels), P4, H4 for CSS comments (`globals.css:963,1290`) | `app/globals.css`, `app/layout.tsx` |
| **S1-W2 (markup a11y)** | A2, A3, optional N1 if promoted | `components/marketing/GroupWalkFeatureCard.tsx`, `components/marketing/HowItWorksStrip.tsx` (incl. drop its commented refs), `components/marketing/ServicesPreview.tsx` (incl. `:94` comment), `components/marketing/hooks/useHomePawWalk.ts` (N1 only) |
| **S1-W3 (dead code + docs)** | H1, H2, H4 non-CSS comments, H10 | `HomePageContent.tsx`, `DisabledHomeSections.tsx` (delete), `HowItWorksPageContent.tsx`, `ProcessSteps.tsx`, `hooks/useHowItWorksPawTrail.ts` (delete), `AnimatedServiceCards.tsx` (comments), `PersonalizedCareCarouselExperiment.tsx`, `ClosingTrust.tsx`, `hooks/useSectionReveals.ts`, `ContactInfoCard.tsx`, `WelcomeWalkModal.tsx` (comment only), `lib/content/{legacy-routes,contact,coverage,site,walk-concepts}.ts`, `scripts/copy/*`, `docs/copy/*`, `plans/README.md` |

Overlaps resolved: `HowItWorksStrip.tsx` and `ServicesPreview.tsx` are W2 only (W3 does not touch them); `docs/copy/*` and `scripts/copy/*` are W3 only; `globals.css` is W1 only. W3 deletions: only the 4 files proven unreferenced (grep + knip); run build + public E2E before commit.

## 8. Not verified / risks
- Lighthouse numbers are one machine; mobile video bytes vary 0–1.9 MB run to run.
- Long-task profile is one local 4x run, not Lighthouse; no real phone.
- LCP delay cause beyond N1 (8.3 s vs FCP 1.3 s) not fully explained; re-measure after N1.
- Playwright E2E not run in S0 (baseline for S1 gate still needed).
- Workers reported worktree HEAD `5100036` (plan commit atop `0e7658f`); no code differs from main.

Needs from owner/reviewer: approve ranking and split; decide whether N1 moves into S1; later decisions on H3b, H7, `logos/`.
