# Operations runbook

For the site owner and whoever maintains the site. Plain language. Part A is what to do. Part B is the
state of production as last measured, so you can tell what has and has not been checked.

Evidence date for every "measured" fact below: **2026-10-05** (Plan 013 phase P0, read-only checks; see
`plans/reports/013-P0-report.md`). Facts marked **UNVERIFIED** were not checked, or cannot be checked
without access this runbook's author did not have. Nothing here is a recovery-time or recovery-point
guarantee, a compliance claim, or a statement that monitoring exists unless it says so.

---

# Part A: operator steps

## A1. Who owns what

| Service | What it holds | Where | Access today |
| --- | --- | --- | --- |
| GitHub | Source code, CI (GitHub Actions) | Repository `Bai-ee/nottherug`, branch `main` | Owner's account |
| Vercel | Hosting, production deploys, cron, environment variables | Team `baiees-projects`, project `nottherug`; production alias `nottherug-ten.vercel.app` | Owner's account |
| Firebase / Google Cloud | Firestore (leads, applicants, analytics), Storage (photos, resumes), Auth (admin sign-in), security rules | Project `not-the-rug`, Firestore database `(default)` in `nam5` | **One owner principal** (measured) |
| Resend | Outgoing email (inquiry notifications, applicant emails, daily digest) | Resend account holding the API key named in `RESEND_API_KEY` | UNVERIFIED (not checked) |
| Calendly | Scheduling link opened after an inquiry | URL in `NEXT_PUBLIC_CALENDLY_URL` | UNVERIFIED |

**Single point of failure: every service above is held by one person, and Firebase has exactly one
project owner.** Add a second owner in each of GitHub, Vercel, Firebase (IAM, role Owner) and Resend
so access survives one lost account. See checklist item 9.

## A2. Environment variables

Names and purpose only. Never paste values into a document, ticket or chat. Set them in
Vercel > Project > Settings > Environment Variables. `.env.example` is the same list with inline
comments; `.env.local` is the local-development copy and is never committed.

Environments measured on 2026-10-05: **Production** and **Preview** had the same set. **Development**
had only the Firebase and brief variables. Note that Preview uses the **same Firebase and Resend
credentials as Production** (see checklist item 8).

| Name | Required? | Purpose |
| --- | --- | --- |
| `PUBLIC_BASE_URL` | Required | Public origin for canonical URLs, social images, sitemap/robots and email links. Must be the host that really serves the site. Read at **build** time for the static `robots.txt` and `sitemap.xml`, so a change needs a redeploy. Any path or trailing slash is stripped; if it is unset or not a valid http(s) URL the build falls back to `https://nottherug.com` (an invalid value also logs a warning). That is the chosen canonical domain, but it is not attached to the Vercel project yet, so until the domain cutover production must keep `PUBLIC_BASE_URL` on the host that serves it today. |
| `NEXT_PUBLIC_CALENDLY_URL` | Required for live scheduling | Scheduling link. If empty, inquiries still save and the visitor sees an honest next step. |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | Required | Browser Firebase config (public by design; access is controlled by the rules files). |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Required (secret) | Server service account. Without them nothing can be saved. |
| `RESEND_API_KEY` | Required (secret) | Sends all email. |
| `RESEND_FROM_EMAIL` | Required | Sender address. A `@resend.dev` sender only delivers to the Resend account's own address, and customer confirmations are then skipped. |
| `FOUNDER_EMAIL` | Required | Where new-inquiry notifications and the daily digest go. |
| `CRON_SECRET` | Required for the scheduled digest (secret) | Without it every `/api/cron/*` request is rejected. |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Optional | Must be exactly `true` for visitor tracking. Build-time: changing it needs a redeploy. |
| `NEXT_PUBLIC_ANALYTICS_TEST_MODE` | Optional | `true` marks events as test data, excluded from real dashboard numbers. |
| `ANALYTICS_TRACKING_DISABLED` | Optional | `true` stops the server storing tracking events immediately, with no redeploy. Emergency stop. |
| `LAUNCH_MODE` | Optional | `true` redirects public pages to `/contact`. |
| `ANTHROPIC_API_KEY`, `NWS_USER_AGENT`, `NOT_THE_RUG_BRIEF_DATA_DIR` | Optional (secret for the first) | Daily brief pipeline. Brief generation is not scheduled; see A8. |
| `BENCH_AI_SUMMARIES_ENABLED`, `BENCH_AI_MODEL` | Optional | Applicant AI summary. Leave unset until counsel has confirmed it is acceptable (see `docs/backup-bench.md`). |
| `TWILIO_*`, `QSTASH_*`, `CHECKR_*` | Not used | Reserved for later bench phases. Nothing reads them today. |

