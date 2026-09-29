# Backup walker bench

The plan is [plans/011-backup-walker-bench.md](../plans/011-backup-walker-bench.md).
This page covers what is built, how to set it up, and how to run it.

## What exists today (Phases 0–2)

| Piece | Where |
| --- | --- |
| Public application, linked from Indeed | `/walk-with-us` (`app/(marketing)/walk-with-us/page.tsx`, `components/bench/WalkerApplicationForm.tsx`) |
| Application intake | `POST /api/bench/apply`, then `POST /api/bench/apply/resume` for an optional resume |
| Admin page | `/admin/dashboard/applications`, the **Team Applications** entry in the admin nav. The Backup Bench page and tab were removed. |
| Admin APIs | `app/api/admin/bench/**`. Every handler calls `verifyAdmin` |
| Pure logic | `lib/bench/` (contract, validation, knockouts, coverage, stages, resume) |
| Server I/O | `lib/server/bench.ts`, `benchIntake.ts`, `benchEmail.ts`, `benchSummary.ts` |
| Email copy | `lib/email/bench-templates.ts` |

Coverage heatmap, callouts and SMS dispatch, tiers, check-in pings and background checks
come in Phases 3 to 5. Until then the Coverage and Callouts tabs say so.

## Where every answer goes

Each application becomes one `benchPeople/{id}` document, keyed by a hash of the email
address, so the same person applying twice stays one record. The form is the owner's
part-time, on-call questionnaire (2026-09-29). Contact details (full name, email, phone
stored as E.164) and the weekly availability grid are stored at the top level. Every
other answer is stored as given under `answers` (see `OnCallAnswers` in
`lib/bench/contract.ts`): home neighborhood, Williamsburg travel, on-call interest,
24-hour coverage, notice needed, same-day emergencies, response time, notification
channel, travel time, weekly capacity, recurring commitments, training start date, dog
experience, experience with special dogs, multi-dog comfort, physical duties, training
and phone protocol, the three scenario answers, why on-call fits, the experience
summary and anything else. The record also keeps `confirmedAt` (the on-call
confirmation), SMS consent with its timestamp (only offered when Text is the chosen
channel), and allowlisted `src`/UTM values. Unknown UTM values are dropped, not stored.

The admin **Applicants** and **Walkers** tabs read all of it through
`GET /api/admin/bench/people`. Expand a card to see every answer, the week grid, the
resume, the stage history and Luis's notes.

Analytics sees only an anonymous page view of `/walk-with-us`. No applicant data goes
into analytics events.

## Pipeline

`applied → review → shadow_invited → shadow_scheduled → shadow_done → offer_conditional
→ (background_check) → bench`, plus `rejected`, `inactive` and a separate **hold** flag.
Allowed moves are in `lib/bench/stages.ts`. The server enforces them, and the admin page
shows only the buttons for the current stage.

| Action | Emails the applicant |
| --- | --- |
| Application received | "We got your application" |
| Knockout (can't reach Williamsburg, won't train, no availability) | A kind "can't move forward" note |
| Invite to shadow | Invite, with the shadow booking link from Settings |
| Reject | A kind decline |
| Conditional offer | Offer, conditional on a background check run only after the offer |
| Mark background check clear | None. Moves the person to the bench at tier B (a pinned tier is kept) |

Emails are skipped when `RESEND_FROM_EMAIL` is a `@resend.dev` sandbox sender. Each
outcome is recorded on the person under `notifications`.

## Compliance defaults (confirm with counsel)

- **NYC Local Law 144.** Automatic rejection happens only on the applicant's own
  objective answers about the role. The physical-duties question never rejects
  anyone; "No" or "Would like to discuss" is an accommodation conversation. The review queue sorts by a fixed rule: fills an under-target slot
  first, then oldest first, with held applicants last. AI output is never used to sort.
  The AI summary sits behind `BENCH_AI_SUMMARIES_ENABLED` (off), sends only the answers
  (no name, contact details, home neighborhood or physical-duties answer), and is told not to score or recommend. The form shows
  the AI-use notice. `autoInviteOnGap` stays off in Settings until counsel confirms it.
- **Fair Chance Act.** The form asks nothing about criminal history. The offer email
  says the background check runs only after the offer.
- **SMS consent.** A separate checkbox, shown only when the applicant picks Text as
  their channel. It starts unchecked and is optional; `smsConsentAt` records when it
  was given. Nothing texts anyone yet.
- **Not asked, by the owner's choice:** age and US work authorization. Both would
  normally be knockouts; confirm with counsel whether they belong on the form or in
  onboarding.
- **Data.** Every `bench*` Firestore collection and every resume under
  `private/bench-resumes/` is denied to client SDKs. Admins read resumes only through
  `GET /api/admin/bench/people/{id}/resume`, which checks the admin whitelist on every
  read. That stands in for the plan's short-lived signed URL.

## Setup

1. Deploy the Firestore rules: `firebase deploy --only firestore:rules`. This needs
   authorization; the new `bench*` blocks are all deny-all.
2. The Settings page was removed with the Backup Bench page, so the defaults in
   `lib/bench/contract.ts` apply (areas, time blocks, shadow booking link). Change them there or through `/api/admin/bench/settings`.
3. Post the job on Indeed using [backup-bench-indeed-post.md](backup-bench-indeed-post.md),
   linking to `https://<domain>/walk-with-us?src=indeed&utm_source=indeed&utm_medium=job_post&utm_campaign=backup-bench`.
4. While `LAUNCH_MODE=true`, `proxy.ts` redirects `/walk-with-us` to `/contact`. Add
   `/walk-with-us` to its `ALLOWED_PREFIXES` if recruiting should start before launch.
   That file belongs to the coordinator.

### Accounts needed for later phases

| Service | For | Manual steps for Bryan |
| --- | --- | --- |
| Twilio | Phase 3 SMS | Buy a local number, then complete **A2P 10DLC** brand and campaign registration (a few days to weeks). The campaign sample messages should match the callout text in plan §7.5. Unregistered 10DLC traffic is filtered by carriers. |
| Upstash QStash | Phase 3 wave timers | Create a QStash project and copy the token and both signing keys. |
| Checkr | Phase 5 | Create a staging account first; production needs Checkr's review of the use case. |

### Local development against the emulator

```bash
npm run emulators                                  # needs Java; see the rules tests' skip message
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_ADMIN_PROJECT_ID=<same id as the dev server> \
  npm run bench:seed -- --admin you@example.com    # 25 fake people across every stage
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run dev
```

The seed script refuses to run without `FIRESTORE_EMULATOR_HOST`. Admin sign-in still
uses real Firebase Auth. `--admin` writes that account's `admins/{email}` document into
the emulator so the whitelist check passes.

## Operations

- **New applicants:** Applicants tab, then Review queue. Expand a card, read it, then
  Invite to shadow, Hold or Reject.
- **After the shadow walk:** Mark scheduled, then Shadow walk done (with an optional
  1–5 rating), then Conditional offer, then Mark background check clear.
- **Recruiting focus:** in Settings, tick **Recruiting** on an area. The application then
  says "We especially need walkers in …".
- **Stopping intake quickly:** turn every area off in Settings. The form will then
  reject submissions for having no area. For a hard stop, remove the route.
