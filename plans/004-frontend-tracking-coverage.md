# Frontend tracking coverage plan

Status: **PLANNED.** This is an instrumentation pass on top of the uncommitted analytics foundation described in [003-admin-dashboard-and-tracking.md](003-admin-dashboard-and-tracking.md). It does not enable tracking, deploy, or replace the remaining preview gates.

## Goal

Populate the admin analytics dashboard with useful, privacy-bounded evidence of how visitors move through the marketing site and booking flow. Track real conversion-intent interactions only: route views, engaged visits, booking entry points, contact actions, service discovery, inquiry progress, saved inquiries, and completed appointments.

Do not create synthetic events for static cards, hidden sections, dead controls, prefetches, admin pages, or interactions the site does not actually offer. A missing dashboard row must mean "not measured" rather than falsely implying zero clicks.

## Constraints and source of truth

- Reuse the existing first-party tracker, event endpoint, Firestore collections, session logic, dashboard report, and test setup. Do not add a second analytics provider or SDK.
- Preserve the current working tree. The analytics/dashboard implementation is local and uncommitted; review and extend it in place without reverting or duplicating it.
- Keep event names, routes, CTA IDs, campaign slugs, and payload validation centralized in `lib/analytics/events.ts`.
- Store no form values, contact details, pet details, raw referrer URLs, query strings, scheduler payloads, IP addresses, or arbitrary UTM values.
- Analytics is best effort. It must never delay navigation, block a call/email link, or change booking success and failure behavior.
- Keep components small and semantic. Use one reusable tracked internal-link component and one reusable tracked anchor/action component where their semantics differ. Do not turn page sections into client components merely to record a click.
- Keep comments limited to non-obvious browser, privacy, or event-deduplication behavior.

## Definition of done

1. Every allowlisted public route emits one page view per client navigation and can emit one engaged-visit event per session/route under the established dwell, scroll, or meaningful-click rules.
2. Every visible conversion-intent link has a stable, documented CTA ID and produces one `cta_click` without changing its native behavior.
3. Booking form start, each first-reached step, saved inquiry, scheduling-dialog open, and provider-confirmed appointment remain distinct and deduplicated.
4. The dashboard receives meaningful page, source, CTA, funnel, inquiry, and appointment data from a tracking-enabled **test-mode** browser run against an isolated Firebase environment.
5. Tests prove the event contract, click IDs, duplicate prevention, accessibility-preserving link behavior, and no data leakage. Preview and production activation remain separate release actions.

## Measurement contract

### Events that already exist and must be retained

| Event | Meaning | Dashboard use |
| --- | --- | --- |
| `page_view` | Allowlisted marketing route displayed after initial load or client navigation. | Pages, sessions, inquiry rate denominator. |
| `engagement` | First meaningful scroll, 15-second dwell, or tracked click. | Engaged-visit percentage. |
| `booking_form_start` | First real interaction with a booking form. | Funnel entry. |
| `booking_step` | First reach of each named step for that attempt. | Funnel drop-off. |
| `lead_saved` | Booking API successfully persisted an inquiry. | Diagnostic funnel event only; lead records remain the business source of truth. |
| `scheduling_dialog_opened` | Scheduling path was opened. | Distinguishes scheduler intent. |
| `appointment_completed` | Valid, deduplicated scheduler completion signal. | Appointments scheduled, separate from inquiries. |

### CTA taxonomy to complete

Use `cta_click` for the following deliberate actions. IDs are examples of the final contract; add an ID only when its corresponding element exists in the rendered UI.

| Category | Existing visible interactions to instrument | Suggested stable IDs | Notes |
| --- | --- | --- | --- |
| Booking | Desktop nav, mobile nav, hero, closing section, Williamsburg detail, footer. | Keep current `nav_book`, `mobile_menu_book`, `hero_book`, `closing_trust_book`, `neighborhood_detail_book`, `footer_book`. | Verify each emits exactly once. |
| Contact navigation | Mobile nav Contact, Williamsburg detail Contact, footer Contact if present. | Keep `nav_contact`; add `neighborhood_detail_contact` and `footer_contact` only for rendered links. | A route to `/contact` is contact intent, not email. |
| Phone | Contact card and actual `tel:` links on service/footer content. | Keep `contact_phone`; add source-specific IDs only when there are distinct rendered links worth comparing. | A tap-to-call is intent, not a completed call. |
| Email | Contact card and actual `mailto:` links on service/footer content. | Keep `contact_email`; add source-specific IDs only for real links. | Preserve the native mail client action. |
| Service discovery | Hero “View Services”, top-level Services navigation, and one intentional footer services entry if present. | Add `hero_view_services`, `nav_services`, `footer_services`. | This measures service discovery. Static service cards are not clicks. |
| Optional outbound proof | Yelp, Google, Instagram only if the owner wants outbound-proof data in the dashboard. | `hero_yelp`, `hero_google`, `contact_instagram`. | Keep out of the initial dashboard table unless a report section is added. |