## A3. Deploy

**Production deploys automatically when a commit lands on `main`** (Vercel Git integration). There is no
manual deploy command in the normal flow.

1. Make sure the commit you intend to ship is the tip of `main` and CI is green. GitHub Actions runs four
   jobs: `check`, `e2e`, `emulators`, `e2e-analytics`.
2. Merge or push to `main`. Vercel builds and promotes it.
3. In Vercel > Deployments, open the new deployment. Confirm: status Ready, source commit is the SHA you
   intended, the build log shows Node 24 (the project setting says 20.x but `engines.node` in `package.json`
   is `24.x` and Vercel follows it; do not change either without testing).
4. Smoke test on the production URL: home, `/book`, `/contact`, `/robots.txt`, `/sitemap.xml`, and sign in
   at `/admin`. Details in `docs/release-checklist.md`.
5. Firestore/Storage rules are **not** part of a Vercel deploy. See A5.

**Previews are off.** `vercel.json` disables Git deployments for every branch except `main`, because Preview
currently shares production credentials. Pushing a feature branch will not produce a preview URL. To
re-enable, see checklist item 8.

## A4. Roll back the site

Use this if a release breaks inquiry saving, admin access, a critical route, or exposes private data.

1. Vercel > Project > Deployments. Find the last good **Production** deployment (the one before the bad
   release). Example of the shape: at the time of writing production was deployment
   `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1`, built from commit `905206d` of `main`. Record the current one before
   every release; that is your rollback target.
2. Open it, choose the menu (three dots) > **Promote to Production** (or **Instant Rollback**). From the
   command line: `vercel rollback <deployment-url> --scope baiees-projects`.
3. Re-run the smoke test in A3.
4. **Do not delete or edit lead records** to tidy up after a rollback. Data changes are additive, so the
   previous deployment reads newer records.
5. Rules do not roll back with a deployment. If rules changed in the same release, redeploy the previous
   rules (A5).
6. A rollback is overwritten by the next push to `main`. Revert or fix on `main` before pushing again.

## A5. Firestore and Storage rules: deploy and verify

Rules live in `firestore.rules` and `storage.rules` in this repository. Vercel does not deploy them.

**Deploy (needs Firebase CLI logged in as a project owner/editor):**

1. Check out the exact released commit (`git checkout <released-sha>`).
2. Record the active ruleset first (below) so you can roll back.
3. `firebase deploy --only firestore:rules --project not-the-rug`
   (storage: `firebase deploy --only storage --project not-the-rug`).

**See which ruleset is live:** Firebase console > Firestore Database > **Rules** tab shows the published
rules and a history of versions (Storage has the same under Storage > Rules). Compare the published text
with `firestore.rules` at the released SHA; they must be identical.

**Measured on 2026-10-05, before the Plan 013 release (rollback targets):**

| Rules | Ruleset id (as recorded) | Published |
| --- | --- | --- |
| Firestore (`cloud.firestore`) | `98050a6d-75ce-4ce7-9168-6fa04c605c9b` | 2026-09-29 22:32 UTC, identical to `firestore.rules` at commit `905206d` |
| Storage (`not-the-rug.firebasestorage.app`) | `2e328ac4-dacb-41de-9be9-678eb7f45116` (also in the Firebase console rules history) | 2026-09-29 22:32 UTC, identical to `storage.rules` at `905206d` |

**Roll back rules:** check out the previous SHA and run the same deploy command, or in the console Rules
history choose the earlier version and publish it.

## A6. Admin access: grant and remove

Who can use `/admin` is the set of documents in the Firestore collection `admins`, where the **document ID
is the person's exact sign-in email**. The server checks this on every admin request.

Both of these happen in the Firebase console (Firestore Database > Data > `admins`); the application cannot
add or remove admins and rules forbid clients from writing there.

- **Grant:** add a document whose ID is the person's email address exactly as it appears on their sign-in
  account (case and all). The fields can be empty. The person must sign in with an account whose email is
  **verified** (Google accounts are). Unverified email/password accounts are refused even if listed.
