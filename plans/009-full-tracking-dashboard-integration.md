# 009 — Full tracking and custom dashboard integration

Status: **APPROVED FOR IMPLEMENTATION — local integration and verification may proceed; preview and production activation still require explicit authorization.**

Updated September 18, 2026 after reviewing the committed analytics foundation on `main`, the active `feat/welcome-modal` worktree, the booking-first work in both worktrees, the existing analytics plans, and the focused analytics test suite.

This plan supersedes the integration sequencing in [003-admin-dashboard-and-tracking.md](003-admin-dashboard-and-tracking.md) and [004-frontend-tracking-coverage.md](004-frontend-tracking-coverage.md). Their privacy, metric-definition, and owner-decision sections remain authoritative unless this document explicitly replaces them.

## Objective

Integrate the existing first-party Firestore analytics foundation into the redesigned booking-first site, finish the owner-facing custom dashboard, verify the complete browser-to-Firestore-to-dashboard path, and prepare a controlled activation package without losing either worktree's uncommitted work.

The finished system must answer:

1. Is the site producing inquiries and scheduled appointments?
2. How many pageviews and browsing sessions occur, and how many sessions become engaged?
3. Which pages, sources, and real conversion-intent controls are being used?
4. Where do visitors enter and progress through the booking and scheduling journey?
5. Is the displayed data real traffic, test traffic, incomplete, stale, disabled, or unavailable?

## Decision record

The original four-step file-copy proposal is rejected. The analytics implementation itself is approved for reuse, but integration must happen through a checkpointed merge followed by deliberate reconciliation.

Reasons:

- `/Users/bballi/Documents/Repos/NotTheRug-welcome-modal` is at `41bdf952` on `feat/welcome-modal`, zero commits ahead of and 25 commits behind `main`. Its newer product and design work exists in 75 working-tree entries.
- `/Users/bballi/Documents/Repos/NotTheRug` is at `f77e3d2` on `main` and also has uncommitted booking-first work that already adapts parts of the scheduler and form to analytics.
- Copying only `lib/analytics/*` and the three routes would omit required Firestore helpers, rules, environment documentation, tests, and intervening reliability fixes.
- The live site removed `/services` and `/how-it-works`, changed navigation to homepage anchors, added the welcome scheduler, and added a group-walk prefill form. The committed route and CTA allowlists therefore no longer describe the rendered site.
- The committed dashboard does not forward `testMode=1` from its UI and has no page-by-page performance table.
- Retention is currently manual, the approved visitor disclosure is absent, and the CTA documentation has drifted from the code.

## Verified baseline

The following evidence was collected before writing this plan. It is baseline evidence only, not proof of the future integrated branch:

- `feat/analytics-dashboard`, `main`, and `origin/main` all point to `f77e3d2`.
- `feat/welcome-modal` points to `41bdf952`; `main` is 25 commits ahead.
- The active welcome-modal worktree reports 32 tracked changes and 43 untracked paths: 75 total status entries.
- Seventeen current welcome-modal paths overlap files changed between `41bdf952` and `f77e3d2`.
- Focused analytics, report, route, retention, CTA, booking, and scheduler tests: **12 files passed, 132 tests passed**.
- `npm run typecheck`: **passed** in the main worktree.
- `lib/analytics/verifiedOrigin.ts` in the welcome-modal worktree matches the committed main implementation, but the live scheduler does not yet emit analytics.

Recheck every fact at execution time. Do not assume the working trees stayed unchanged after this document was written.

## Locked product and measurement decisions