Do not retain the current “reserved” CTA IDs as live dashboard choices. During implementation, either remove IDs with no rendered element or keep a separate documented future list outside the accepted event union. The report must use `LIVE_CTA_IDS` (or an equivalent single source) so it never renders nonexistent controls as zero-result rows.

### Final CTA inventory (locked, T1/T5)

`CTA_IDS` in `lib/analytics/events.ts` now holds exactly 16 ids, one per
rendered element, and `LIVE_CTA_IDS === CTA_IDS` — the two can no longer
diverge. The nine stale reserved ids (`services_book`, `how_it_works_book`,
`reviews_book`, `nav_phone`, `footer_phone`, `footer_email`,
`home_service_card`, `home_pricing_card`, `services_pricing_card`) were
removed from the contract entirely, not just filtered out of the report.

| Group | ID | Owner label | Surface |
| --- | --- | --- | --- |
| Booking | `nav_book` | Top nav: Book | Desktop top navigation |
| Booking | `mobile_menu_book` | Mobile menu: Book | Mobile navigation menu |
| Booking | `hero_book` | Homepage hero: Book | Homepage hero |
| Booking | `closing_trust_book` | Homepage closing section: Book | Homepage closing/trust section |
| Booking | `neighborhood_detail_book` | Williamsburg page: Book | Williamsburg neighborhood page |
| Booking | `footer_book` | Footer: Book | Site footer |
| Contact | `nav_contact` | Mobile menu: Contact | Mobile navigation menu |
| Contact | `footer_contact` | Footer: Contact | Site footer |
| Contact | `neighborhood_detail_contact` | Williamsburg page: Ask about coverage | Williamsburg neighborhood page |
| Phone | `contact_phone` | Contact page: Phone tap | Contact page contact card |
| Phone | `services_phone` | Services page: Phone tap | Services page |
| Email | `contact_email` | Contact page: Email tap | Contact page contact card |
| Email | `services_email` | Services page: Email tap | Services page |
| Service discovery | `hero_view_services` | Homepage hero: View services | Homepage hero |
| Service discovery | `nav_services` | Top nav: Services | Desktop top navigation |
| Service discovery | `footer_services` | Footer: Services | Site footer |

Full id → label → route/surface → destination table lives in
`docs/analytics-operations.md` ("What gets measured"). The dashboard's owner
labels and grouping are derived from `LIVE_CTA_IDS` via
`components/admin/analytics/ctaLabels.ts`, typed so an id added without a
label/group is a compile error. Outbound proof links (Yelp, Google,
Instagram) remain deliberately excluded from this release per the default in
this section.

## Route-by-route coverage matrix

| Route / shared surface | Required instrumentation | Explicit non-events |
| --- | --- | --- |
| Marketing layout | Existing page view and engagement observer for every allowlisted route. | Admin, API, local unknown paths, query strings, hash changes. |
| Global desktop navigation | Book CTA, Services navigation; preserve page context. | Passive hover, prefetch, logo unless a business decision adds it. |
| Global mobile navigation | Book CTA, Contact navigation, Services navigation; close menu exactly as it does today. | Menu open/close unless navigation usability is later studied. |
| Homepage hero | Book and View Services. | Static proof text and visual decoration. |
| Homepage closing / neighborhood sections | Existing book CTA and any visible Contact link. | Non-interactive trust copy. |
| Homepage service preview | No click event while cards are static. Instrument only if a real card/link is introduced for product reasons. | Card impressions and fabricated pricing clicks. |
| Services | Existing embedded booking funnel; real phone, email, and Contact links; any genuine Services-to-book CTA. | Form field values, static service descriptions. |
| Book | Existing form funnel and scheduler lifecycle. | Validation errors and form contents. |
| Contact | Existing form funnel and phone/email actions; outbound social only if selected. | Contact data entered into fields. |
| Williamsburg detail | Book and Contact calls to action. | Static coverage and pricing copy. |
| About, How It Works, Reviews, Safety | Page view/engagement and shared nav/footer interactions. | New conversion buttons added solely to make analytics look fuller. |
| Footer | Existing Book action plus one real services/contact destination if rendered. | Each duplicate service deep link unless source-level detail has a stated decision use. |

