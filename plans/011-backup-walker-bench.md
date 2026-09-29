# 011: Backup walker bench (recruit, stack, dispatch)

Status: **PLANNED. Local build and verification may proceed. Sending real SMS, running real background checks, adding cron schedules, changing production Firestore rules, and deploying all require explicit authorization.**

Written 2026-09-29 for a Sonnet implementation agent. The owner is Bryan (builder), working for Luis (Not The Rug).

---

## 0. Read first

1. Read `AGENTS.md`. This is Next.js 16 and it is **not the Next.js in your training data**. Before writing route handlers, pages or metadata, read the relevant guides in `node_modules/next/dist/docs/`.
2. Read `README.md` (the module map), `PRODUCT.md`, `docs/scheduled-jobs.md`, `firestore.rules`, `storage.rules`, and `plans/002-claude-handoff.md`. Plan 002's working rules apply here too: preserve uncommitted work, no `any`/`ts-nocheck` to get checks green, comments only for constraints, don't invent business facts, and use mocks and emulators instead of live services.
3. Run `git status` before you start. The owner often has uncommitted work. Never reset it or overwrite it. Work on a branch: `feat/backup-bench`.
4. Build **one phase at a time** (§10). Each phase ends with `npm run check` passing and a short report appended to §13 of this file: what changed, the commands you ran and their results, and any open questions. Then stop and wait for approval.
5. If a business fact is missing, use the default in this plan, log it in §12, and keep going.

---

## 1. The problem

Not The Rug runs on a small team of full-time walkers. When one can't work, Luis scrambles for cover. The goal is a **bench** of vetted backup walkers, layered so that if some are unavailable, others still are. The system should run itself:

1. **Recruit.** Take in applications, mostly from Indeed.
2. **Screen.** Filter with minimal admin time.
3. **Stack.** Keep enough backups for each area and time slot.
4. **Dispatch.** When a walker calls out, fill the shift automatically by SMS.
5. **Retain.** Keep backups engaged and drop the ones who go quiet.

Luis should only have to (a) approve people after a shadow walk and (b) tap **Need coverage**.

## 2. What the owner asked for

- The tracking side is **its own page in the admin board**: one new nav entry, not a separate app.
- The public application is a **standalone page**, built with the **same UI as the client sign-up / meet-and-greet form**. It is not in the main site nav, and Indeed job posts link straight to it.

## 3. Existing system: reuse it, don't replace it

