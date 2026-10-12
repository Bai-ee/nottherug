# 014 / S1: Tier 1 batch + N1 (combined report)

Branch `award/s1`. Base = main `4bd4292` + `award/s0` merge = `f057102`. Workers: `award/s1-w1..w4`, merged in order W2, W1, W3, W4. Final SHA is in the push line at the end of this file's commit message / reply.
Evidence: `plans/reports/014-S1-evidence/` (baseline, per-worker, `gate/`, `screenshots/` curated JPEGs, `measurement-scripts.tar.gz`). Full-size PNG set stays local: `/Users/bballi/Documents/Repos/NotTheRug-014-s1-w1/plans/reports/014-S1-evidence/w1-screenshots/` (about 100 MB, uncommitted).

## Plan corrections (S0 report was wrong or stale on these)
- **H6:** `pawl.png` and `pawr.png` are the build-asset masters for `paw-walk-*.webp` (`scripts/build-assets.mjs:70-71`). Keep. Not deletable as written.
- **H3:** already done. The playground returns 404 in production (`app/playground/service-cards/page.tsx:17`, asserted in E2E).
- **H5:** cron `console.log` calls are intentional `[cron:...]` logs. Keep.
- **H7 line:** root `logos/` (137 MB, 10 tracked files) is NOT excluded by `.vercelignore` (it only lists `public/logos` videos and `assets-src/`). It is outside `public/` so it is never served; Git-integration deploys clone the whole repo and ignore `.vercelignore` anyway. Still parked, owner call.

## Baseline on 4bd4292 (before S1)
Deployed (`dpl_CkPCGWEtqMZ6fP1HbnNQJPc3hvVV`, parallax markup confirmed in served HTML), Lighthouse 12.8.2, 3 cold runs, medians: mobile Perf 60, LCP 4.8 s (run 1 outlier 8.6 s), TBT 825 ms, A11y 95; desktop Perf 92, LCP 1.26 s, TBT 134 ms, A11y 95; CLS 0 both.
Local 4x-CPU trace (Playwright, 3 runs): median TBT 1698 ms, of which a single 1.5 s `layoutPawWalk` task. Cityscape parallax: 9 scrubbed ScrollTriggers (not 8), mount about 1 ms, +0.15 ms per scroll frame, 0 frames > 20 ms: not a bottleneck on this machine (headless 60 Hz, no GPU model). E2E baseline: 208 passed, 22 skipped, 0 failed. Lint, tsc, vitest (700 passed, 102 skipped) clean.
LCP diagnosis (local, 4x CPU): final LCP is the hero video poster; render delay about 2.1 s (99%). About 1.4 s was the paw-walk task blocking the main thread; the rest is the intro overlay's paper lift. Hero motion, fonts, background image and the parallax layer do not gate it. With the sampling stubbed, LCP was about 740 ms.

