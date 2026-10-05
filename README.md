# Not The Rug

Marketing site and lead intake for Not The Rug, a Williamsburg (Brooklyn) dog-walking
service. Next.js 16 (App Router) with Firebase (Firestore + Storage) for lead/media
storage, Resend for transactional email, and a small admin dashboard for the owner to
review leads, manage photos, and run the daily founder brief.

One acquisition goal drives the whole public site: get a visitor to a qualified
meet-and-greet or phone consultation via `/book`. See `PRODUCT.md` for brand/design intent.

**Start here.** This README is the single entry point. Owners and operators go to
[docs/operations-runbook.md](docs/operations-runbook.md) (ownership, environment variables,
deploy and rollback, rules, admin access, email triage, backups, owner-authorization
checklist). Everything you need is in the repository or linked below; nothing depends on
local-only files.

## Setup

1. Use **Node 24.x** (`engines` in `package.json`), then `npm ci --no-audit`. `npm ci` makes an
   exact install from `package-lock.json`; `--no-audit` stops npm sending dependency metadata
   to the registry on every install (run advisory scans deliberately, not as a side effect).
2. Copy `.env.example` to `.env.local` and fill in real values. Every variable is documented
   inline there (purpose, required vs. optional, what happens when an optional one is blank), and
   the owner-facing inventory is in [the runbook](docs/operations-runbook.md#a2-environment-variables).
   Never commit `.env.local` or paste values into docs or tickets.
3. `npm run dev` and open `http://localhost:3000`.

> **Do not `npm uninstall` a dependency.** It prunes optional native bindings (notably
> Sharp's platform binary) from `node_modules` in a way `npm install` alone won't cleanly
> reverse, and breaks `vitest` until you delete `node_modules` and reinstall from scratch.
> Change dependencies by editing `package.json` directly and running `npm install`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server (Turbopack). |
| `npm run build` | Production build. Needs the Firebase and `PUBLIC_BASE_URL` variables present (throwaway values are fine for a local build; see `.github/workflows/ci.yml`). |
| `npm run start` | Serve a production build (`build` first). |
| `npm run lint` | ESLint over the Next.js app (see `eslint.config.mjs` for scope and ignores). |
| `npm run lint:pipeline` | Separate ESLint pass over `not-the-rug-brief/**` and `scripts/**` (plain Node scripts; see `eslint.pipeline.mjs`). |
| `npm run typecheck` | `tsc --noEmit`. Run after `build` so generated route types are fresh. |
| `npm run test` | Vitest unit/integration tests (`tests/unit/**`). Suites that need the Firebase emulators skip, with a reason, when none is running. Skips are not passes. |
| `npm run test:emulators` | The whole unit suite with `REQUIRE_EMULATORS=1`: emulator suites fail instead of skipping, and `tests/support/check-required-emulator-run.mjs` fails on any skip. Run under `firebase emulators:exec --only firestore,storage --project demo-not-the-rug "npm run test:emulators"` (needs Java 21). This is what the CI `emulators` job runs. |
| `npm run test:e2e` | Playwright browser tests (`tests/e2e/**`) against a real build. Set `E2E_PORT` to choose the port. In CI (`CI` set) an unreachable server fails the booking and walk-with-us specs instead of skipping them. The remaining skips are deliberate desktop-only vs mobile-only exclusions. |
| `npm run test:e2e:analytics` | The analytics specs. Needs a build made with `NEXT_PUBLIC_ANALYTICS_ENABLED=true NEXT_PUBLIC_ANALYTICS_TEST_MODE=true` and `E2E_ANALYTICS_ENABLED=1`, run under the Firestore emulator as the CI `e2e-analytics` job does. |
| `npm run verify:assets` | Checks `public/` assets against `docs/asset-manifest.json`. |
| `node scripts/perf/measure-home.mjs --base http://127.0.0.1:<port> --runs 5 --label <name> --out <dir>` | Cold-load measurement of the homepage (throttled mobile and desktop profiles) against a **local** production build: CTA/headline readiness, LCP, CLS, bytes by type, video separately. Used for Plan 013 P3; see `plans/reports/013-P34-worker-G.md`. Never point it at the live site. |
| `npm run check` | `lint` + `typecheck` + `test`. Run this (plus `test:e2e` separately) before opening a PR. |
| `npm run copy:extract` / `npm run copy:apply` | The founder copy-review round trip; see [docs/copy/README.md](docs/copy/README.md). Applying copy edits source files, so it still needs a commit and a deploy. |

CI (`.github/workflows/ci.yml`) runs four jobs on pull requests and on pushes to `main`:
`check`, `e2e`, `emulators`, `e2e-analytics`.

## Module map

Where to find things, by question:

- **Where does a service price live?** `lib/content/services.ts` (typed; feeds the homepage
  rates section, the service detail modal and the footer rate links). There is no separate
  `/services` page. Contact details and neighborhood coverage are `lib/content/contact.ts` and
  `lib/content/coverage.ts` the same way.
- **Where does booking form validation happen?** Field limits and the shared lead shape
  are `lib/leads/contract.ts` and `lib/leads/validation.ts`; the multi-step form itself is
  `components/booking/` (`BookingForm.tsx`, `BookingSteps.tsx`, `SchedulingDialog.tsx`);
  the public API route that re-validates and persists a submission is
  `app/api/leads/meetgreet/route.ts`.
- **Where are the email templates?** `lib/email/templates.ts` (customer/founder lead
  notifications), `lib/email/digest-template.ts` and `lib/email/founder-brief-template.ts`
  (the daily brief email), `lib/email/resend.ts` (the Resend client/send wrapper).
- **Where is admin authorization enforced?** Server-side: every `app/api/admin/**` route
  and the `app/admin/**` pages call `lib/server/verifyAdmin.ts`, which checks the caller
  against the `admins/{email}` collection in Firestore — see `firestore.rules` for what
  Firestore itself additionally enforces. Client-side: `components/admin/AdminSession.tsx`
  and `AdminGuard.tsx` gate the dashboard UI and hold the session state; they're a UX
  convenience layered on top of the server check, not a replacement for it.
- **Where do public routes and their metadata live?** `app/(marketing)/**` — one route per
  folder, each with its own `metadata` export (title/description/canonical). Shared layout
  pieces (nav, footer, hero, etc.) are `components/marketing/**`; the root
  `app/layout.tsx` only sets site-wide defaults and the `%s · Not The Rug` title template.
  `app/robots.ts` and `app/sitemap.ts` generate `/robots.txt` and `/sitemap.xml` from
  `lib/content/site.ts`'s `PUBLIC_ROUTES` list.
- **Where does analytics tracking live?** `lib/analytics/track.ts` — a thin, dependency-free
  `track(event, payload)` that no-ops unless `NEXT_PUBLIC_ANALYTICS_ENABLED=true` was set at
  build time. It posts allowlisted events to the first-party `/api/track` route and strips
  anything resembling a name/email/phone/note. See its file comment before adding a new event.
- **Where is the daily founder brief pipeline?** `not-the-rug-brief/` (the retained
  CommonJS pipeline) and `lib/not-the-rug-brief/` (TypeScript reads/types/persistence used
  by the admin dashboard and cron routes). `lib/generator/` and `lib/media/` handle the
  rendered brief image/video assets.
- **Where are the cron/API routes?** `app/api/cron/**` (scheduled jobs, see
  `docs/scheduled-jobs.md`), `app/api/leads/**` (public lead intake), `app/api/admin/**`
  (photo and generator operations, all behind `verifyAdmin`).

### Top-level layout

```
app/
  (marketing)/     public routes — one folder per page, own metadata each
  admin/           owner dashboard pages (leads, photos, generator, brief)
  api/             route handlers: leads intake, admin actions, cron
  robots.ts, sitemap.ts
components/
  marketing/       nav, footer, homepage sections, motion hooks
  booking/         the meet-and-greet form and scheduling dialog
  admin/           dashboard shell, session, feature components
  ui/              small shared primitives (e.g. the carousel used in admin)
lib/
  content/         typed services/contact/coverage data + shared metadata builder
  leads/           lead contract, validation, CSV export, stats
  analytics/       track() — see above
  server/          admin auth, Firebase Admin adapters, request error helpers
  email/           templates + Resend
  photos/, generator/, media/   photo and brief-image pipeline
  not-the-rug-brief/            TS side of the brief pipeline
not-the-rug-brief/  retained CommonJS brief pipeline (research, report, send)
scripts/copy/       founder copy-review tooling — see docs/copy/README.md
tests/
  unit/            Vitest
  e2e/             Playwright (public-routes, booking, admin-auth specs)
docs/              design docs, the copy tool's own README, and historical
                   planning documents (see below)
```

## Routes

Public pages (`app/(marketing)/**`): `/`, `/about`, `/book`, `/contact`, `/safety`, `/reviews`,
`/neighborhoods/williamsburg`, `/signup`, `/walk-with-us`. The old `/services` and `/how-it-works`
pages were removed; `next.config.ts` redirects them (307) to sections of the home page. Owner
pages live under `/admin`. Check `app/` for the current list.

## Deployment and operations

- **Production deploys when a commit lands on `main`** (Vercel Git integration; project
  `nottherug`). No manual deploy command is part of the normal flow.
- **Previews are disabled.** `vercel.json` turns off Git deployments for every branch except
  `main`, because Preview currently shares production Firebase and Resend credentials. Re-enabling
  them needs the isolation steps in the runbook's owner checklist.
- **Node:** `engines.node` is `24.x` and Vercel builds with Node 24. The Vercel project setting
  still reads 20.x and is overridden by `engines`; this is documented, not changed.
- `proxy.ts` applies the launch-mode gate (`LAUNCH_MODE=true` redirects public routes to
  `/contact` with a 307), resolves old `/?page=` and `/?hood=` links (307, table in
  `lib/content/legacy-routes.ts`, matching in `lib/routing/legacyRedirects.ts`) so the homepage
  itself stays static, and sends `X-Robots-Tag: noindex, nofollow` on every non-production
  deployment. `vercel.json` and `next.config.ts` hold the rest of the deploy/runtime configuration
  (including `Cache-Control: private, no-store` for admin routes).
- **Scheduled jobs:** one daily job, `/api/cron/leads-digest` at 12:00 UTC (`vercel.json`); see
  [docs/scheduled-jobs.md](docs/scheduled-jobs.md). It needs `CRON_SECRET`.
- **Firestore/Storage rules** (`firestore.rules`, `storage.rules`) are **not** deployed by Vercel.
  Deploy and verify them as described in the runbook.
- **Rollback, admin access, email triage, backups, TTL, retention** are all in
  [docs/operations-runbook.md](docs/operations-runbook.md), which also lists every production
  action that needs the owner's explicit authorization.
- Release gates and smoke checks: [docs/release-checklist.md](docs/release-checklist.md).

## Current documentation

| Topic | Document |
| --- | --- |
| Operating the site | [docs/operations-runbook.md](docs/operations-runbook.md) |
| Release and rollback checklist | [docs/release-checklist.md](docs/release-checklist.md) |
| Scheduled jobs | [docs/scheduled-jobs.md](docs/scheduled-jobs.md) |
| Analytics on/off, dashboard | [docs/analytics-operations.md](docs/analytics-operations.md) |
| Team applications (backup walker bench) | [docs/backup-bench.md](docs/backup-bench.md) |
| Founder copy review | [docs/copy/README.md](docs/copy/README.md) |
| Brand and design intent | `PRODUCT.md`, [docs/design-system.md](docs/design-system.md) |
| Production audit (2026-10-01) | [docs/audits/2026-10-01-production-audit.md](docs/audits/2026-10-01-production-audit.md) |

**Plan 013 (client handoff hardening)** is the current work. The plan is
[plans/013-client-handoff-hardening.md](plans/013-client-handoff-hardening.md); its phase reports,
tracker and review notes are in [plans/reports/](plans/reports/) (start with `013-tracker.md`).

## Historical documents

Not the source of truth; do not use them to drive a change.

- `plans/001`–`plans/010` (and their handoffs/session logs) are historical records; each carries
  a banner saying so. [plans/README.md](plans/README.md) indexes them.
- `docs/COPY-TRACKING.md` and `docs/COPY-TRACKING-EXISTING-SITE.md` are superseded by the founder
  copy-review tool.
- `docs/research.md`, `docs/research_competetive.md`, `docs/OPUS-PLANNING-BRIEF_1.md`,
  `docs/okara-feature-stack-breakdown.md`, `docs/NTR-IMPLEMENTATION-PLAN.md`,
  `docs/COPY-AUDIT-AND-STRATEGY.md`, `docs/content-update-plan.md`,
  `docs/feature-requirements.md` are earlier planning/strategy drafts kept for record.
  `docs/launch-facts-review.md` and `docs/decisions-needed.md` record launch-time owner decisions
  and may mention pages that have since been removed.

## Copy changes

Service copy, prices, and page text can go through `docs/copy/README.md`'s founder review loop
(`npm run copy:extract` / `npm run copy:apply`) instead of hand-editing JSX. The tool rewrites
source files, so a copy change is **not live until it is committed and pushed to `main`** (a
normal deploy). Read that file before changing anything under `scripts/copy/`.
