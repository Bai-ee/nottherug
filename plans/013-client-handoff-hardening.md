# Plan 013 — client handoff hardening

**Status:** ready for execution review; no phase implementation approved or started.
**Baseline:** `905206d6c5e046eee6c42b44b42efd05ad0f1cf8`.
**Audit:** [Production audit, October 1, 2026](../docs/audits/2026-10-01-production-audit.md).
**Reviewer:** Codex in the original audit task. **Implementer:** Claude/Sonnet, one phase at a time.

## Objective and boundaries

Resolve the demonstrated security, reliability, performance, and handoff concerns in the existing live application with small, reviewable changes. Preserve its branding, page structure, service copy, pricing, booking destinations, data model compatibility, Firebase/Resend integrations, and existing admin workflows.

Do not introduce a replacement framework, database, auth provider, analytics product, queue, CMS, redesign, speculative feature, or broad component/CSS rewrite. Do not enable the unscheduled brief-generation jobs. Do not delete customer/applicant records, rewrite historical data, change production secrets, or send real emails as a test. Add tests for the risks being fixed; do not manufacture coverage with assertions that merely repeat the implementation.

Security claims must match evidence. A skipped test, mocked provider, local build, and production success are distinct outcomes. Never call a phase complete while concealing missing verification.

## Approval contract

1. Execute only the currently authorized phase. Phase 0 prepares the verified baseline; its report must be reviewed before Phase 1.
2. Use one branch/worktree rooted at the approved SHA. Recommended branch: `codex/client-handoff-hardening`. Never discard unrelated local changes. The original `Not The Rug/` and `chino.txt` are outside scope.
3. Read repository instructions and the relevant installed Next.js documentation under `node_modules/next/dist/docs/` before changing framework behavior. Use the installed dependency versions; do not assume older Next.js semantics.
4. Finish one coherent phase, run its required checks, save its report to `plans/reports/013-PN-report.md`, and commit only authorized files. Include the commit SHA, diff, evidence, limitations, and rollback.
5. Send/paste that report into the original Codex audit task and **stop**. If the executing tool cannot message that task, provide the report and ask the operator to relay it. Saving the report alone is not delivery or approval.
6. Proceed only after Codex records `APPROVED P<N> <exact-commit-sha>`. Silence, passing CI, self-review, or another agent's opinion does not count. `CHANGES REQUESTED` means revise the same phase and report again.
7. A code change after approval invalidates that approval for the changed SHA. Unrelated baseline changes require a small rebase/diff review, not a silent reset.
8. Codex's technical approval does not authorize a production deploy, paid model invocation, real email, destructive migration, or account transfer. Phase 5 prepares a reviewable release; the project owner explicitly authorizes those external actions.

| Phase | Focus | Depends on | Approval status |
| --- | --- | --- | --- |
| P0 | Reproducible baseline and access evidence | Audit | Pending |
| P1 | Intake correctness and bounded requests | P0 approved | Pending |
| P2 | Security boundaries and enforced CI | P1 approved | Pending |
| P3 | Homepage delivery and responsiveness | P2 approved | Pending |
| P4 | Trustworthy reporting, SEO, and operating docs | P3 approved | Pending |
| P5 | Integrated release and client acceptance | P4 approved | Pending |

One implementer at a time is sufficient. If the operator explicitly assigns multiple agents, give them disjoint files, keep shared helpers/configuration under one owner, and integrate before the phase gate. Parallel agent work does not bypass review.

## P0 — establish the baseline

**Findings covered:** baseline requirements for F05, H03, H04. No production mutations.

