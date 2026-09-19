# Admin dashboard and website tracking

Status: **SUPERSEDED FOR SEQUENCING by [009-full-tracking-dashboard-integration.md](009-full-tracking-dashboard-integration.md)** (September 18, 2026). Its privacy rules, metric definitions and owner decisions remain authoritative; its integration order does not. The route and CTA allowlists quoted below were re-locked in plan 009 P2 against the redesigned site — read `lib/analytics/events.ts` for the current list.

Updated September 15, 2026 against `865024e`. The implementation described below is now committed and merged into the booking-first site; it is still not deployed and tracking is still off by default.

## Purpose

Give the owner a useful view of website activity and inquiries, within the existing admin system. Add first-party website tracking backed by Firestore. Reuse the working booking, authentication, brief, photo, and generator features. Normalize admin navigation and styling to the homepage brand without redesigning those tools.

This replaces the pasted plan based on the pre-cleanup code. It does not replace [the production-readiness plan](002-production-readiness.md) or close its outstanding release gates.

## Interview and scope decisions

Already selected in the earlier discussion:

- Firestore is the analytics store; no third-party analytics platform is required.
- Reuse the homepage palette and typography. Keep data displays simple and readable.
- The earlier preference was analytics at `/admin/dashboard`, with the brief on `/admin/dashboard/brief`. The latter already exists; preserve its features during consolidation.
- Keep comments short and useful; avoid frameworks or dependencies introduced only for this feature.

Interview completed September 15, 2026. The decisions below are answered and locked; they
set the first-release scope. Anything not listed here is still out of scope.

| # | Question | Decision |
| --- | --- | --- |
| 1 | Primary metric | **Inquiries this period** (largest, first) paired with **inquiry rate** (visits to inquiries). Both above the fold. |
| 2 | Bounce rate | **Replaced with engaged-visit %.** A visit counts as engaged on meaningful scroll, dwell past ~15s, or any tracked click. Classic single-pageview bounce is not reported: on a brochure site a one-page read followed by a phone call is a success, not a bounce. |
| 3 | Live window | **Rolling 60-minute tile**, refreshed when the dashboard is loaded, alongside today / 7-day / 30-day. No background auto-polling. |
| 4 | Comparison | **Trend line only.** No prior-period percentage deltas. Direction is read off the chart shape. |
| 5 | Expected traffic | **Under ~100 visits/day.** Report directly from raw `analytics_events` with bounded date queries. **No rollup/aggregation layer in the first release** — it is not justified at this volume and adds partial-failure surface. Revisit if volume grows. |
| 6 | Tracked clicks | All four categories: booking CTAs, phone (tap-to-call), email/contact, and service/pricing links. Each needs a stable CTA id. |
| 7 | Conversion | **Inquiries saved and appointments scheduled, reported as two separate numbers. Never summed, never combined into one "conversions" figure.** Leads remain authoritative for inquiries. |
| 8 | Traffic sources | Referrer hostname, direct/unknown, **and** bounded campaign slugs for hand-out links. Campaign ids come from an allowlist; arbitrary UTM text is not ingested. "Direct" is labeled as including referrer-stripped sources. |
| 9 | `appointment_completed` | **Wire it.** Finish `lib/analytics/verifiedOrigin.ts` against the real Calendly iframe window, deduplicate repeated messages, store no provider payload fields. The funnel must not end at "dialog opened." |
| 10 | Activation | **Preview first**, isolated test namespace, proven end to end; production activation is a separate recorded step. Does not bypass the readiness gates in plan 002. |
| 11 | Admin footer | **Last data refresh time.** In scope, not optional — it distinguishes "zero activity" from "stale page left open." |

### Owner decisions settled after A6

- **Retention approved: 13 months for raw `analytics_events`, 48 hours for
  `analyticsRateLimits`.** The 13-month window is what makes a year-over-year
  read possible for a seasonal business; 48 hours is far past any rate-limit
  record's usefulness and closes the accumulation gap A6 documented. **The
  cleanup job is not implemented** — scheduling it is outstanding work, not a
  settled fact.
- **Campaign slugs: the `CAMPAIGN_SLUGS` allowlist in `lib/analytics/events.ts`
  is authoritative.** Any published link must use a slug exactly as listed
  there. An unlisted slug is dropped server-side and the visit reports as
  direct — silently, which is why this is written down rather than left to
  memory.
- **Visitor-facing disclosure: one short line near the booking form.** No
  dedicated privacy page for now. The copy must match what is implemented:
  cookie-free, no personal data stored, referrer reduced to a hostname.

### Implementation decisions taken by the coordinator

