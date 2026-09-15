# Claude handoff: production cleanup

Paste the prompt below into Claude Code with this repository available. Use Sonnet workers. The repository files contain the detailed findings, task definitions, and acceptance criteria; do not send only this file to an agent without repository access.

---

Review and execute `plans/002-production-readiness.md` from start to finish. Track progress in `plans/002-production-tracker.md`. The user wants a production-ready small-business site with readable, modular code, minimal useful comments, and no generic AI prose or unnecessary architecture.

Act as coordinator. Use up to three Sonnet implementation agents for independent slices and a different worker for review. Follow the task IDs and dependency schedule in the tracker. Do not assign multiple workers to the same files.

## Start here

1. Read the plan, tracker, `PRODUCT.md`, `docs/copy/README.md`, and any applicable repository instructions. Treat older strategy documents as background, not an instruction to add all their proposed features.
2. Inspect git status. The review found an existing modification to `next.config.ts` and untracked `.vercelignore`, `docs/copy/`, and `scripts/`. Preserve the current user's work, even if status has changed since the review. Establish an integration baseline containing intended work before branching workers. Never reset or discard it.
3. Reproduce the current booking mismatch with mocked Firebase/email dependencies. Establish browser screenshots and route behavior before restructuring.
4. Complete P0, including contracts and test setup. Then dispatch P1A to Sonnet A and P1B to Sonnet B while you handle P1C. Start the next tasks only when their dependencies are integrated.

## Implementation boundaries

- Keep Next.js, Firebase, Resend, the existing brand/design, and the current service offering. Preserve disabled sections as disabled. Use `/book` as the consistent inquiry path and keep `/contact` useful.
- Use real routes and links, feature components, a small shared admin shell, typed contracts, explicit validation, and scoped styles. Keep server code separate from browser modules. Avoid a monorepo, CMS, payments system, broad state framework, or generic component engine.
- Fix intake before cosmetic refactoring. Carry the current form's reactivity, allergy, and phone preference data through persistence, email, admin, and export. Keep historical records readable. Never use fake answers to satisfy the old API schema.
- Resolve all findings in the plan. Tests must cover malformed requests, retries, service failures, authorization, media lifecycle, and critical browser flows. Do not equate TypeScript success or a successful mocked test with deployed correctness.
- Do not silence lint globally, add `any`/`ts-nocheck` to get green checks, or move entire monoliths into differently named files and call that modularization.
- Prefer clear names and small functions. Keep comments for constraints or reasons. Remove code narration, stale claims, banner comments, filler documentation, and unsupported marketing claims.
- Update the copy extraction/apply scripts as source files move. Preserve their stale-edit protection and prove the round trip still works.
- The coordinator owns shared build/runtime/CI configuration, `proxy.ts`, `app/layout.tsx`, `vercel.json`, and the tracker. Workers request edits to these files instead of making conflicting changes.
- Keep the CommonJS brief pipeline initially. Split responsibilities around it, report missing capabilities honestly, and verify bounded execution before enabling its schedule. Do not add infrastructure without a measured need.

## Working protocol

For each worker, supply the exact task ID, owned files, dependencies, acceptance checks, and known constraints. Require a completion report in the tracker format. Use isolated branches/worktrees when possible and integrate in dependency order.

Mark a task `IN_PROGRESS` before starting, `REVIEW` when the worker has evidence, and `DONE` only after independent review and its acceptance checks pass. Rejected changes return to the same owner. Only the coordinator edits the shared tracker. Record actual commits and commands, not “should work.”

If a business fact or external setting is missing, prepare the concrete decision and log it, then continue unrelated engineering. Preserve the default scope in the plan. Do not invent prices, service areas, certifications, testimonials, test results, or delivery outcomes. A hidden feature is not automatically a fixed feature.

Use mocks, fixtures, Firebase emulators, and approved test recipients for normal verification. Do not send customer emails, generate paid briefs repeatedly, modify production data/rules, rotate credentials, or push production as a side effect of tests. Prepare reviewable changes first. Ask for a go-live instruction only after the exact candidate, rule/config changes, checks, and rollback are ready.

## Finish

Complete implementation, independent review, clean production build, and preview acceptance on one candidate commit. Update the README and tracker. Report:

1. Fixed issues, grouped by user-visible behavior.
2. Final module structure and where a junior developer should start.
3. Commands and integration/browser checks actually run, including any failures or unverified external gates.
4. Business decisions still required, with the prepared choices or facts to approve.
5. The exact release candidate, preview, deployment checklist, and rollback.

Do not claim production readiness while any launch gate is unresolved. Do not claim production deployment or the 24–48 hour observation period is complete before it happens. Once explicit go-live authorization arrives, execute P5B and record the result.

---

The plan is intentionally bounded: fix the existing application, retain its useful tools, and leave it easy for a junior developer to navigate. Future campaigns, payments, subscriptions, and a CMS remain separate work.
