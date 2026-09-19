# Analytics operations

How to turn website tracking on and off, what it costs, and what to check if
the numbers on `/admin/dashboard` look wrong. Written for the site owner;
sections marked **Developer** assume comfort with environment variables and
the codebase.

This covers the first-party tracking system described in
[`plans/003-admin-dashboard-and-tracking.md`](../plans/003-admin-dashboard-and-tracking.md).
Nothing here is a third-party analytics product — every number comes from
your own Firestore database.

## What gets measured

This is the locked, final contract as of the tracking-coverage pass
([`plans/004-frontend-tracking-coverage.md`](../plans/004-frontend-tracking-coverage.md)).
Nothing is measured that isn't listed here — a control not in the CTA table
below simply isn't on the site, and a dashboard row never appears for it.

### Event dictionary

| Event | What it means | Where it shows up on the dashboard |
| --- | --- | --- |
| Page view | A tracked page finished loading, either on first load or by clicking to another page. | Pageviews, sessions, the daily trend chart. |
| Engagement | The visitor did something meaningful on the page: scrolled through about half of it, stayed 15+ seconds, or clicked a tracked button. | "Engaged Visits" percentage — replaces the usual "bounce rate." |
| CTA click | The visitor clicked one of the 16 specific buttons/links listed in the CTA reference below. | CTA Clicks table, grouped by Booking / Contact / Phone / Email / Service discovery. |
| Booking form start | The visitor began filling out the booking form for real (not just loading the page). | "Form Started" row in the Booking Funnel. |
| Booking step reached | The visitor reached a new step of the booking form (Details, Dog, Schedule, Review) for the first time in that attempt. | Step rows in the Booking Funnel. |
| Lead saved | The booking form was submitted and the inquiry was actually saved to the Leads system. | Funnel only — see note below. The **Inquiries** headline number comes from the Leads system directly, not from this event. |
| Scheduling dialog opened | The visitor opened the scheduling (Calendly) dialog. | "Scheduling Dialog Opened" row in the Booking Funnel. |
| Appointment completed | The scheduling provider confirmed a booked appointment. | "Appointments Scheduled" (its own number, never added to Inquiries) and "Scheduled via Calendly" in the funnel. |

**Booking-form and scheduler activity is funnel data, never a CTA row.**
Starting the form, reaching a step, saving a lead, opening the scheduler, and
completing an appointment all live in the Booking Funnel panel only. They are
never also counted as a CTA click, so nothing is double-counted between the
two panels.

### CTA reference

Every button/link the dashboard can report on, in the groups they appear in
on the CTA Clicks table:

| Group | ID | Label shown on dashboard | Where it lives | What it does |
| --- | --- | --- | --- | --- |
| Booking | `nav_book` | Top nav: Book | Desktop top navigation | Goes to `/book` |
| Booking | `mobile_menu_book` | Mobile menu: Book | Mobile navigation menu | Goes to `/book` |
| Booking | `hero_book` | Homepage hero: Book | Homepage, hero section | Goes to `/book` |
| Booking | `closing_trust_book` | Homepage closing section: Book | Homepage, closing/trust section | Goes to `/book` |
| Booking | `neighborhood_detail_book` | Williamsburg page: Book | Williamsburg neighborhood page | Goes to `/book` |
| Booking | `footer_book` | Footer: Book | Site footer | Goes to `/book` |
| Contact | `nav_contact` | Mobile menu: Contact | Mobile navigation menu | Goes to `/contact` |
| Contact | `footer_contact` | Footer: Contact | Site footer | Goes to `/contact` |
| Contact | `neighborhood_detail_contact` | Williamsburg page: Ask about coverage | Williamsburg neighborhood page | Goes to `/contact` |
| Phone | `contact_phone` | Contact page: Phone tap | Contact page, contact card | Taps a phone number (`tel:` link) |
| Phone | `services_phone` | Services page: Phone tap | Services page | Taps a phone number (`tel:` link) |
| Email | `contact_email` | Contact page: Email tap | Contact page, contact card | Taps an email address (`mailto:` link) |
| Email | `services_email` | Services page: Email tap | Services page | Taps an email address (`mailto:` link) |
| Service discovery | `hero_view_services` | Homepage hero: View services | Homepage, hero section | Goes to `/services` |
| Service discovery | `nav_services` | Top nav: Services | Desktop top navigation | Goes to `/services` |
| Service discovery | `footer_services` | Footer: Services | Site footer | Goes to `/services` |

