# S0 perf backlog verify (source-level, worktree award/s0 HEAD 5100036; brief said 0e7658f)
Note: plans/reports/013-P3P4-report.md is NOT in this worktree (only 013-P0-codex-review.md).

## P2 Heavy homepage JS: PARTLY TRUE
- gsap is lazy: components/marketing/hooks/gsapLoader.ts:19 `Promise.all([import('gsap'), import('gsap/ScrollTrigger')])`; 8 hooks use loadGsap. Not in initial bundle statically.
- Only static gsap import is components/AnimatedServiceCards.tsx:6, consumed solely by app/playground (not "/"; DisabledHomeSections comment confirms).
- Static on "/": HomePageContent.tsx:12-14 imports WelcomeWalkModal (1430 lines, next/image, router, leads validation, SchedulingDialog chain), HomeIntroOverlay, HomePawWalk (PawWalkTuner is already next/dynamic ssr:false, HomePawWalk.tsx:49).
- Layout-level WelcomeModalHost already uses next/dynamic ssr:false (WelcomeModalHost.tsx:14) but returns null on "/" (onHome), so home bypasses it and ships the modal statically.
- Remaining gsap cost is loaded at mount (not idle/visible-gated) by useHomeHeroMotion, useSectionReveals, useNavScrollShadow, useHomePawWalk: Suspected main-thread cost. Needs the other worker's chunk data.
- Fix files: components/marketing/HomePageContent.tsx, WelcomeWalkModal.tsx / WelcomeModalHost.tsx (dynamic + idle/event mount; first-visit auto-open timing must be preserved); optionally the hooks.
- Impact M-H | Effort M | Risk Med (modal auto-open, booking funnel adjacency) | Suspected -> Tier 2 if chunk data confirms; modal touches booking flow, so Parked if analytics/booking behavior changes.

## P3 LCP preload: PARTLY TRUE
- No `priority`/`fetchPriority`/`<link rel=preload>` on any hero asset. fetchPriority="high" exists only on nav logo (SiteNav.tsx:155), intro walker (HomeIntroOverlay.tsx:59), /book logo, admin nav.
- Hero video: `preload="none"`, poster="/video/hero-mccarren-poster.webp" (31,994 B) HomeHero.tsx:147-148, sources attached after 2 rAF + idle (hooks lines ~76-90). Poster is a plain attribute: no preload hint.
- Hero badge `<Image src=/logos/notRugGreen.png 1080x1080>` HomeHero.tsx:161 has no `priority` (270,756 B source, optimized by next/image). Hero H1 is text. The real LCP element is unknown without a trace (poster vs H1 vs intro overlay, which covers page at load). Certainty: Suspected.
- Fix files: components/marketing/HomeHero.tsx (add `priority` to badge only if it is LCP; poster preload via metadata/link in app/(marketing)/page.tsx). Needs the LCP element from the measuring worker first.
- Impact M | Effort S | Risk Low | Suspected -> Tier 3 until LCP node confirmed, then Tier 1.

## P4 Fraunces italic preloaded everywhere: TRUE (preload), mostly unused on "/"
- app/layout.tsx:11-16 `style: ["normal","italic"], axes:["opsz"]` -> both files preloaded on every route (next/font default preload).
- Italic on "/": `.hero-eyebrow span` italic (globals.css:1058-1061) is overridden by `.hero-eyebrow .stamp-label` font-style normal (globals.css:2350-2355); hero/section `em` set normal; FounderPullQuote/NeighborhoodTeaser (italic, globals.css:389,1833) are `{false && ...}` (HomePageContent.tsx:124-125). Remaining italic: `<em>` in WelcomeWalkModal (:1142,:1151, lazy on CTA/first visit), ContactDialog, ServiceDetailDialog, NeighborhoodDetail (inline italic, other routes). So not strictly "unused": needed on modals/other routes.
- Safe fix: second Fraunces instance for italic with `preload:false` (or keep normal-only preload) so file loads on demand and no faux-italic. Do NOT just drop "italic" (synthetic italic in modal/neighborhoods = visual change).
- Files: app/layout.tsx (+ globals.css `--font-italic` var wiring). Font-size claim (82 KB) not verified here.
- Impact M | Effort S | Risk Low-Med (FOUT on modal em) | Known -> Tier 1 (preload:false variant).