- **Route convention.** The repo has two (page-adjacent `app/admin/leads/route.ts` and API-namespaced `app/api/admin/*`). Analytics uses the API namespace for both: public `POST /api/track`, protected `GET /api/admin/analytics`.
- **No rollup layer** follows from decision 5. `analytics_events` is queried directly with bounded date ranges; this removes the create-plus-increment atomicity problem from the first release entirely.

Decisions about returning-browser identifiers, bounce/engagement definitions, retention, and lead-level attribution follow from these answers. Do not introduce cross-visit identification, session replay, or customer profiling by default.

## Current code: reuse and extend

| Existing part | What works / exists | Planned integration |
| --- | --- | --- |
| `lib/analytics/track.ts` | Five event names, payload sanitization, beacon transport, optional endpoint flag; no collection service. | Extend this tracker and its tests. Do not add a second snippet or parallel event system. |
| `components/marketing/TrackedCtaLink.tsx` | Shared tracked link; used in several marketing sections. Hero also calls `track()` directly. | Audit actual call sites and assign stable CTA IDs. One click must produce one event. |
| `components/booking/BookingForm.tsx` | Genuine form-start and post-success `lead_saved` events. Existing validation and submission flow. | Add step events and optional anonymous session attribution without changing qualification fields or the success flow. |
| `components/booking/SchedulingDialog.tsx` | Reports scheduling dialog opened; handles focus and scrolling. | Add a listener for provider-reported scheduling only if selected. Opening the dialog is not a booking. |
| `lib/analytics/verifiedOrigin.ts` | Checks Calendly origin and event name. Not connected to the dialog. | Extend checks to the actual iframe window; deduplicate repeated messages. Do not store provider payloads containing customer data. |
| `components/admin/AdminSession.tsx`, `AdminGuard.tsx` | Shared session and denied/error states, currently mounted within individual pages. | Reuse in a common dashboard shell; remove duplicate provider mounts when migrated. Keep login accessible outside the dashboard guard. |
| `components/admin/adminFetch.ts` | Bearer-token requests, typed response errors, cancellation helpers. | Use for the new reporting endpoint and refresh/error states. |
| `lib/server/verifyAdmin.ts`, `lib/server/errors.ts` | Server authorization and sanitized errors. | Protect analytics reads using the same boundary. Public ingestion gets its own strict validation. |
| `lib/server/firestoreRest.ts` | Get/set/create, atomic field increment, bounded collection query, emulator support. | Reuse transport. Add only the range/cursor/atomic operation primitives required by analytics. Create plus a separate increment is not an atomic deduped aggregate. |
| `lib/leads/contract.ts`, `lib/leads/stats.ts` | Shared lead contract, daily/source breakdown, bounded recent records. | Leads remain the truth for saved inquiries. Existing stats cap at 1,000 records; do not rename that count “all time.” Add range-aware reporting if needed. |
| `components/admin/dashboard/*` | Existing brief overview, history and summary components. Dashboard page is now 426 lines, not 1,668. | Reuse these in the dedicated brief workspace; inventory features before replacing the landing page. |
| `app/admin/dashboard/brief/page.tsx` | Already has brief content/history/preview. | Consolidate useful overview features here; retain generation, downloads, history and founder-email preview links. |
| `app/(marketing)/layout.tsx` | Public-route boundary separate from admin. | Mount one lightweight pageview observer here, not globally around admin and APIs. |
| `app/globals.css` | Current paper/ink/olive/sage tokens and loaded type variables. | Map a scoped admin token layer to these actual variables. Do not assume the old font-token names are correct. |
| Vitest, Playwright, Firebase emulator tests | Existing test infrastructure, including analytics sanitization and booking events. | Extend the suites; no second test framework. |

`vercel.json` currently has no scheduled jobs. This feature must not accidentally re-enable brief generation or assume an existing aggregation cron is running.

## Proposed owner experience

Subject to interview answers, the home should answer three questions:

1. Is the website bringing in inquiries?
2. Which sources, pages, and calls to action contribute?
3. Where do people stop in the booking process?

Start with a date selector, four clear summary numbers, a simple daily trend, a source table, a click table, and a booking funnel. Link inquiry counts to the existing Leads page. Keep Brief, Photos, Generator, and founder-email preview reachable from the shared navigation.

Show “Tracking starts on [date]” for new analytics. Historical lead totals may exist before that date; do not imply matching traffic history. Distinguish zero activity, tracking disabled, loading, stale data, and a failed request. Do not show fabricated chart data in production.

## Measurement definitions