A tap-to-call or tap-to-email is intent to reach out, not proof the call or
email actually happened — there's no way to measure that from the website.
Outbound links (Yelp, Google, Instagram) exist on the site but are
deliberately not tracked in this release; see `lib/analytics/events.ts` for
that decision if it needs revisiting later.

**Developer note:** the source of truth for this table is `LIVE_CTA_IDS` in
`lib/analytics/events.ts` and the label map in
`components/admin/analytics/ctaLabels.ts`. The label map is typed so that
adding an ID to the event contract without adding its owner-facing label and
group is a TypeScript compile error, not a silent gap — this table cannot
drift out of sync with the dashboard without a broken build.

## The three switches

Tracking is controlled by three environment variables. All three default to
**off**, so nothing is collected unless someone deliberately turns it on.

| Variable | What it does | Where it applies |
| --- | --- | --- |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Master switch. `true` turns on collection in the visitor's browser. Anything else (blank, `false`, unset) means nothing is ever sent. | **Build-time.** Baked into the site when it's built — changing it requires a new deploy, not just an env var edit on a running server. |
| `NEXT_PUBLIC_ANALYTICS_TEST_MODE` | `true` stamps every event as test traffic. Test traffic never shows up in your real numbers — it's a separate view (see below). | Build-time, same as above. |
| `ANALYTICS_TRACKING_DISABLED` | Emergency stop. `true` makes the collection endpoint accept and immediately discard every event — nothing is written to the database. | **Runtime.** Takes effect the moment you set it, no rebuild needed. Use this if you need to halt collection right now and can't wait for a deploy. |

**Developer note:** the first two are `NEXT_PUBLIC_*`, which Next.js inlines
into the JavaScript bundle at build time. Setting them in a `.env` file and
restarting the server is **not enough** — they only take effect on the next
`npm run build`. `ANALYTICS_TRACKING_DISABLED` is read fresh on every request
server-side, so it works immediately without a rebuild.

## Turning tracking on

1. Set `NEXT_PUBLIC_ANALYTICS_ENABLED=true` in the deploy's environment.
2. For a first run, also set `NEXT_PUBLIC_ANALYTICS_TEST_MODE=true`. This
   keeps every event tagged as test traffic so you can prove collection
   works without touching your real numbers.
3. Deploy/build with those variables set.
4. Visit the live site yourself a few times — home page, a service page,
   click a "Book" button.
