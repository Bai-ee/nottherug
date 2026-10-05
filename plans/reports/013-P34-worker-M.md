# Plan 013 — P4 Worker M (lint, comment cleanup, README/runbook handoff)

Branch `013/p34-m`, base `e5e28c8`. Documentation and comment/lint-only; no application behavior changed.

## What changed
- **Lint:** `scripts/audit-public-assets.mjs` unused `stat` import removed. `SchedulingDialog.tsx` raw `<img>` kept with a justified `eslint-disable-next-line @next/next/no-img-element` and an explanatory comment. A `next/image` swap was tried first and reverted: importing `next/image` in that module breaks `tests/unit/booking-analytics-failure-isolation.test.ts` (5 failures, `document is not defined` at load in the node test environment), and editing tests was out of ownership. The asset is a local 498x88 PNG already at delivered size.
- **Comment:** `app/api/bench/apply/route.ts` auto-invite catch block now describes the real flow (stage claim first; on ambiguous failure a confirm re-read decides invite vs "received"). Text only.
- **README.md:** now the single entry point (Node 24, `npm ci --no-audit`, env vars, all commands incl. `test:emulators`, `test:e2e:analytics`, `verify:assets`, deployment, current routes, docs map, historical list, where Plan 013 reports live). Removed stale `/services` grid references; Node 24 vs Vercel 20.x documented; copy tool now states a deploy is needed.
- **docs/operations-runbook.md (new):** ownership, env inventory, deploy, rollback, rules deploy/verify, admin grant/removal, email triage, cron, backups, retention, TTL, alerts, copy edits; owner-authorization checklist (11 items); history separated in Part B.
- **Other docs:** `docs/copy/README.md` (not live until deployed), `docs/release-checklist.md` (`--no-audit`, emulator/analytics gates, links), `docs/preview-verification-plan.md` (historical banner), `.env.example` (comments only), `plans/README.md` (013 row, pointers), "Historical" banner on 17 plans 001-010 and session files (011, 012, 013 untouched).

## Lint before / after
| | Before | After |
| --- | --- | --- |
| `npm run lint` | 0 errors, 1 warning | 0 errors, 0 warnings (1 justified disable) |
| `npm run lint:pipeline` | 0 errors, 1 warning | 0 errors, 0 warnings |

## Docs map
README -> operations-runbook, release-checklist, scheduled-jobs, analytics-operations, backup-bench, copy/README, design-system, audit, plans/013 + plans/reports. plans/README indexes historical plans.

## UNVERIFIED items and owner actions (all in the runbook)
- Resend sender domain verification; Resend/Calendly account ownership.
- Storage versioning/backup; whether deleting an applicant also deletes the resume file.
- Cost/error/uptime alerts (no evidence any exist).
- Backups/PITR/delete protection: none (measured), owner decision; no restore tested; no RTO/RPO stated.
- TTL missing on `leadRateLimits`, `benchRateLimits` (console/gcloud steps listed).
- Rules deploy, branch protection, email/password provider, second owner, Preview isolation, retention policy, release promotion: checklist items 1-11, none executed.
- Brief generation duration (60 s limit) unmeasured; keep disabled.
- Note: `lib/content/site.ts` `PUBLIC_ROUTES` still lists `/services` and `/how-it-works` (P3/P4 code owner); README only describes the redirects.

## Tests
typecheck pass; lint x2 clean; emulator suite `npm run test:emulators`: 76 files, 716 passed, 0 skipped (102 emulator-backed across 11 suites); build pass; `CI=1 E2E_PORT=3670 npm run test:e2e -- tests/e2e/booking.spec.ts`: 6 passed. Emulators used `firebase.worker.json` ports (18780/19799); port 8080 untouched. `next-env.d.ts` restored.
