# Plan 013 — P3 + P4 combined review request
Status: READY FOR REVIEW (P3 and P4 run back to back at the operator's direction; GitHub CI via draft PR #1 reported with the relay message)
Base: `6e5b76440c56a9ff86c04a738ff5c0285b54a711` (approved P2) + record commit `e5e28c8`
Candidate SHA: **the commit that adds this report** (code identical to `e4157305bf534f23f8d2bf4ed91a56e07d175844`, where the final checks ran; this commit adds only `plans/reports/` files)
Phase commits (each revertable on its own; verified with `git revert` of each alone on top of the other):
- **P3** `f7b235ce637a5a09167fdcee777744e65ab29afd` — F06, F07, F08
- **P4** `e4157305bf534f23f8d2bf4ed91a56e07d175844` — F09, F10, H03 docs, lint, P2 comment cleanup

Branch `codex/client-handoff-hardening`, worktree `/Users/bballi/Documents/Repos/NotTheRug-013`. No push to `main`, no deploy, no Firebase/Vercel/console changes.

## P3 — homepage delivery (F06, F07, F08)

### Before / after

**Performance** — `scripts/perf/measure-home.mjs` against local production builds served side by side (base `e5e28c8` on :3610, P3 on :3611), interleaved before → after → before → after, 5 cold runs per set, cache disabled, fixed 15 s window from navigation commit. Mobile: 375×812, DPR 3, iPhone UA, 4× CPU, 150 ms RTT / 1.6 Mbps down / 750 kbps up. Desktop: 1440×900, no CPU throttle, 40 ms RTT / 10 Mbps. Values are the two rounds' medians (round 1 / round 2 shown where they differ). Raw JSON and tables: `013-P3-evidence/perf-{before,after}-final-{1,2}.{json,md}`.

| Metric | Mobile before | Mobile after | Desktop before | Desktop after |
| --- | --- | --- | --- | --- |
| Booking CTA visible, opaque and hit-testable | 8.07 s | **1.57 / 1.55 s** | 6.75 / 6.77 s | **0.67 s** |
| Headline visible | 8.07 s | **1.57 / 1.55 s** | 4.74 / 4.75 s | **0.67 s** |
| LCP | 8.10 s | **2.86 / 2.88 s** | 4.31 / 4.32 s | **1.05 / 1.17 s** |
| LCP element | `#hero-polaroid-frame` (paper-grain) | same | `#home-hero-section` (hero-walker-strip) | same |
| CLS | 0.000 | 0.000 | 0.000 | 0.000 |
| Images transferred in window | 2,048 KB¹ | **1,099 KB (−46%)** | 3,087 KB | **1,205 KB (−61%)** |
| Fonts | 239 KB | 239 KB | 239 KB | 239 KB |
| JS | 223 KB² | 280 KB² | 295 KB | 280 KB |
| CSS | 22 KB | 22 KB | 22 KB | 22 KB |
| Non-video total | 2,567 KB | 1,695 KB | 3,692 KB | 1,802 KB |
| Video bytes in window | 293 KB (still downloading) | 175 KB | 4,662 KB (complete) | 191 KB (attaches after idle) |
| Console / page errors | 0 | 0 | 0 | 0 |

¹ Lower bound: on mobile five team JPEGs were still in flight at the cutoff before P3. ² Mobile "before" had not finished fetching all chunks in the window; on desktop, where both loads complete, JS is 295 → 280 KB, so no extra initial JS. Budgets: initial image transfer reduction ≥30% — met (46% / 61%); no extra fonts or JS — met; CTA no longer depends on decorative loading — met. Earlier baselines by the harness author (`perf-before.json`, `perf-before-rerun.json`) agree on bytes; desktop timing varied ~1 s between those runs under machine load, which is why the final comparison was interleaved.

| Finding | Before | After |
| --- | --- | --- |
| F06 | Page and nav `visibility:hidden` until release = asset wait (≤2.5 s) **+** additive 800 ms hold; GSAP rebuilt the CTA row from opacity 0; audit measured CTA final state at ~5.2–5.4 s unthrottled. | Intro is CSS keyframes only; page never hidden; overlay `pointer-events:none`, `aria-hidden`; no body scroll lock. Intro ends on its own animation clock (`hooks/homeIntroClock.ts`, `document.getAnimations()`), 2.5 s ceiling. GSAP hero entrance only moves the CTA (`y`), never its opacity, and is skipped if GSAP is late (cutoff 800 ms). Reduced motion: final state, no overlay. GSAP blocked / video failed: content stays visible. |
| F07 | Two paw PNGs ≈530 KB; six team portraits ≈1.41 MB fetched eagerly as CSS backgrounds; hero WebM 4.55 MiB requested immediately. | Paw prints `paw-walk-{left,right}.webp` 104×111 (≈16 KB total). Team portraits `<picture>` AVIF/WebP/JPEG at rendered sizes, loaded by IntersectionObserver near the viewport (native lazy loading still fetched them; the band sits inside Chromium's threshold). Hero video: poster only for reduced motion, Save-Data and 2g/slow-2g; otherwise attaches after first paint and idle; phones get new 540p clips (WebM 1.92 MB vs 4.77 MB, MP4 1.71 MB vs 4.47 MB). Masters retained; `build-assets.mjs` regenerates image derivatives; manifest verified. |
| F08 | `/` awaited `searchParams` for old `?page=`/`?hood=` links → dynamic (`ƒ`), `Cache-Control: private, no-cache, no-store`. | Legacy redirects in `proxy.ts` (`lib/routing/legacyRedirects.ts`, table unchanged in `lib/content/legacy-routes.ts`): 307, hood over page, first duplicate wins, hash targets kept, `?page=home` no redirect, launch gate first, noindex header on previews including redirects, UTM and `?welcome=1` pass through. `/` builds as `○` static; local `next start`: `Cache-Control: s-maxage=31536000`, `x-nextjs-cache: HIT`. Fixed a latent bug: `/?hood=constructor` redirected to `function Object() { [native code] }`. |

Font audit (P3 item 4): seven preloaded woff2 files (239 KB). Fraunces italic (82 KB) is preloaded on every route but unused on `/`; it is used on `/contact`, `/book` and neighborhood pages. Stopping only the italic preload requires splitting the Fraunces declaration and adjusting CSS on those routes, so it is **parked** (see Parked) rather than changed. No evidence-backed JS change was found.

### P3 integration problems found and fixed

- **Mobile section-jump regression** (found by the coordinator's integrated E2E, 2/16 failures vs 16/16 at base): `useScrollToTopOnLoad` forced `scrollTo(0)` during hydration ~25 ms after a user/test scroll; with the faster static page this now raced real input. Fix: skip the forced top on the first mount of a fresh `navigate` load (reload, back/forward and bfcache still pin to top). 40/40 after.
- **Two intro clocks** (review M2): JS timers vs CSS keyframes could snap or blink on slow phones; intro now ends on `animationend`/`finished` with a ceiling, entrance cutoff 800 ms.
- `scripts/perf/measure-home.mjs` lint errors (browser globals) fixed; ~3.8 MB of evidence screenshots kept out of the repo (held in the coordinator's local evidence).
- Dead `resolveLegacyMarketingPath` removed.

### P3 tests

New: `home-intro-timing` (6), `hero-video-policy` (3), `team-chip-photo` (4), `legacy-redirects-proxy` (28) unit; E2E `home-entrance.spec.ts` (CTA ≤1.5 s after DOMContentLoaded with per-frame opacity sampling, reduced motion and Save-Data request no video, video size by viewport, GSAP chunk aborted, video aborted, keyboard Tab+Enter, no overflow at 375/768/1440, no console errors), `home-image-delivery.spec.ts` (no portrait requests before scroll; requested and painted after; WebP paws), 10 request-level legacy-URL checks in `public-routes.spec.ts`. One threshold in a new test was loosened (reduced-motion hit-test 500 → 1500 ms); reviewer judged it acceptable because overlay-count and word-wrap assertions still pin the behavior.

## P4 — reporting, SEO, handoff (F09, F10, H03, lint)

| Item | Before | After |
| --- | --- | --- |
| F09 | `robots.txt` advertised `https://nottherug-ten.vercel.app//sitemap.xml`; every `<loc>` had `//`; sitemap listed `/services` and `/how-it-works`, which redirect. | `normalizePublicBaseUrl` (trim, http(s) only, origin only, throws on junk) + `resolvePublicBaseUrl` (unset → `https://nottherug.com` as before; invalid → same fallback with one warning) + `absoluteUrl` via `new URL`. Used by sitemap, robots, page metadata, layout `metadataBase`, and the three founder-brief email routes. Sitemap: 7 indexable 200 routes (`/`, `/about`, `/safety`, `/neighborhoods/williamsburg`, `/reviews`, `/book`, `/signup`); `/contact` still excluded; `/walk-with-us` unchanged (indexable via nav, not in sitemap — **parked**). Verified on `next start` with a trailing-slash base: single clean `Sitemap:` line, clean `<loc>`s, every path 200. `robots.txt`/`sitemap.xml` are static, so `PUBLIC_BASE_URL` is read at build time (documented). |
| F10 | Failed live or first-event queries rendered as 0 visits / "no history" with status `ok`. | Additive `meta.unavailable: ('live' \| 'trackingStart')[]`, status `partial_failure`; "Unavailable" on the live tile (ids `admin-analytics-live-visits-value`, `-pageviews-value`, word-sized) and "Tracking started · Unavailable" in the footer; banner names the missing part. True zero still shows 0. Both-main-queries-fail throw unchanged. |
| Lint | 1 app warning (`SchedulingDialog` `<img>`), 1 pipeline warning (unused `stat`). | 0 / 0. `next/image` swap broke node-environment booking unit tests, so the `<img>` keeps a single-rule `eslint-disable-next-line` with the reason. |
| P2 cleanup | Stale apply-route comment ("Stage not stored… stays in review"). | Describes current flow: stage claim first; ambiguous failure → confirm re-read chooses invite vs "received". |
| Docs / H03 | README pointed at removed pages and older plans; no owner runbook. | README is the entry point (setup with `npm ci --no-audit`, commands incl. emulator/analytics suites and the perf script, deploy flow, main-only `vercel.json`, Node 24 vs project setting, proxy duties). New `docs/operations-runbook.md`: ownership, env inventory (names only), deploy/rollback, rules deploy/verify with full ruleset ids, admin grant/removal, email triage (`notifications` keys `received`/`shadowInvite`/`closed`, `emailSendLog`), cron, TTL (2 of 4), backups (none), retention, alerts; UNVERIFIED where evidence is missing; 11-item owner authorization checklist. `.env.example` comments, release-checklist corrections (Previews disabled note, base-URL wording), analytics "Unavailable" section, historical banners on plans 001–010 and session logs. |

P4 tests: `seo-urls.test.ts` (25: base-URL fixtures incl. trailing slash/path/whitespace/invalid; sitemap/robots/metadata across four env cases; every sitemap entry maps to a route file and is not redirected; founder-brief email links), `tests/support/check-seo-endpoints.mjs` (request-level), `analytics-report.test.ts` (+10: each query failing alone, true zero, test mode, truncation, recovery), `admin-analytics-unavailable.test.ts` (4 render tests).

## Verification on the final code (`e4157305`)

Local, 2026-10-05T18:07–18:08Z, Node v24.7.0, firebase-tools 15.15.0, CI throwaway env, emulators on 8580/9599 (unrelated port-8080 process untouched). Logs: `013-P34-evidence/`.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run lint` / `npm run lint:pipeline` | 0 / 0 | **0 warnings** each |
| `npm run build`, `npm run typecheck`, `npm run verify:assets` | 0 | `/` is `○` static |
| `npx vitest run` with emulator hosts unreachable (CI `check` job) | 0 | 696 passed, 101 skipped (emulator suites) |
| `firebase emulators:exec … "npm run test:emulators"` (CI `emulators` job) | 0 | **797 passed, 0 skipped**; guard: 102 emulator-backed tests across 11 suites |
| `CI=1 E2E_PORT=3400 npm run test:e2e` | 0 | **199 passed, 21 skipped** (deliberate device exclusions), 0 flaky |
| Analytics build + `npm run test:e2e:analytics` under emulator | 0 | 6 passed |
| `git revert` of P3 alone and of P4 alone on top of the other | clean | each phase independently revertable |

GitHub Actions on the candidate SHA via draft PR #1: reported with the relay message (run on push).

## Independent reviews

**P3** (`013-P3-review.md`): approve with conditions → approve after fixes.

| # | Finding | Resolution |
| --- | --- | --- |
| M1 (HIGH until explained) | Two mobile section-jump E2E failures | Root-caused (hydration scroll-to-top race) and fixed in product code; 40/40 |
| M2 (MEDIUM) | Intro has two clocks → snap/blink on slow phones | Intro ends on its animations' own finish; entrance cutoff 800 ms |
| M3 (MEDIUM) | ≥30% image budget not shown | Interleaved before/after table above (−46% / −61%) |
| L1 | Visual timing changes (shorter CSS intro, CTA rise without fade, 2.5 s failsafe) | Parked for owner visual sign-off |
| L2 | Nav `translate` during intro could trap fixed children | Checked: section-jump is not a nav descendant; nav already had `backdrop-filter`; no new trap |
| L3 | Stale comment `public-routes.spec.ts:66-69` | Fixed |
| L4 | CTA test ignores the global 0.4 s `.page` fade | Documented; shared fade unchanged |
| L5 | 540 clips built manually with ffmpeg, not by `build-assets.mjs`; WebM larger than MP4 | Commands recorded in `013-P34-worker-H.md`; parked |
| L6 | Perf script lint errors | Fixed |
| I1 | ~8–9 MB binaries incl. 4 MB evidence JPEGs | Screenshots removed from the repo; media derivatives kept |
| I2 | Device/Vercel-only proofs | Parked (below) |

**P4** (`013-P4-review.md`): approve with minor fixes → all applied in the P4 commit.

| # | Finding | Resolution |
| --- | --- | --- |
| M1 | Runbook pointed to a truncated Storage ruleset id | Full id `2e328ac4-dacb-41de-9be9-678eb7f45116` in runbook |
| L1 | Silent fallback to `https://nottherug.com` | Documented in runbook, `.env.example`, release checklist; failing the build instead is parked |
| L2 | `PUBLIC_BASE_URL` build-time only in a worker report | Runbook + `.env.example` |
| L3 | Release checklist said the URL "defaults to nottherug.com" | Reworded to current production setting + fallback |
| L4 | "Preview acceptance" assumes previews | Note: previews disabled; run locally until isolated |
| L5 | Wrong bench notification key names | `received`, `shadowInvite`, `closed` |
| L6 | "Unavailable" in large number style | Word sizing scoped to `#admin-analytics-live-stats-row` |
| L7 | No analytics doc line on `meta.unavailable` | Added |

## Parked items (owner decision or access needed)

| # | Item | Decision / action needed | Owner |
| --- | --- | --- | --- |
| 1 | Index `/walk-with-us`? | Keep (indexable via nav, not in sitemap) / list it (add `'/walk-with-us'` to `PUBLIC_ROUTES` in `lib/content/site.ts`) / hide it (`noIndex: true` in its `buildPageMetadata`) | Owner |
| 2 | Visual sign-off of the new entrance | Review on a phone and desktop: CSS intro ~0.4 s shorter, CTA rises without fading, headline word slide 0.4–1.0 s, 2.5 s failsafe; optionally drop the word slide for literal opacity 1 at first paint | Owner |
| 3 | 540p mobile hero clip | Watch it once on a phone; optionally fold the ffmpeg commands into `build-assets.mjs` | Owner / maintainer |
| 4 | Fraunces italic preload (82 KB on `/`) | Approve splitting the Fraunces declaration so italic is not preloaded on routes that don't use it (visual check on `/contact`, `/book`) | Owner |
| 5 | No-JS team portraits | Accept that portraits need JS (decorative; the intro already needs JS) or request a `<noscript>` fallback | Owner |
| 6 | Unreferenced `public/img/pawl.png`, `pawr.png` | Delete after the release is confirmed | Maintainer |
| 7 | Invalid `PUBLIC_BASE_URL` | Keep logged fallback, or fail the production build on a set-but-invalid value | Owner |
| 8 | Domain | Choose the canonical host (custom domain vs `nottherug-ten.vercel.app`); then set `PUBLIC_BASE_URL` and redeploy | Owner |
| 9 | Device / Vercel-only verification | On the released deployment: static `/` edge caching (`x-vercel-cache`), per-query cache keys, iOS Safari video start with `preload="none"`, real-phone LCP, intro smoothness. Proxy redirects no longer carry `no-store` (previous page redirects did). | Release (P5) |
| 10 | Production configuration (runbook checklist, none executed) | Deploy Firestore rules (`firebase deploy --only firestore:rules --project not-the-rug` from the released SHA; record current ruleset first); enable TTL on `leadRateLimits` and `benchRateLimits`; decide backups/PITR/delete protection; require `check`, `e2e`, `emulators`, `e2e-analytics` on `main`; disable or keep email/password sign-in; add a second Firebase/Vercel/GitHub owner; verify the Resend sender domain; isolate Previews (separate Firebase project + Resend key) then remove `git.deploymentEnabled`; promote the release | Owner |
| 11 | Unverified operations facts | Resend and Calendly account ownership; Storage versioning/backup; whether deleting an applicant deletes the resume file; cost/error/uptime alerts; brief-generation duration (keep disabled) | Owner |
| 12 | `plans/README.md` lists 012 as PLANNED | Pre-existing status drift; correct in P5 | Maintainer |

## Risks

- Visual timing of the entrance changed (parked #2); copy, composition, pricing and booking destinations unchanged.
- Fresh-navigation scroll restoration: the forced scroll-to-top no longer runs on the first mount of a fresh navigation (reload/back-forward unchanged); reviewed against its original purpose (reload/bfcache restoration).
- `/` is now cacheable; every distinct query string is its own CDN key (one miss per campaign URL).
- Team portraits require JavaScript.
- `PUBLIC_BASE_URL` changes need a redeploy.

## Rollback

Nothing is deployed; production remains `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1` at `905206d`. On the branch: `git revert e415730` (P4 only) and/or `git revert f7b235c` (P3 only); each applies cleanly alone (reverting P3 alone leaves one README line about proxy legacy redirects stale). If later released: Vercel rollback to the prior production deployment; no data migration, no rules or settings changed in P3/P4; old asset URLs (`pawl.png`, `pawr.png`, 1080 videos, team JPEGs) are retained, so a rolled-back deployment still finds them.

## Review request

Request Codex approval for P3 and P4 at the candidate SHA in the relay message. P5 has not started.

## Reviewer decision — Codex only
PENDING