- **Remove:** delete that document. Server-side denial is immediate for the next request. A session that
  is already open stops working at its next admin call. To also end the person's sign-in entirely, disable
  or delete the user in Firebase console > Authentication > Users; revoked and disabled users are rejected.
- **Check who has access:** read the `admins` collection. Also check Authentication > Users and the
  Authentication > Sign-in method page for enabled providers (see checklist item 5).

## A7. Email: sender, failures, triage

**Sender verification: UNVERIFIED.** Confirming that `RESEND_FROM_EMAIL`'s domain is verified in Resend
needs access to the Resend dashboard (Domains), which was not available during evidence gathering.
Check it there. If the sender is a `@resend.dev` address, customer confirmation emails are skipped and
founder notifications reach only the Resend account's own address.

**Where outcomes are recorded.** A failed email never loses the inquiry; the lead or applicant is saved
first and the email result is stored alongside it as `sent`, `failed` or `skipped`.

| Flow | Where to look |
| --- | --- |
| Inquiry (`leads`) | Firestore > `leads` > the document > `notifications` map: `founder` and `customer`, each `sent` / `failed` / `skipped`. Filter the collection for `notifications.founder == failed` (or `customer`) to find failures. |
| Team application (`benchPeople`) | Firestore > `benchPeople` > the document > `notifications` map (one entry per email kind, the keys are `received`, `shadowInvite` and `closed`). The admin Team Applications page also reports a failed email when you act on a person. |
| Daily leads digest | Firestore > `emailSendLog`: one document per kind, day and recipient, recording whether the send was claimed and its outcome. |
| Provider-side | Resend dashboard > Emails / Logs shows delivery, bounces and rejections. |
| Function errors | Vercel > Project > Logs (runtime), filter for `cron:` or `bench:` log prefixes. |

Triage: find the record, confirm the address is valid, check Resend for a bounce or a domain problem,
then contact the person directly. There is no automatic retry of a failed notification and no alert is
configured (see A12); a person has to look.

## A8. Scheduled jobs

Defined in `vercel.json`; a job runs only if `CRON_SECRET` is set.

| Path | Schedule | Notes |
| --- | --- | --- |
| `/api/cron/leads-digest` | `0 12 * * *`, daily at 12:00 **UTC** | Daily lead summary to `FOUNDER_EMAIL`. Vercel cron is UTC-only: 08:00 New York in summer, 07:00 in winter. Guards against double sends per day and recipient. |

Not scheduled, on purpose: `/api/cron/not-the-rug-brief` (brief generation) and `/api/cron/founder-brief`
(brief email). **Brief generation has an unmeasured duration limit:** the route is capped at 60 seconds
and a real run makes several sequential paid model calls. Nobody has measured that it fits, because
measuring needs a paid run that was not authorized. Keep it disabled until one authorized run records its
duration. Details: `docs/scheduled-jobs.md`.

## A9. Backups and restore

**Currently there are none. This is the measured state, not an assumption.**

- Firestore scheduled backups: **none configured** (2026-10-05).
- Firestore point-in-time recovery: **disabled**.
- Firestore delete protection: **disabled**.
- Storage (photos, resumes): no versioning or backup was measured. **UNVERIFIED.**
- Source code is recoverable from GitHub, and any past production build from Vercel Deployments.

Consequence: if a collection is deleted or overwritten, there is **no stored copy to restore from**.
No restore procedure has been tested, and this document states no recovery time or recovery point.

**Owner decision needed (checklist item 3):** choose a backup policy (for example a daily scheduled
backup with a stated retention, and/or point-in-time recovery, and delete protection on). Backups cost
storage money and point-in-time recovery adds ongoing cost; both include personal data of leads and
applicants, which feeds the retention decision in A10. After enabling, perform and record one test
restore into a scratch database before relying on it.

## A10. Retention and deletion of personal data

**Responsibility: the owner.** The application does not delete leads, applicants or resumes on any
schedule and no retention period has been decided. This runbook does not state a legal retention period
or make any privacy-law compliance claim; take that advice from counsel.

| Data | Where | Today |
| --- | --- | --- |
| Inquiries (name, phone, email, dog details) | Firestore `leads` | Kept until someone deletes the document in the console. |
| Applicant records | Firestore `benchPeople` | Same. |
| Applicant resumes | Storage (private; read only through the admin download route) | Kept until someone deletes the file. Whether deleting an applicant record also removes its resume file was not verified; check Storage and delete the file too. |
| Visitor analytics events | Firestore `analytics_events` | Expire automatically (TTL ACTIVE). |
| Rate-limit counters | Firestore `analyticsRateLimits` (TTL active), `leadRateLimits`, `benchRateLimits` (no TTL) | See A11 and checklist item 2. Contain only hashed network identifiers. |