1. Confirm the live Vercel alias, deployment ID, repository, source SHA, Node version, and local HEAD. If production has moved beyond the audit SHA, report the diff and refresh only affected findings before implementation. The checked-out branch name is not proof of deployment identity.
2. Create an isolated checkout of the approved baseline. Use Node 24 and `npm ci --no-audit` (with `npm_config_audit=false`; the detailed registry scan in step 5 needs explicit approval); do not delete dependencies or build artifacts in someone else's active checkout. Use synthetic environment values for local/CI validation, following the existing workflow's temporary-key pattern. No real service-account key belongs in a report.
3. Run lint, pipeline lint, build, typecheck, unit tests, browser tests, and asset verification. Record counts and skip reasons. Preserve the four audit reproductions from `docs/audits/2026-10-01-evidence/` as baseline evidence; these currently assert undesirable behavior and must be inverted into regression tests during P1.
4. Inventory environment variable **names/purpose/required status only**, using `.env.example` and deployment metadata. Confirm a non-production test environment and synthetic recipient strategy. List missing access separately from application defects.
5. With explicit approval for metadata transfer, run `npm audit --json`, plus an `--omit=dev` view. Record date, exact lockfile/SHA, advisory IDs, dependency paths, exploit prerequisites, and minimal compatible remedies. If approval remains unavailable, leave H04 open and report it; do not claim zero advisories.
6. Read-only verification: deployed Firebase rule versions; TTL policy states for all four named collections; GitHub required checks; supported auth providers; live email sender; project ownership and rollback access. If access is absent, state exactly what the operator must supply in a later gate. Do not export customer records to prove access.

**Exit evidence:** reproducible baseline, production SHA match or explained drift, command results, dependency scan result or explicitly open gate, configuration checklist with evidence timestamps. Codex must approve before P1.

**Rollback:** no application or infrastructure changes to roll back. Remove only the phase's own disposable test environment when finished.

## P1 — correct intake state and request handling

**Findings:** F01, F02, F03, F04, F11.
**Primary files:** `app/api/leads/{capture,meetgreet}/route.ts`, `lib/server/{firestoreRest,firebaseStorage,bench,benchIntake}.ts`, `app/api/bench/apply/**`, narrow bench notification/summary/admin mutation call sites, and relevant unit/integration suites.

Implement the following bounded changes:

- Namespace durable lead rate-limit counters by capture versus final inquiry. Preserve limits, TTL timestamps, and the documented failure policy. Add `Retry-After` if straightforward, without changing frontend flow.
- Extract one byte-capped JSON request reader from the existing correct implementations. Apply it to public JSON intake routes; cancel when over limit and handle disconnected streams safely. Keep upload limits compatible with the deployed platform ceiling.
- Implement the smallest concurrency primitive needed by existing writes: Firestore transaction or update-time conditional update with bounded retries. Reuse REST access if practical; do not pull in a large new database stack merely for this change. Treat precondition conflicts differently from dependency failures.
- Make capture transitions monotonic: conversion never reverts, true booking hints never clear, original first-seen time survives, and conversion-before-capture cannot create a fresh outstanding row. Coordinate booking-hint propagation to the full lead under both arrival orders. No replacement of unrelated fields.
- Validate a resume, then atomically claim its token before any storage write. Only the winning request uploads. Use attempt ownership for conditional finalization/cleanup; merge resume fields rather than saving a stale whole person. Keep the application on file on every failure. Document the existing email fallback for an interrupted consumed-token attempt; do not build a new upload-recovery product.
- Narrow other asynchronous bench writers found in this path to the fields they own so notification and AI-summary completion cannot overwrite an admin's stage/notes. Avoid unrelated admin redesign.
- Add cancellable deadlines to Firestore/Storage requests. Choose budgets from route limits (capture/track 10 seconds, inquiry 20 seconds, resume 30 seconds) and reserve time for response/status persistence. Pass caller-specific budgets where a single global timeout is inappropriate. Do not automatically retry an ambiguous write/send unless existing idempotency guarantees make it safe.

**Required proof:** convert the supplied four reproductions into tests for correct outcomes, plus emulator tests of both capture/conversion arrival orders, concurrent true/false booking signals, resume replay, an admin edit during upload, duplicate submission, expired token, storage/finalization failure, Unicode/chunked oversized input, and stalled upstream requests. Verify no duplicate email is sent and a notification failure preserves the lead. Baseline lint/build/typecheck/unit checks must pass; run affected booking/application E2E flows with mocks or test services.

**Exit evidence:** explain the conflicting-write ordering before/after, show emulator results rather than mocked concurrency alone, document timeout budgets and token failure behavior, and provide the small final diff. Stop for Codex approval.

**Rollback:** revert the phase commit. New fields must be optional/backward-compatible; old rate counters can expire normally. No production backfill is part of this phase. If existing inconsistent rows are found later, propose a dry-run repair separately with counts and owner approval.