5. In the admin dashboard, add `?testMode=1` to the analytics report URL (or
   use the dashboard's test-mode toggle, if one is wired in) to see that test
   traffic. Confirm the pageviews and clicks you just made show up.
6. Once you're confident it's working, redeploy with
   `NEXT_PUBLIC_ANALYTICS_TEST_MODE=false` (or remove it) to switch to
   collecting real business traffic. Leave `NEXT_PUBLIC_ANALYTICS_ENABLED=true`.

## Turning tracking off

- **Right now, no deploy:** set `ANALYTICS_TRACKING_DISABLED=true` on the
  running server. Every visitor request is still accepted (so nothing
  breaks or errors for them) but nothing is written. Unset it to resume.
- **Permanently / before you're ready:** set `NEXT_PUBLIC_ANALYTICS_ENABLED`
  back to blank or `false` and redeploy. The browser will never even attempt
  to send an event.
- Turning tracking off (either way) never affects **saved inquiries** — the
  booking form and its lead records are a completely separate system and
  keep working normally whether or not analytics is on.

## Preview-then-production activation sequence

This is the order the feature was designed to be turned on in, and the order
it was verified in during this acceptance pass:

1. **Local/emulator proof (developer only).** Run `npm run emulators`, then
   the emulator-backed test suites (see Verification below). This proves the
   write → read contract end to end against a real (local) Firestore, with
   no effect on the live site.
2. **Preview deploy, test mode on.** Deploy with
   `NEXT_PUBLIC_ANALYTICS_ENABLED=true` and
   `NEXT_PUBLIC_ANALYTICS_TEST_MODE=true`. Click through the real site on
   that preview URL. Confirm events appear under `?testMode=1` in the
   dashboard and nowhere else.
3. **Production, test mode on (optional but recommended).** Deploy to the
   real domain still in test mode, click through it yourself once, confirm
   the same thing there. This catches any environment difference between
   preview and production (allowed origins, project id, etc.) before real
   visitors are counted.
4. **Production, test mode off.** Redeploy with
   `NEXT_PUBLIC_ANALYTICS_TEST_MODE=false`. From this point on, real visitor
   traffic is being recorded. Note the date — that's your "tracking starts
   on" date, and the dashboard will not imply any history before it.

Each step is a separate, deliberate deploy. Nothing about activation is
automatic or scheduled.

## Expected read/write volume

At the owner's expected traffic (under ~100 visits/day, per the plan's
locked scope decisions):

- **Writes:** roughly 1 write per tracked event (pageview, click, booking
  step, etc.), plus 1 counter write per unique visitor IP per minute for
  rate limiting. A single visit that reads a page, scrolls, and clicks
  "Book" is on the order of 4–8 events. At 100 visits/day that's very
  roughly **500–1,000 writes/day** — comfortably inside Firestore's free
  tier (which measures in the tens of thousands of writes/day).
- **Reads:** the admin dashboard queries a bounded date range every time it
  loads (no background polling — see the plan's decision 3). Each dashboard
  load is a handful of range queries, not a scan of all historical data. A
  business owner checking the dashboard a few times a day costs very little.
- There is deliberately **no rollup/aggregation layer** in this release —
  every report is computed directly from the raw events, bounded by date.
  This keeps every number exact, at the cost of reads growing with the
  number of events in the selected range. That tradeoff was a locked
  decision, not an oversight, and is fine at this traffic level; it should
  be revisited if traffic grows well past ~100 visits/day.

## What to expect at low traffic (under ~100 visits/day)

The site's actual traffic is well under 100 visits a day, and the dashboard
was built for that scale. Small numbers are normal — they are not a sign
something is broken:

- On the **Today** view, most individual CTA rows will show single digits or
  a real **0**. A 0 next to a button that is genuinely on the site is an
  honest measured zero, not a missing/broken button — see the CTA reference
  above for which buttons are actually tracked.
- It's normal for an entire group (e.g., everyone who visited today happened
  to call instead of email) to show all zeros in another group for a single
  day. Look at **7 Days** or **30 Days** for a steadier picture.
- **Engaged Visits %** can swing widely (e.g., 0% one day, 100% the next)
  when there are only a handful of sessions. That's expected with small
  denominators, not a bug — it settles down over the 7-day and 30-day views.
- **Sessions are visits, not people.** Someone on their phone and later their
  laptop counts twice. Don't read the session count as a headcount, and
  don't expect it to match a follower/customer count.
- If a number looks unexpectedly low, first check whether part of the
  selected range falls before the "Tracking starts on [date]" note — see
  below.

## Retention

Every analytics document now carries its own expiry date, written when the
document is created:

| Collection | Field | Expires |
| --- | --- | --- |
| `analytics_events` | `expiresAt` | 13 months after the event was received |
| `analyticsRateLimits` | `expiresAt` | 48 hours after the counter's minute |

