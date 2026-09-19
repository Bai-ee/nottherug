# Production final-mile optimization

Prepared September 19, 2026.

Target implementation ref: `codex/full-analytics-dashboard-integration` at
`fdc301399a9a30333594b820231499046a8781f0`, followed by the owner's current
styling changes. The last fully verified code candidate is `37c6f6a`; the tip
after it changes only plan documentation.

Status: **PLANNED — begin after the current CSS/navigation styling pass has a
clean checkpoint.**

Asset sizing and delivery requirements are defined in the companion
[asset optimization specification](010-asset-optimization-spec.md). That spec
is a required part of P0, P3, P4, and P6—not an optional cleanup list.

## Recommendation

Approve this plan as the final code-quality and performance pass before the
preview/production release sequence. The application does not need another
architecture rewrite. The earlier production-readiness work repaired the
important contracts, security boundaries, tests, routes, and deployment
packaging. This pass should remove current lint defects, reduce unnecessary
browser work, make the largest modules easier to own, and establish measurable
release budgets.

Execute in small commits with behavior and screenshot evidence after every
phase. Do not mix a visual redesign into this work.

## Relationship to the other plans

- [002](002-production-readiness.md) remains the source of truth for the major
  security, booking, storage, route, and release-readiness decisions already
  completed.
- `plans/009-full-tracking-dashboard-integration.md` on the target integration
  branch remains the source of truth for analytics/dashboard integration and
  its external activation phase.
- This plan is a focused follow-on. It does not repeat completed work from 002,
  enable analytics, deploy, alter Firebase, or change the booking product.
- If a finding in this plan conflicts with an explicit decision in 002 or 009,
  preserve the earlier decision and record the conflict before changing code.

## Current baseline and evidence

The audit was read-only against the integrated worktree. No deployment,
Firebase request, email, or production write was made.

The owner is actively editing these files and they must be preserved:

- `app/globals.css`
- `components/SiteNav.tsx`

At audit time, the integrated worktree was otherwise clean.

| Area | Current evidence |
| --- | --- |
| Lint | `npm run lint` reports **16 errors and 64 warnings**. |
| Types | Last verified candidate: `npm run typecheck` passed. |
| Unit tests | Last verified candidate: 43 files, 396 passed, 0 skipped. |
| Rules/emulator | Last verified candidate passed. |
| Production build | Last verified candidate passed. |
| Browser suite | Last verified candidate: 125 passed, 5 skipped, 0 failed on desktop and 400 px mobile. |
| Largest global style file | `app/globals.css`: 3,559 lines before the current styling pass is finished. |
| Largest UI modules | `AnimatedServiceCards.tsx` 1,296 lines; generator page 1,219; playground client 1,151; welcome modal 919; booking form 763. |
| Client boundary | `HomePageContent` is a Client Component and imports nearly the complete homepage tree. |
| Home paw trail | `HomePawWalk` renders 320 `<img>` elements before measuring how many are visible. |
| Hero video | WebM is about 9.6 MB; MP4 is about 12.1 MB; markup uses `preload="auto"` and has no poster. |
| Images | Native `<img>` occurs in 24 source files; only one source file imports `next/image`. Some native images are valid editor/animation exceptions, so this needs classification rather than a blanket replacement. |
| Public assets | Several PNGs are 2–3.1 MB. The public asset tree contains multiple large backgrounds and logo variants. |
| Fonts | Six Google font families are attached at the root. `Space Mono` is described as admin-only but is loaded from the root layout. |
| Route resilience | No `error.tsx`, `global-error.tsx`, `loading.tsx`, or `not-found.tsx` boundary is present in `app/`. |
| Bundle tooling | Next 16.3.5 provides `npx next experimental-analyze --output`; no retained before/after analysis exists yet. |

### Known lint defects to fix first

The 16 errors are bounded, not a vague cleanup target:

- one unescaped apostrophe in the founder brief page;
- one synchronous state update inside the analytics dashboard effect;
- ten booking-form errors caused by a component declared during render and
  ref access inside the `groupProps` render helper;
- one `let` that can be `const` in `lib/analytics/session.ts`;
- three `any` types in analytics CTA tests.

The warnings include native image usage, ref cleanup that reads mutable
`.current` values, unused imports/arguments, and one anonymous default export.
Warnings in production code must be fixed or explicitly justified; generated
image editors may retain native `<img>` only where the requirement is recorded
next to the suppression.

## Goals

1. Preserve the current appearance, copy, booking behavior, analytics
   semantics, admin behavior, and responsive layouts.
2. Reach zero ESLint errors and no unexplained warnings in shipped code.
3. Reduce browser JavaScript, DOM work, media transfer, and font cost using
   measured before/after evidence.
4. Keep route files compositional and large modules organized around named
   responsibilities without fragmenting the code into meaningless wrappers.
5. Add useful error/loading boundaries and predictable failure states.
6. Leave a reproducible release gate that a senior engineer can run locally
   and in preview.

## Non-goals

- No new visual direction, copy rewrite, or conversion-flow experiment.
- No analytics activation, TTL change, Firebase deploy, Vercel deploy, email,
  or real lead/appointment creation.
- No framework, state-management, CSS-in-JS, or database migration.
- No blanket dependency upgrades or automated `audit fix --force`.
- No wholesale rewrite of the CommonJS brief pipeline.
- No deletion of experiments or owner assets until usage and recovery are
  documented.
- No arbitrary line-count target. A cohesive 300-line module is preferable to
  ten indirection-only files.

## Engineering rules

- Read the relevant installed Next 16 documentation under
  `node_modules/next/dist/docs/` before changing framework behavior.
- Keep Server Components as the default and move `use client` to the smallest
  interactive leaf that owns browser state/effects.
- Never move server-only imports into shared client graphs.
- Validate `unknown` at external boundaries; keep internal types specific.
- Fix causes instead of disabling lint rules. Any retained suppression must be
  local, documented, and tested.
- Make assets earn their cost. Every eager image, video, font, and third-party
  script needs a visible above-the-fold reason.
- Preserve accessibility and reduced-motion behavior during performance work.
- Never treat a local Lighthouse score alone as proof of field performance.
- Keep the owner's uncommitted styling intact. Shared-file changes wait until
  the styling checkpoint and require before/after screenshots.

## Release budgets

Phase 0 records the exact starting numbers. Later phases may tighten these
budgets but may not silently weaken them.

| Budget | Required outcome |
| --- | --- |
| Lint | 0 errors. 0 unexplained warnings in production code and tests. |
| Types/tests/build | Typecheck, unit tests, rule tests, production build, and Playwright all pass. |
| Functional regression | Booking, admin authentication, dashboard test/real isolation, and all public routes keep their existing verified behavior. |
| JavaScript | No public route may increase initial client JS by more than 5% without a recorded reason. Homepage client JS must decrease after dead/optional client code is removed. |
| CSS | No route CSS increase without an intentional visual change. Extracted files must preserve cascade order and screenshot parity. |
| Images | Every shipped image has a measured maximum rendered box and crop. Inline images have dimensions, accurate `sizes`, appropriate priority, and no layout shift. Large-breakpoint assets meet the target density without upscaling; smaller devices receive smaller candidates. Native images have a documented reason or move to `next/image`. |
| Hero media | Add a poster/fallback and stop eagerly fetching more media than required. Target each selected video format below 5 MB if visual comparison supports it; document an exception otherwise. |
| DOM | Remove the fixed 320-node paw over-allocation. Render only the measured requirement plus a small explicit buffer, or use a lower-node representation with visual parity. |
| Fonts | Public pages load only families and weights they use. Admin-only typography is scoped to the admin layout. |
| Core Web Vitals | Preview p75 target: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 on representative mobile traffic. Until field data exists, record throttled Lighthouse and Playwright trace baselines without presenting them as field results. |
| Accessibility | No new serious/critical automated findings; keyboard, focus, reduced motion, and 400 px layout checks pass. |

