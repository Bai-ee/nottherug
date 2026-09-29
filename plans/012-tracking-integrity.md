# 012 — Tracking integrity: analytics, Calendly, email, lead capture

Status: PLANNED (2026-09-29). Extends [009](009-full-tracking-dashboard-integration.md); all 009 "Locked product and measurement decisions" still apply. Source of truth for this workstream.

## Objective

Make the admin data trustworthy before any UX discussion: every number on the dashboard and every lead row must mean what it says. Scope is data correctness, linking, delivery, and labels. No visual redesign.

## Verified baseline (2026-09-29, branch `copy/home-services-refresh`)

- `npm run typecheck` clean. Unit: 53 files / 418 passed. Emulator suites (6 files / 49 tests) pass when Java is on PATH: `PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" firebase emulators:exec --only firestore,storage --project demo-not-the-rug "npx vitest run <files>"`.
- Analytics pipeline is wired end to end: all 8 event types emitted from live UI, validated, reported, displayed.
- Vercel env and runtime logs were NOT readable from the review session (403 / timeout). Production env state is unverified.

Recheck every fact at execution time.

## Findings to fix (reference IDs)

| ID | Finding | Evidence | Sev |
|---|---|---|---|
| F0 | Production analytics likely still in test mode (`NEXT_PUBLIC_ANALYTICS_TEST_MODE=true` per 009 P6 / 010); Real dashboard view stays empty. No record of the switch. | plans/009 tracker P6, plans/010:574 | High |
| F1 | No server-side booking truth. No Calendly webhook/API. Cancel/reschedule invisible; "Yes, it's booked" is unverified. | SchedulingDialog.tsx:58-77, WelcomeWalkModal.tsx:449-478 | High |
| F2 | No crons scheduled. leads-digest, founder-brief, not-the-rug-brief never fire. Modal bookings notify nobody but Calendly. | vercel.json `"crons": []`, leads-digest/route.ts:8-12 | High |
| F3 | Answers indistinguishable from defaults. Server defaults reactivity/allergies/phoneConsult; selects pre-set; completeness always "N of N". | validation.ts:132-134, BookingForm.tsx:191-199, completeness.ts:47-57 | High |
| F4 | Booked flag lost on conversion: only on capture doc, which admin hides once converted. | capture/route.ts:116, admin/leads/route.ts:35, adminLeadRecord.ts:43-45 | High |
| F5 | `fsSetDoc` PATCH has no `updateMask` → full-doc replace. Re-capture wipes `convertedLeadId`/`convertedAt`. | firestoreRest.ts:96-104, capture/route.ts:107-117 | Med |
| F6 | `void markCaptureConverted(...)` not awaited; serverless can kill it → funnel undercounts conversions. | meetgreet/route.ts:318, 333 | Med |
| F7 | One person ≠ one record. Meetgreet id = hash(answers)+hour bucket; capture id = hash(email); no link. Lead not linked to analytics session or Calendly booking. | meetgreet/route.ts:112-131, capture/route.ts:64, BookingForm.tsx:436-446 | Med |
| F8 | `/book` BookingForm opens Calendly without name/email prefill → retyping, emails can diverge. | BookingForm.tsx:829, calendlyEmbedUrl.ts:22-43 | Med |
| F9 | Customer email says "we'll reach out to schedule" even after a booking; skipped entirely if sender is `@resend.dev`. | templates.ts:95,115; meetgreet/route.ts:170,201 | Med |
| F10 | "Phone-Consultation Path" funnel row stale since 822b198 removed the option. | FunnelPanel.tsx:52-58, report.ts:118,557 | Med |
| F11 | CTA ids overloaded/mislabelled: `nav_contact` = 3 buttons; `hero_contact` = Contact desktop / Book mobile; `contact_phone`/`contact_email` fire from footer + modal but labelled "Contact page". | SiteNav.tsx:39,168,210; HomeHero.tsx:154-171; ctaLabels.ts:26 | Med |
| F12 | Minor: greeting vs card appointment counts differ (greeting.ts:23 vs AppointmentsStat.tsx:56); `fetchTrackingStartDate` can miss real events behind 25 test events (report.ts:464); stats row `grid-2` holds 3 cards (dashboard/page.tsx:178); stale comments (report.ts:175-198, CtaTable.tsx:22); dead `NEXT_PUBLIC_ANALYTICS_ENDPOINT` (.env.example:69, README.md:71); capture route has no honeypot; `leadRateLimits` never expire; allergy "Other" text can exceed 300-char limit (BookingForm.tsx:433); admin 500-row cap applied before filtering (admin/leads/route.ts:24-35); stored neighborhood "North Williamsburg" is a default nobody picks. | as listed | Low |