## Phased execution

### T1 — Audit the rendered interaction inventory

**Owner:** one coordinator. **Do not edit shared event constants yet.**

1. Inspect every marketing route at desktop and mobile breakpoints. Record each rendered internal link, `tel:`, `mailto:`, external action, booking form, and scheduling path.
2. Compare that inventory to `CTA_IDS`, `LIVE_CTA_IDS`, current `track()` calls, and dashboard CTA labels.
3. Write the final CTA table in this document and `docs/analytics-operations.md`: ID, user-facing label, route/surface, destination/action, and whether it appears in the initial report.
4. Decide whether outbound review/social clicks are first-release metrics. Default: exclude them from dashboard reporting until they answer a specific business question.
5. Confirm no CTA is duplicated by a parent click handler, navigation listener, or React development behavior.

**Exit evidence:** reviewed coverage matrix; one agreed final identifier list; no invented interaction to satisfy a metric.

### T2 — Normalize small tracking primitives

**Owner:** frontend instrumentation worker. **File ownership:** `components/marketing/TrackedCtaLink.tsx`, any new adjacent tracking primitive, and focused unit tests.

1. Keep `TrackedCtaLink` for Next.js internal navigation.
2. Add a small tracked anchor/action primitive for `tel:`, `mailto:`, and external URLs so it renders a semantic `<a>` rather than relying on Next Link behavior for non-page destinations.
3. Preserve consumer `onClick`, keyboard activation, target/rel attributes, modified-click behavior, and destination. Tracking failure must be ignored.
4. Accept only the shared `CtaId` type, not arbitrary strings. Pass display/source context only if the existing sanitized event contract allows it.
5. Ensure a CTA click marks engagement through the existing tracker once, rather than emitting a separate engagement event from components.

**Exit evidence:** focused tests prove internal, mail, phone, and external link rendering; each valid activation calls the tracker once with an allowlisted ID.

### T3 — Instrument real surfaces

**Owner:** frontend instrumentation worker. **Coordinate before touching shared `SiteNav`, `SiteFooter`, or event constants.**

1. Apply the audited CTA IDs to `SiteNav`, `SiteFooter`, `HomeHero`, `ClosingTrust`, `NeighborhoodDetail`, `ContactInfoCard`, and `ServicesPageContent`.
2. Keep Server Components as Server Components by using the reusable client leaf components.
3. Do not add a new CTA to About, Reviews, Safety, or How It Works only for measurement. If a product decision later introduces a conversion action, add its ID and test in the same change.
4. Reconcile `CTA_IDS` and `LIVE_CTA_IDS` with the resulting markup. Remove stale reserved IDs from the live contract, report labels, and tests.
5. Keep all route/page context canonical using the allowlisted pathname. Never read or emit query parameters.

**Exit evidence:** every row in the final coverage matrix maps to a real element, a typed ID, and a single event emission.

### T4 — Protect the booking and scheduling funnel

**Owner:** booking worker. **File ownership:** `components/booking/*`, corresponding funnel tests only.

1. Reconfirm the form records a start only after genuine user interaction, each step only once per attempt, and `lead_saved` only after the successful API response.
2. Verify navigation back and forward, validation failures, retry, and cancellation do not inflate steps or saved-lead counts.
3. Verify scheduling dialog open is distinct from a provider-confirmed completion; bind the completion listener only to the intended iframe/window and continue to discard provider payload fields.
4. Ensure a booking succeeds even if tracking is disabled, rejected, rate limited, offline, or throws.

**Exit evidence:** existing funnel and scheduling tests pass, with regression cases for duplicate clicks/messages and analytics failure isolation.