## P2 — enforce security verification

**Findings:** F05, H01, H02, H04.
**Primary files:** `lib/server/verifyAdmin.ts`, relevant admin response helpers/routes, `firestore.rules` if identity rules change, `.github/workflows/ci.yml`, `package.json`/lockfile only when justified, test configs and auth/rules tests.

1. Confirm actual owner authentication works with verified-email checks. Require verified email before email-keyed whitelist authorization and check revoked/disabled credentials. Preserve distinction between missing/invalid credentials, insufficient permission, and backend failure. Mirror verified-email requirements in the direct client whitelist read rule if needed; retain no self-enrollment and default deny.
2. Set explicit private/no-store caching for private admin data and documents, including failure responses through the same boundary where practical. Do not depend on proxy UI gating for data authorization.
3. Add a CI integration job using pinned Firebase tooling and compatible Java. Start Firestore and Storage under a `demo-` project. Required rule/round-trip tests must fail when the emulators cannot start. Do not count zero executed tests as a pass.
4. Build a dedicated E2E configuration with `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, test mode, and `E2E_ANALYTICS_ENABLED=1`. Intercept analytics network writes for client assertions and use emulators for actual persistence tests. Preserve the production/test traffic separation. Turn unreachable mandatory local routes into failures in CI; retain deliberate device exclusions.
5. Publish useful test artifacts (`test-results` traces and a configured HTML report, or equivalent) on failure. Verify GitHub actually requires the relevant jobs before merge; report an absent branch-protection setting as an operations gate.
6. Apply only justified advisory fixes from P0. Affected runtime high/critical advisories must be fixed or explicitly risk-accepted by the owner with rationale and review date. Use compatible pinned/lockfile changes, rerun build and auth/media routes, and preserve the documented Firebase packaging workaround unless a tested change is necessary. Never use forced blanket upgrades.

**Required proof:** anonymous, malformed, expired, unverified-email, revoked, disabled, non-whitelisted, allowed-admin, and dependency-failure cases; cache headers on synthetic private responses; full default-deny rule tests; analytics client and emulator persistence tests with zero required security-suite skips. Test Google sign-in on the isolated preview with a designated account. Source mocks alone do not prove the real popup and whitelist behavior.

**Exit evidence:** CI run for the exact SHA, auth/provider evidence without tokens or PII, rules diff and preview validation, dependency disposition. Stop for Codex approval. Production rules are not deployed during this gate.

**Rollback:** revert code/CI changes; retain a saved previous rules version for the later coordinated release. Keep an authorized owner account available throughout validation.

## P3 — make the existing homepage faster

**Findings:** F06, F07, F08.
**Primary files:** `HomeIntroOverlay.tsx`, `hooks/useHomeIntroSequence.ts`, `hooks/useHomeHeroMotion.ts`, `HomeHero.tsx`, `HomePawWalk.tsx`, `TeamScroller.tsx`, their existing styles/content/assets, `app/(marketing)/page.tsx`, `proxy.ts`, and the asset manifest.

1. Keep headline and primary action visible and operable without waiting for video/fonts/GSAP. Adjust only the entrance behavior; preserve the composition, copy, brand assets, and reduced-motion handling. Keep failure paths visible. An arbitrary minimum hold must not delay booking.
2. Replace the two large paw PNG consumers with measured transparent derivatives. Optimize the eagerly loaded team images at their actual rendered sizes/crops; lazy-load those below the fold. Add a smaller mobile video/poster strategy and avoid video transfer for reduced-motion or supported data-saving signals. Reuse existing Sharp/build tooling and record source-to-derivative mappings; retain masters outside delivery paths.
3. Move only the existing allowlisted legacy query redirects out of the homepage server render. Preserve launch-mode behavior, preview noindex, old link targets, duplicate-parameter behavior, `/` navigation, `?welcome=1`, and marketing attribution. Verify the homepage becomes static and shows expected edge-cache behavior on preview. Leave dynamic booking/settings/admin routes alone.
4. Measure fonts and initial JS. Change only evidenced unused/preloaded resources; do not remove a font family or the welcome modal merely to reduce a number. Avoid risky function-tracing cleanup in this phase.

**Required proof:** before/after production-build samples under identical device/network settings, at least three cold runs for home at mobile and desktop widths. Report medians, completed transfer sizes, video separately, final LCP element, CTA visibility timing, layout shifts, and console errors. The audit's two unthrottled observations are evidence, not a Lighthouse score or field percentile.

**Project acceptance budgets:** primary headline/action do not depend on decorative loading; at least 30% reduction in comparable initial image transfer; no extra fonts or initial JS without justification; no new overflow, broken crops, or hydration errors. Compare 375/768/1440px and reduced motion, keyboard access, slow/failed video, and failed GSAP loading. If a budget cannot be met without design changes, report the measured tradeoff for approval instead of changing the design silently.

**Exit evidence:** media manifest passes, legacy URL tests pass, full affected public E2E passes, screenshots and measurements demonstrate preserved design and improved availability. Stop for Codex approval.

**Rollback:** revert route/motion/asset-consumer changes together; retain previous asset URLs through the release. No content data migration.

## P4 — finish reporting, SEO, and the operational handoff

**Findings:** F09, F10, H03, documentation drift and lint warnings.
**Primary files:** `lib/content/site.ts`, `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `lib/analytics/report.ts`, the existing analytics status/live components, `README.md`, `.env.example`, current operations/release docs, and the two existing lint-warning locations.