The field is a real Firestore timestamp, which is what a TTL policy needs.
Nothing deletes the documents until that policy exists — stamping is done in
code, expiring is a project setting.

**Developer — one-time TTL setup (not yet applied to any deployed project).**
Run these once per Firebase project, replacing `<project-id>` with the value
of `FIREBASE_ADMIN_PROJECT_ID`:

```bash
gcloud firestore fields ttls update expiresAt \
  --collection-group=analytics_events --enable-ttl --project=<project-id>

gcloud firestore fields ttls update expiresAt \
  --collection-group=analyticsRateLimits --enable-ttl --project=<project-id>
```

Verify with:

```bash
gcloud firestore fields ttls list --project=<project-id>
```

Firestore deletes expired documents within about 24 hours of their expiry, so
"expired" and "gone" are not the same minute. Deletions count as ordinary
document deletes for billing.

**Backlog written before the policy.** Documents created before this change
have no `expiresAt`, so TTL will never touch them. The protected manual
cleanup endpoint stays for exactly that case — see
`app/api/admin/analytics/cleanup/route.ts`. It is bounded (at most 300
deletes per collection per run), idempotent, and reports whether more remain,
so an old backlog is cleared by calling it a few times.

## If the dashboard looks empty

This is the short version — for anything not covered here, see "If the
numbers look wrong" below. An empty-looking dashboard almost always means one
of these four things. The dashboard itself tells you which one with a banner
at the top of the page:

1. **Tracking is disabled.** A yellow banner reading "Tracking is off right
   now" means `NEXT_PUBLIC_ANALYTICS_ENABLED` was not set to `true` on the
   currently-deployed build. Nothing is being recorded until that changes and
   the site is rebuilt/redeployed.
2. **There's no data yet.** A banner reading "Tracking has not started yet —
   no events have been recorded" means tracking is on but no visit has been
   recorded ever, or not yet in the selected date range. This is expected
   right after tracking is first turned on.
3. **The request failed.** A red banner reading "Could not load analytics:
   …" with a Retry button means the dashboard couldn't reach the server this
   time — a network hiccup or a server-side error. Click Retry. If it keeps
   failing, that's a developer issue (check server logs), not a "no
   visitors" situation.
4. **You're looking at test-mode-only data (or the reverse).** A banner
   reading "Showing test/preview traffic only" means you're viewing
   `?testMode=1` — practice/QA clicks, not real visitors, and real traffic
   is hidden while this is on. If you expect to see real numbers, make sure
   `?testMode=1` is off. Conversely, if you just ran a test-mode walkthrough
   and don't see it, make sure `?testMode=1` **is** on — real and test data
   are always two separate views and never blended together.

## If the numbers look wrong

Check in this order:

1. **Is tracking actually on?** Confirm `NEXT_PUBLIC_ANALYTICS_ENABLED=true`
   was set on the build that's currently deployed (not just in a `.env`
   file — see the build-time note above). If it wasn't set when the site was
   last built, nothing has been collected since that deploy, full stop.
2. **Is the kill switch accidentally on?** Check whether
   `ANALYTICS_TRACKING_DISABLED=true` is set anywhere in the current
   deploy's environment. If so, every event has been silently discarded
   since it was set — this is intentional emergency-stop behavior, not a
   bug, but it's easy to forget you left it on.
3. **Are you looking at test data by accident, or missing it?** Real numbers
   and test-mode numbers are two separate views (`?testMode=1` switches
   between them). Make sure you're looking at the one you mean to.
4. **"Tracking starts on [date]"** — the dashboard will not show activity
   before the first event was ever recorded. If a number looks low for a
   date range, check whether part of that range is before tracking started.
5. **Ad blockers and privacy browsers.** Some visitors' browsers block
   first-party tracking scripts or `sendBeacon` calls outright. This system
   makes no claim to count every visitor — it's directional, not a legal or
   audited traffic count. A gap between this and, say, a hosting provider's
   raw request logs is expected and not a bug.
