# Preview verification plan

Everything that cannot be proven on a laptop, and exactly what is needed to prove it.

Release candidate: `1737c48` on `main`. **44 commits are unpushed**, so no preview can
exist until they are pushed. Nothing here touches production.

## What is already proven locally

| Area | Evidence |
| --- | --- |
| Booking validation, idempotency, rate limit, notification status | 155 unit/integration tests, Firebase and Resend mocked |
| Firebase rules | 13/13 against real Firestore and Storage emulators, OpenJDK 21 |
| Sharp rendering | Real fixtures through libvips 8.18.6 — composite, opacity, all three formats, appended-byte stripping |
| Routes, redirects, layout, keyboard, reduced motion | 132 Playwright assertions, desktop and mobile, against a local production build |
| Packaged function contents | Build trace manifests, per route |
| Build, lint, typecheck, audit | Clean on the candidate |

## What a preview is required to prove

None of these can be faked locally, and each is currently unverified.

1. **A lead survives a real round trip.** Submit one synthetic inquiry; confirm the
   Firestore document, then that it renders in the admin table with the new reactivity,
   allergy and phone-consult fields, then that the CSV export opens in a spreadsheet with
   no formula executing and a readable phone number, then that the founder notification
   actually arrives and the stored `notifications` status matches reality.
2. **Retry behaviour against real Firestore.** Submit the identical payload twice in
   quick succession and confirm exactly one document and one notification.
3. **Admin authorization end to end.** A whitelisted account reaches the dashboard; a
   signed-in non-whitelisted account gets a distinct "not permitted", not a hang and not
   a generic failure.
4. **Deployed Firebase rules.** Read what is actually live on the project and diff it
   against `firestore.rules` / `storage.rules`. The emulator proves the files are correct;
   it proves nothing about what is deployed.
5. **Real media operations.** Upload a real photo, render it, delete it. Confirm the
   thumbnail, confirm a failed delete keeps the row, confirm no download token appears in
   the function logs.
6. **Private brief access.** Confirm a private report is not reachable without
   authorization, and that the authorized read-back works against real Storage.
7. **One timed brief generation.** Run it once manually and read `durationMs` off the run
   record. Scheduled generation stays off until that number exists and fits with margin.
8. **Packaged functions at runtime.** Trace manifests say the right files are included;
   only a deployment proves they are sufficient. In particular this is where the
   `FIREBASE_ADMIN_INCLUDES` question gets settled — see
   [docs/function-packaging.md](function-packaging.md).

## Preview environment configuration

Set on the Vercel project, Preview scope only.

| Variable | Value for preview | Notes |
| --- | --- | --- |
| `PUBLIC_BASE_URL` | the preview deployment URL | Wrong value breaks canonicals and email links |
| `NEXT_PUBLIC_FIREBASE_*` (6) | **a non-production Firebase project** | See the decision below |
| `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` | service account for that same project | |
| `RESEND_API_KEY` | a Resend key | |
| `RESEND_FROM_EMAIL` | a verified sender, or leave on `@resend.dev` | On `@resend.dev` the customer confirmation is skipped by design and only the founder mail sends |
| `FOUNDER_EMAIL` | **an approved test recipient**, not the real founder address | |
| `NEXT_PUBLIC_CALENDLY_URL` | the real link, or empty | Empty is a valid test: intake must still succeed |
| `CRON_SECRET` | any value | Without it every cron route rejects everything |
| `LAUNCH_MODE` | unset | |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | unset | `track()` stays a no-op |

`vercel.json` has an empty `crons` array, so no scheduled job runs on the preview. That
is deliberate and should stay that way until item 7 above is done.

Preview deployments already send `X-Robots-Tag: noindex, nofollow` via `proxy.ts`, so a
preview cannot compete with production in search results.

## What is needed from the owner

Only these. Everything else is either done or does not need anyone.

1. **Push access, or permission for me to push.** 44 commits sit unpushed on `main`.
   Nothing deploys until they are on the remote. Tell me whether to push `main` or open a
   branch and PR.
2. **Which Firebase project the preview should use.** Strong recommendation: a separate
   non-production project. Pointing a preview at the production project means test leads
   land in the real leads collection and test uploads in the real bucket. If no second
   project exists, say so and I will use a clearly-marked prefix instead — but that is a
   worse answer.
3. **An approved test recipient address** for `FOUNDER_EMAIL`. No email will be sent
   anywhere until this is given.
4. **Authorization for one timed brief generation.** It calls a paid model once. Without
   it, item 7 stays open and scheduled generation stays disabled.
5. **The canonical host** — see the business decisions list.

## Not blocking launch

The 12.3 MB of unreferenced images in `public/img`. They cost nothing in page weight
because no page requests them, only deploy upload size. Recorded, not a gate.