- First-party Firestore analytics only. Do not add Google Analytics, Segment, Mixpanel, pixels, session replay, fingerprinting, or a new analytics dependency.
- Tracking remains disabled unless `NEXT_PUBLIC_ANALYTICS_ENABLED=true` was present at build time.
- Preview traffic uses `NEXT_PUBLIC_ANALYTICS_TEST_MODE=true` and remains isolated from real traffic.
- `ANALYTICS_TRACKING_DISABLED=true` remains the runtime emergency stop.
- Sessions are visits, not people or unique visitors.
- Use engaged-visit percentage, not classic bounce rate.
- Inquiries come from authoritative saved lead records. `lead_saved` is a tracked-cohort/funnel signal, not the authoritative business total.
- Scheduled appointments remain separate from inquiries. Never sum them into a generic conversion number.
- Opening Calendly is not an appointment. Only a verified `calendly.event_scheduled` message from the configured origin and the intended iframe window emits `appointment_completed`.
- The booking-first journey may schedule before a lead exists. Appointment counts may legitimately exceed inquiry counts.
- Store no form values, email addresses, phone numbers, pet details, free text, provider payloads, raw IPs, full referrer URLs, arbitrary query parameters, or arbitrary campaign values in analytics.
- Outbound proof/social links remain out of the initial dashboard unless the owner makes a separate decision to measure them.
- Use `America/New_York` for business-day reporting boundaries.
- No background dashboard polling. The rolling 60-minute tile refreshes when the report is loaded or manually refreshed.
- Raw event retention is 13 months. Rate-limit record retention is 48 hours.
- Add the approved short disclosure near booking: cookie-free first-party visit measurement, no form contents stored, visitor information never sold.

## Target architecture

```text
Marketing layout and conversion controls
        │
        ▼
lib/analytics/track.ts + session.ts
        │  validated, allowlisted, best-effort events
        ▼
POST /api/track
        │  origin check, bot filter, rate limit, dedupe, server timestamp
        ▼
Firestore analytics_events ───────────────┐
Firestore leads (authoritative inquiries) │
                                          ▼
                              lib/analytics/report.ts
                                          │
                                          ▼
                              GET /api/admin/analytics
                                          │  verified admin only
                                          ▼
                      /admin/dashboard custom owner dashboard
```

The founder brief remains at `/admin/dashboard/brief`. Leads, Photos, Generator, and Founder Brief preview remain available through the shared admin shell.

## Target event contract

Retain these event meanings:

| Event | Meaning |
| --- | --- |
| `page_view` | One allowlisted public route rendered after initial load or client navigation. |
| `engagement` | A session first qualifies through dwell, meaningful scroll, or a tracked conversion-intent click. |
| `cta_click` | One activation of a real, allowlisted conversion-intent control. |
| `booking_form_start` | First genuine interaction with the full booking questionnaire for an attempt. |
| `booking_step` | First reach of each named questionnaire step for an attempt. |
| `lead_saved` | The lead API successfully persisted the inquiry. |
| `scheduling_dialog_opened` | The Calendly scheduling dialog opened. |
| `appointment_completed` | The intended Calendly iframe emitted one verified scheduled-event message for the attempt. |

At the contract-lock phase, update `TRACKED_ROUTES` to the routes that actually render. The expected set after the current redesign is:

- `/`
- `/about`
- `/book`
- `/contact`
- `/neighborhoods/williamsburg`
- `/reviews`
- `/safety`

Remove `/services` and `/how-it-works` if they remain deleted at execution time. Hash navigation on the homepage is part of `/`; hashes are never stored as routes.

The CTA inventory must be regenerated from rendered controls. Expected decisions, subject to confirming the final DOM:

- Keep booking entry IDs for desktop nav, mobile nav, hero/modal entry, closing section, neighborhood detail, and footer.
- Keep contact-navigation IDs for the real “Let’s Get Started,” contact, and neighborhood controls.
- Keep contact-page phone and email IDs.
- Keep service-discovery IDs for the hero, navigation, and footer homepage anchors.
- Add one stable ID for the validated group-walk prefill submission that navigates to `/book`.
- Remove service-page phone/email IDs when no service page renders.
- Remove any closing-contact ID that now points to the hiring email rather than a customer conversion action.
- Do not track modal dismissal, accordion toggles, hover effects, animation tuners, passive cards, login, or social/review links in this release.

`CTA_IDS`, `LIVE_CTA_IDS`, instrumentation, dashboard labels, zero-filled reports, tests, and operations documentation must derive from one exact contract.

## Multi-agent execution model

Use one root coordinator and at most three concurrent implementation agents. All agents share the same filesystem, so file ownership is mandatory. The coordinator owns Git operations, shared contracts, integration, global verification, and final commits.

### Coordinator-owned files

Only the coordinator edits these unless ownership is explicitly reassigned in writing:

- `lib/analytics/events.ts`
- `lib/analytics/track.ts`
- `lib/analytics/session.ts`
- `lib/server/firestoreRest.ts`
- `firestore.rules`
- `.env.example`
- `app/globals.css`
- `package.json` and lockfiles
- `plans/*` and `docs/*`
- merge conflicts and Git state

### Worker A — public-site instrumentation

Owns:

- `app/(marketing)/layout.tsx`
- `components/SiteNav.tsx`
- `components/marketing/*`, except files assigned to Worker B
- focused public CTA/pageview tests

Does not edit `events.ts` or `app/globals.css`. It reports required contract IDs and CSS changes to the coordinator.

### Worker B — booking and scheduler funnel

Owns:

- `components/booking/*`
- `components/marketing/WelcomeWalkModal.tsx`
- `components/marketing/GroupWalkFeatureCard.tsx`
- `lib/booking/*`
- booking, handoff, scheduling, and analytics-isolation tests

Does not edit shared analytics contracts or global CSS. It reports required event/CTA additions and CSS changes to the coordinator.

### Worker C — reporting and admin dashboard

Owns:

- `lib/analytics/report.ts`
- `app/api/admin/analytics/route.ts`
- `app/admin/dashboard/page.tsx` and any extracted dashboard client component
- `components/admin/analytics/*`
- `app/admin/admin.css`
- analytics report, route, and dashboard tests

It may update shared admin-shell components only after confirming no other agent owns them.

### Review rotation

After implementation:

- Worker A reviews Worker B’s funnel semantics and public behavior.
- Worker B reviews Worker C’s metric labels and booking-funnel interpretation.
- Worker C reviews Worker A’s route/CTA coverage against the shared contract.
- Reviewers report findings; the coordinator assigns fixes and owns final acceptance.

Agents must not commit, switch branches, stash, reset, run global formatters, or edit another worker’s files. The coordinator alone performs those operations.

## Phases and gates

### P0 — Preserve and baseline both worktrees

**Owner:** coordinator only. **Parallel work:** read-only audits are allowed; no edits.

1. Re-read `AGENTS.md` and the relevant installed Next.js 16.3.5 documentation before changing routes, layouts, search parameters, or client/server boundaries.
2. Inspect both worktrees, running processes, branch refs, status, and recent commits. Do not assume the baseline above is still exact.
3. In the welcome-modal worktree, create a recovery branch such as `codex/full-analytics-dashboard-integration`, carrying the current working tree, and make a clearly labeled checkpoint commit without rewriting `feat/welcome-modal`.
4. In the main worktree, preserve the current dirty booking-first analytics-compatible work on a separate recovery branch such as `codex/booking-first-analytics-checkpoint`, leaving the `main` ref at its committed state.
5. Record the checkpoint refs and SHAs in this document’s tracker.
6. Run the cheapest baseline checks that do not disturb the port-3000 server: typecheck and focused booking/analytics tests. Record exact results and pre-existing failures.

**Gate P0:** both previously dirty states are recoverable from named refs/commits; the integration worktree is clean; no user change is available only in an untracked file.

### P1 — Merge the complete committed foundation

**Owner:** coordinator only. **Parallel work:** agents may perform read-only conflict audits.

1. Merge the committed `main` foundation into the integration branch. Use the verified main SHA rather than a moving ref if `main` advanced unexpectedly.
2. Resolve conflicts with this policy:
   - keep the redesigned welcome-modal UI and current copy/layout;
   - keep analytics, authentication, Firestore, rules, error handling, and failure isolation from the main foundation;
   - preserve intentional route deletions;
   - keep `/admin/dashboard` for analytics and `/admin/dashboard/brief` for the founder brief;
   - preserve every existing admin action and feature.
3. Use the main-worktree booking-first checkpoint as a semantic reference for analytics-compatible `BookingForm`, `SchedulingDialog`, and welcome-modal behavior. Do not cherry-pick its full UI over the newer live design.
4. Remove conflict markers and obsolete duplicate component directories.
5. Run typecheck and the focused foundation tests before starting new feature edits.

**Gate P1:** merge commit is reviewable; the branch compiles; the analytics backend, admin routes, and current redesigned UI all exist on one branch.

### P2 — Lock the live route, CTA, and funnel contract

