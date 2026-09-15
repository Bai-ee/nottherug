# Not The Rug

Marketing site and lead intake for Not The Rug, a Williamsburg (Brooklyn) dog-walking
service. Next.js 16 (App Router) with Firebase (Firestore + Storage) for lead/media
storage, Resend for transactional email, and a small admin dashboard for the owner to
review leads, manage photos, and run the daily founder brief.

One acquisition goal drives the whole public site: get a visitor to a qualified
meet-and-greet or phone consultation via `/book`. See `PRODUCT.md` for brand/design intent
and `plans/002-production-readiness.md` for the launch cleanup this repo is mid-way
through.

## Setup

1. `npm install` (Node 24.x — see `engines` in `package.json`).
2. Copy `.env.example` to `.env.local` and fill in real values. Every variable is
   documented inline there (what it's for, which are required vs. optional, and what
   happens when an optional one is left blank) — this file does not repeat that list.
3. `npm run dev` and open `http://localhost:3000`.

> **Do not `npm uninstall` a dependency.** It prunes optional native bindings (notably
> Sharp's platform binary) from `node_modules` in a way `npm install` alone won't cleanly
> reverse, and breaks `vitest` until you delete `node_modules` and reinstall from scratch.
> Change dependencies by editing `package.json` directly and running `npm install`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Serve a production build (`build` first). |
| `npm run lint` | ESLint over the Next.js app (`app`, `components`, `lib`, etc. — see `eslint.config.mjs` for the exact scope and ignores). |
| `npm run lint:pipeline` | Separate ESLint pass over `not-the-rug-brief/**` and `scripts/**` (plain Node scripts, not Next code — see `eslint.pipeline.mjs`). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run test` | Vitest unit/integration tests (`tests/unit/**`). |
| `npm run test:e2e` | Playwright browser tests (`tests/e2e/**`) against a real build — see that directory's specs for what each covers and how they start a server. |
| `npm run check` | `lint` + `typecheck` + `test`, in that order. Run this (plus `test:e2e` separately) before opening a PR. |
| `npm run copy:extract` / `npm run copy:apply` | The founder copy-review round trip — see `docs/copy/README.md`. |

## Module map

Where to find things, by question:

- **Where does a service price live?** `lib/content/services.ts` (typed, used by both the
  homepage rates preview and the `/services` grid — the two intentionally use different
  names/copy for overlapping services; see the file comment before "fixing" that).
  Contact details and neighborhood coverage are `lib/content/contact.ts` and
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
  `track(event, payload)` that no-ops unless `NEXT_PUBLIC_ANALYTICS_ENDPOINT` is set. It
  strips anything resembling a name/email/phone/note before sending. See its file comment
  before adding a new event or a real provider.
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

## Deployment and operations

Deployed on Vercel. `proxy.ts` applies the launch-mode gate (`LAUNCH_MODE=true` redirects
public routes to `/contact` with a 307) and sends `X-Robots-Tag: noindex, nofollow` on
every non-production deployment, so previews never compete with production in search
results. `vercel.json` and `next.config.ts` hold the rest of the deploy/runtime
configuration.

Scheduled jobs live under `app/api/cron/**`; see `docs/scheduled-jobs.md` for what runs
and when, and `CRON_SECRET` in `.env.example` for how they authenticate.

Firestore/Storage access rules are versioned in `firestore.rules` and `storage.rules` —
review the diff on any change to `lib/server/**` or `lib/leads/**` that touches what a
request can read or write.

## Historical documents

These predate the current site and are not wired to it — do not use them to drive a
change:

- `docs/COPY-TRACKING.md` and `docs/COPY-TRACKING-EXISTING-SITE.md` — both superseded by
  the founder copy-review tool (`docs/copy/README.md`); see that file's own "Older copy
  docs" section for why.
- `docs/research.md`, `docs/research_competetive.md`, `docs/OPUS-PLANNING-BRIEF_1.md`,
  `docs/okara-feature-stack-breakdown.md`, `docs/NTR-IMPLEMENTATION-PLAN.md`,
  `docs/COPY-AUDIT-AND-STRATEGY.md`, `docs/content-update-plan.md`,
  `docs/feature-requirements.md` — earlier planning/strategy drafts, kept for record but
  not the current source of truth. `plans/002-production-readiness.md` and
  `PRODUCT.md` are current.

## Copy changes without a code deploy

Service copy, prices, and page text can go through `docs/copy/README.md`'s founder
review loop (`npm run copy:extract` / `npm run copy:apply`) instead of hand-editing JSX —
read that file before changing anything under `scripts/copy/`.