## Owner decisions (Phase 0 — block the phases noted)

| # | Decision | Blocks |
|---|---|---|
| D1 | Confirm prod env in Vercel: `NEXT_PUBLIC_ANALYTICS_ENABLED`, `NEXT_PUBLIC_ANALYTICS_TEST_MODE`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain, not `@resend.dev`), `FOUNDER_EMAIL`, `CRON_SECRET`. Approve flipping test mode off. | P7 |
| D2 | Calendly plan tier supports webhooks (Standard+)? Provide personal access token + webhook signing key when ready. | P6 |
| D3 | Cron times (America/New_York) for leads-digest, founder-brief, not-the-rug-brief. Vercel plan tier (Hobby = daily, imprecise). | P4 |
| D4 | Founder alert on a modal booking: immediate email, or digest only? | P4 |
| D5 | Phone-consult funnel row: relabel ("Saved, scheduler not opened") or remove? | P5 |
| D6 | Wording for booked-aware customer confirmation email. | P4 |
| D7 | Stored neighborhood value: keep "North Williamsburg" or store "Williamsburg". | P2 |

## Constraints

- Presentation stays as-is. No new libraries. No new analytics vendors. No PII into `analytics_events` (storing the analytics session id on the lead is allowed; the reverse is not).
- Do not touch the uncommitted welcome-modal work on `copy/home-services-refresh` (`TrackedCtaLink.tsx`, `WelcomeModalHost.tsx`, `welcome-modal.ts`, `SiteNav.tsx`, `NeighborhoodDetail.tsx`, marketing `layout.tsx`). Work in a separate worktree off `main`: `git worktree add ../NotTheRug-tracking -b fix/tracking-integrity main`. Rebase onto that work only when the owner says it is committed.
- CTA ids already in stored data stay valid (label them "legacy"); new ids are additive.
- Push to `main` deploys production (Vercel Git integration). Never push without owner approval.
- Next.js 16: read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md` before using `after()`.
- Stop for owner approval after each wave.

## Agent model (same as 009)

One coordinator (Sonnet, this plan's executor) + at most 3 concurrent workers. Shared filesystem → file ownership is mandatory. Only the coordinator commits, branches, rebases, or edits the shared files below.

Coordinator-owned: `lib/server/firestoreRest.ts`, `lib/analytics/events.ts`, `lib/leads/contract.ts`, `firestore.rules`, `.env.example`, `vercel.json`, `package.json`, `plans/*`, `docs/*`, Git.

| Lane | Owns |
|---|---|
| L — lead server | `app/api/leads/**`, `lib/leads/validation.ts`, `lib/leads/completeness.ts`, `app/admin/leads/route.ts`, lead tests |
| B — booking client | `components/booking/**`, `components/marketing/WelcomeWalkModal.tsx`, `components/marketing/GroupWalkFeatureCard.tsx`, `lib/booking/**`, booking tests |
| C — dashboard | `lib/analytics/report.ts`, `lib/analytics/greeting.ts`, `app/api/admin/analytics/**`, `app/admin/dashboard/**`, `components/admin/**`, `app/admin/admin.css`, dashboard tests |
| E — email/cron | `lib/email/**`, `app/api/cron/**`, email/cron tests |
| W — webhook (P6 only) | `app/api/webhooks/calendly/**`, `lib/booking/calendlyWebhook.ts`, webhook tests |

Workers: no commits, no branch ops, no global formatters, no edits outside their lane. Need a shared-file change → report to coordinator. After each wave, a fresh reviewer agent reviews the diff against this plan (format: Verdict / Findings / Risks / Next step).

## Phases and waves

### Wave 1 (parallel: coordinator → L, C, E)

**P1 — Data integrity (F4, F5, F6, F12 honeypot/rate-limit/admin cap)**
- Coordinator: add `fsMergeDoc(path, data)` to firestoreRest.ts using `updateMask.fieldPaths` for each top-level key. Keep `fsSetDoc` for true replacements. Emulator test proves untouched fields survive.
- L: capture route and `markCaptureConverted` use `fsMergeDoc`. Wrap `markCaptureConverted` in `after()` on both paths. Carry `bookedSelfReported` onto the meetgreet lead at conversion time (read from the capture doc), and on a later `booked:true` capture of a converted email, also merge it onto `convertedLeadId`. Add the same honeypot to capture that meetgreet uses. Add `expiresAt` (+48h) to `leadRateLimits` docs matching the analytics pattern. Apply the admin row cap after filtering.
- C: `adminLeadRecord` reads the lead's own `bookedSelfReported`.
- Tests: re-capture after conversion keeps `convertedLeadId`/`convertedAt`; booked flag visible on converted lead; honeypot rejects.

**P5 — Dashboard clarity (F10, F11, F12 dashboard items)** — needs D5
- Coordinator: add split CTA ids to `events.ts` (e.g. `nav_get_started`, `nav_contact_us`, `hero_contact_desktop`, `hero_book_mobile`); keep old ids accepted, labelled legacy.
- C: labels/categories for new + legacy ids; `contact_phone`/`contact_email` labels become location-neutral; phone-consult row per D5; greeting uses the same appointments number as the card; `fetchTrackingStartDate` filters test mode in the query, not after a 25-doc read; stats row `grid-3`; fix stale comments.
- Call-site id swaps in SiteNav/HomeHero are held until the owner's welcome-modal work is committed (those files are frozen). List them in the hand-back.
- Coordinator: remove dead `NEXT_PUBLIC_ANALYTICS_ENDPOINT` from `.env.example`/README/docs.

**P4a — Cron wiring (F2)** — needs D3
- Coordinator: `vercel.json` crons for the three routes at D3 times (UTC-converted). E: confirm each route fails closed without `CRON_SECRET` and is idempotent under a double fire (existing sendGuard). Test.

→ Reviewer pass → owner approval.

### Wave 2 (parallel: B + L, then E)

**P2 — Answer fidelity (F3, F12 allergy cap, D7)** — invisible to users
- B: BookingForm tracks which fields the user actually set and sends `answeredFields: string[]`. Cap the allergy "Other" input so the combined value fits `LEAD_FIELD_LIMITS.allergies`. Neighborhood per D7.
- Coordinator: add `answeredFields` to the contract.
- L: validation stops inventing values: missing reactivity/allergies are stored as empty, not "None noted"/"None". Completeness counts `answeredFields` (fall back to the old logic for older docs). Admin/CSV show "not answered" for untouched fields. Check email templates still read sensibly with empty values (E reviews).

**P3 — Identity and linking (F7, F8)**
- Coordinator: contract adds `emailKey` (same sha256 as the capture id), `analyticsSessionId`, `calendlyLinkId`.
- B: send the current analytics session id with the lead. Prefill Calendly from BookingForm with `name` + `email`, and pass `utm_content=<leadId>` (the welcome modal passes the capture id) so P6 can match exactly. Extend `calendlyEmbedUrl.ts` + its tests.
- L: store `emailKey` on meetgreet leads; admin groups rows sharing `emailKey` (show "also captured / submitted N times") without deleting any doc.

**P4b — Email correctness (F9)** — needs D4, D6
- E: booked-aware customer template (D6 copy). If D4 = immediate, founder alert on the first `booked:true` capture, guarded against repeat sends (reuse the sendGuard pattern). L exposes the hook point in the capture route; E owns the email code.

→ Reviewer pass → owner approval.

### Wave 3 — P6 Calendly webhook (F1) — needs D2

- W: `POST /api/webhooks/calendly`. Verify `Calendly-Webhook-Signature` (HMAC-SHA256, timestamp tolerance, constant-time compare) before parsing. Handle `invitee.created` and `invitee.canceled` (a reschedule = canceled with `rescheduled: true` + a new created). Match the lead by `utm_content` first, then by `emailKey`. `fsMergeDoc` a `booking` object `{status: scheduled|canceled|rescheduled, eventStartAt, inviteeUri, updatedAt}`, idempotent by invitee URI. Store no Calendly payload beyond those fields. Unmatched bookings go in a `calendlyBookings` doc keyed by invitee URI so the dashboard can count them.
- C: dashboard shows verified bookings (webhook) separately from self-reported (postMessage), and cancellations.
- Coordinator: env `CALENDLY_WEBHOOK_SIGNING_KEY`, rules deny client access to the new collection, and a one-time script/runbook to create the webhook subscription via the Calendly API (the owner runs it with their token).

→ Reviewer pass (security focus on signature verification) → owner approval.

### Wave 4 — P7 Activation (F0) — needs D1

- The owner sets env in Vercel and flips `NEXT_PUBLIC_ANALYTICS_TEST_MODE=false`. Enable the Firestore TTL policy on `leadRateLimits.expiresAt`. Deploy rules.
- Coordinator: merge to `main` only on owner approval (merging deploys). Post-deploy smoke test: one real-mode page_view shows up, one test booking goes end to end (lead row → booked flag → webhook status → founder email), then delete the test data.
- Update `plans/README.md` status and this file's tracker.

## Verification gate (every wave)

`npm run typecheck`, `npm test`, emulator suites (command above), `npm run lint` (no new errors vs. baseline), and focused Playwright specs for touched flows (`tests/e2e/booking.spec.ts`, `analytics-journey.spec.ts`). Report exact counts.

## Execution tracker

| Wave | Phases | Status | Evidence | Open risks |
|---|---|---|---|---|
| 1 | P1, P5, P4a | DONE, awaiting approval (2026-09-29) | Worktree `../NotTheRug-tracking`, branch `fix/tracking-integrity`, commits dd5cab3 c57766d 20e88ff. typecheck clean; unit 433 pass/56 skip; with emulator 489/489; lint 0 errors. | Only leads-digest scheduled (D3 times unset; brief crons held per docs/scheduled-jobs.md). leadRateLimits TTL policy not yet enabled. Frozen call-site id swaps pending. Playwright not run. |
| 2 | P2, P3, P4b | PLANNED | | |
| 3 | P6 | BLOCKED on D2 | | |
| 4 | P7 | BLOCKED on D1 | | |

## Kickoff prompt for the coordinator (Sonnet)

```
You are the coordinator for plans/012-tracking-integrity.md in /Users/bballi/Documents/Repos/NotTheRug. Read it fully, then plans/009-full-tracking-dashboard-integration.md (its locked decisions and agent model), then AGENTS.md. 012 is the source of truth; do not drift to older plans.

Rules:
- Work in a separate worktree: git worktree add ../NotTheRug-tracking -b fix/tracking-integrity main. Never touch the uncommitted welcome-modal files on copy/home-services-refresh.
- Execute ONE wave at a time. Spawn at most 3 worker agents per wave with the lane file ownership in 012. Give each worker: its findings IDs, the exact files it owns, the tests it must add, and the "no commits / no edits outside lane" rule. You own the shared files and all Git operations.
- Skip or stub any phase whose owner decision (D1–D7) is unanswered; list it as blocked.
- After a wave: run the verification gate, spawn one fresh reviewer agent on the wave's diff (Verdict / Findings / Risks / Next step), fix its confirmed findings, commit per phase with conventional commit messages, update the tracker in 012, then STOP and report: files changed, behavior changed, what stayed untouched, verification counts, manual test next, risks. Wait for approval before the next wave.
- Never push to main (it deploys production). Never read or print secret env values.

Start with Wave 1. First reply: restate the wave's scope in 2 lines, list the decisions it still needs from me, then begin.
```