## Phased implementation

### P0 — Freeze the styling baseline and measure

Do not start code cleanup while the owner is still changing the same shared
CSS/navigation files.

1. Confirm the active implementation branch contains `fdc3013` and that the
   owner's latest styling work is present.
2. Review the diff with the owner changes treated as authoritative. Create a
   recovery ref and a normal checkpoint commit; do not stash or rewrite it.
3. Capture desktop and mobile screenshots for every public route, the booking
   flow, the welcome modal, and each reachable admin page.
4. Run and retain:
   - `npm run lint`
   - `npm run lint:pipeline`
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:rules`
   - `npm run build`
   - `npm run test:e2e`
   - `npx next experimental-analyze --output`
5. Record route-level JS/CSS, font files, hero/video network behavior, DOM node
   count, LCP element, CLS, long tasks, and mobile Lighthouse results.
6. Complete the route/state/viewport asset inventory required by
   [the asset specification](010-asset-optimization-spec.md), including each
   asset's maximum CSS box, crop, intrinsic dimensions, bytes, density demand,
   loading behavior, and public-file classification.
7. Record a visual list of intentional animations so performance changes do
   not accidentally remove the site's character.

**Gate:** checkpoint is recoverable; baseline artifacts and failures are
recorded; no cleanup work has started on a moving CSS target.

### P1 — Eliminate deterministic code-quality debt

This is the low-risk, reviewable first commit series.

1. Fix all 16 current lint errors:
   - move `BookingForm`'s `GroupHeader` to module scope;
   - replace the render-time ref/property helper with explicit typed pane
     props or a stable callback-ref helper that does not read refs during
     render;
   - restructure the dashboard request effect so loading derives from request
     lifecycle without a synchronous effect reset;
   - correct the brief text escape, analytics timer declaration, and test
     types.
2. Fix effect cleanup warnings by snapshotting the actual nodes/instances used
   by the effect before registering cleanup. Do not read a later `.current`
   value during teardown.
3. Remove unused imports and arguments and name exported configuration values.
4. Classify every native image warning into:
   - public content image: use `next/image` with dimensions and `sizes`;
   - animation-controlled image: use `next/image` only if ref/transform
     behavior remains identical, otherwise retain native markup with a local
     explanation and explicit dimensions/decoding/loading;
   - authenticated generator/editor preview: native object/remote URL is an
     allowed documented exception;
   - disabled/dev-only source: resolve in P3 rather than suppress globally.
5. Add a lint script that targets shipped application code explicitly if the
   existing command cannot distinguish supported exceptions. Do not exclude a
   whole directory just to make the count green.

**Gate:** zero errors; all remaining warnings listed with owner and reason;
typecheck and focused unit tests pass; no screenshot differences.

### P2 — Tighten component and client/server boundaries

Prioritize ownership seams that lower risk or shipped JavaScript. Do not split
files only because they are long.

1. Make the homepage route a server composition layer where possible. Move
   scroll/reveal orchestration into a small client boundary and keep static
   content outside the broad `HomePageContent` client graph.
2. Remove disabled component imports from the production homepage graph. The
   `false && ...` blocks and `DisabledHomeSections` import must not make
   `AnimatedServiceCards`, its GSAP import, or experimental assets eligible for
   the production bundle. Keep the recoverable experiment in a dev-only route
   or separate source boundary.
3. Keep `/playground/service-cards` unavailable in production and prove its
   client bundle is not reachable from a public production route.
4. Refactor `BookingForm` around named concerns:
   - submission state and request lifecycle;
   - step validation/navigation;
   - field registration/focus;
   - full-layout versus stepped rendering.
   Keep the shared lead contract and current DOM/test selectors stable.
5. Split `WelcomeWalkModal` only along stable behavior seams: persistence and
   analytics, dialog/focus lifecycle, and presentational steps. Do not invent
   a generic modal framework.
6. Keep the generator route compositional. Move request/data orchestration out
   of the 1,219-line page only where existing admin components already provide
   a clear boundary.
7. Treat `lib/analytics/report.ts` as domain logic, not UI debt. Extract only
   independently testable calculations that reduce cognitive load and preserve
   one-pass/bounded reads.

**Gate:** bundle analysis proves public client graphs did not grow; booking and
analytics tests pass; route and screenshot behavior is unchanged.

### P3 — Reduce media, DOM, font, and bundle cost

All asset work in this phase must satisfy
[the asset optimization specification](010-asset-optimization-spec.md). Do not
replace files using filename size alone; use the measured maximum rendered box,
crop, breakpoint, and density demand.

1. Replace the paw trail's unconditional 320-image render with a measured
   representation:
   - calculate the required step count from the actual path and stride;
   - render a small documented safety buffer only;
   - retain alternating paws, route timing, resize behavior, reduced motion,
     and the dev tuner;
   - verify long-page and mobile resize cases.
2. Re-encode the hero clips from the original source using reproducible
   settings. Compare stills and motion at desktop/mobile sizes before choosing
   the smaller assets. Add a poster; change `preload="auto"` to the least eager
   value that preserves the intended first view; pause or avoid playback when
   offscreen or when user preferences/data constraints call for it.
3. Audit the 2–3.1 MB PNG backgrounds and logo variants. Convert photographic
   content to appropriately sized AVIF/WebP where browser delivery and alpha
   needs allow. Generate crop-aware 1×/2× and breakpoint variants for CSS
   backgrounds. Keep source masters outside the deployed public surface and
   flag originals that cannot supply the required large-breakpoint detail
   instead of upscaling them.
4. Apply `next/image` to public content images that benefit from responsive
   sizing and optimization. Confirm configured remote sources for any remote
   image; do not permit broad host wildcards.
5. Move `Space Mono` to the admin layout. Audit every other font family and
   weight against computed usage; remove unused variants and keep fallback
   stacks metrically sensible.
6. Use the Turbopack analyzer to find the largest client modules. Prefer
   removing dead reachability and narrowing client boundaries before adding
   dynamic imports. Lazy-load only heavy optional UI that is not needed for
   the initial interaction.
7. Confirm Firebase client code appears only in admin bundles and Sharp,
   Firebase Admin, and Resend remain server-only.
8. Check in the asset manifest and verifier described by the companion spec;
   classify every file under `public/` and exclude source/tooling files from
   the deployed surface.

**Gate:** before/after analyzer output and network traces retained; budgets met
or exceptions documented; animation and media visual comparisons approved;
mobile memory/interaction behavior improves or stays neutral.

### P4 — Make CSS maintainable without redesigning the site

Start only after the owner's visual pass is checkpointed and P0 screenshots
exist.

1. Inventory `app/globals.css` by responsibility: tokens/reset, navigation,
   shared primitives, homepage sections, booking, route-specific marketing,
   motion, and responsive overrides.
2. Remove dead selectors only after proving no source, test, state class,
   pseudo-state, or runtime animation references them. Do not trust a static
   unused-CSS tool alone because GSAP and IDs are runtime-driven.
3. Consolidate duplicate tokens, breakpoints, keyframes, and repeated button or
   form declarations when computed styles remain identical.
4. Move self-contained feature styles closer to their feature using the
   smallest migration that preserves source order. Keep one deliberate global
   entry order; do not scatter uncoordinated global imports across components.
5. Replace repeated inline style objects in stable UI with named classes when
   values are not dynamic. Preserve deliberate dynamic geometry inline.
6. Document the few cascade dependencies that must remain global. Add a short
   style-ownership map so later edits have an obvious home.
7. Compare full-page screenshots at desktop, tablet, 400 px, and a short
   laptop viewport after every extraction batch.

**Gate:** no unapproved pixel/layout changes; no CSS budget regression; global
styles are smaller or clearly partitioned; future rules have an ownership
location.

### P5 — Add production resilience and accessibility polish

1. Add minimal App Router boundaries:
   - root `global-error.tsx` for last-resort failures;
   - a marketing error state with a safe route home/contact action;
   - an admin error state that does not disclose server details;
   - an intentional `not-found.tsx`;
   - loading UI only where a route genuinely suspends long enough to need it.
2. Verify error reset behavior and report failures through a small server-safe
   logging boundary. Do not expose credentials, provider payloads, form text,
   customer data, or stack traces.
3. Audit interactive semantics after styling: real buttons for actions, links
   for navigation, associated form labels, visible focus, Escape/focus restore
   for dialogs, status announcements, and tap targets.
4. Verify every motion path and transition respects `prefers-reduced-motion`.
   Reduced motion must still reveal content and preserve usable placement.
5. Review API route concurrency for independent work and retained timeouts.
   Parallelize only independent operations; keep idempotency and persisted
   status behavior from plan 002 intact.
6. Review security headers/CSP against actual Firebase, Calendly, image, and
   preview needs. Introduce only policies proven in preview; do not break the
   booking iframe or admin auth to claim a stricter header.
7. Ensure production logs are structured enough to identify route and failure
   class without customer content. Remove noisy success logging that has no
   operational consumer.

**Gate:** injected error tests render the intended boundaries; accessibility
checks and keyboard journeys pass; no secret/private payload appears in logs
or responses.

### P6 — Full verification and release handoff

1. Run all quality gates from P0 on the final tree.
2. Run the real-browser analytics round trip against the local emulator again:
   browser to `/api/track` to Firestore to report, with real/test modes isolated.
3. Run booking against local/mocked dependencies only. Confirm no real email,
   lead, appointment, or Firebase project is touched.
4. Compare bundle, network, DOM, Lighthouse, and screenshot results to P0.
   Include the final asset manifest, selected responsive candidates at every
   breakpoint, full-resolution large-breakpoint crops, mobile transfer totals,
   and the replacement-master backlog.
5. Test on at least one physical iPhone/Safari-class device and one Android/
   Chromium-class device when available. Record browser, viewport, network,
   and any visual differences.
6. Produce a concise release report containing:
   - commits and changed paths by phase;
   - before/after budgets;
   - test results;
   - accepted exceptions;
   - unresolved external production gates from plans 002 and 009;
   - rollback ref and exact rollback procedure.
7. Stop before preview/production deploy, environment-variable activation,
   TTL changes, or Firebase rules/data changes unless the owner separately
   authorizes those external actions.

**Gate:** the final report is complete, all local gates pass, accepted visual
changes are explicit, and the release candidate is recoverable.

## Suggested commit sequence

Keep review surfaces small and independently reversible:

1. `chore: checkpoint final styling baseline`
2. `fix: clear lint and effect lifecycle defects`
3. `refactor: narrow homepage client boundaries`
4. `perf: remove disabled production bundle reachability`
5. `perf: right-size paw trail and hero media`
6. `perf: optimize public images and font scope`
7. `refactor: organize booking and modal responsibilities`
8. `refactor: partition styles with visual parity`
9. `feat: add route error and not-found boundaries`
10. `test: enforce production performance and regression gates`
11. `docs: record final optimization evidence and release handoff`

Commits may be split further. Do not squash away evidence until review is
complete.

## Verification matrix

| Surface | Required evidence |
| --- | --- |
| Home | Desktop/mobile screenshots, video/poster request trace, paw node count, reduced-motion check, no console errors. |
| Booking | All steps and full layout, validation focus, repeat submit behavior, phone and scheduling branches, no real external action. |
| Navigation/modal | Pointer and keyboard open/close, modified-click behavior, focus restore, mobile menu, direct-link fallback. |
| Marketing routes | Every route 200, expected metadata/canonical, no horizontal overflow, images sized and lazy/eager as intended. |
| Admin | Signed-out 401/redirect behavior, signed-in flow when an authorized local session is available, dashboard real/test isolation, generator/photo/brief error states. |
| APIs | Existing unit tests plus malformed/auth/failure cases; sanitized errors; timeouts and idempotency unchanged. |
| Analytics | Event allowlist, privacy fields, rate limit, cleanup behavior, report reconciliation, tracking-off default. |
| Build/deploy package | Production build, function tracing, route list, bundle analyzer, no dev route or server-only dependency in public client chunks. |

## Stop conditions

Pause the affected phase and report evidence if:

- the owner's styling files change concurrently after P0;
- an optimization changes booking, analytics meaning, admin authorization, or
  persisted data shape;
- a media optimization is visibly worse at its real rendered size;
- a CSS extraction creates unexplained screenshot differences;
- a Server/Client boundary move pulls a server-only dependency into the client;
- a proposed fix requires production credentials, paid calls, real customer
  data, deployment, or an irreversible external action;
- the change expands into a product decision rather than code quality.

## Definition of done

This plan is complete only when:

- the current owner styling is preserved and checkpointed;
- lint, types, unit, rules, build, and browser suites pass;
- bundle/media/font/DOM evidence shows measurable improvement or a documented
  reason to keep the current behavior;
- large modules have clear responsibility boundaries without unnecessary
  abstraction;
- CSS ownership is understandable and visual parity is approved;
- error/not-found behavior is intentional and tested;
- the final release report names every remaining production-only action;
- no deploy, analytics activation, Firebase mutation, real lead, appointment,
  or email happened without separate authorization.

## Master execution prompt

Use this prompt in a fresh implementation task after the styling checkpoint:

```text
Implement plans/010-production-final-mile-optimization.md from start to finish
against the newest NotTheRug integration branch.