**Owner:** coordinator. **Parallel work:** three agents audit their assigned surfaces and report findings without editing shared contracts.

1. Inventory every rendered public route and every real booking, contact, phone, email, and service-discovery action at desktop and mobile widths.
2. Decide the final `TRACKED_ROUTES`, `CTA_IDS`, `LIVE_CTA_IDS`, owner labels, categories, and destinations.
3. Confirm the booking-step mapping against the current questionnaire.
4. Confirm the welcome-modal and full-form scheduler sources do not change event meaning or transmit their `source` strings to stored analytics.
5. Update the shared contract, label exhaustiveness tests, and this document’s final inventory.
6. Commit the contract before parallel instrumentation begins.

**Gate P2:** every live dashboard row maps to exactly one rendered action; no rendered conversion-intent action selected for measurement lacks an ID; deleted/nonexistent controls have no live IDs.

### P3 — Implement three independent workstreams

**Owners:** Workers A, B, and C in parallel after P2.

#### P3A — Public instrumentation

- Mount one `PageViewTracker` in the marketing route-group layout and nowhere in admin.
- Preserve one pageview per committed client navigation; prefetches, hashes, unknown paths, and Strict Mode repeats must not inflate counts.
- Instrument the locked navigation, hero, footer, contact, and neighborhood actions through small typed client leaves.
- Preserve current click handlers, modal opening, smooth/reduced-motion behavior, modified clicks, keyboard semantics, destinations, `target`, and `rel`.
- Emit at most one CTA event per activation.
- Do not turn whole sections into client components solely for analytics.

#### P3B — Booking-first funnel

- Restore `safeTrack` failure isolation in the redesigned `BookingForm`.
- Emit form start only after real interaction and once per attempt.
- Emit each mapped step once per attempt, regardless of back/forward navigation.
- Emit `lead_saved` only after the API confirms persistence.
- Pass the proper bounded source category to the scheduler call site without storing it in analytics.
- Emit scheduler-open and verified completion events while preserving origin, iframe-window, and per-attempt deduplication checks.
- Ensure the optional `onBooked` welcome-modal callback runs exactly once after verification even if analytics throws.
- Instrument the group-walk prefill only after validation succeeds and before navigation; never send the entered email or phone.
- Prove disabled, rejected, rate-limited, offline, or throwing analytics cannot block lead submission, navigation, modal progress, or appointment UI.

#### P3C — Report and dashboard completion

- Extend the report with a page table containing owner-readable route, pageviews, and distinct sessions. Do not invent route-level engagement attribution from a session-level engagement event.
- Add visible range totals for pageviews and sessions alongside inquiries, tracked inquiry rate, appointments, and engaged visits.
- Preserve daily trend, source table, CTA table, funnel, and rolling 60-minute tile.
- Add an explicit Real/Test data control. `?testMode=1` must load only test events, remain reflected in the URL, and pass `testMode=1` to the admin API. Follow the installed Next.js guidance for async `searchParams` or `useSearchParams`/Suspense.
- Keep test mode visually unmistakable.
- Preserve honest loading, retry, disabled, no-data-yet, zero-activity, partial-failure, truncated, and last-refreshed states.
- Preserve admin authentication and all Brief, Leads, Photos, Generator, and preview navigation.

**Gate P3:** each workstream passes its focused tests and submits a concise file/result/risk handoff to the coordinator.

### P4 — Integrate, automate retention, and align documentation

**Owner:** coordinator. **Parallel work:** review rotation may run read-only.

1. Review and integrate all worker changes. Resolve type/contract/CSS conflicts centrally.
2. Add the approved booking-area tracking disclosure.
3. Implement automatic expiry fields suitable for Firestore TTL:
   - raw event expiry: received time plus 13 months;
   - rate-limit expiry: bucket time plus 48 hours.
4. Extend Firestore REST serialization only as narrowly as needed to write/read timestamp values, with tests.
5. Keep the protected manual cleanup endpoint for legacy/backlog cleanup.
6. Prepare the exact Firestore TTL policy commands/runbook, but do not change the deployed project without explicit authorization.
7. Update `docs/analytics-operations.md`, plans 003/004 status, `.env.example`, the CTA table, test-mode instructions, retention instructions, and troubleshooting guidance.
8. Remove stale claims such as old CTA counts, deleted routes, missing cleanup, or a dashboard toggle that is not actually wired.