## P5 Large images: TRUE sizes; mostly not on public routes
| File | Bytes | Consumers |
|---|---|---|
| public/logos/ntr_offwhite_horiz.png | 2,102,412 | NONE in app/components/lib. Only legacy index.html:1224 (root, unserved by Next) and style-guide/ docs. Dead weight; still deployable at /logos/... |
| public/img/backgorund_dogs.png | 1,338,454 | ContactSheetSection.tsx:37 plain `<img>` loading=lazy 1536x642 (below fold on "/"; also on other pages using ContactSheetSection) |
| public/logos/notRugYellow.png | 702,558 | Admin only: lib/generator/types.ts:62 previewSrc, lib/generator/server.ts:78 uses app-assets/generator-logos copy (not public/). No public route |
- No WebP/AVIF derivatives exist for any of the three. Note: git status at session start showed backgorund_dogs.png modified, so the dogs asset is a moving target.
- build-assets.mjs: data-driven JOBS array {master,out,webpQ,avifQ}; copies master to assets-src/img then sharp -> `<out>webp/avif` at same dimensions, new filenames. Adding a backgorund_dogs job (e.g. out `public/img/contact-sheet-dogs.`) works; ntr_offwhite has a comment saying deliberately excluded (zero consumers). Special trim code mentions ntr_offwhite at ~line 97.
- Fixes: (a) backgorund_dogs: add JOB + change ContactSheetSection.tsx to `<picture>` avif/webp (or next/image). Files: scripts/build-assets.mjs, components/marketing/ContactSheetSection.tsx, docs/asset-manifest.json, new public/img/*.webp/avif. Impact M (lazy, below fold, 1.3MB saved) | S-M | Low | Known -> Tier 1/2. (b) ntr_offwhite_horiz.png: delete or leave (unreferenced); removal is Parked-adjacent: needs manifest/verify-asset-manifest update; Impact L. (c) notRugYellow: admin-only, Parked/skip.

## P6 540p hero clip: TRUE (WebM larger than MP4)
- 540: mp4 1,711,801 B vs webm 1,917,181 B (+12%). 1080: mp4 4,468,914 vs webm 4,773,718. Poster 31,994.
- Selected via heroVideoPolicy.ts:24-30 (WebM listed first in HomeHero attach order, so Chrome/Firefox download the larger WebM). Both attach after idle, mobile uses 540.
- Generated by hand: docs/asset-manifest.json:38,49 (ffmpeg libx264 crf29 540x540 24fps; libvpx-vp9 crf38). NOT in build-assets.mjs (no video job; grep for ffmpeg in scripts/ empty).
- Fix options: re-encode webm smaller (crf ~42 / two-pass) or list MP4 first for mobile. Files: public/video/hero-mccarren-540.webm (new name for cache safety), components/marketing/hooks/heroVideoPolicy.ts, docs/asset-manifest.json. Impact M (~200 KB mobile) | S-M | Low | Known -> Tier 2 (binary re-encode needs visual check).

## P8 Images: mostly FALSE (OK)
- next/image users: HomeHero badge (no priority; above fold, fine), SiteFooter.tsx:70 (sizes set), InstagramGrid.tsx:96 (loading=lazy, sizes), WelcomeWalkModal:1090/1098 (sizes), TeamScroller:145 (no sizes; width/height only, comment says deliberate eager load; ok).
- Plain `<img>`: SiteNav/book/SchedulingDialog logos (documented, small), AlwaysIncluded:238, GroupWalkFeatureCard:411/426, ContactSheetSection:37, HomePawWalk:133, DisabledHomeSections, all lazy. Intro walker eager+high (intentional).
- Gaps: TeamScroller `<Image>` without `sizes` (:145). Impact L | S | Low | Known -> Tier 3.

## New issues
- N1: WelcomeWalkModal statically bundled on "/" while layout host lazy-loads it elsewhere (see P2).
- N2: Duplicate CSS blocks (`.hero-h1`, `.hero-eyebrow-dot`, `.hero-h1 em` at globals.css 1064 vs 2380 etc.) bloat CSS; Impact L, Effort M, Risk Med (cascade) -> Tier 3.
- N3: Large unreferenced file in public/logos (`Not the rug logo design.png` 365 KB, logo_horiz.png 183 KB) not checked for consumers. Suspected, L.