| Measure | Source and meaning |
| --- | --- |
| Pageviews | One actual public-route view, including client navigation; exclude prefetch and duplicate effects. Only allowlisted route paths, no query strings or hashes. |
| Visits / sessions | Approximate browsing sessions under a documented session lifetime. Session storage does not identify unique people or reliably deduplicate tabs. Never label these “unique visitors.” |
| CTA clicks | Stable ID plus route: booking, phone, email and other selected actions. A phone click is intent, not proof of a completed call. |
| Form starts / steps | First actual form interaction and first reach of each named step per attempt. Repeated back/forward navigation must not inflate funnel counts. No input values or validation text. |
| Inquiries saved | Authoritative persisted lead records, including untracked inquiries. Client `lead_saved` remains a diagnostic event, not the source for this business total. |
| Scheduling opened | Existing dialog-open event. Separate the phone-consultation path so skipping Calendly is not reported as abandonment. |
| Appointments reported scheduled | Valid message from the embedded scheduler, if implemented. This is not proof of attendance, payment, or future cancellation status. Server reconciliation is separate scope. |
| Traffic source | Session entry attribution: approved campaign identifiers, otherwise external referrer hostname, otherwise direct/unknown. “Direct” may include sources whose referrer was withheld. |
| Conversion rate | Only a matched, deduplicated tracked-session cohort with a defined denominator. Display total inquiries separately, since tracking can be blocked. Do not divide all saved leads by partial tracked traffic and call it an accurate conversion rate. |

Use `America/New_York` for business day boundaries, consistent with lead stats. Define whether a metric is grouped by event time or session start before implementing comparisons. Counts of distinct sessions/visitors must not be obtained by summing overlapping unique counts.

Returning visitors, all-time unique visitors, and revenue attribution remain out of scope. Classic bounce rate is explicitly rejected in favour of engaged-visit % (decision 2).

## Tracking and storage design constraints

- Keep a single same-origin `POST /api/track` collection endpoint and a protected `GET /admin/analytics` reporting endpoint, following existing route conventions.
- Default tracking to off outside the intended production host. Provide a separate explicit test mode/namespace for preview acceptance. Do not mix preview and real business traffic.
- Keep current tracker calls compatible. Fix transport details: sendBeacon can return false; fetch rejection must be caught; unload-safe delivery is best effort. Analytics must never delay navigation or prevent a booking save.
- Define a narrow event union and allowed fields shared by client/server. Validate it again on the server, along with bytes, bounded batch size, timestamps, IDs, routes, CTA IDs and campaign IDs. Do not accept arbitrary object spreads.
- Use server receipt time as the reporting authority. Deduplicate by event ID across retries. Handle partial failure between event persistence and aggregation through atomic writes or a replayable aggregation design, verified in the emulator.
- Keep raw events in `analytics_events`; choose the smallest necessary session/rollup collections once metrics are confirmed. Reporting must use bounded date queries and summaries, not unbounded scans of all historical events. Indexes, retention and cleanup are part of the feature.
- Existing Firestore rules deny direct client access by default. Retain that policy for analytics; public visitors submit through the validated server endpoint only. Admin SDK operations bypass rules, so endpoint controls are essential.
- Add persistent ingestion rate limits, same-origin request checks where applicable, a payload cap and an emergency tracking switch. Origin checks alone do not stop scripted abuse. Filter obvious bots without claiming perfect human counts. Document whether suspicious events are excluded or rejected.
- Exclude admin routes, local/preview activity and an explicit owner test mode. Public tracking must not import Firebase Auth simply to identify the owner. Session identifiers are pseudonymous; cookie-free is not a promise of anonymity.
- Never retain raw IPs, full referrer URLs, arbitrary query strings, contact details, pet details, free text, or Calendly payloads as analytics dimensions. Use bounded campaign slugs; do not ingest arbitrary UTM text. Any rate-limit identifiers must be short-lived and separate from reporting.
- Reuse and tighten the sanitizer tests, but prefer an allowlist over trying to detect every possible personal value with regexes. Update the site's short tracking/data-handling explanation to match what is implemented.
- Saved inquiry counts work when tracking is disabled. If attribution is selected, add optional bounded attribution fields to the lead contract; historical records and existing callers stay compatible. Failure of the analytics write must not fail the saved inquiry.
- Define a modest retention policy and estimate reads/writes from expected traffic before activation. No new paid service or broad analytics infrastructure is assumed. Do not quote costs without checking current platform pricing.

## Current execution status

The following status is based on the latest implementation report and the current
working tree. It is not evidence of a deployed preview or production behavior.