**Gate P4:** implementation, tests, owner documentation, and operator documentation describe the same behavior; no retention or disclosure item remains an undocumented production prerequisite.

### P5 — Full verification and independent review

**Owner:** coordinator, with worker review rotation.

Run and record, from the final candidate:

1. `npm run lint`
2. `npm run lint:pipeline`
3. `npm run typecheck`
4. Focused analytics, booking, scheduler, CTA, report, retention, and admin-route tests
5. Complete unit suite
6. Firestore emulator round-trip and rules suites
7. Production build
8. Ordinary Playwright suite
9. Tracking-enabled, test-mode Playwright journey

Do not convert pre-existing failures into passes by weakening rules, adding broad ignores, or skipping required assertions. Record exact pass/fail/skip counts and distinguish pre-existing debt from regressions.

Browser acceptance must cover desktop, tablet, and 400px mobile widths plus keyboard interaction. Verify:

- public navigation and anchors still work;
- one pageview per route visit;
- each selected CTA emits once;
- group-walk prefill leaks no values;
- full booking funnel semantics;
- verified Calendly message and deduplication;
- real/test isolation in both API and dashboard;
- dashboard totals, page table, sources, CTA table, and funnel match a controlled event fixture/journey;
- empty, disabled, stale, failed, partial, and truncated states;
- founder brief, leads, photos, generator, and preview pages did not regress;
- stored documents contain no prohibited values.

**Gate P5:** all required local/emulator checks pass or have an explicit, honest blocker; independent reviews have no unresolved high-severity findings; the integration worktree is clean.

### P6 — Preview and production activation

**Owner:** coordinator. **External action gate:** explicit user authorization required.

Preview sequence:

1. Confirm the target Firebase project, domain, admin account, test recipient, Calendly test approach, and rollback owner.
2. Diff and deploy required Firestore rules/TTL configuration only after approval.
3. Build preview with `NEXT_PUBLIC_ANALYTICS_ENABLED=true` and `NEXT_PUBLIC_ANALYTICS_TEST_MODE=true`.
4. Run a controlled journey. Do not create a real appointment, production lead, or customer email unless specifically authorized.
5. Use the dashboard Test view to reconcile expected counts; confirm the Real view remains unchanged.
6. Exercise the runtime kill switch and confirm booking still works.

Production sequence:

1. Verify retention policies and the visitor disclosure are live.
2. Optionally deploy production once with test mode still enabled and verify one owner journey.
3. Redeploy with test mode disabled to begin real collection.
4. Record the exact activation date/time, deployment, environment values, and rollback instructions.
5. Monitor the first controlled event, dashboard load, and booking flow; use the kill switch if collection misbehaves.

**Gate P6:** production tracking is not considered active until a real event is collected, displayed in the correct mode, and the activation record is complete.

## Required test matrix

| Layer | Required proof |
| --- | --- |
| Shared contract | Unknown event, route, CTA, step, campaign, and extra fields cannot reach storage. |
| Session | Rolling expiry, first-event attribution, one engagement per session, blocked storage degradation. |
| Ingestion | Byte/batch caps, origin handling, bot exclusion, persistent rate limit, fail-open limiter, event-ID dedupe, kill switch. |
| Privacy | No PII/provider payload/query/full referrer/raw IP in stored event documents. |
| Public UI | One pageview per route; each locked CTA emits once without changing native behavior. |
| Booking | Real start, once-per-step, post-persistence lead event, failure isolation. |
| Scheduler | Origin plus iframe-window verification, per-attempt dedupe, callback once, no provider payload storage. |
| Reporting | New York boundaries, mode isolation, page aggregation, source counts, CTA zero rows, funnel, truncation/degraded metadata. |
| Admin | 401/403/500 behavior, real/test control, range changes, retry, states, shared navigation. |
| Retention | Correct expiry timestamps and cleanup cutoffs; legacy cleanup remains bounded/idempotent. |
| Browser | Test-mode journey reconciles from UI action through Firestore and back to the authenticated dashboard. |

## Definition of done

The plan is complete only when:

- both original dirty worktrees are recoverable;
- the integration branch contains the full main foundation and the redesigned booking-first UI;
- the route/CTA/event contract matches the rendered site exactly;
- page, session, engagement, source, CTA, inquiry, appointment, and funnel reporting works;
- the dashboard can switch between isolated real and test traffic;
- `/admin/dashboard/brief` and all other admin tools retain their existing behavior;
- privacy, auth, failure-isolation, rate-limit, retention, and disclosure requirements are satisfied;
- required tests and browser acceptance are recorded from the final candidate;
- documentation matches the implementation;
- production remains disabled until P6 is explicitly authorized.

## Rollback strategy

- Keep the P0 checkpoint refs until production acceptance is complete.
- Keep analytics disabled by default so the integrated code can ship without collecting data.
- Use `ANALYTICS_TRACKING_DISABLED=true` for immediate collection shutdown without breaking booking.
- A frontend rollback may remove instrumentation while leaving stored events intact; reporting remains read-only.
- Do not delete event collections as rollback. Retention/cleanup is a separate, deliberate data operation.
- Revert integration commits normally; never use destructive reset against the user’s original worktrees.

## Execution tracker

| Phase | Status | Evidence / commit | Open risks |
| --- | --- | --- | --- |
| P0 Preserve and baseline | DONE | main-worktree checkpoint `0cfde87`; integration checkpoint `9d08ed2` on `codex/full-analytics-dashboard-integration`; `main` still `f77e3d2`, `feat/welcome-modal` still `41bdf95`. Baseline: integration typecheck clean, main focused analytics 12 files / 128 tests passed. | Both original dirty trees are now recoverable from those two commits; do not delete them before P6 acceptance. |
| P1 Merge foundation | DONE | merge `bcd862f` (156 files, +10196/-1510). 11 conflicts: 3 intentional route deletions kept deleted, 7 UI/booking files resolved to the live redesign, plans/README merged by hand. Post-merge: 6 test files / 34 tests fail, 302 pass, 49 skip — all missing-instrumentation, scoped to P3. | Live marketing and booking components carry no tracking calls yet; main's scheduler hardening must be re-implemented in P3B from the `codex/booking-first-analytics-checkpoint` reference, not assumed present. |
| P2 Lock contract | DONE | contract commit `cc19549`. Three read-only audits (routes/CTAs, funnel, dashboard) fed one lock: TRACKED_ROUTES = /, /about, /book, /contact, /neighborhoods/williamsburg, /reviews, /safety. CTA_IDS = 17 ids, 4 retired, 4 added (group_walk_card_submit, welcome_modal_schedule, welcome_modal_details, hero_contact). Labels/categories and the docs CTA table follow the same list. | The three homepage modal/card ids are locked but not yet wired — they are P3A/P3B work, so they read as zero rows until then. |
| P3A Public instrumentation | DONE | `86709b4`. Ten locked ids wired across nav, hero, closing section and footer; two stale unit tests rewritten to the rendered site. PageViewTracker was already mounted in the marketing route group by the merge. 18 focused tests pass. | The nav records its four clicks from a small local helper rather than the TrackedCtaLink wrapper — accepted to avoid branching both nav maps into two link shapes; peer review is checking it keeps the wrapper's guarantees. |
| P3B Booking funnel | DONE | `e7231e2` (funnel) + `0253b7d` (three homepage CTAs). 35 focused tests pass. Lead events fire only after confirmed persistence and outside the component's network catch; appointment completion keeps the origin and iframe-window checks. | The home page's full-layout form emits no booking_step events by design (its step never advances); the funnel there reads as form start to lead saved. |
| P3C Dashboard/report | DONE | `4304f92`. Adds per-route page table, visible range totals, and a Real/Test switch that reflects itself in the URL and forwards testMode=1; a report whose mode does not match the request is discarded rather than rendered. 41 focused tests pass. | Admin pages need a signed-in session, so the toggle and page table are type/unit/HTTP-verified, not clicked through in a browser. |
| P4 Retention/docs/integration | DONE | TTL stamps `044d392` (expiresAt on events = +13 months, on rate-limit buckets = +48h, written as real Firestore timestamps; 33 focused tests pass). Docs: retention/TTL runbook `85e12f5`, CTA reference re-synced to the locked contract. | Enabling the TTL policy on a deployed Firebase project is still an external action held for P6. |
| P5 Verification/review | DONE | Final candidate `37c6f6a`. lint 16 errors / 64 warnings — byte-identical to the pre-P3 baseline at `bcd862f`, no new findings. lint:pipeline clean. typecheck clean. Unit: 43 files / 396 tests, 0 skipped (the Firestore emulator ran on an unlinked Homebrew openjdk@21). Production build succeeded. Playwright against a tracking-enabled build: 125 passed / 5 skipped (viewport-gated) / 0 failed, desktop and 400px mobile. Browser-to-Firestore-to-report round trip reconciled on the emulator: all 7 tracked routes in the page table, 7 CTA ids from real clicks, funnel in contract order, test mode reporting inquiries as not measured, real mode still empty. | Admin pages need a signed-in session, so the dashboard's new controls are verified by unit test, HTTP status and report-level reconciliation, not by a signed-in click-through. Two component behaviors (second-attempt reset, second booking from one mount) have no render harness in this repo and are read-verified only. |
| P6 Activation | BLOCKED — AUTHORIZATION REQUIRED | — | Nothing was deployed, no Firebase configuration was changed, no TTL policy was enabled, no real appointment, lead or customer email was created. All verification ran against a local build and a local emulator project (`demo-verify009`). |