## S1/W1: terracotta contrast, italic preload, CSS comments
SHA / branch: e65498f / award/s1-w1
Closed: A1 → closed (`--terracotta` `#C4674B` → `#A9503A`, paper text 3.31 → 4.57:1). N4 → closed by the same token (S0's 3.3 on `.stamp-label-dark` was not reproduced; that class is gold-on-olive, not terracotta). P4 → closed (preloaded woff2 7 → 6 on `/`, `/contact`, `/book`; italic still emitted and loads on demand). H4 (CSS part) → closed (`globals.css` ~962 and ~1287).
Files: `app/globals.css`, `app/layout.tsx`.
Behavior changed: every use of `--terracotta` is slightly deeper (nav CTA, `.btn-accent`, contact-sheet stamp, walk-with-us term stamps, `.phase-tag`, admin sign-in error text, `.text-terra`). `fraunces` is upright only; a second `frauncesItalic` instance (`preload:false`, `--font-fraunces-italic`); `--font-italic` points at it.
Untouched on purpose: CITYSCAPE PARALLAX LAYERS block and intro walk-line CSS (grep confirmed they do not reference `--terracotta`); layout, copy, markup, other tokens.
DOM ids affected (CSS only): `nav-book-cta`, `footer-book-luis-cta`, `reviews-leave-review-cta`, `home-reviews-leave-review-cta`, `home-group-walk-feature-form`, `home-contact-sheet-header`, `walk-with-us-terms-row`, `walk-with-us-on-call-kicker`, `admin-signin-error`, `admin-signin-denied-title`.
Verification: lint 0, tsc clean, vitest 700 passed, E2E 208/22/0 (one earlier run had 1 failure; see flake section).
Screenshots: `screenshots/before/` and `screenshots/after/` (390 / 768 / 1440 per surface), `screenshots/reduced-motion/`, italic pairs for `/contact` and the neighborhood page. I looked at the 768 reviews-CTA pair: same colour family, visibly deeper, no layout change. The owner should still eyeball them. Fallback if more margin wanted: `#A64B32` (4.85:1).
Risks: change is sitewide and visible (Med risk item). Footer CTA hover (`#footer-book-luis-cta:hover`) not measured. `WalkWithUsPageContent.tsx` has a hard-coded `rgba(196,103,75,0.25)` glow in the old colour (not W1's file). Reduced JPEG quality to about 68 to hit the 10 MB screenshot target (asked ~80).
Process slip: W1 committed the build-generated `next-env.d.ts` in e65498f; I reverted it in the merge (`chore: restore next-env.d.ts`).

## S1/W2: heading order, label-in-name, orphan refs
SHA / branch: b634c76 / award/s1-w2
Closed: A2 → closed on `/` (axe `heading-order` gone). A3 → closed (axe `label-content-name-mismatch` gone). Orphan refs in `HowItWorksStrip.tsx` (lines 5, 34, 73) removed; stale `ServicesPreview.tsx:94` comment fixed.
Files: `components/marketing/GroupWalkFeatureCard.tsx`, `HowItWorksStrip.tsx`, `ServicesPreview.tsx`.
Behavior changed: heading levels exposed to assistive tech only. `#home-group-walk-feature-title` is `<h3 aria-level={2}>`; step and coverage titles are `<h4 aria-level={3}>`. Tags and styling unchanged, because the CSS selects on `h3`/`h4` (`.hiw-step h4`, `.home-coverage-point h4`, `#home-process-section ... h4`). `#home-group-walk-feature-details-btn` aria-label is now "Rates & Details: Dog Walking, full details and rates"; rate stickers read "<sticker text>: <title>, full details and rates" (e.g. "Puppy Pace: Puppy Visits, full details and rates").
Untouched on purpose: `globals.css`, footer headings, other routes.
DOM ids: none added (edited elements already had ids; step and coverage-point items have none, only classes).
Verification: lint, tsc, vitest, E2E 208/22/0, axe on `/`.
Risks: DOM tag and exposed level now disagree (`aria-level` is a valid but less pure fix; true tag changes need W1-owned CSS, candidate for Track F). Only `/` was axe-scanned; other routes' heading skips remain. Not checked with a screen reader.

## S1/W3: dead code, comments, plans README
SHA / branch: e7a936c / award/s1-w3
Closed: H1 → closed. H2 → closed. H4 (non-CSS) → closed. H10 → closed.
Deleted: `components/marketing/DisabledHomeSections.tsx`, `HowItWorksPageContent.tsx`, `ProcessSteps.tsx`, `hooks/useHowItWorksPawTrail.ts`. `SampleWalkReportCard` kept (knip now lists it as unused; intentional, Track F).
References removed or updated (file:line before edit): `HomePageContent.tsx:18-23` import and `:113`, `:126-129` the five gates; comments in `app/playground/service-cards/PersonalizedCareCarouselExperiment.tsx:4,9,17`, `components/AnimatedServiceCards.tsx:735`, `lib/content/walk-concepts.ts:4`, `scripts/copy/extract-copy.mjs:28-29`, `docs/copy/README.md:77`; `scripts/copy/extract-copy.mjs:70`, `scripts/copy/copy-map.mjs:57-62`, four entries in `docs/copy/copy-inventory.json`. Stale `app/page.tsx` comments fixed in `AnimatedServiceCards.tsx`, `ClosingTrust.tsx:12`, `ContactInfoCard.tsx:16`, `useSectionReveals.ts:11`, `lib/content/{contact,coverage,legacy-routes,site}.ts`; `WelcomeWalkModal.tsx:134` no longer cites the nonexistent plan 005. Left alone: `tests/e2e/public-routes.spec.ts:259-270` (only asserts those sections stay absent, still passes), historical plan reports.
`plans/README.md`: current work is 014 Track S, 013 CLOSED 2026-10-12, 014 row added, 002/006/007/008/009 marked HISTORICAL, unindexed files indexed. Plan 014 file not edited.
Behavior changed: none (all removed code was behind `false`). The `#home-process-cityscape-frame` parallax markup was not touched.
Diff: 21 files, +53 / -460.
Risks: `npm run copy:extract` was already broken at base (lists four files that no longer exist: `ServicesPageContent.tsx`, `ServiceGrid.tsx`, `app/(marketing)/services/page.tsx`, `app/(marketing)/how-it-works/page.tsx`), so the inventory was edited by hand (`totalEntries` set to the real count, 396). Owner decision: fix or retire that tooling. `plans/013-client-handoff-hardening.md` header still says "ready for execution review"; README execution-order prose still says 003 is uncommitted.

## S1/W4: N1, paw-walk layout off the critical path
SHA / branch: f8d5e64 (code 090bf98) / award/s1-w4
Closed: N1 → closed.
Files: `components/marketing/hooks/useHomePawWalk.ts` (+131 / -20), `components/marketing/HomePawWalk.tsx` (1 line). `lib/marketing/paw-walk-path.ts` not touched.
Behavior changed: the 1401-point route is sampled once into a module-level path-space cache, in 8 ms slices after `requestIdleCallback` (1500 ms timeout; `setTimeout` 200 ms fallback), then scaled per breakpoint. The pre-paint estimate uses `cachedOnly` (cold cache returns 0; `INITIAL_STEP_ESTIMATE=168` covers all measured widths). The walk is laid out about 0.2-2 s after load. Reduced-motion end state identical (`static`, same prints).
Proof: paw positions at 11 scroll points, 168 paws, 390 / 768 / 1440: max delta 0 / 0.02 / 0 px, rotation 0, 0 tone/display mismatches. Reduced-motion prints identical to base.
DOM ids relied on (unchanged): `home-paw-walk-layer`, `home-paw-walk-path-svg`, `home-paw-walk-path`, `home-paw-step-{i}`.
Risks: a very fast jump to the paw section within the first ~2 s is untested (ScrollTrigger would still pick up scroll once built). Dev-only stored-paw-size grow-to-fit now runs post-paint. Safari/Firefox, the `setTimeout` fallback, and the dev path editor/tuner were not exercised.

## Phase gate: merged `award/s1` vs base `f057102`
**All numbers are LOCAL production builds** (merged on :3031, base on :3032, runs alternated), not the deployed site; the branch is not deployed. Local numbers are not comparable to the deployed baseline above (local mobile LCP is about 8 s on both). Machine load ran 5-8 during measurements (`gate/lh-load.log`).

| Lighthouse median (3 cold runs) | Mobile base → merged | Desktop base → merged |
|---|---|---|
| Performance | 65 → **75** | 90 → **93** |
| LCP | 8902 → 8268 ms | 1973 → 1757 ms |
| TBT | 401 → **8** ms | 65 → **0** ms |
| TTI | 9002 → 8389 ms | 2000 → 1788 ms |
| CLS | 0 → 0 | 0 → 0 |
| FCP | 1054 → 1054 ms | 284 → 284 ms |
| Speed Index | 3476 → 2878 ms | 1199 → 855 ms |
| A11y | 95 → **100** | 95 → **100** |
| SEO / BP | 69 / 100 → 69 / 100 | 69 / 100 → 69 / 100 |
| Transfer / video | 3280 / 1651 → 3421 / 1873 KB | 4539 / 2715 → 5075 / 3332 KB |

No metric regressed. Transfer and video bytes are higher on merged and stable across runs (mobile 1873 KB in all three); cause not investigated (likely the video now loads sooner because the main thread is free), unconfirmed. SEO 69 is the same on both and is a local-server artifact, not investigated.
**LCP is not fixed.** In Lighthouse (simulated throttling) mobile LCP is still about 8 s, and the element is still `video#hero-bg-video` with render delay about 7.4 s. The Playwright 4x trace showed LCP falling 1928 → 448 ms, so the two methods disagree; S2 must reconcile this before the < 2.0 s target (see S2 below).
**4x-CPU trace (Playwright, 3 runs):** TBT median 1570 → **82 ms** on the same-session base (recorded baseline 1698); the 1.4 s `layoutPawWalk` task and the three ~100 ms estimate tasks are gone. Remaining long tasks are browser `(program)` tasks (175/99/98 ms) and a 53 ms module evaluation; none during scroll. Parallax per-frame cost on/off: about 0 ms delta, 0 frames > 20 ms (no regression).
**Checks:** lint 0 problems (after bundling evidence scripts into a tarball; see below), tsc clean, vitest 83 files / 700 passed / 102 skipped, full public E2E (`E2E_PORT=3030`) **208 passed, 22 skipped, 0 failed** = baseline.
**Console/hydration** (`/`, `/book`, `/contact`, 1440 and 390): 0 errors, 0 page errors, 0 hydration text. `/book` has 3 "preloaded but not used" warnings (2 fonts, 1 css), identical on base.
**Reduced motion** (`/`, 390 and 1440): 0 console errors, intro done, paw walk `static` and positions unchanged, hero video has no request/paused with poster, all 9 parallax elements have no inline transform.
**A11y:** Lighthouse A11y 100 in all 6 runs; `color-contrast` passes. Axe remaining on `/`: `landmark-one-main` and `region` (moderate, best-practice, not scored, also on base).

### Flake check (`home-entrance.spec.ts:379`, "keyboard can reach and activate the primary CTA")
Run alone 5x per checkout: merged 0/5 failed, base 0/5 failed; also passed in all 16 merged and 17 base full-spec runs. Not reproduced; W1's single failure is unexplained and not an S1 blocker (nothing to bisect).
A different test flakes on BOTH checkouts under load: `GSAP chunk blocked: CTA and headline stay visible…` (line 248), `expect(received).not.toBeNull()` at `expectIntroEndedWithinCeiling` (15 s). Merged 2/5 then 0/6; base 0/5 then 2/6; 10/10 passes alone with 1 worker. Pre-existing, load-sensitive (7 parallel workers), not an S1 regression.

### Contrast over the parallax photo layers (owner requirement)
Method: text hidden, real pixels sampled behind 259 text elements (team band, closing trust, contact sheet, footer, nav), 1440 and 390. **New failures from the token change: 0.** Solid terracotta fills (`#home-closing-book-luis-cta`, `#home-instagram-follow-cta`, `#footer-book-luis-cta`, contact-sheet `.stamp-label`) went 3.31 → 4.57. Pre-existing and unchanged (110 of 259 under threshold on merged vs 119 on base): cream text at 70% alpha over green about 3.2-3.3, gold stamps/`em` about 3.9, footer white at 68-85% alpha 3.1-4.3, `.trust-park-tag` about 3.9, nav links over photo about 3.4. Needs-review: `#nav-book-cta` and `#home-meetgreet-submit-button` sampled unreliably (washed-out state). Data: `gate/contrast-*.json.gz`.

## Backlog status after S1
Closed: A1, A2, A3, N1, N4, P4, H1, H2, H4, H10. H11 stays a gate (met). Plan corrections above (H3, H5, H6).
Not done / still open: A4, N2 `<main>` landmark, P2, P5, P6, P3, P8, A5 CSS gaps, N5, N6 (Tier 2/3); H7, `CTA_IDS`, N3, `notRugYellow.png`, P7 real-phone (Parked, unchanged).

## Proposed for S2 (for reviewer to rank)
1. **LCP (mobile ~8 s local Lighthouse, 4.8 s deployed baseline):** reconcile Lighthouse vs Playwright; the hero poster render delay is the target. Candidates: intro overlay paper-lift keyframes toggle `visibility` (`HomeIntroOverlay.tsx:21-26`, `globals.css:3908-3940`; make compositor-only), poster preload/priority, `preload="none"` video behaviour under simulated throttling. Needs a re-diagnosis with Lighthouse's own trace on the merged build.
2. `<main>` landmark on non-home routes plus home (axe `landmark-one-main`).
3. Cream-on-green alpha text over photo layers (contrast, Med risk, design call).
4. `/book` `.form-control` focus ring (A4); `/book` unused preloads (2 fonts, 1 css).
5. Video bytes up 220-620 KB after merge: investigate; P6 WebM re-encode (WebM 12% larger than MP4, listed first).
6. `#home-meetgreet-neighborhood-display` `aria-prohibited-attr`; hero video `video-caption` decision.
7. `copy:extract` tooling decision (owner).

## Hygiene notes for the reviewer
- Evidence scripts (`*.cjs`) are bundled in `measurement-scripts.tar.gz` because loose `.cjs` files fail `npm run lint` (`no-require-imports`); `eslint.config.mjs` was not touched.
- Raw Lighthouse and contrast JSON are gzipped; the 15 MB S0 trace is not committed.
- Skipped / not verified: deployed measurements of the merged branch; real phone, iOS Safari, Firefox; screen reader; `analytics` Playwright config (needs emulator); other routes' axe scan after W2.
- Rules check: no new dependencies, no booking/API/Firebase/auth/analytics/admin/copy/pricing changes, no merge to main.

Needs from owner: eyeball terracotta screenshots (or choose `#A64B32`); decide `copy:extract`; approve S2 ranking; later H3b/H7 decisions.