| Area | Implementation | Local verification | Preview / production | Remaining evidence |
| --- | --- | --- | --- | --- |
| Shared admin chrome and dashboard | Present | Code/tests reported clean | Not viewed in an authenticated browser | Responsive, keyboard and visual review |
| Public event collection | Present | Firestore emulator round trip, hostile payload, dedupe and rate-limit checks reported | Tracking off; no real browser event collected | Tracking-enabled preview browser run |
| Funnel and Calendly event | Present | Unit/emulator checks reported | No real Calendly or preview run | Provider configuration and real scheduled-event check |
| Analytics reporting | Present | Emulator report/read checks reported | No authenticated preview dashboard check | 401/403/500 and owner-facing browser check |
| Activation controls and operations notes | Present | Kill-switch and test-mode checks reported | No environment activated | Preview configuration, data retention decision, operational owner |

Current test report: 278 passing and 49 explicitly skipped when the emulator
is unavailable; 327 passed with the Firestore emulator running. Re-run these
checks from the final committed candidate before treating them as release
evidence. The tracker in plan 002 remains the source of truth for the wider
production release.

## Decisions needed before preview activation

These answers control external configuration or the meaning of data. They do
not block a commit, code review, or local work.

| Decision | Why it matters | Recommended starting point |
| --- | --- | --- |
| Preview Firebase project | Test analytics and synthetic leads must not enter a real customer dataset. | Use a separate Firebase project, with its own client/admin credentials and Firestore rules deployment. |
| Canonical public host | `PUBLIC_BASE_URL`, canonical tags, Open Graph URLs, allowed origins and production analytics all depend on the actual host. | Attach the intended domain before public indexing; use the preview URL only for preview test mode. |
| Approved test recipient | Preview lead/email verification needs one inbox that may safely receive test messages. | A dedicated owner-controlled test address, never a customer address. |
| Data retention | Raw analytics events and rate-limit documents currently have no automatic expiry. | Keep raw analytics events for 13 months; delete rate-limit documents after 48 hours. Confirm before enabling real collection. |
| Launch campaigns | Campaign slugs are deliberately allowlisted, so the dashboard needs the first real distribution channels. | Start with `instagram-bio`, `google-business`, `yelp`, and `flyer-qr` only if those links will actually be used. |
| Operating owner | Someone needs to notice a disabled tracker, failed inquiry email, or unusual traffic. | Name one person for weekly dashboard and error review. |
| Visitor-facing disclosure | Tracking is pseudonymous first-party measurement, not anonymous by default. | Add a short collection/use statement near the form or in a privacy page before activation. |

## Phased implementation and tracker

Planning status: **A0 complete. A1-A5 are implemented in the uncommitted working tree; A6 is locally emulator-verified but has not passed preview acceptance.**

| ID | Phase | Reuse / changes | Completion evidence |
| --- | --- | --- | --- |
| A0 | Confirm owner needs and contracts | Interview; event/metric definitions; route and data contracts. | **Done — see the locked decision table above.** |
| A1 | Shared admin shell | Implemented: `AdminShell`, `AdminNav`, `AdminFooter`, scoped admin stylesheet and page migration. | Pending authenticated responsive/keyboard/visual browser review. |
| A2 | Collection foundation | Implemented: public-layout observer, `POST /api/track`, validation, dedupe, rate limit, rules and tests. | Emulator verified; pending tracking-enabled browser on a preview. |
| A3 | Funnel and source integration | Implemented: selected CTA/form/funnel events and Calendly completion listener. | Pending real provider configuration and preview behavior. |
| A4 | Reporting service | Implemented: bounded raw-event reporting and protected endpoint. | Emulator verified; pending authenticated preview route behavior. |
| A5 | Owner dashboard and brief consolidation | Implemented: analytics dashboard and brief component consolidation. | Pending visual/interaction review and confirmation no brief action regressed. |
| A6 | Preview acceptance and activation | Local emulator acceptance completed. | Not started on a deployment; requires the decisions above and a committed candidate. |

Order: A0 first. A1 and A2 can run independently with separate file ownership. A3 follows A2. A4 uses the agreed A0 contract and is integrated after A2/A3. A5 follows the shell/reporting service. A6 verifies the combined result.

If agents execute this plan, one coordinator owns shared config, the Firestore adapter, rules/indexes, lead contract changes and this tracker. An admin worker owns A1/A5; a collection worker owns A2/A3; a reporting worker owns A4. Workers request shared changes rather than editing the same files. Do not install dependencies underneath another running session.

The current production plan still owns the reported public overflow failures, booking retry race, and external preview gates. Recheck their status before editing booking/layout code. This plan must not disguise those defects as analytics work. Planning and isolated admin work can proceed, but feature activation does not bypass readiness checks.

