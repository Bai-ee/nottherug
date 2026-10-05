# Plan 013 — P2 review request
Status: READY FOR REVIEW (GitHub Actions result pending the operator's push; see Evidence §3)
Base SHA: `7833d996f002925ef87a3dd58fb956a1161bb5e7` (approved P1), plus record commit `0068493`
Candidate SHA: **the commit that adds this report** (code identical to `69a2beb`, where the local checks ran; the report commit adds only `plans/reports/` files). Exact SHA is given in the relay message.
Branch: `codex/client-handoff-hardening`, worktree `/Users/bballi/Documents/Repos/NotTheRug-013`
Findings addressed: F05, H01, H02, H04; folded in from P1: apply-route auto-invite ordering (Worker D note)

## Result

| ID | Before | After |
| --- | --- | --- |
| H01 | `verifyIdToken(token)` without revocation check; any token with an `email` claim was looked up in the whitelist, verified or not. Production has Google **and email/password** sign-in enabled (re-checked 2026-10-05T04:26Z: `enabled: true`). | `verifyIdToken(token, true)` (revoked sessions and disabled users rejected); `email_verified === true` required before the whitelist lookup. 401: missing/malformed header, `auth/argument-error`, `auth/invalid-id-token`, `auth/id-token-expired`, `auth/id-token-revoked`, `auth/user-disabled`, `auth/user-not-found`, no email claim. 403: unverified email (403, not 401, because the client's `adminFetch` turns 401 into "sign in again", which cannot fix an unverified email), verified but not whitelisted. 500: any other verification failure (Auth backend/network/credential), whitelist lookup failure or 5 s timeout. Known exception: firebase-admin reports a signing-key fetch failure as `auth/argument-error`, so that case is 401, as before. Email is not normalized: `admins/` docs are keyed by the raw token email and the rules use it unchanged. |
| H01 rules | `admins/{email}` client read allowed for any signed-in user reading their own email doc. | Also requires `request.auth.token.email_verified == true`. No self-enrollment, default deny unchanged. |
| H02 | Admin responses had no explicit cache policy. | One boundary: `next.config.ts` `headers()` sets `Cache-Control: private, no-store` for `/api/admin/:path*`, `/admin/leads`, `/admin/founder-brief/:path*`, `/admin/preview/:path*`, `/admin/not-the-rug/:path*` — every route handler that calls `verifyAdmin` (21 callers), including resume download and brief HTML, on success and error responses. Verified on a local `next start`: config header overrides a handler-set `Cache-Control`; public routes unaffected. `transpilePackages` firebase workaround untouched. |
| F05 | CI ran Vitest without emulators (96–97 emulator tests skipped as "pass"); analytics E2E never ran (6 skips); booking/walk-with-us skipped when their route was unreachable; failure artifact path was empty. | New `emulators` job: Temurin 21, `npx --yes firebase-tools@15.15.0 emulators:exec --only firestore,storage --project demo-not-the-rug "npm run test:emulators"`. `REQUIRE_EMULATORS=1` makes an unreachable or unset emulator host **fail**; `tests/support/check-required-emulator-run.mjs` fails unless each of the 11 emulator suites passed ≥1 test and the run has 0 skipped/todo/failed. New `e2e-analytics` job: separate build with `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, `NEXT_PUBLIC_ANALYTICS_TEST_MODE=true`, run under the Firestore emulator with `E2E_ANALYTICS_ENABLED=1` (`playwright.analytics.config.ts` refuses to run without it). booking/walk-with-us fail when `CI` is set and the server is unreachable (skip locally). Playwright writes an HTML report in CI; `playwright-report/` and `test-results/` uploaded on failure for both E2E jobs; vitest JSON for `emulators`. Every install is `npm ci --no-audit` with `npm_config_audit=false` at workflow level. |
| H04 | Advisory scan not run (no approval). | Owner approved; scan run once (details below). `next` 16.3.5 → 16.3.8; `@grpc/grpc-js` 1.14.4 → 1.14.5 under `firebase-admin`. Remaining advisories proposed for owner risk acceptance. |
| P1 fold-in | Auto-invite email could be sent while the stage move to `shadow_invited` was skipped (person stayed in `review`). | Stage move persisted first (conditional, budgeted); invite sent only if that write succeeded; otherwise the ordinary "received" email. Admin state still wins. |

## Change scope

- **H01/H02 (Worker E, `79f1828`):** `lib/server/verifyAdmin.ts`, `firestore.rules` (admins read rule), `next.config.ts` (`headers()` only), tests `auth-verifyAdmin.test.ts` (rewritten, all cases), `admin-cache-headers.test.ts` (config output + every `verifyAdmin` route covered by a source), `rules-firestore.test.ts` (unverified, missing claim, anonymous added; existing cases now carry `email_verified: true`).
- **F05 (Worker F, `5a28aac`):** `.github/workflows/ci.yml` (4 jobs: `check`, `e2e`, `emulators`, `e2e-analytics`), `playwright.config.ts` (`E2E_PORT`, CI reporters `github`+`list`+`html`), new `playwright.analytics.config.ts`, `package.json` scripts (`test:emulators`, `test:e2e:analytics`), new `tests/support/emulatorGate.ts` and `check-required-emulator-run.mjs`, gating headers of 11 emulator suites (no assertion changes), `tests/e2e/helpers/serverGate.ts`, README and `docs/analytics-operations.md`. One spec fix: `analytics-journey.spec.ts` waited for navigation to `/book` after the footer CTA, which now opens the welcome dialog in place; it navigates directly after asserting the `footer_book` event (never ran before because of the skip).
- **Fold-in (Worker C, `a70530a`):** `app/api/bench/apply/route.ts`, bench tests.
- **Coordinator (`0e2bcc5`, `69a2beb`):** `package.json` (`next` pin), `package-lock.json` (13 entries), `vercel.json` (see Operations), `tests/unit/upstream-deadlines.test.ts` (env set in `vi.hoisted`; the file failed when run alone at baseline), `verifyAdmin.ts` comment correction.
- No production rules deployed, no settings changed, no new dependencies.

### Lockfile note

`npm install`/`--package-lock-only` with npm 11.5.1 removed 27 other-platform optional entries (`lightningcss-*`, `@rolldown/binding-*`, `fsevents`) although their parents still declare them; committing that would break `npm ci` builds on Linux CI. The committed lockfile keeps every original entry and takes only the 13 entries npm changed (`next`, `@next/env`, 8 `@next/swc-*`, root spec, 2 `@grpc/grpc-js` copies). Verified with a clean `npm ci --no-audit` in an empty directory; reviewer confirmed platform entry counts identical (11 lightningcss, 112 platform bindings).

## Dependency advisories (H04)

Scan: `npm audit --json` and `npm audit --omit=dev --json`, 2026-10-05, at `0068493` (lockfile before the upgrade). Raw output: `013-P2-evidence/npm-audit-all.json`, `npm-audit-omit-dev.json`, `npm-audit-meta.txt`. Totals: all 11 (10 high, 1 critical); runtime (`--omit=dev`) 5 (4 high, 1 critical).

| Advisory | Package / path | Runtime? | Exposure here | Disposition |
| --- | --- | --- | --- | --- |
| GHSA-vcvr-r3jv-pc5j (critical): RCE in `next/og` `ImageResponse`, `>=16.2.0 <16.3.6` | `next` (direct) | Yes | No code imports `next/og`/`ImageResponse`; OG images are static PNGs | **Fixed**: 16.3.8 (patch) |
| GHSA-m9gg-hp2v-232j, GHSA-f596-whhp-79r4 (high): grpc-js server `getAuthContext` / error messages | `@grpc/grpc-js` 1.14.4 via `firebase-admin` → `@google-cloud/firestore` → `google-gax` | Installed, server | App runs no gRPC server; app's Firestore access is REST; advisories concern grpc servers | **Fixed** in lockfile: 1.14.5 (within declared `^1.12.6`) |
| Same two | `@grpc/grpc-js` 1.9.16 via `firebase` → `@firebase/firestore` (`~1.9.0`) | Installed | Browser bundle uses WebChannel, not grpc; the client SDK runs only in the browser and in rules tests; no gRPC server | **Owner risk acceptance proposed**: no compatible fix (npm's only offer is a major downgrade to `firebase@9.14.0`); revisit when `firebase` updates its range. Review date: next dependency pass or 2027-01-05 |
| GHSA-vfj7-8cjw-p6xm (high) via `braces`/`micromatch`/`fast-glob`/`@next/eslint-plugin-next`/`eslint-config-next` | dev only (lint) | No | Lint tooling on developer-controlled patterns | **Owner risk acceptance proposed** (only offered fix is a major downgrade of `eslint-config-next`) |
| `@firebase/rules-unit-testing` (high, via `firebase`) | dev only (tests) | No | Test-only emulator client | **Owner risk acceptance proposed** |

Not run after the upgrade (would be a second registry transfer, not separately approved); post-upgrade status of the two fixed advisories is inferred from versions against the advisory ranges. `eslint-config-next` stays 16.3.5 (dev-only, harmless).

## Evidence

### 1. Local reproduction of every CI job

Run on `69a2beb`; logs and `summary.txt` in `plans/reports/013-P2-evidence/`. Environment: Node v24.7.0, firebase-tools 15.15.0, OpenJDK 21.0.12, `npm_config_audit=false`, CI throwaway Firebase env (`ci-build` placeholders, fresh RSA key, `PUBLIC_BASE_URL=https://example.test`). Emulators via untracked `firebase.worker.json`: Firestore 8580, Storage 9599, hub 4540, logging 4550 (`emulators:exec` exports `FIRESTORE_EMULATOR_HOST=127.0.0.1:8580`, `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9599`). The unrelated port-8080 process was left untouched. Local E2E servers on port 3400 (`E2E_PORT=3400`, `CI=1`).

Run 2026-10-05T04:27:10Z–04:28:48Z.

| CI job → local command | Exit | Result |
| --- | --- | --- |
| `check`: `npm run lint` | 0 | 0 errors, 1 pre-existing warning (`SchedulingDialog.tsx`, P4) |
| `check`: `npm run lint:pipeline` | 0 | 0 errors, 1 pre-existing warning (P4) |
| `check`: `npm run build` | 0 | Next 16.3.8 |
| `check`: `npm run typecheck` | 0 | — |
| `check`: `npx vitest run` with `FIRESTORE_EMULATOR_HOST=127.0.0.1:1 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:1` (no emulator, as the `check` job) | 0 | 612 passed, 100 skipped (emulator suites; not the gate) |
| `check`: `npm run verify:assets` | 0 | pass |
| `emulators`: `firebase emulators:exec --config firebase.worker.json --only firestore,storage --project demo-not-the-rug "npm run test:emulators"` | 0 | **712 passed, 0 skipped**; guard: "101 emulator-backed tests passed across 11 suites" |
| `emulators`, negative: `npm run test:emulators` with emulator hosts unreachable | 1 (expected) | 11 suites fail: "REQUIRE_EMULATORS=1 but the Firestore emulator is unreachable…" |
| `e2e`: default build, `CI=1 E2E_PORT=3400 npm run test:e2e` | 0 | 156 passed, 20 skipped (6 analytics, now run by `e2e-analytics`; 14 deliberate device exclusions) |
| `e2e-analytics`: build with analytics flags, then `CI=1 E2E_PORT=3400 E2E_ANALYTICS_ENABLED=1 firebase emulators:exec --config firebase.worker.json --only firestore --project demo-not-the-rug "npm run test:e2e:analytics"` | 0 | **6 passed** (previously always skipped) |

Additional local proofs by Worker F: analytics config refuses a non-analytics build; booking/walk-with-us with `CI=1` and no server → 16 failed, 0 skipped (16 skipped without `CI`); full E2E on the analytics build 162 passed, 14 skipped. Baseline (P1 approved): emulator suite 692/692; P2 adds 20 tests.

### 2. Real sign-in (operator, local server against production Auth)

Candidate built and served locally (`next start`, port 3500) with production public Firebase config and Admin credentials loaded by Next from the operator's `.env.local` (symlinked for the run, removed after), `ANALYTICS_TRACKING_DISABLED=true`, a dummy `RESEND_API_KEY`, no `ANTHROPIC_API_KEY`. Only reads: Firebase Auth token verification with revocation check, and `admins/{email}`.

| Check | Result |
| --- | --- |
| a. Owner Google sign-in at `/admin`, dashboard loads | **Passed** (operator, 2026-10-05). Server log showed no errors. Confirms a real Google token carries `email_verified: true`, the revocation check works with the production service account, the rules read and server whitelist agree on the email doc id. |
| Unauthenticated admin API on that server | `GET /api/admin/analytics` → 401, `Cache-Control: private, no-store` |
| b. Verified non-whitelisted Google account → 403 | **Not run** (operator decision); covered by unit tests only |
| c. Unverified email/password account → 403 | **Not run** (operator decision). Covered by unit and rules tests only. Note: production already has email/password sign-in **enabled**, so this path exists in production today; the operator chose not to create a test account. |
| d. Disabled/revoked account → 401 | **Not run** (operator decision); covered by unit tests (`checkRevoked: true` asserted, `auth/user-disabled`, `auth/id-token-revoked`) |
| Cache-Control on an authenticated 200 through Vercel's edge | Not verified (no isolated deployment); local `next start` showed the config header overrides handler headers |

### 3. GitHub Actions on the exact SHA

**Pending.** The branch had not reached GitHub when this report was committed (`git ls-remote` empty at 2026-10-05T04:29Z; the coordinator's push was blocked by the session's safety policy and the operator is pushing). No GitHub Actions run exists yet for this SHA, so nothing here is claimed about runner behavior: Actions YAML acceptance, `setup-java`, the emulator jar cache, `npx firebase-tools@15.15.0` on a runner, Playwright browser install, Linux/WebKit timing and artifact upload remain **unverified**. Vercel at 04:26Z: no deployment for this branch (newest is production `905206d`). The run URL and per-job results, and a re-check that no Preview was built, will be added in an addendum (`013-P2-ci-addendum.md`) without changing code.

### 4. Independent review (Worker D)

`plans/reports/013-P2-review.md`: APPROVE-FOR-SUBMISSION, no blocking defects.

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | `verifyAdmin` comment claimed a signing-key fetch failure surfaces as 500; firebase-admin maps it to `auth/argument-error` (401) | Comment corrected (`69a2beb`); behavior unchanged and documented above |
| 2 | Auto-invite stage write that times out but commits → `shadow_invited` with the "received" email instead of the invite | Accepted risk, documented in `013-P2-worker-C.md` (admin sees the correct stage and can send the invite) |
| 3 | `vercel.json` rule disables all non-main Git deployments | Intended; see Operations |
| 4 | Cache-Control verified at config level and on local `next start`, not through Vercel | Recorded as unverified on Vercel |
| 5 | `eslint-config-next` 16.3.5 vs `next` 16.3.8 | Harmless; left |

## Operations and owner steps (none executed)

1. **Deploy the Firestore rules separately.** Vercel does not deploy Firebase rules. After this candidate is released, the owner runs, from a checkout of the released SHA: `firebase deploy --only firestore:rules --project not-the-rug`. Before deploying, record the current ruleset (`98050a6d-75ce-4ce7-9168-6fa04c605c9b`, P0) for rollback. Verify afterwards that the released ruleset source matches `firestore.rules`. Storage rules are unchanged in P2.
2. **Preview deployments are off once this merges.** `vercel.json` now has `"git": { "deploymentEnabled": { "**": false, "main": true } }`. Vercel reads this from each pushed commit, so after the merge to `main` **every non-main branch stops getting Preview deployments for the whole project** (production deploys from `main` continue). This exists because Preview currently shares production Firebase/Resend credentials. To turn Previews back on once they are isolated (separate Firebase project and Resend key/recipient scoped to the Preview environment): remove the `git.deploymentEnabled` block (or set specific branches to `true`) in a commit to `main`.
3. **Mark CI checks required** in GitHub branch protection for `main`: `check`, `e2e`, `emulators`, `e2e-analytics` (job ids; confirm display names in the UI). `main` is currently unprotected (P0).
4. **Consider disabling email/password sign-in** in Firebase Auth if no one uses it: admin login is Google-only, and the enabled provider is the reason H01's verified-email check matters.
5. **Accept or reject the proposed advisory risk acceptances** in the H04 table.

## Risks and unresolved items

- **CI on GitHub:** see §3; branch protection is not set (owner step 3).
- **Sign-in checks b–d** not run against real accounts (operator decision); unit/rules tests only.
- **Revocation check latency/availability:** every admin request now calls Firebase Auth; an Auth outage returns 500 on admin routes (by design, fails closed). A new firebase-admin error code outside the allowlist would surface as 500 (fails closed).
- **Rules not deployed:** production still runs the P0 ruleset until owner step 1.
- **Analytics E2E** asserts the client's `/api/track` request; persistence is covered by the emulator round-trip unit suite.
- **Local-only quirk:** the repo's plain `npm test` uses default emulator hosts; on this machine port 8080 is an unrelated process, so explicit-host commands were used.
- Remaining open: F06–F10 (P3–P4), H03 (P4/P5).

## Rollback

Revert P2 on the branch: `git revert -m 1 2f2a49d 26d9741 ed9db24` plus `git revert 69a2beb 0e2bcc5` (newest first), or reset to `7833d99`. Nothing is deployed; production remains `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1` at `905206d`, rules at the P0 rulesets. If later released: reverting `vercel.json` restores Preview deployments; reverting the rules requires redeploying the previous ruleset (`firebase deploy --only firestore:rules` from the prior SHA). `next` downgrade is a revert of the two manifest lines.

## Review request

Request Codex approval for P2 at the candidate SHA in the relay message. P3 has not started.

## Reviewer decision — Codex only
PENDING