6. **Bots and scripts are filtered, not perfectly.** Requests with no
   User-Agent, or one that names itself a bot/script/crawler, are silently
   excluded rather than counted. This catches the obvious cases only — it is
   not a claim of perfect human-only counting.
7. **Sessions are not people.** The dashboard reports "sessions" or
   "visits," never "unique visitors." Someone browsing on their phone and
   later their laptop counts as two sessions. Don't read a session count as
   a headcount.
8. **Developer:** if the dashboard shows a "partial failure" status or a
   truncated-data note, one of its two data dependencies (raw events, or the
   leads collection) failed or hit its row ceiling for that query — check
   server logs for the failing Firestore call rather than assuming the
   number itself is simply wrong.

## Verification performed for this release (developer-only)

This section records what was actually checked against a running Firestore
emulator before production activation, per the plan's A6 acceptance phase.
See `tests/unit/analytics-emulator-roundtrip.test.ts`,
`tests/unit/analytics-rate-limit-fail-open.test.ts`, and
`tests/unit/rules-analytics.test.ts`.

- The full write (`POST /api/track`) → read (`getAnalyticsReport`) path was
  exercised against a real (emulator) Firestore for every event type:
  `page_view`, `engagement`, `cta_click`, `booking_form_start`,
  `booking_step`, `lead_saved`, `scheduling_dialog_opened`,
  `appointment_completed`. Field names were confirmed to match exactly
  between writer and reader (`receivedAt`, `clientTs`) with no stray `ts`
  field ever stored.
- Duplicate event delivery (sequential and concurrent) was confirmed to
  produce exactly one stored document and no inflated count.
- The per-IP rate limiter was confirmed to actually engage at its threshold
  (60 events/minute) and to fail open — continuing to accept and store
  traffic — when its own Firestore counter write throws.
- `mode:'test'` events were confirmed excluded from the default report and
  visible only when explicitly requested, in both directions.
- `ANALYTICS_TRACKING_DISABLED=true` was confirmed to write nothing at all.
- Bot-identifying and missing User-Agent requests were confirmed to be
  accepted-but-discarded, writing nothing.
- Hostile payloads (an email, a phone number, a dog name, free-text notes, a
  full referrer URL with a query string, and an un-allowlisted route) were
  posted directly at the server route and the **actual stored Firestore
  documents** were inspected field-by-field to confirm none of it reached
  storage — not just that the response looked clean.
- Direct client-SDK reads and writes to `analytics_events` and
  `analyticsRateLimits` were confirmed denied by `firestore.rules`,
  including for a signed-in admin account (server routes only).
- New York calendar-day bucketing was confirmed correct at the exact
  midnight boundary and across both 2026 DST transitions (spring-forward
  and fall-back), using directly-written fixture events at real Firestore.
- A gated Playwright end-to-end test
  (`tests/e2e/analytics-pageview.spec.ts`) exists for "a real browser visit
  produces a page_view." It could not be run for real during this pass: the
  server already running on port 3000 was built without
  `NEXT_PUBLIC_ANALYTICS_ENABLED=true` (confirmed via `.env.local`), and
  rebuilding in place would have risked disrupting that live server. The
  test skips with an explicit reason rather than reporting a false pass; run
  it for real with `E2E_ANALYTICS_ENABLED=1` against a build made with
  tracking enabled.

**Not verified by this pass** (explicitly out of scope or requiring tools
not available in this environment): the admin dashboard's authentication
boundary (401/403/500) was not re-tested here — it already has its own
passing mocked-Firestore test suite
(`tests/unit/admin-analytics-route.test.ts`) that this pass did not modify
or re-verify against a live server; whether saved inquiries remain correct
specifically *while* analytics is failing/unavailable (as opposed to
disabled) was not directly exercised; and no manual UI/visual check of the
dashboard itself was performed.
