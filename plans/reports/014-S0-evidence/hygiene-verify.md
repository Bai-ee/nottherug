# 014 S0 hygiene verification (read-only)
Worktree HEAD 5100036 on award/s0 (brief said 0e7658f). AGENTS.md is gitignored, absent here; read node_modules/next/dist/docs project-structure (private folders `_folder`).

| H | Verdict | Key evidence |
|---|---|---|
| H1 | TRUE (5 gates, not 1) | HomePageContent.tsx:109 `{false && <OtherServicesTeaser />}`, :122-125 WeekdayBenefits/VisitIncludes/FounderPullQuote/NeighborhoodTeaser; import :18-23. DisabledHomeSections.tsx exports exactly those 5 (lines 30,67,109,131,148), 168 lines; only importer HomePageContent.tsx. Only other deps: NeighborhoodCard (also used elsewhere? keep). Comments referencing: AnimatedServiceCards.tsx:735, ServicesPreview.tsx:94, lib/content/walk-concepts.ts:4, PersonalizedCareCarouselExperiment.tsx:4-17, docs/copy/README.md:77, scripts/copy/extract-copy.mjs:27-29 (excludes list). Whole file + 6 call sites + import safely removable; comment edits in those 6 files. |
| H2 | TRUE | HowItWorksPageContent.tsx has zero importers in app/components/lib/tests/scripts (only scripts/copy/extract-copy.mjs:70, copy-map.mjs:57, docs/copy/copy-inventory.json). It is sole importer of SampleWalkReportCard (:7,:33) and ProcessSteps (:6). knip also flags unused useHowItWorksPawTrail.ts (only commented refs in HowItWorksStrip.tsx:5,34,73). KEEP SampleWalkReportCard (Track F). Deleting HowItWorksPageContent orphans ProcessSteps.tsx too. |
| H3 | PARTLY ALREADY FIXED | app/playground/service-cards/page.tsx:17 `notFound()` when NODE_ENV==='production'; e2e tests/e2e/public-routes.spec.ts:244 asserts 404; robots.ts:15 disallows. But route is still compiled: build logs show `○ /playground/service-cards` (plans/reports/013-P2-evidence/check-build.log:65), so playground client + GSAP code ships as that route's JS chunks (not in home graph). Only importer of AnimatedServiceCards = PersonalizedCareCarouselExperiment.tsx:19. PawWalkTuner is lazy `dynamic()` in HomePawWalk.tsx:49,139, gated by pawWalkDevFlags() (paw-walk-tuning.ts:48 returns false when NODE_ENV production) so it never loads in prod. Gating options (Next docs: private folders `_x` opt out of routing; proxy.ts exists): (a) leave as is, fix stale comments; (b) delete playground + AnimatedServiceCards + Experiment (002-tracker:236 already proposed this; owner decision); (c) proxy.ts rewrite is unnecessary. Recommend (a) now, (b) if owner OKs. |
| H4 | TRUE | globals.css:963, :1290 name `app/page.tsx` (does not exist; home is app/(marketing)/page.tsx + HomePageContent). Same stale ref: AnimatedServiceCards.tsx:672,750,950; ClosingTrust.tsx:12; useSectionReveals.ts:11; ContactInfoCard.tsx:16; DisabledHomeSections.tsx:5 (also says `app/(marketing)/page.tsx` has the gate; actually HomePageContent.tsx); lib/content/{legacy-routes:2,contact:2,coverage:1,site:2}.ts; WelcomeWalkModal.tsx:134 cites plans/005-booking-first-onboarding.md which does not exist. Many are "extracted from app/page.tsx" provenance (harmless history); globals.css:963 is actively wrong (also describes carousel pin-stage as dead code). |
| H5 | FALSE for client code; intentional for cron | console.log in app/api/cron/leads-digest/route.ts:38,61 and founder-brief/route.ts:40,70 are `[cron:...]` idempotency/sent logs = intentional server logs, keep. No console.log/debugger in app/, components/, lib/, proxy.ts. Others are CLI output in scripts/, not-the-rug-brief/, tests/support (intentional). hooks/useHowItWorksPawTrail.ts:64 console.warn (file unused). |
| H6 | FALSE - NOT SAFE TO DELETE | scripts/build-assets.mjs:70-71 uses public/img/pawl.png & pawr.png as MASTERS for paw-walk-left/right.webp (release-packet 013-P5 §6.8 says kept). Comments: HomePawWalk.tsx:42, SectionRail.tsx:11. assets-src/img also holds pawl/pawr copies, so masters could move there (change build-assets.mjs) then delete public copies (528 KB, publicly served but unreferenced by pages). |
| H7 | see below | |
| H8 | see below | |
| H9 | TRUE | single consumer components/marketing/ContactSheetSection.tsx:37 (`/img/backgorund_dogs.png`); plan docs only otherwise. Modified in working tree of main checkout, so rename belongs with P5. |
| H10 | TRUE | see below |
| H11 | PASS | `npm run lint`: 0 errors, 0 warnings. `npx tsc --noEmit`: 0 errors. `npm test` (vitest run): 83 files passed, 700 tests passed, 102 skipped. Side effect: tsc/knip rewrote next-env.d.ts; reverted with git checkout. |