### T5 — Align reporting and operator documentation

**Owner:** reporting coordinator. **File ownership:** `lib/analytics/events.ts`, dashboard CTA labels/report mapping, `docs/analytics-operations.md`, this plan.

1. Make dashboard CTA labels derive from the same live-ID definition used by instrumentation. Label the action in owner language, for example “Hero: View services,” rather than exposing code IDs.
2. Do not display rows for UI elements that do not exist. Show a clear empty state until a real event arrives.
3. Verify service-discovery events are visible in the CTA table, booking and contact actions are categorized clearly, and form/scheduler events remain in the funnel instead of being double-counted as clicks.
4. Update the operations document with the final event dictionary, test-mode procedure, expected low-volume behavior, and a short troubleshooting guide for “dashboard is empty.”
5. Confirm visitor-facing tracking language accurately says first-party, cookie-free measurement with no form contents stored, if that copy is part of the current launch scope.

**Exit evidence:** a reviewer can trace each dashboard row back to a typed event and visible site action without reading component internals.

### T6 — Verify with isolated test traffic

**Owner:** release coordinator. Do this after all code is committed as one candidate; do not mix it with real customer data.

1. Run typecheck, lint, focused analytics/CTA/funnel tests, then the whole existing suite. Run Firestore rules and emulator tests with the emulator available.
2. Create a tracking-enabled build using `NEXT_PUBLIC_ANALYTICS_ENABLED=true` and `NEXT_PUBLIC_ANALYTICS_TEST_MODE=true`, pointed at an isolated preview Firebase project or emulator. Do not use production credentials.
3. In a real browser, complete this script once per clean session: visit Home, open Services, use a booking CTA, begin and advance the booking form, submit a known test inquiry, open the scheduler, and complete the provider test path when configuration allows. Also activate phone/email/contact actions without needing to complete a call or send email.
4. As an authenticated admin, check the dashboard: page views, engaged sessions, source, CTA rows, funnel counts, inquiry total, and appointment count must agree with the script. Confirm test-mode data stays out of normal reporting.
5. Inspect browser console/network and Firestore documents for duplicated events, rejected events, query strings, full referrers, or personal data. Test the server kill switch and confirm booking still works.
6. Perform desktop and mobile keyboard checks: links remain reachable and native actions are preserved.

**Exit evidence:** saved browser results/screenshots or recorded counts; one test-mode dashboard report; test output from the final commit; no production collection enabled.

### T7 — Preview handoff and production activation

This phase is owned by the broader release plan, not this implementation pass.

1. Commit the completed instrumentation separately from unrelated cleanup where practical.
2. Complete the preview checklist in [003-analytics-preview-handoff.md](003-analytics-preview-handoff.md), including canonical host, isolated Firebase project, rules deployment, and a real dashboard review.
3. Only then enable production tracking with the approved environment values, verify a controlled owner visit, and record the activation date so the dashboard does not imply historical coverage.
4. Set the 13-month events and 48-hour rate-limit cleanup mechanism before long-term production collection, as already approved in plan 003.

## Test matrix

| Layer | Required proof |
| --- | --- |
| Contract | Unknown route/CTA/campaign and extra fields are rejected; only allowed event-field combinations persist. |
| Components | Every final CTA ID is emitted once by its visible element; `tel:`, `mailto:`, external, and internal links retain their correct semantics. |
| Funnel | First interaction/step semantics; saved inquiry after real success; calendar message origin/window/deduplication; analytics failure cannot fail a lead. |
| Reporting | Live CTA IDs map to owner labels; absent elements do not render as zero rows; source/page/funnel totals use the established New York business-day rules. |
| Browser + emulator | Tracking-enabled test-mode journey writes events and renders expected dashboard counts. |
| Regression | Typecheck, lint, full tests, Firestore rules tests, existing booking journey, mobile/desktop overflow checks already open in plan 002. |

## Work tracker

