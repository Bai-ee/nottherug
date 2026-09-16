# Master prompt: finish analytics safely

Paste the following into the next agent with this repository open.

---

Finish the existing admin-dashboard and first-party analytics work. Do not start over and do not redesign the feature.

Read these files before doing anything:

- `AGENTS.md`
- `plans/002-production-readiness.md`
- `plans/002-production-tracker.md`
- `plans/003-admin-dashboard-and-tracking.md`
- `docs/analytics-operations.md`
- `docs/release-checklist.md`
- `docs/launch-facts-review.md`

Read the relevant installed Next.js guidance in `node_modules/next/dist/docs/` before editing Next.js routes, layouts or configuration. Preserve the current working tree: the analytics/dashboard feature is implemented but **uncommitted**. Inspect `git status`, review every changed file, and do not reset, stash, discard, overwrite or rebuild dependencies underneath another active agent/session.

## Goal

Commit a reviewable analytics/dashboard candidate, finish all local checks, and prepare a concrete preview-validation package. Do not deploy preview or production, write a real lead, send a real email, change deployed Firebase rules, or run the paid brief pipeline unless the user explicitly authorizes that external action.

## Current feature scope

- First-party Firestore tracking only. No analytics vendor or new dependency.
- Admin dashboard at `/admin/dashboard`; Daily Brief remains available at `/admin/dashboard/brief` with its prior useful actions preserved.
- Homepage palette/type applied to admin chrome; data interface remains calm and legible.
- Track page views, meaningful engagement, booking/phone/email/service CTA clicks, booking form starts/steps, saved inquiries, scheduler opened, and Calendly-reported scheduled appointments.
- Inquiries saved and appointments scheduled remain separate metrics. Sessions are not people or unique visitors. Do not add classic bounce rate.
- Tracking remains off until a separate preview activation. Do not alter that default.

## Required work

1. Review the uncommitted analytics implementation against plan 003 and the existing code. Check for regressions in login, Leads, Brief/history/preview, Photos, Generator, public navigation and booking. Fix only concrete defects found.
2. Run the relevant local checks on the final candidate: lint, pipeline lint, typecheck, unit tests, emulator-backed analytics/rules tests, build, and the ordinary browser suite. Record actual output and any skips.
3. Inspect the dashboard and shared admin chrome in an authenticated browser if local test credentials are available. Otherwise, preserve the explicit visual verification gap; do not claim it passed from code inspection alone. Check 400px, tablet and desktop layouts, keyboard navigation, focus, loading, failure, empty, tracking-off and test-mode states.
4. Confirm the analytics system has one event contract and one collection path. Check server validation, event-ID dedupe, test-mode isolation, kill switch, fail-open rate limiting, bot filtering, bounded date queries, New York time boundaries, referrer/query-string stripping, campaign allowlist, no PII/provider payload storage, and that an analytics failure cannot prevent a saved lead.
5. Review the Calendly listener against the actual iframe/window behavior. It may record only an allowed `calendly.event_scheduled` event from the configured provider origin. It must not store customer/provider details or duplicate an appointment event.
6. Resolve stale documentation introduced by earlier planning. Keep `plans/003-admin-dashboard-and-tracking.md`, `docs/analytics-operations.md`, and `plans/002-production-tracker.md` honest about local emulator proof versus preview/prod proof.
7. Prepare, but do not execute, a preview test runbook covering configuration, Firebase rules deploy/diff, one synthetic booking through persistence/admin/CSV/email, tracking-enabled browser page view, CTA/funnel/report validation, media operation, private brief access, and rollback.
8. Commit only after review and checks. Use focused commits with clear messages. Do not include unrelated generated files, credentials, emulator data, or dependency churn.

## Non-negotiable constraints

- Existing uncommitted changes belong to the user. Preserve them.
- Never treat a skipped test, mocked test, emulator test, or a successful typecheck as a preview or production pass.
- Never enable tracking in `.env.local`, preview or production without explicit authorization and a separate Firebase/test-data configuration.
- Never send customer email, create a real customer lead, or trigger paid model work during normal verification.
- Do not introduce rollups, cron jobs, session replay, fingerprinting, cross-device identity, a CRM, payment reporting, or a new UI framework.
- Do not silence errors with `any`, `ts-nocheck`, broad ESLint ignores, empty catches or fake UI success states.
- Do not claim a session count is visitor count, person count, or conversion truth. Tracking can be blocked.