## H7 inventory (all tracked)
| Item | Size | What | Referenced by | Proposal |
|---|---|---|---|---|
| index.html | 168K | Legacy static prototype site (refs dogs/, logos/) | next.config.ts:19 trace-exclude only; docs/okara-feature-stack-breakdown.md:230 | move to archive/ or delete (owner OK) |
| optimize_video.py | 8K | ffmpeg hero-video transcode helper | next.config.ts:20; docs none | move to scripts/ (keep, still useful); update trace-exclude |
| Not-The-Rug-Platform-Setup-Guide.docx | 20K | handoff doc | none | move to docs/ |
| misc/ | 128K | download_video.py, nottherug-boilerplate copy.html | next.config.ts:11, eslint.config.mjs:20, asset-manifest.json:211 (stale `public/misc/` path) | delete (owner OK) |
| not-the-rug-brief/ | 340K, 34 files | LIVE: brief pipeline (npm run brief:*, lint:pipeline) | package.json, lib/not-the-rug-brief | KEEP |
| dogs/ | 9.2M, 10 PNG | prototype images used only by index.html | index.html:1581+ | delete/archive with index.html |
| logos/ | 137M | raw logo/video masters; index.html uses some; optimize_video default dir | index.html, optimize_video.py | move to assets-src/ or archive (largest repo bloat) ; owner decision |
| app-assets/ | 3.9M | generator-logos/ READ AT RUNTIME (lib/generator/types.ts:55,61; tests; docs/function-packaging.md:27); service-icons-source.png source | code | KEEP generator-logos; service-icons-source.png could move to assets-src |
| style-guide/ | 48K | STYLE-GUIDE.md, boilerplate/color-swatches html | build-assets.mjs:50 comment, next/eslint excludes | keep or move to docs/ |
| assets-src/ | 41M | image/video masters (referenced by asset-manifest) | docs/asset-manifest.json | KEEP |

## H8 knip (npx --yes knip; config error loading playwright.analytics.config.ts requires E2E_ANALYTICS_ENABLED=1, ran anyway; no unused deps reported)
- Unused files, REAL: HowItWorksPageContent.tsx, ProcessSteps.tsx, hooks/useHowItWorksPawTrail.ts (SampleWalkReportCard: keep).
- Unused files, FALSE POSITIVES (CLI entry points): not-the-rug-brief/{index,instagram,reddit,reviews,weather}.js, scripts/*.mjs, tests/support/check-seo-endpoints.mjs. `firebase` unlisted binary = CLI, ignore.
- Unused exports 74 + types 31: mostly noise (constants/types exported for tests/future; not-the-rug-brief/*.js module.exports). Likely-real dead: ServicesPreview.tsx:49 PreviewCard, ui/carousel.tsx useCarousel, bench PersonCard CoverageFitChip, lib/server/env.ts requireEnv*/MissingEnvError/AppError (check), lib/firebase.ts storage. Low value; do not mass-edit (touches lib/analytics, booking, server = parked).
- Duplicate export: lib/analytics/events.ts CTA_IDS|LIVE_CTA_IDS (analytics, parked).

## H10 plans/README.md drift
- Line 3 "Current work: 013" but 013 release closed 2026-10-12 (reports/013-tracker.md:77); table says 013 IN PROGRESS; 013 file header says "ready for execution review" (also stale).
- 014 (web award master plan) missing from index; 005 missing and plans/005-booking-first-onboarding.md does not exist though WelcomeWalkModal.tsx:134 cites it.
- 002 PLANNED, 006 OPEN, 007 BUILT UNCOMMITTED, 008 UNCOMMITTED, 009 IN PROGRESS are stale (010/013 landed on main). Statement "Plans 001-010 each carry a banner" - 011 and 012 have none, fine, but verify 005-less numbering.
- Unindexed files: 002-claude-handoff, 002-production-tracker, 003-analytics-preview-handoff, three extra 007-*, 010-asset-optimization-spec (only referenced in prose), 2026-09-18-0125-homepage-ui-session-state.md, reports/.