| ID | Task | Status | Completion evidence |
| --- | --- | --- | --- |
| T1 | Audit actual rendered interactions and lock final CTA inventory | DONE | `CTA_IDS` locked to 16 ids in `lib/analytics/events.ts` with `LIVE_CTA_IDS === CTA_IDS`; nine stale reserved ids removed. Final inventory recorded above and in `docs/analytics-operations.md`. |
| T2 | Normalize internal-link and anchor tracking primitives | PLANNED | Focused unit tests. |
| T3 | Wire real marketing CTAs and remove stale live IDs | PLANNED | Route matrix and component tests. |
| T4 | Recheck booking/scheduler funnel isolation | PLANNED | Funnel regression tests. |
| T5 | Align dashboard labels, empty states, and operating docs | DONE | `components/admin/analytics/ctaLabels.ts` adds a typed `CTA_LABELS: Record<CtaId, string>` + exhaustive category map, derived from `LIVE_CTA_IDS`; `CtaTable.tsx` groups by Booking/Contact/Phone/Email/Service discovery instead of one flat sorted list and drops the dead "Not Yet Instrumented" section (unreachable now that `LIVE_CTA_IDS === CTA_IDS`); `emptyReport.ts` verified/comment-corrected to zero-fill all 16 live ids; `docs/analytics-operations.md` updated with the event dictionary, CTA reference table, low-traffic expectations, and a short "dashboard looks empty" section. Confirmed booking/scheduler events stay funnel-only (distinct event names from `cta_click`, never in `CTA_IDS`). `npx tsc --noEmit` exit 0; `npx vitest run tests/unit` exit 0 (33 files passed, 278 tests passed, 49 skipped). |
| T6 | Run isolated tracking-enabled browser/emulator acceptance | PLANNED | Recorded test-mode dashboard evidence. |
| T7 | Follow preview/release activation gates | BLOCKED BY RELEASE DECISIONS | Preview acceptance and activation record. |

## Master prompt for an execution agent

```text
You are implementing the frontend tracking coverage plan in the NotTheRug repository. Read AGENTS.md, the installed Next.js documentation relevant to every file you change, plans/003-admin-dashboard-and-tracking.md, plans/003-analytics-preview-handoff.md, plans/004-frontend-tracking-coverage.md, and docs/analytics-operations.md before editing.

Goal: complete the planned frontend instrumentation so the existing first-party Firestore analytics dashboard receives useful, privacy-bounded events from actual public-site interactions. Reuse the current uncommitted analytics implementation. Do not replace it, add a third-party analytics SDK, enable production tracking, deploy, push, or discard unrelated working-tree changes.

Work in order:
1. Audit the rendered marketing routes at desktop and mobile widths. Produce the final CTA inventory from real elements only.
2. Keep a typed shared event contract in lib/analytics/events.ts. Remove stale reserved IDs from the live dashboard contract; never show nonexistent UI as a zero-count row.
3. Use a small tracked Next Link leaf for internal navigation and a semantic tracked anchor leaf for tel:, mailto:, and external URLs. Preserve user handlers, keyboard behavior, modifier clicks, destination, rel, and target. Never block navigation if tracking fails.
4. Instrument only the actions in the coverage plan: real booking CTAs, contact routes, phone/email actions, and service discovery links. Do not manufacture events for static cards, hovers, hidden content, or generic page chrome.
5. Preserve the existing booking and Calendly funnel semantics: actual form start, once-per-step, lead_saved after persistence, dialog open separate from confirmed appointment, no provider payload stored, analytics failure cannot affect lead submission.
6. Align dashboard labels and docs with the final live IDs. Use owner-readable labels and honest empty states.
7. Add focused tests, run typecheck/lint/full relevant suite and emulator/rules tests. Then run a tracking-enabled test-mode browser journey only against an isolated emulator or preview Firebase project. Verify data appears in the authenticated dashboard and no PII/query/referrer path is stored.

Implementation standards: small components; server components stay server components where possible; no dependency additions without a clear need; minimal comments for non-obvious behavior only; no placeholder tests or skipped assertions. Keep a concise changelog in this plan’s Work tracker with files changed, commands run, results, and unresolved risks.

Stop before preview or production activation if required credentials, canonical host, test recipient, Firebase project, or approval are missing. Report the exact blocker and leave the code/test candidate reviewable.
```

## Not in this plan

Session replay, heatmaps, fingerprinting, arbitrary UTM capture, ad-platform pixels, per-person attribution, conversion experiments, dashboard polling, and redesigning the marketing site. A product decision to add new CTAs can be planned independently; instrumentation follows a real user action rather than creating one.