## Acceptance checklist

Checked items below were verified against a **running Firestore emulator**
during A6 (`tests/unit/analytics-emulator-roundtrip.test.ts`,
`tests/unit/analytics-rate-limit-fail-open.test.ts`,
`tests/unit/rules-analytics.test.ts`) — see `docs/analytics-operations.md`'s
"Verification performed for this release" section for the full list of what
was checked. Unchecked items were not verified by A6, either because they
are outside this phase's scope (owner sign-off, admin UI/visual checks) or
because the environment could not support the check (see notes) — they are
left unchecked deliberately rather than assumed.

- [ ] Owner scope and metric definitions confirmed. — Answered in the locked A0 decision table; not re-verified by A6 (a business confirmation, not a testable claim).
- [ ] Existing authentication, leads, brief/history/email preview, photos and generator remain functional. — The full existing unit suite (327 tests: 278 passed plus 49 emulator-gated skips, including these areas' own tests) passes and `tsc --noEmit` is clean, which is consistent with no regression, but A6 did not perform a manual UI walkthrough of these features.
- [ ] Shared admin navigation and scoped palette changes pass responsive and keyboard checks. — Out of A6's scope (A1/A5 owns this); not checked here.
- [x] Public pageviews and selected interactions reach Firestore using the existing tracker. — Verified: every event type (page_view, engagement, cta_click, booking_form_start, booking_step, lead_saved, scheduling_dialog_opened, appointment_completed) posted through the real route handler and read back correctly via the real reporting service, against a live emulator.
- [x] Duplicate delivery and concurrent writes do not inflate reports; partial writes are recoverable. — Verified: sequential and concurrent duplicate posts of the same event id produce exactly one stored document; the rate limiter's fail-open path (a dependency write failing without blocking ingestion) was also exercised.
- [ ] Saved inquiries remain correct with tracking blocked, unavailable or disabled. — Partially covered: the kill switch (`ANALYTICS_TRACKING_DISABLED=true`) was verified to write nothing on the analytics side, and the full leads test suite (independent of analytics) passes. Not directly exercised: submitting a lead while analytics itself is actively failing/unavailable.
- [x] Admin reporting is authenticated; public analytics cannot read data or write arbitrary fields. — Verified: `firestore.rules` denies direct client-SDK read/write of `analytics_events` and `analyticsRateLimits` (including for a signed-in non-admin account), and hostile payloads posted at the public route were confirmed absent from the actual stored documents. The GET route's 401/403/500 auth boundary itself is pre-existing, mocked-Firestore coverage (`tests/unit/admin-analytics-route.test.ts`), not newly re-verified against a live server by A6.
- [x] Funnel/source calculations use clear cohorts, ranges and New York day boundaries. — Verified: funnel/source numbers from a full round-trip session, plus dedicated tests for the exact NY-midnight boundary and both 2026 DST transitions, all against real Firestore range queries.
- [x] Test traffic, bot limitations, retention, operational controls and privacy text are documented. — Verified in part: test-mode isolation (both directions), bot/missing-User-Agent filtering, and the kill switch were all proven against the emulator; retention and operational guidance written up in `docs/analytics-operations.md`. The site's own visitor-facing privacy/data-handling copy was not audited by A6.
- [ ] No production widget invents history, presents a capped count as all time, or labels sessions as people. — A UI/copy check (A5 dashboard scope); not checked here. Code-level review only: `lib/analytics/report.ts`'s types and comments consistently call these "sessions," never "people" or "unique visitors."
- [x] A preview proves actual event collection and reporting before enabling production tracking. — Verified against a local Firestore emulator standing in for an isolated test namespace (not a deployed Vercel preview URL — none was created during this pass). A gated Playwright E2E test for a real-browser page_view exists (`tests/e2e/analytics-pageview.spec.ts`) but could not be run for real without rebuilding the already-running production server on port 3000; see that file and `docs/analytics-operations.md` for how to run it for real against a tracking-enabled build.

## Explicitly outside the initial build

Session replay, heatmaps, fingerprinting, ad-platform integration, a new CRM, payments/revenue reporting, AI-written performance recommendations, a second authentication system, and re-enabling scheduled paid brief generation. (The admin footer is in scope — see decision 11.)

## Planning evidence

Read the installed Next.js guides for layouts/pages and Route Handlers in `node_modules/next/dist/docs/`. The implementation agent must reread the relevant installed guidance before code changes, per `AGENTS.md`.

This plan is based on code inspection, not a fresh execution of the previous agent's tests. No live Firebase, email, analytics, deployment, or paid generation calls were made while preparing it.