To delete one person's data on request: delete their `leads` and/or `benchPeople` documents and any
resume file for them in Storage, using the console. Record that you did.

## A11. Time-to-live (TTL) policies

TTL makes Firestore delete expired documents automatically. State measured 2026-10-05:

| Collection (field `expiresAt`) | State |
| --- | --- |
| `analytics_events` | **ACTIVE** |
| `analyticsRateLimits` | **ACTIVE** |
| `leadRateLimits` | **MISSING** |
| `benchRateLimits` | **MISSING** |

The two missing collections hold short-lived per-IP counters. Without TTL they are not harmful to
behavior but accumulate forever. **Owner action** (checklist item 2), either:

- Console: Firestore Database > **TTL** (under Indexes or Time to live) > Create policy > collection group
  `leadRateLimits`, timestamp field `expiresAt`; repeat for `benchRateLimits`; or
- `gcloud firestore fields ttls update expiresAt --collection-group=leadRateLimits --enable-ttl --project=not-the-rug`
  and the same with `--collection-group=benchRateLimits`.

TTL deletes only documents whose `expiresAt` is in the past and cannot be undone. Policies take time to
become ACTIVE. Verify afterwards in the console TTL list.

## A12. Cost and error alerts

**UNVERIFIED. No evidence of any cost alert, budget, uptime monitor, or error alert was gathered.**
Do not assume anything is watching. Until an owner configures them, a named person must look manually.

Suggested owner decisions (none done): a Google Cloud budget alert on project `not-the-rug`; Vercel
usage/spend notification settings; Resend delivery-failure notices; who reviews Vercel runtime logs and
the failed-email records in A7, and how often. For 24 to 48 hours after any release, the responsible
maintainer should review errors, failed notifications and cost; this is a manual duty, not automatic.

## A13. Copy edits

Text and price changes via the founder copy-review tool edit source files in the repository. They take
effect on the live site **only after the change is committed and pushed to `main`** (a normal deploy, A3).
See `docs/copy/README.md`.

---

# Production actions requiring owner authorization

Nothing below has been done. Each needs an explicit yes from the owner. "Email?" means the action itself
sends email; "Cost?" means it may add spend; "Data?" means it changes stored data or settings.

| # | Action | Purpose | Target | Rollback | Email? | Cost? | Data? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Deploy Firestore rules (after the release is on `main`) | Ship the verified-email admin read rule and keep the server rule set in sync with code | Firebase project `not-the-rug`, Firestore rules; run from the released SHA | Redeploy the prior ruleset (`98050a6d-75ce-4ce7-9168-6fa04c605c9b`) from the previous SHA or the console history | No | No | Changes access rules, not stored data |
| 2 | Enable TTL on `leadRateLimits` and `benchRateLimits` | Stop counter documents accumulating | Firestore TTL policies on field `expiresAt` | Disable the policy (documents already deleted by TTL are gone; they are disposable counters) | No | No (small deletes) | Yes: expired counters are deleted automatically |
| 3 | Decide and enable backups / point-in-time recovery / delete protection | Make recovery from deletion possible; today it is not | Firestore database `(default)` | Disable the schedule or PITR; delete old backups | No | **Yes**, ongoing storage cost | Creates copies of personal data (affects retention) |
| 4 | Make `check`, `e2e`, `emulators`, `e2e-analytics` required checks on `main` | Prevent merging code that fails tests | GitHub branch protection or ruleset for `main`. Confirm the displayed check names after one CI run; they equal the job ids | Remove the rule | No | No | No (blocks merges) |
| 5 | Decide on email/password sign-in | Admin login is Google-only; the extra provider widens who can create accounts (admin access is still gated by the `admins` list and a verified email) | Firebase console > Authentication > Sign-in method | Re-enable the provider | No | No | Disabling stops those users signing in |
| 6 | Verify the Resend sender domain | Customer confirmations and reliable founder email need a verified domain; currently UNVERIFIED | Resend dashboard > Domains (DNS records at the domain host); `RESEND_FROM_EMAIL` in Vercel | Revert `RESEND_FROM_EMAIL` to the previous value and redeploy | A test send, if you choose to do one | No (plan-dependent) | DNS changes |
| 7 | Set up cost and error alerting | Know about spend and failures without watching | Google Cloud budgets, Vercel notifications, Resend | Delete the alerts | They send alert emails | No | No |
| 8 | Isolate Preview, then re-enable it | Preview shares production Firebase and Resend credentials, so a preview could write real data or email real people | Create a separate Firebase project and a separate Resend key/recipient, set them for the **Preview** environment only in Vercel, then remove the `git.deploymentEnabled` block from `vercel.json` in a commit to `main` | Restore the `deploymentEnabled` block and redeploy | Previews would send email (to the isolated recipient) | Possible second Firebase project cost | New data in the separate project only |
| 9 | Add a second owner on Firebase, Vercel, GitHub and Resend | Remove the single-account failure risk | Each service's IAM or team settings | Remove the member | Invitation emails | Possible per-seat Vercel cost | No |
| 10 | Promote a release | Put the approved candidate commit live | Merge/push the exact approved SHA to `main` (A3); note the current deployment first | Roll back per A4 | Production notifications continue as normal | No | New inquiries write to production |
| 11 | Decide retention periods and who deletes leads, applicants, resumes | Nothing deletes personal data today | Firestore `leads`, `benchPeople`; Storage resumes | n/a (a policy) | No | No | Deleting is irreversible with no backups (item 3) |