1. Normalize/validate the configured public base URL in one shared place. Use URL construction for sitemap, robots, canonical/OG metadata, and relevant email links. Preserve the currently intended host until the owner chooses a custom domain. Remove redirected service/process pages from the sitemap. Record whether `/walk-with-us` should be indexed; test the chosen behavior and keep `/contact`'s intentional policy.
2. Add explicit analytics dependency availability for live and first-event queries. Display unavailable values as unavailable and preserve successful sections. Test each query failure independently, true zero traffic, test mode, truncation, and recovery. Keep the existing bounded-query architecture.
3. Resolve the two lint warnings with minimal changes: remove the unused import; optimize the scheduling image with preserved dimensions or document a justified exception. No opportunistic modal refactor.
4. Make README the single entry point for setup, commands, deployment, and operations. Link current docs; mark superseded plans historical. Correct stale removed-route references, the copy-update/deploy description, and Node-version drift. Separate operator instructions from historical agent chatter. Do not rewrite all old plans.
5. Complete an owner-facing runbook: service/project ownership; environment variable inventory; deploy/rollback procedure; admin grant/removal; rule deployment/version verification; verified email sender and failed-email triage; configured cron schedule and brief-duration limitation; backup/restore verification; retention/deletion responsibility for leads/resumes; TTL states for four collections; cost/error alert ownership. Record “unverified” wherever evidence is missing. Do not invent recovery-time guarantees or legal compliance claims.
6. List any production actions required to close operations gates, with exact purpose, target, rollback, and whether they send email, cost money, or modify data. Prepare these for owner authorization; do not execute them under a documentation task.

**Required proof:** trailing-slash/no-slash URL fixtures; every sitemap destination is an intentional indexable 200 route; robots/canonicals/OG share the correct host; independent analytics failures render honestly; lint is clean or explicitly justified; a second reader can follow the README/runbook using no hidden local files. Preview acceptance covers home, booking, application, admin sign-in, metadata, and the dashboard with synthetic data.

**Exit evidence:** revised runbook, operation checklist with owners/status, passing tests, no unresolved P1 findings, explicit disposition for each P2/H item. Stop for Codex approval.

**Rollback:** revert code/doc changes. No data deletion, TTL activation, account transfer, or cron activation occurs without the separately authorized operation.

## P5 — integrated acceptance and release package