## Findings fixed during review (P5)

Peer review of the three workstreams found, and this branch fixed:

- A test-mode dashboard showed the **real** inquiry total under the banner
  saying the data was not real. Leads carry no mode, so test mode now reports
  inquiries as not measured instead of borrowing the real number.
- Test mode could claim tracking had never started while showing non-zero
  tiles, because the "first event" sample was read across both modes. Status
  is now derived from the range being reported.
- `lead_saved` fired for dedupe-suppressed resubmissions, where the API
  answers `ok` but writes nothing.
- The funnel printed `schedule` above `review` although the scheduler opens
  last, so the table read as going back up.
- A superseded mode/range switch could land on a silent all-zero dashboard.
- A cmd/ctrl/shift-click on the hero and nav booking controls opened the
  welcome modal instead of the link.
- `TrackedCtaLink`/`TrackedCtaAnchor` required a `page` value the tracker
  never stores.

One unrelated defect was found by the browser suite and fixed: the booking
form's progress dots had lost their forward-validation gate in the redesign,
so a visitor could skip required steps.

## Master execution prompt for a multi-agent Codex coordinator

Copy the prompt below into a new Codex task opened on this repository.

```text
Implement plans/009-full-tracking-dashboard-integration.md from start to finish using coordinated subagents.

You are the root integration coordinator. Use built-in collaboration subagents, not separate user-owned tasks. Run at most three workers concurrently in addition to yourself. All agents share one filesystem, so enforce the plan’s file-ownership table. You alone own Git operations, shared analytics contracts, app/globals.css, Firestore helpers/rules, plans/docs, integration, final verification, and commits.

Before editing:
1. Read AGENTS.md completely.
2. Read plans/009-full-tracking-dashboard-integration.md completely.
3. Read plans/003-admin-dashboard-and-tracking.md, plans/003-analytics-preview-handoff.md, plans/004-frontend-tracking-coverage.md, plans/005-booking-first-onboarding.md, docs/analytics-operations.md, and the relevant production-readiness tracker sections.
4. Inspect both worktrees:
   - /Users/bballi/Documents/Repos/NotTheRug
   - /Users/bballi/Documents/Repos/NotTheRug-welcome-modal
5. Read the relevant installed Next.js 16.3.5 guides in node_modules/next/dist/docs before changing routes, layouts, searchParams, client/server boundaries, or route handlers.
6. Recheck branch refs, status, running processes, and baseline tests. Treat plan facts as dated evidence, not permission to overwrite newer work.

Execute the plan phase by phase and do not skip gates.

P0 and P1 are coordinator-only mutation phases. Preserve both dirty worktrees on recoverable codex/* checkpoint branches/commits before merging anything. Do not stash, reset, discard, overwrite, or clean user files. Leave main and feat/welcome-modal refs recoverable. Merge the full committed main foundation into the checkpointed integration branch; do not reproduce it by copying a shortlist of files. Preserve the redesigned welcome-modal UI while retaining main’s analytics, Firestore, auth, rules, errors, tests, and admin-shell behavior. Keep analytics at /admin/dashboard and the founder brief at /admin/dashboard/brief.

During P2, dispatch up to three read-only audit agents:
- Agent A audits rendered routes, nav/hero/footer/contact/neighborhood actions and pageview placement.
- Agent B audits BookingForm, WelcomeWalkModal, GroupWalkFeatureCard, SchedulingDialog, handoff state, and funnel semantics.
- Agent C audits report fields, dashboard states, test-mode handling, page aggregation, and admin regressions.

Collect their inventories, then you alone lock and commit TRACKED_ROUTES, CTA_IDS, LIVE_CTA_IDS, booking-step mappings, labels, and categories. Every live ID must map to a real rendered control; every selected real control must have one ID. Remove deleted routes and stale controls. Never store hashes, query strings, form values, or provider payloads.

After the P2 contract commit, run three implementation agents concurrently with the exact ownership in plan 009:
- Agent A implements public pageview and CTA instrumentation, excluding booking-owned files.
- Agent B implements booking, group-walk prefill, welcome-modal, and scheduler analytics with failure isolation and verified completion.
- Agent C implements report/dashboard completion, including page performance and a real/test URL control wired to the API.

Tell each agent not to commit, change branches, edit shared-contract/global-style/docs files, run global formatters, or touch another agent’s owned files. Require each to run focused tests and return: files changed, commands/results, assumptions, and unresolved risks. If a needed change crosses ownership, agents must message you instead of editing it.

Integrate their work yourself. Apply shared contract, global CSS, Firestore timestamp/TTL support, disclosure, docs, and cross-cutting fixes centrally. Keep raw events for 13 months and rate-limit records for 48 hours. Prepare TTL deployment commands but do not change a deployed Firebase project without explicit user authorization. Keep the manual protected cleanup route as a fallback.

Then run the review rotation from plan 009 using read-only peer reviews. Fix every concrete high- or medium-severity finding and repeat focused checks.

Run the full P5 verification matrix from the final candidate: lint, pipeline lint, typecheck, focused suites, full unit suite, Firestore emulator/rules tests, production build, ordinary Playwright, and tracking-enabled test-mode browser acceptance. Record exact pass/fail/skip counts. Never report a skip, mock, typecheck, or emulator check as preview/production proof. Do not weaken lint, types, auth, origin checks, assertions, or tests to obtain green output.

Privacy and correctness are non-negotiable:
- Analytics must never block navigation, lead persistence, scheduler progress, or callbacks.
- A scheduling-dialog open is not an appointment.
- Only the expected Calendly origin and intended iframe window may complete an appointment event.
- Appointments and inquiries remain separate.
- Sessions are not people.
- No email, phone, name, pet detail, form answer, free text, raw IP, full referrer, query string, arbitrary campaign, or provider payload may enter analytics storage.
- Test and real traffic must never be blended.
- Tracking remains off by default.

Do not deploy, enable production tracking, change live Firebase rules/TTL, create a real appointment, send customer email, or write/delete production leads without separate explicit authorization. Complete all safe local and emulator work first. When P6 is the only remaining phase, present one concise authorization request listing the exact external actions, targets, test data, cleanup, and rollback. After authorization, execute the approved preview/production sequence and verify the resulting state rather than assuming success.

Keep the execution tracker in plan 009 current after every phase. Make focused coordinator commits at phase gates. Do not rewrite or squash the P0 recovery history unless the user explicitly asks.

Final report requirements:
1. Checkpoint, merge, implementation, and documentation commit SHAs.
2. Changed behavior and final route/CTA/event contract.
3. Exact checks and pass/fail/skip counts.
4. What was verified by unit test, emulator, browser, preview, and production.
5. Privacy/storage inspection results.
6. Remaining blockers and which phase/gate they block.
7. Activation values, timestamp, rollback, and cleanup evidence if P6 was authorized.

Continue until every locally executable phase is complete and verified. Pause only for an explicit external-authorization gate or a genuinely unsafe ambiguity that cannot be resolved from the repository and locked decisions.
```