---

# Part B: history and context

Not needed to operate. Useful for understanding how production reached its current state.

- Plan 013 (`plans/013-client-handoff-hardening.md`) is the hardening plan that produced these facts.
  Its phase reports are in `plans/reports/`: P0 baseline, P1 booking/application correctness, P2
  security/CI, and later phases. The production audit is `docs/audits/2026-10-01-production-audit.md`.
- Dependency advisories that remain after P2 were accepted by the owner on 2026-10-05, with a review date
  of the next dependency pass or 2027-01-05. They are test/lint-only or not reachable in this app; see
  `plans/reports/013-P2-report.md`, section "Dependency advisories".
- Node version: `package.json` says `24.x`; the Vercel project setting still says `20.x`, and Vercel
  builds with Node 24 because of `engines`. Documented, not changed.
- The email/password provider being enabled is why admin access now requires a verified email
  (P2, finding H01).

## Domain cutover to nottherug.com (owner decision 2026-10-05)

The owner chose `https://nottherug.com` as the site's main address. As of 2026-10-05 the domain is **not** attached to the Vercel project (only `nottherug-ten.vercel.app` is), its DNS is at GoDaddy (`ns77/ns78.domaincontrol.com`), and it currently serves a different site behind a Sucuri firewall. Order matters, because canonical URLs, the sitemap, robots and email links follow `PUBLIC_BASE_URL`:

1. Keep production `PUBLIC_BASE_URL` on the address that serves the site today (`https://nottherug-ten.vercel.app`) until step 6.
2. Before touching anything, record every current GoDaddy DNS record for `nottherug.com` (export or screenshot): A/CNAME, **MX, TXT (SPF, DKIM, DMARC, verification records)**. Email and verification records must survive the change.
3. In Vercel, add `nottherug.com` (and `www.nottherug.com`, redirecting to the apex) to project `nottherug`. Vercel shows the DNS records it needs.
4. At GoDaddy, change **only** the web records Vercel asks for (A for the apex, CNAME for `www`); leave MX/TXT untouched. This takes the current site at that address offline — plan the switch, and keep that site's content/backup if it is still needed. Wait until Vercel reports the domain as valid and `https://nottherug.com` serves this app with a certificate.
5. Before switching the app to the new host: add `nottherug.com` (and `www.nottherug.com`) to Firebase Authentication → Settings → **Authorized domains**, or admin Google sign-in fails there; check any other allow-listed origins (e.g. Calendly embed settings); if the Resend sender should become `@nottherug.com`, verify that domain in Resend and only then change `RESEND_FROM_EMAIL`.
6. Set production `PUBLIC_BASE_URL=https://nottherug.com` and redeploy (it is read at build time). Check `https://nottherug.com/robots.txt`, `/sitemap.xml`, a page's canonical link and an email link.
7. Optionally make `nottherug-ten.vercel.app` redirect to `nottherug.com` in Vercel's domain settings.
8. Update Google Search Console / Google Business profile links if they point at the old site.

Rollback: set `PUBLIC_BASE_URL` back to the vercel.app address and redeploy; revert the GoDaddy web records to the values recorded in step 2.