## Owner decisions already made (treat as settled)

- **Campaign slugs — use the implemented allowlist verbatim.** `lib/analytics/events.ts`
  defines `flyer`, `ig-bio`, `ig-story`, `google-business`, `yelp`, `referral-card`,
  `door-hanger`. An earlier draft of this handoff proposed `instagram-bio` and
  `flyer-qr`; those are **not** in the allowlist and must not be used. A link
  carrying an unlisted slug has its `camp` dropped while `src:'campaign'`
  survives, so `buildSourceTable` buckets the visit as **direct** — a printed
  QR campaign would silently report as direct traffic with no error and no zero
  row to notice. Do not add a slug to a printed or published link unless it
  appears in `CAMPAIGN_SLUGS`.
- **Retention approved: 13 months for raw analytics events, 48 hours for
  rate-limit records.** 13 months preserves year-over-year comparison for a
  seasonal business. The 48-hour window also closes the `analyticsRateLimits`
  accumulation gap noted in `docs/analytics-operations.md`. The cleanup job is
  not yet implemented — implementing it is in scope for whoever picks this up.
- **Visitor-facing disclosure: one short line near the booking form**, not a
  dedicated privacy page. Plain language, stating that anonymous page visits
  are recorded and that visitor information is never sold. Keep it accurate to
  what is actually implemented: cookie-free, no personal data stored, referrer
  reduced to a hostname.

## Preview configuration (owner-supplied; all four decisions now settled)

- **Firebase project: reuse the existing one** that already backs the meet &
  greet form capture (`NEXT_PUBLIC_FIREBASE_PROJECT_ID` /
  `FIREBASE_ADMIN_PROJECT_ID` as set in `.env.local`). No new project.
- **Canonical host: the apex `https://nottherug.com`, no `www`.** This matches
  the existing `PUBLIC_BASE_URL` fallback already hard-coded in
  `app/layout.tsx`, so choosing `www` would mean changing shipped metadata and
  OG URLs for no benefit. Point `www` at a 301 to the apex in the Vercel
  domain settings. Set `PUBLIC_BASE_URL` explicitly in production rather than
  relying on the fallback.
- **Test email: `bryanballi@gmail.com`** for every synthetic lead and email
  check. Never a customer address.
- **Weekly analytics/error review: the founder**, who will open the dashboard
  directly. Design and copy should therefore assume a non-technical reader —
  no jargon, no unexplained metrics.

### Required precaution: the shared project is safe for analytics, NOT for leads

Reusing the production Firebase project is fine for **analytics**, because
`mode:'test'` isolation exists precisely for this: test events are excluded
from real numbers and surface only under `?testMode=1`. That path is
emulator-verified in both directions.

It is **not** automatically safe for a synthetic booking. A preview booking
against the shared project writes a real document into the same `leads`
collection the owner reads, and `lib/email/resend.ts` sends a notification to
`FOUNDER_EMAIL`. Left alone, a preview test puts a fake customer in the real
Leads list and emails the founder about it.

Before any synthetic booking against the shared project:

1. Set `FOUNDER_EMAIL=bryanballi@gmail.com` in the preview environment, so the
   business notification cannot reach the founder's real inbox.
2. Use `bryanballi@gmail.com` as the customer email too, so the customer
   confirmation also lands with the tester.
3. Give the submission an obviously synthetic owner name and a recognizable
   `source` value, so the record is unmistakable in the Leads table and CSV.
4. **Delete the synthetic lead document after verification**, and confirm the
   Leads list and lead-stats totals return to their prior counts. Record the
   before/after counts in the report.
5. Never run a synthetic booking against production with the real
   `FOUNDER_EMAIL` set.

If the owner would rather not touch the production `leads` collection at all,
the alternative is a separate Firebase project for preview — more setup, and
it is a decision to revisit only if step 4 proves awkward in practice.

Continue all local work that does not need those choices. Consolidate requests for external access/authorization into one short handoff after the candidate is ready.

## Final report

Report:

1. Commit(s), changed files and user-visible behavior.
2. Every check run with pass/fail/skip counts.
3. What was verified locally, with the emulator, in a browser, and what was not verified.
4. Remaining decisions and exactly what each blocks.
5. The preview configuration and exact synthetic test steps, ready for approval.
6. Any defects or risks still open.

Do not deploy anything. Stop after the candidate and preview package are concrete and reviewable.

---