First read AGENTS.md, the entire plan, plans/002-production-readiness.md,
plans/002-production-tracker.md, plans/009-full-tracking-dashboard-integration.md,
plans/010-asset-optimization-spec.md,
and the relevant installed Next 16 documentation under node_modules/next/dist/docs/.

Before editing anything:
1. Verify the expected analytics integration commit fdc3013 is an ancestor of
   the current branch.
2. Treat all newer styling/navigation work as owner-authored and preserve it.
3. Require a clean, recoverable styling checkpoint and create a recovery ref.
4. Capture the P0 tests, screenshots, bundle analysis, media/network, DOM, and
   mobile performance baseline.

Execute P1 through P6 in order. Use small commits and update the plan with
evidence after each gate. Fix root causes; do not add blanket lint suppressions,
perform a visual redesign, change booking or analytics semantics, weaken auth,
or alter persisted data contracts. Narrow Client Component boundaries, remove
disabled code from production bundle reachability, optimize the paw trail,
hero media, public images and font scope, then organize CSS only after visual
baselines exist. Add minimal tested error/not-found boundaries.

Re-run the full matrix at the end. Stop before any preview/production deploy,
analytics environment activation, Firebase TTL/rules/data change, email, real
lead, or appointment. Those actions need separate explicit authorization.