1. Freeze one candidate SHA containing only approved phases. From a clean isolated checkout run `npm ci --no-audit`, both lints, build, typecheck, unit tests, required emulator suites, full analytics-enabled E2E, and `verify:assets`. Capture all results for that SHA; distinguish permitted device exclusions from unexecuted required coverage.
2. Deploy an approved isolated preview and exercise the real flows with a designated synthetic identity/recipient: inquiry persistence, duplicate/retry, confirmation/founder notification status, capture-to-booking handoff, allowed/denied admin access, resume upload and private download, admin edit preservation, photo upload/render/delete, and truthful analytics failure states. Obtain explicit authorization before a real test email or paid generation. Keep brief generation off if its duration gate remains unmeasured.
3. Verify Firebase/Storage deployed rules, TTL states, canonical domain, email sender, secrets present by name only, supported runtime, intended cron, required GitHub checks, and owner access. A mock test cannot close these gates. Document any explicit owner risk acceptance with scope and date.
4. Assemble the release packet: candidate SHA, approved phase reports, finding-to-fix matrix, test evidence, known limitations, current production rollback deployment ID, rule rollback version, release steps, smoke checks, and responsible owner.
5. Submit the packet to Codex and **stop for technical approval**. Then obtain the project owner's explicit authorization to promote that exact candidate and apply any listed production configuration/rule actions. Deploy no other SHA.
6. After authorization, execute the release checklist, verify the alias points to the candidate, and repeat the minimal production smoke checks. Synthetic submission/email requires the agreed test identity. Record the results and final handoff status back to Codex. The responsible maintainer reviews error/notification/cost signals over the agreed first 24–48 hours; do not claim background monitoring has been configured unless it actually has.

**Release rollback triggers:** inquiry persistence fails; valid owner loses access; private content becomes accessible anonymously; duplicate notifications; broken scheduler; material performance/visual regression; unexplained production errors. Restore the prior Vercel deployment, restore rules only if changed and necessary, preserve customer data, and document the incident. Backward-compatible fields must allow the prior deployment to operate.

**Definition of done:** every P1 closed; each P2 fixed or explicitly accepted with reasoning; H items verified or explicitly recorded as remaining limitations; no unexplained required-test skips; live candidate SHA verified; owner can deploy, roll back, revoke admin access, find failed notifications, and locate backup/retention instructions. Codex reviews the post-release report before the plan is marked complete.

## Reusable Claude/Sonnet dispatch prompt

```text
Work on Not The Rug using plans/013-client-handoff-hardening.md and the linked
production audit. Implement ONLY phase [P0/P1/P2/P3/P4/P5], based on approved
commit [SHA]. Read prior phase reports and verify Codex approved that exact base.

Use the smallest changes that fix the listed existing issues. Preserve branding,
copy, booking behavior, integrations, and backward-compatible data. Read local
AGENTS.md and the installed Next.js docs before framework changes. Never touch
unrelated untracked files, production secrets/data, unscheduled paid generation,
or real email recipients. Do not deploy without the explicit release authorization.

Run the phase's required checks. Record failures and skips honestly. Save
plans/reports/013-[PHASE]-report.md with the completed report template below,
commit only in-scope files, and return the report and exact SHA to the original
Codex audit task for review. STOP until Codex explicitly approves that phase/SHA.
Do not start the next phase, waive your own failures, or mark yourself approved.
If the task cannot be messaged directly, ask the operator to relay your report.
```

## Required phase report format

```markdown
# Plan 013 — P<N> review request
Status: READY FOR REVIEW | BLOCKED | CHANGES REQUESTED ADDRESSED
Base SHA:
Candidate SHA:
Branch/worktree:
Findings addressed:

## Result
Concrete before/after behavior and why this is the smallest sufficient fix.

## Change scope
Files changed, public contract changes, dependencies/configuration changes.

## Evidence
Exact commands; environment/runtime; exit codes; passed/failed/skipped counts;
skip reasons; reproduction results; emulator/preview URLs or artifact paths.
No credentials, ID tokens, customer data, or unredacted provider payloads.

## Risks and unresolved items
Remaining issue IDs; what was not verified; production actions requiring owner
authorization; compatibility and operational implications.

## Rollback
Exact revert/deployment target and any configuration reversal. No data deletion.

## Review request
Request Codex approval for P<N> at <SHA>. No next phase has started.

## Reviewer decision — Codex only
PENDING
```

Codex reviews the final diff, the demonstrated failure mode, the correctness of the remedy, passing mandatory checks, and scope discipline. The reviewer writes `APPROVED P<N> <SHA>` or actionable changes requested. A report that omits missing production evidence is rejected rather than silently accepted.