| Need | Use what already exists |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript. Node 24. |
| Data | Firestore through `lib/server/firestoreRest.ts` (`fsCreateDoc`, `fsSetDoc`, `fsGetDoc`, `fsQueryCollection`, `fsIncrementField`, and the rest). Add helpers there only if you need to, and test them. |
| File uploads | Firebase Storage through `lib/server/firebaseStorage.ts`. Resumes go in a private path. |
| Admin auth | `lib/server/verifyAdmin.ts` on every admin API route. `AdminSessionProvider`, `AdminGuard` and `AdminShell` on the page. `adminFetch` on the client. |
| Admin chrome | `components/admin/AdminShell.tsx`, `AdminNav.tsx`, `app/admin/admin.css`. Follow the patterns in `app/admin/dashboard/leads/page.tsx` and `components/admin/leads/*` (table, filter bar). |
| Public form UI | `components/booking/BookingForm.tsx`, `BookingSteps.tsx` and `components/MeetGreetForm.tsx`, rendered inside `components/marketing/ContactSheetSection.tsx` on `/signup` (`SignupPageContent.tsx`). |
| Public intake route pattern | `app/api/leads/meetgreet/route.ts`: capped body, honeypot, per-IP rate limit via `fsIncrementField`, idempotency via `fsCreateDoc`, email timeouts. Copy this pattern. |
| Email | Resend via `lib/email/resend.ts`. Templates go in `lib/email/`. |
| Cron | `app/api/cron/**` guarded by the `CRON_SECRET` bearer token, plus `app/api/cron/_lib/sendGuard.ts` for once-per-day sends. |
| AI | `ANTHROPIC_API_KEY` already exists (it's used by the brief pipeline). |
| Tests | Vitest (`tests/unit`), Firestore/Storage emulator rules tests, Playwright (`tests/e2e`). |

**New external services:** Twilio (SMS), Upstash QStash (delayed wave timers, see §7.5), and Checkr (background checks, Phase 5). Add their env vars to `.env.example`, documented inline the way the existing ones are.

**Coordinator-owned files.** Propose changes to these in your phase report instead of editing them silently: `vercel.json`, `proxy.ts`, `app/layout.tsx`, `next.config.ts`.

---

## 4. Legal and compliance guardrails (NYC). These are required.

Not The Rug hires in Brooklyn, so NYC rules apply. Bryan and Luis will confirm with counsel, but build these defaults in:

1. **NYC Local Law 144 (automated employment decision tools).** AI must not score, rank, or reject applicants.
   - Automatic rejection happens **only** on objective answers the applicant gave: under 18, no service area we cover, no availability, not authorized to work.
   - The AI writes a **summary and interview prompts** for Luis to read. No score, no recommendation, no ordering.
   - The review queue is sorted by a deterministic rule (does the applicant fill a coverage gap, then submission date), never by AI output.
   - Behind flag `BENCH_AI_SUMMARIES_ENABLED` (default `false` until counsel confirms). The application page must carry a one-line notice that AI may be used to summarize applications.
2. **NYC Fair Chance Act.** No criminal-history questions on the form. The background check runs **only after a conditional offer**. `consider` results never auto-reject; they go to Luis for the manual Fair Chance process.
3. **SMS consent (TCPA, Twilio A2P 10DLC).**
   - The form needs an explicit, unchecked opt-in checkbox with consent text. Store `smsConsentAt`.
   - Handle `STOP`, `START` and `HELP`.
   - Never text anyone without consent or after they've opted out.
   - A2P 10DLC registration is a manual step for Bryan. Document it in `docs/backup-bench.md`.
4. **Worker classification (W-2 vs 1099) is undecided.** Store `employmentType` on each person and keep offer copy neutral.
5. **Data.** Firestore and Storage rules stay deny-all for the client (server routes use the service account, the way they do today). Add explicit, commented `match` blocks for each new collection, following the style of `firestore.rules`. Resumes are only viewable through a short-lived signed URL issued by an admin route. Don't put applicant PII in analytics events or in SMS bodies beyond first name.

---

## 5. Concepts

- **Areas.** These are operational service areas for staffing, **separate** from `lib/content/coverage.ts`, which is the marketing SEO list and must not change for this feature. Seed `Williamsburg` and `Greenpoint`. Luis edits the list in bench settings.
- **Time blocks.** Default `morning 7–11`, `midday 11–3`, `evening 3–8`, seven days a week. Editable in settings.
- **Slot.** Area × weekday × block.
- **Depth.** The number of active bench walkers available for a slot. The target is a setting, default `3`.
- **Tier.** A, B or C. New bench members start at B. Tiers are recalculated nightly (§8). Luis can pin a tier by hand.
- **Wave.** A callout texts tier A first, then B, then C. Waves are separated by a timeout (setting, default 10 minutes).
- **Time zone.** Everything is `America/New_York`. Store timestamps in UTC.

---

## 6. Firestore data model

Every collection is prefixed `bench` so it groups cleanly and is easy to secure.

```
benchSettings/config
  areas: [{ id, name, active, priorityRecruiting }]
  timeBlocks: [{ key, label, start, end }]
  targetDepth, waveTimeoutMinutes, pingCadenceDays, shadowBookingUrl,
  autoInviteOnGap (default false), templates: { ...sms/email copy }

benchPeople/{personId}
  firstName, lastName, email, phoneE164, zip
  source: 'indeed' | 'website' | 'referral' | 'other', utm: { source, medium, campaign }
  stage: applied | review | shadow_invited | shadow_scheduled | shadow_done |
         offer_conditional | background_check | bench | fulltime | inactive | rejected
  stageHistory: [{ stage, at, by }]
  areas: [areaId], availability: [{ weekday 0-6, block }]
  unavailableDates: [{ date 'YYYY-MM-DD', block | null }]
  answers: { experienceYears, experienceTypes[], responseSpeed, hasSmartphone, ... }
  is18Plus, workAuthorized, knockoutReason | null
  resumePath | null, aiSummary | null
  smsConsentAt, smsOptedOut, employmentType | null
  tier | null, tierPinned: bool, tierHistory: [{ tier, at, reason }]
  metrics: { offers, answered, accepted, completed, noShows, medianResponseMin, pingsMissed, lastShiftAt }
  notes, shadowRating | null
  createdAt, updatedAt

benchCallouts/{calloutId}
  date 'YYYY-MM-DD', areaId, block, notes (internal only, never sent by SMS)
  originalWalker | null, createdBy
  status: open | filling | filled | unfilled | cancelled
  code (4 digits, unique among open callouts), currentWave, filledBy | null, filledAt | null
  offers subcollection: benchCallouts/{id}/offers/{personId}
    wave, sentAt, response 'yes' | 'no' | null, respondedAt, outcome 'won' | 'lost' | 'expired'

benchCalloutClaims/{calloutId}     ← the atomic claim (see §7.5)
  personId, claimedAt

benchMessages/{id}                 ← every inbound and outbound SMS
  personId | null, direction, body, twilioSid, calloutId | null, kind, createdAt

benchShifts/{id}                   ← what actually happened
  personId, calloutId | null, date, block, completed, noShow, rating | null
```

Coverage is **computed in code** (`lib/bench/coverage.ts`): a pure function takes people and settings and returns a grid. Unit-test it. Don't try to reproduce SQL-style views in Firestore. Bench size is small (dozens of people), so reading the whole `bench` stage is fine.

Put all bench logic in `lib/bench/` as pure, tested modules: `contract.ts` (types and option lists), `validation.ts`, `coverage.ts`, `candidates.ts`, `tiers.ts`, `smsParse.ts`, `knockouts.ts`. Put I/O in `lib/server/bench*.ts`.

---

## 7. Features

### 7.1 Public application page (standalone)

- **Route:** `app/(marketing)/walk-with-us/page.tsx`, with the page title "Walk With Us". Use `buildPageMetadata`, like `/signup` does.
- **Layout:** mirror `SignupPageContent.tsx`: `SiteNav`, the same green closing band and paper form sheet, and `SiteFooter`. Create a sibling content component (`components/marketing/WalkWithUsPageContent.tsx`) with its own section ids for CSS hooks. Reuse the existing class vocabulary (`booking-form-wrap`, `booking-form`, `form-row`, `form-group`, `form-control`, `form-select`, `stamp-label`) so it looks the same without new design work.
- **Form:** `components/bench/WalkerApplicationForm.tsx`, built on the same stepped pattern as `BookingForm`/`BookingSteps`, and supporting both `layout="steps"` and `layout="full"`. **Do not refactor or change the booking form.** If you must share a primitive, extract it with zero change to booking behavior, and prove that with the existing booking tests.
- **Steps:**
  1. **About you:** first and last name, email, mobile, zip, 18+ (yes/no), authorized to work in the US (yes/no).
  2. **Where and when:** areas (multi-select from settings), a weekly availability grid (weekday × block, as tappable chips that work on mobile), and how fast you can respond to a same-day ask (15 min / 1 hr / same day only).
  3. **Dog experience:** years; experience types (large dogs, puppies, reactive dogs, seniors, meds); a short free text "tell us about the dogs you've cared for" (length-capped).
  4. **Wrap up:** optional resume upload (PDF/DOCX, 5MB max), how you heard about us, the SMS consent checkbox, the AI-use notice, and submit.
- **Tracking:** read `?src=indeed` and UTM params into `source`/`utm`. Use the existing allowlist approach: store only known values, never arbitrary strings.
- **API:** `app/api/bench/apply/route.ts`, copying the meetgreet protections (capped body, honeypot, rate limit, idempotency). Upload resumes through a separate capped route or a signed upload URL. Don't push a 5MB file through the JSON route.
- **On submit:**
  - Run knockouts. A knockout goes to `rejected` with a kind email.
  - Otherwise the applicant goes to `review` and gets a confirmation email.
  - If `BENCH_AI_SUMMARIES_ENABLED`, queue the AI summary. It runs after the response and must never block or fail the submit.
- **Launch mode and sitemap.** `proxy.ts` redirects public routes while `LAUNCH_MODE=true`. Propose adding `/walk-with-us` to its allowlist, so recruiting works before launch. Add the page to `PUBLIC_ROUTES` in `lib/content/site.ts` only if Luis approves (§12). Don't add it to `SiteNav`. A footer link is a §12 decision.

### 7.2 Indeed

- Indeed job posts link to `/walk-with-us?src=indeed`. Write ready-to-paste job post copy in `docs/backup-bench-indeed-post.md` (plain, warm, local, matching PRODUCT.md's voice; no invented pay; leave a `[PAY]` placeholder).
- Don't scrape Indeed or use unofficial Indeed APIs.

### 7.3 Screening (admin)

- The **Applicants** tab shows the review queue, sorted by (fills at least one under-target slot) desc, then `createdAt` asc.
- Each card shows answers, a coverage-fit chip computed in code, the AI summary if enabled, and the resume via a signed URL.
- **Actions:**
  - **Invite to shadow** sends SMS (if consented) and email with `shadowBookingUrl`, and moves the person to `shadow_invited`.
  - **Mark scheduled.**
  - **Reject** sends a kind email.
  - **Hold.**
- The `autoInviteOnGap` setting (default **off**) auto-invites applicants who pass knockouts and fill a red slot. It's an objective rule, but it stays off until counsel confirms.

### 7.4 Shadow → conditional offer → background check → bench

- Luis marks the shadow walk done and adds a 1–5 rating and notes, then clicks **Conditional offer**. That sends the email and, in Phase 5, creates a Checkr invitation.
- A Checkr webhook (with verified signature) updates the person. `clear` moves them to `bench` at tier B and sends a welcome SMS explaining how callouts work. `consider` notifies Luis.
- Until Phase 5 ships, there's a manual **Mark background check clear** button so the bench can be used right away.

### 7.5 Callouts (the core feature)

1. On the **Callouts** tab, a large **Need coverage** button (thumb-reachable on mobile) opens a short form: date, area, block, and optional internal notes.
2. **Candidates** (`lib/bench/candidates.ts`, pure and tested): stage `bench`, consented and not opted out, covers the area, available for that weekday and block, not marked unavailable on that date, and not already holding a shift for that date and block. Sort by tier, then completion rate, then oldest `lastShiftAt`, which spreads the work around.
3. **Wave A.** Text every tier-A candidate:
   `Not The Rug: backup walk Tue 10/6, midday (11-3), Williamsburg. Reply YES 4821 to take it.`
   Then schedule the next-wave check.
4. **Claiming is atomic.** An inbound `YES <code>` calls `fsCreateDoc('benchCalloutClaims/{calloutId}', …)`. `createDocument` returns 409 on an existing id, so **exactly one** person wins, even with simultaneous replies. It's the same guarantee the lead idempotency relies on.
   - The winner updates the callout to `filled` and gets a confirmation SMS. Everyone else offered gets "Thanks, this one's been filled." Late YES replies get the same message.
   - A bare `YES` counts if the sender has exactly one open offer. If they have more than one, reply asking for the code.
   - `NO` is recorded silently.
5. **Wave timer.** Default: **Upstash QStash** delayed callback to `app/api/bench/callouts/[id]/advance`, verified by QStash signature. The handler is idempotent: it only moves forward if the callout is still `filling` on the expected wave.
   - Fallback: if Bryan prefers no new service and the Vercel plan supports per-minute cron, a minute-cron sweep calls the same `advance` logic. Implement `advance` as a plain function so either trigger works. Report the Vercel plan finding in Phase 0.
6. After wave C times out, the callout becomes `unfilled`. Luis gets an immediate email, plus an SMS if his number is in settings.
7. Luis can **cancel** (everyone offered is told) or **assign manually**.
8. **SMS never carries client names, addresses or dog details.** The winner's confirmation says Luis will send details, or links to an admin-issued, short-lived details page (Phase 6).
9. **Inbound SMS webhook:** `app/api/bench/sms/inbound/route.ts`. It validates the Twilio signature, is idempotent on `MessageSid`, logs to `benchMessages`, and handles STOP/START/HELP/YES/NO/Y/UPDATE, plus replies it can't parse (auto-reply with help text; the message still appears in the person's thread).

### 7.6 Keeping the bench warm

- **Ping** (`app/api/cron/bench-ping`, every `pingCadenceDays`, default 30): "Still up for backup walks? Reply Y to stay on the list, or UPDATE to change your days."
  - `UPDATE` replies with a magic link to `/walk-with-us/availability?token=…`: a signed, expiring, single-person token. On that page the walker edits areas, the weekly grid and unavailable dates, reusing the form's step 2 component.
  - Two missed pings in a row move the person to `inactive`, and Luis sees that in his digest.
- The **Walkers** tab flags anyone with no shift in 30+ days, so Luis can give them shadow or vacation work. Keeping backups busy is what keeps them.

### 7.7 Coverage monitoring

- `app/api/cron/bench-nightly`: recompute metrics and tiers (§8), recompute coverage, toggle `priorityRecruiting` on areas with gaps (the apply page shows "We especially need walkers in …"), and send Luis **one** digest email, only when something changed. Use `sendGuard` so it can't double-send.
- Per `docs/scheduled-jobs.md`, **don't add these to `vercel.json`**. Build them, make them callable manually with `CRON_SECRET`, document them in `docs/scheduled-jobs.md`, and propose the schedule in your report. Turning them on is Luis's call.

---

## 8. Reliability and tiers (`lib/bench/tiers.ts`)

Calculate over a rolling 90 days:

- Response rate: offers answered / offers sent.
- Accept rate.
- Median response minutes.
- Completion rate: completed / won. A no-show is heavily negative.
- Ping response.
- Average shadow and shift rating.

Tier rules. Keep them as named constants in one place.

- **A:** at least 3 completed shifts, completion ≥ 95%, zero no-shows in 90 days, response rate ≥ 70%.
- **C:** any no-show in 60 days, or response rate < 30%, or 2 missed pings.
- **B:** everyone else.

A pinned tier is never overwritten. Log every tier change to `tierHistory`.

Shift outcomes: the day after a filled callout, Luis confirms on the Callouts tab ("Completed / No-show / Rate"). (Phase 6 can add a "Reply DONE" SMS.)

---

## 9. Admin page: `/admin/dashboard/bench`

- Add one entry to `NAV_LINKS` in `components/admin/AdminNav.tsx`: `{ href: '/admin/dashboard/bench', label: 'Backup Bench' }`, placed after "Scheduled Leads".
- One page with in-page tabs, synced to `?tab=`: **Coverage · Callouts · Applicants · Walkers · Settings**. Use `AdminShell` with the same `AdminSessionProvider` → `AdminGuard` → `AdminShell` wrapping as the leads page.
- All data comes from `app/api/admin/bench/**` routes, each calling `verifyAdmin`, through `adminFetch`.

| Tab | Contents |
|---|---|
| **Coverage** | Heatmap with areas as rows and weekday × block as columns. Cells show depth against target (colors: under target, at target, over). Tap a cell to see who's available. Summary stats on top: bench size by tier, red slot count, open callouts. |
| **Callouts** | The Need coverage button. Open callouts with live status (poll every 10s while any are `filling`). Each detail view shows the wave timeline: who was texted when, and who replied what. Recent history, and the shift outcome confirmation. |
| **Applicants** | The review queue (§7.3) and a pipeline board by stage. On mobile, the board becomes a stage filter plus a list. |
| **Walkers** | Searchable table (reuse the LeadTable and LeadFilterBar patterns). Profile drawer: answers, availability, tier with a pin control and history, metrics, SMS thread with a reply box, shifts, notes, and stage actions. |
| **Settings** | Areas, blocks, target depth, wave timeout, ping cadence, shadow booking URL, Luis's alert phone, message templates with a live preview, and the auto-invite toggle. |

Mobile first: Luis will run this from his phone. Keep styling inside `app/admin/admin.css` (or a scoped `bench.css` imported by the page), using the existing tokens from `app/globals.css`. No new UI library.

---

## 10. Phases

**Phase 0: Discovery (docs only).** Confirm everything in §3 still holds. Report the Vercel plan (cron granularity) and recommend QStash or per-minute cron. List the new env vars and the accounts Bryan must create (Twilio number and A2P, QStash, Checkr). Draft `docs/backup-bench.md` (overview, setup, operations). Add this plan to `plans/README.md`.

**Phase 1: Data and settings.** `lib/bench/contract.ts` and validation, Firestore rules blocks and rules tests, a settings API and the Settings tab, the nav entry, and an empty-state page shell with tabs. Add an emulator seed script (`scripts/bench-seed.mjs`) that creates about 25 fake people across stages, tiers and areas.
*Done when:* rules tests pass, and in the emulator an admin sees the seeded settings and can edit them.

**Phase 2: Application and screening.** `/walk-with-us` page and form, the apply API, resume upload, knockouts, emails, the Applicants tab, stage actions, the AI summary behind its flag, the Indeed post copy, and Playwright coverage of the form (steps and full layouts, mobile viewport).
*Done when:* a test application lands in the review queue with the right coverage-fit chip, a knockout gets rejected with an email (mocked), and booking-form tests still pass.

**Phase 3: Callouts.** Twilio client wrapper (mockable), inbound webhook, `smsParse`, `candidates`, the callout create/advance/cancel/assign flows, QStash scheduling, the Callouts tab and wave timeline.
*Done when:* unit and integration tests cover two simultaneous YES replies producing exactly one winner, wave A→B→C escalation, unfilled alert, cancel, late YES, bare YES with one open offer and with several, STOP, and a duplicate `MessageSid`. Also do one manual end-to-end run with Twilio test credentials.

**Phase 4: Coverage and warm bench.** `coverage.ts` and the heatmap, `tiers.ts`, the nightly and ping cron routes (manual trigger only), the availability magic link page, inactive handling, the digest email, and the Walkers tab.
*Done when:* editing seeded availability changes the heatmap, and a simulated pair of missed pings makes someone inactive.

**Phase 5: Background checks.** Checkr invitation on conditional offer, the webhook with signature check, clear → bench, and consider → notify.
*Done when:* the Checkr staging flow moves a test person to bench.

**Phase 6 (only if approved).** Walker texts `OUT` to create a draft callout; "Reply DONE" completion check-ins; a short-lived client-details page for the winner; reports (fill rate, time-to-fill, bench growth by source).

---

## 11. Testing and quality bar

- Pure logic in `lib/bench/*` gets unit tests. That covers `smsParse` (`yes`, `YES 4821`, `Yes!`, `y`, `stop`, `Stop.`, emoji and whitespace variants), `candidates`, `coverage`, `tiers` and `knockouts`.
- Firestore and Storage rules tests for every new collection and path.
- Route tests for auth (401/403 on every admin bench route), malformed bodies, rate limits, signature failures (Twilio, QStash, Checkr), and idempotency.
- Playwright: the application page at desktop and mobile widths. The admin bench page behind admin auth follows the existing `admin-auth.spec.ts` approach.
- `npm run check` must pass at every phase. Don't send real SMS or email during tests. Use the existing Resend mocking patterns and a mockable Twilio wrapper.

---

## 12. Open decisions (use the defaults, and list these in the Phase 0 report)

| # | Decision | Default until answered |
|---|---|---|
| 1 | W-2 or 1099 for backups | Neutral copy, `employmentType` unset |
| 2 | Backup pay rate, and any retainer or guaranteed shifts | `[PAY]` placeholder in the Indeed copy |
| 3 | Staffing areas and time blocks | Williamsburg and Greenpoint; 7–11 / 11–3 / 3–8 |
| 4 | Is `/walk-with-us` in the sitemap? Footer link? | Not in the sitemap, no footer link |
| 5 | Allow `/walk-with-us` during `LAUNCH_MODE` | Proposed yes (coordinator edits `proxy.ts`) |
| 6 | QStash, or per-minute Vercel cron | QStash |
| 7 | Counsel sign-off on AI summaries and auto-invite (LL144) | Both off |
| 8 | Budget: Twilio number and A2P fees plus per-SMS cost, Checkr per check, QStash tier | Build against test and staging only |
| 9 | Does Not The Rug use scheduling software (Time To Pet, etc.) that callouts should sync with later? | No sync in v1 |
| 10 | Luis's alert phone and admin emails | From settings; `FOUNDER_EMAIL` for email |

---

## 13. Phase reports

### Phases 0–2 (2026-09-29), branch `feat/backup-bench`, worktree `../NotTheRug-bench`, uncommitted

The owner approved Phases 0–2 together; Phases 3–5 wait on Twilio, QStash and Checkr accounts.

**Phase 0 (discovery).** Everything in §3 still holds. Differences found:
- `fsQueryCollection` orders and limits but cannot filter. That is fine for the bench's size (the whole collection is read).
- `lib/server/firebaseStorage.ts` has no signed-URL helper and no emulator support. Resumes are streamed to admins through `GET /api/admin/bench/people/[id]/resume`, which runs `verifyAdmin` on every read, instead of a signed URL.
- Vercel caps a function request body at 4.5MB, so the resume limit is **4MB**, not 5MB.
- Vercel plan: the linked team is "baiee's projects". The API does not expose the plan tier. If it is Hobby, cron runs daily only, so **QStash** (the §12 #6 default) is required for wave timers.
- The base commit `f47fd58` does not typecheck on its own: `ClosingTrust`/`SiteFooter` use `opensWelcomeModal`, which exists only in the owner's uncommitted `TrackedCtaLink.tsx` edit. Checks below ran with that WIP applied temporarily, then reverted. Nothing of it is on this branch.
- New env vars, accounts to create and A2P steps: `.env.example` and `docs/backup-bench.md`.

**Phase 1 (data and settings).** `lib/bench/contract.ts` and `validation.ts`; deny-all rules for every `bench*` collection, including the callout `offers` subcollection; rules tests; settings API and Settings tab; **Backup Bench** nav entry after Scheduled Leads; a tabbed page with `?tab=`; `scripts/bench-seed.mjs` (`npm run bench:seed`, 25 people, refuses to run without the emulator). The Coverage and Callouts tabs are placeholders that name their phase.

**Phase 2 (application and screening).** `/walk-with-us` (not in the nav or sitemap), with a 4-step form supporting `layout="steps"|"full"`; `POST /api/bench/apply` (capped body, honeypot, per-IP limit, idempotent per email); `POST /api/bench/apply/resume` (single-use 30-minute token, magic-byte check, private Storage); knockouts; applicant emails; Applicants tab (review queue plus a stage filter) and Walkers tab (search plus a stage filter), where each card shows every answer, the coverage-fit chip, the week grid, the resume, notes and the stage actions from `lib/bench/stages.ts`; AI summary behind `BENCH_AI_SUMMARIES_ENABLED` (answers only, no contact details, runs in `after()`); Indeed copy in `docs/backup-bench-indeed-post.md`. `/walk-with-us` is added to the analytics route allowlist, so page views (never answers) reach the dashboard.

Deviations: the page reuses the shared `#home-closing-band-shell` / `#home-contact-sheet-*` ids, because `globals.css` paints the sheet from them (as `/signup` does); every new container has its own `walk-with-us-*` id. The Applicants pipeline is a stage filter plus a list at every width, not a desktop board. The manual stage actions from §7.4 (shadow done, conditional offer, background check clear) are included so a bench can form before Phase 5. Message templates in Settings wait for Phase 3.

**Commands and results**
- `npm run check`: lint clean (1 pre-existing warning), typecheck clean with the WIP applied, 506 tests pass (52 emulator-gated tests skipped).
- `firebase emulators:exec … vitest rules-*`: 18/18 pass, including 3 new bench cases.
- `npm run build`: succeeds; all 8 new routes build.
- `playwright test tests/e2e/walk-with-us.spec.ts` against `next start` plus the seeded emulator: 4/4 pass (desktop and iPhone 13).
- Live `POST /api/bench/apply` to the emulator: record stored at `review`, phone normalized, the non-allowlisted UTM value dropped, email skipped because of the sandbox sender.
- No real SMS or email was sent, no background check was run, `vercel.json` is unchanged and nothing was deployed.

**Open for the owner / coordinator**
- `proxy.ts`: add `/walk-with-us` to `ALLOWED_PREFIXES` if recruiting starts during `LAUNCH_MODE` (§12 #5).
- `next.config.ts`: no change needed (`/api/admin/analytics` works with no tracing entry either). Re-check on the first preview deploy.
- Deploy the Firestore rules. Commit the owner's `TrackedCtaLink` WIP (or rebase onto it) so the branch typechecks on its own.
- The admin page was not signed into in a browser during this run (Google sign-in). Luis or Bryan should confirm it on a preview.
- §12 decisions 1–10 are unchanged: defaults in use.

---

## Handoff prompt (paste into Claude Code with Sonnet)

> Read `plans/011-backup-walker-bench.md` completely, then `AGENTS.md`, `README.md`, `PRODUCT.md`, `docs/scheduled-jobs.md`, `firestore.rules` and `plans/002-claude-handoff.md`. Run `git status` and preserve any uncommitted work. Create branch `feat/backup-bench`. Execute **Phase 0 only**. Append your report to §13 of the plan, then stop and wait for my approval before Phase 1. Do not send real SMS or email, run real background checks, change `vercel.json`, or deploy.

### Update (2026-09-29, later): on-call questionnaire and Team Applications

- `/walk-with-us` is now the owner's part-time, on-call questionnaire ("Join Our Team"), led by the on-call terms. Answers are stored as given under `answers` (`OnCallAnswers` in `lib/bench/contract.ts`), plus `workTypes` and the part-time/full-time follow-ups. Knockouts: not interested in on-call work, can't reach Williamsburg, won't train, no availability. The physical-duties answer never rejects. Age and work-authorization questions were dropped at the owner's direction (counsel to confirm).
- New admin page **Team Applications** (`/admin/dashboard/applications`), tracked like Scheduled Leads: search, stage filter, sort, cards or line items, Refresh, Export CSV (`lib/bench/applicationFields.ts`). It reads the same `GET /api/admin/bench/people` as Backup Bench.
- `tests/unit/bench-emulator-roundtrip.test.ts` proves a submission through the real apply route comes back, with every answer, from the admin route.