Return a final report with exact commits, files, before/after measurements,
tests, accepted exceptions, recovery ref, unresolved external gates, and the
recommended release/no-release decision.
```

## Release evidence (executed September 19, 2026)

Executed by one coordinator with parallel Sonnet workers in isolated
worktrees, on `codex/production-ui-analytics-release` (consolidated from the
integration branch checkpoint `a003441` plus the main-worktree section-nav
checkpoint `e5b8baf`). Recovery tags: `recovery/*-20260919-115649`.

| Gate | Baseline (`a003441` + section nav) | Release candidate `371f35c` |
| --- | --- | --- |
| `npm run lint` | 15 errors / 63 warnings | **0 errors / 0 warnings** |
| `npm run lint:pipeline` | clean | clean |
| `npm run typecheck` | clean (after build) | clean |
| `npm run test` | 357 passed / 49 skipped (emulator down) | **427 passed** (with emulator) / 372 + 49 skipped without |
| `npm run test:rules` | 15/15 | 15/15 |
| `npm run build` | passes | passes (42 routes) |
| `npm run test:e2e` | 116 passed / 7 failed (welcome-modal scroll race) | **131 passed / 0 failed / 17 skipped** |
| Tracking-enabled journey (emulator) | not run | 6 passed / 0 failed; 17/17 CTA ids once each; allowlist, `expiresAt`, PII and real/test isolation verified |
| `npm run verify:assets` | n/a | passes |

Browser measurements (local production server, desktop 1440, DPR 1):

| Route | DOM nodes | Image bytes | Video bytes |
| --- | --- | --- | --- |
| `/` | 1313 → 1165 | 14.5 → 4.3 MB | 9.1 → 4.6 MB |
| `/about` | 316 → 319 | 6.3 → 3.4 MB | — |
| `/neighborhoods/williamsburg` | 262 → 265 | 4.7 → 1.8 MB | — |
| `/reviews` | 276 → 279 | 4.6 → 1.7 MB | — |
| `/safety` | 320 → 323 | 4.6 → 1.7 MB | — |
| `/admin` (signed out) | 95 → 99 | 2.8 → 0.3 MB | — |

- Paw trail: 320 → 168 `<img>` (measured requirement + buffer; grows only for outliers, capped at 320).
- Hero video: 1920×1080 12.1 MB MP4 / 9.6 MB WebM, `preload="auto"`, no poster → 1080×1080 center crop 4.4 MB MP4 / 4.7 MB WebM, `preload="metadata"`, 32 KB WebP poster, pauses offscreen and under reduced motion. Masters in `assets-src/video/`.
- Tracked `public/` bytes: 69.2 MB → 22.9 MB. Source masters (37 MB) live in `assets-src/` (git-tracked, `.vercelignore`d, trace-excluded).
- Client JS (gzip, per worker C2's scratch builds of `a003441` vs `371f35c`): `/` 248 → 234 KB (−5.6%); other marketing routes +8–12% (`/book` 185 → 208 KB).
- CSS per route: 85.3 → 83.3 KB.
- Fonts: unchanged on public routes (Space Mono was unused there and is now admin-only).
- Bundle isolation: `AnimatedServiceCards`/GSAP experiment only in `/playground/service-cards` (404 in production); Firebase client SDK only in `/admin*`; `sharp`, `firebase-admin`, `resend` absent from all client chunks.

### Accepted exceptions

- **Non-home route JS +8–12% gzip vs baseline.** Recorded reason: the owner's new section navigation (`SectionRail`/`SectionJump`/`useActiveSection`) now mounts in the marketing layout on every route, plus the new error/not-found boundaries; the temporary next/image runtime cost was removed again by worker C2. Homepage decreased as required.
- **Native `<img>` retained** with local, documented `eslint-disable-next-line` for: nav wordmark (498×88, native size), animation-controlled images (paw trail, group-walk card, intro overlay), admin generated-image previews (signed Storage URLs), and dev-only playground/experiment files.
- **Breakpoint-specific background crops not shipped.** Backgrounds are same-resolution WebP re-encodes (2.2–2.8 MB PNG → 110–290 KB); mobile still receives the desktop-resolution file. Worker B2's crop/`image-set()` pass was left uncommitted on `codex/release-worker-b` and is backlog.
- **Replacement masters needed** (from `docs/asset-manifest.json`): `homepage_image` ≥ 2560×1535; `bg_section_1`, `bg_section_2`, `bg5` ≥ 2560×1440; `bg_section_graphic_2` ≥ 2560×1070; `public/dogs/IMAGE 00002–00007` need landscape masters ≥ 2560 px wide; `product_background` and `bg_section_graphic_1` need a re-measure in the pinned scroll state.
- **CSP / COOP** deferred until verified against live Firebase sign-in and the Calendly embed; only `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options: SAMEORIGIN` ship.
- **Welcome modal scroll trigger** (owner change, 120 px) can open over a control the visitor is about to tap on a first visit; e2e journeys mark the modal seen. Product decision left to the owner.
- **`PUBLIC_BASE_URL`** is empty in Vercel; canonicals fall back to `https://nottherug.com`. Domains were out of scope.
- **`public/logos/ntr_offwhite_horiz.png`** (2.1 MB) is referenced only by `style-guide/` docs; left in place.

### Release sequence

Firestore and Storage rules deployed to `not-the-rug`; TTL on `expiresAt`
enabled for `analytics_events` and `analyticsRateLimits` (both `ACTIVE`).
Vercel preview and production carry `NEXT_PUBLIC_ANALYTICS_ENABLED=true` and
`NEXT_PUBLIC_ANALYTICS_TEST_MODE=true`. Preview
`nottherug-f4khyapy6-baiees-projects.vercel.app` verified in a browser
(renders, no console errors, `/api/track` beacons 202). Production deployment
and the controlled production analytics test are recorded in plan 009's
tracker.

### Production release record (September 19, 2026)

- `main` = `9aca667` (release `24c11b8` + one deployment fix), pushed to `origin/main`.
- Production deployment `dpl_CosFGdKKy1YbxZ5Eh4M95ypwHYYF`
  (`nottherug-np5m401al-baiees-projects.vercel.app`) aliased to
  `nottherug-ten.vercel.app` and `nottherug-baiees-projects.vercel.app`.
  Previous production (rollback target): `dpl_7Vpkd4PjX83kV3snpDPi4TmyQtRE`
  (`nottherug-jqi9izuho-baiees-projects.vercel.app`, commit `f77e3d2`).
- Deployment defect found and fixed during the production smoke test: Vercel's
  Next launcher runs Node 24 with `--no-experimental-require-module`, so the
  externalized `firebase-admin/auth` failed at jwks-rsa's `require('jose')`
  with `ERR_REQUIRE_ESM`. Every Firestore-backed route had been failing in
  production since September 16 (`/api/track` dropped every event with a 202,
  `/api/admin/analytics` returned 500). Fix: bundle `firebase-admin`,
  `jwks-rsa`, `jose` via `transpilePackages` (`9aca667`).
- Environment defect found and fixed: `NEXT_PUBLIC_ANALYTICS_TEST_MODE` had
  been stored as `"true\n"`; re-added as `true` on preview and production.
  Before the fix, one preview visit wrote two real-mode documents
  (`page_view` + `engagement` on `/safety`, ids `ecd191c2…` and `b7fc7cb2…`,
  21:49 UTC). They were not deleted (production deletes were not authorized);
  the owner may delete them or let the cleanup endpoint handle them.
- Controlled production analytics test (anonymous, synthetic, no lead,
  appointment, or email): 14 `mode: "test"` documents — 7 page views (one per
  tracked route), CTA clicks `nav_book`, `footer_book`, `hero_view_services`,
  `footer_services`, `booking_form_start`, `booking_step` details + dog. Every
  document's field set is within the allowlist, `expiresAt` = received +
  395 days, no name/email/phone/free text stored. The rate-limit bucket
  carries a 48-hour `expiresAt`.
- Admin dashboard (owner session, Test Data view) reconciled exactly with the
  journey; Real Data view shows only the two stray real-mode documents.
- Production remains in analytics TEST MODE. Real collection starts only when
  the owner redeploys with `NEXT_PUBLIC_ANALYTICS_TEST_MODE=false`.
- Not performed: physical iPhone/Android device pass (owner action); worker
  B2's breakpoint-specific background crops (uncommitted, backlog).
