# Plan 013 — P0 review request
Status: READY FOR REVIEW
Base SHA: `905206d6c5e046eee6c42b44b42efd05ad0f1cf8`
Candidate SHA: the commit that adds this report on `codex/client-handoff-hardening` (exact SHA supplied with the relay message; no application code changed)
Branch/worktree: `codex/client-handoff-hardening`, `/Users/bballi/Documents/Repos/NotTheRug-013`
Findings addressed: baseline for F05, H03, H04 (P0 is evidence only)

## Result

The baseline is reproducible from a clean install. Production still serves the audited SHA, so no finding needs refreshing. All four audit reproductions still demonstrate their defects. The 61 unit-test skips are purely a CI configuration gap: with local emulators the full suite runs 599/599 with zero skips. New operational facts: TTL is active on only two of the four named collections, there are no Firestore backups or point-in-time recovery, branch protection is off, and Firebase Auth has email/password sign-in enabled alongside Google.

## Change scope

Documentation only. Added `plans/reports/013-P0-report.md` and `plans/reports/013-tracker.md`. Also committed the previously untracked source documents so the reviewer and later phases share them: `plans/013-client-handoff-hardening.md`, `docs/audits/2026-10-01-production-audit.md`, and `docs/audits/2026-10-01-evidence/` (copied unchanged from the main checkout; public/synthetic data only). No application code, configuration, dependency, rule or deployment change. `Not The Rug/` and `chino.txt` untouched.

## Evidence

### 1. Production identity (read-only, 2026-10-05T00:12Z)

| Item | Value |
| --- | --- |
| Alias | `nottherug-ten.vercel.app` (also `nottherug-baiees-projects`, `nottherug-git-main-baiees-projects`) |
| Deployment | `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1`, READY, target production, region iad1 |
| Source | GitHub `Bai-ee/nottherug`, branch `main`, commit `905206d6c5e046eee6c42b44b42efd05ad0f1cf8` |
| Local `origin/main` | `905206d` — no drift from the audit baseline |
| Node | `package.json` engines `24.x`; local `v24.7.0`. Linked `.vercel/project.json` still records `nodeVersion: 20.x` (the audit's build log showed Node 24 overriding it). Project-setting change is out of scope; recorded for P4 docs. |
| CI on main | Last three `CI` runs on `main` succeeded (latest run 36797169457 for `905206d`). |

### 2. Baseline commands (isolated worktree, `npm ci`, CI-style throwaway Firebase config, `PUBLIC_BASE_URL=https://example.test`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm ci` | 0 | 686 packages added. See H04 note below. |
| `npm run lint` | 0 | 0 errors, 1 warning (`SchedulingDialog.tsx:259` raw `<img>`) |
| `npm run lint:pipeline` | 0 | 0 errors, 1 warning (unused `stat`, `scripts/audit-public-assets.mjs:25`) |
| `npm run build` | 0 | Next 16.3.5. `/` is `ƒ` (dynamic) — confirms F08 precondition |
| `npm run typecheck` | 0 | after build |
| `npm test` (no emulators, as CI) | 0 | 66 files; 538 passed, **61 skipped** |
| `firebase emulators:exec --only firestore,storage --project demo-not-the-rug "npx vitest run"` (firebase-tools 15.15.0, OpenJDK 21.0.12) | 0 | 66 files; **599 passed, 0 skipped** |
| `npm run verify:assets` | 0 | pass |
| Playwright, `E2E_BASE_URL=http://127.0.0.1:3194`, 4 workers, server with `FIRESTORE_EMULATOR_HOST=127.0.0.1:1 ANALYTICS_TRACKING_DISABLED=true` | 0 | 156 passed, 20 skipped, 0 failed, 57.3 s |
| Audit reproductions (both `.txt` files copied to temporary test names, run, then removed) | 0 | **4 passed — all four defects still present** (F01 shared quota, F02 capture/conversion race, F04 Unicode limit bypass, F03 resume replay + stale overwrite) |

E2E skip reasons (from JSON reporter): 6 skips are analytics specs needing an analytics-enabled build (`analytics-journey` ×4, `analytics-pageview` ×2) — **these are F05 targets, not acceptable as required coverage**. The other 14 are deliberate device exclusions (desktop-only vs mobile-only nav/menu/rail, one engine for layout chrome). The `booking` and `walk-with-us` route-unreachable skips did not trigger in this run but remain capable of silently skipping in CI (F05).

`next-env.d.ts` was rewritten by the build and restored afterwards.

### 3. Environment variables (names only)

Vercel API token lacks permission to list env vars (403); names obtained via linked Vercel CLI `env ls`, which does not show values.

| Name | Prod | Preview | Dev | In `.env.example` |
| --- | --- | --- | --- | --- |
| PUBLIC_BASE_URL, NEXT_PUBLIC_CALENDLY_URL, RESEND_API_KEY, RESEND_FROM_EMAIL, FOUNDER_EMAIL, CRON_SECRET | ✓ | ✓ | — | ✓ |
| NEXT_PUBLIC_ANALYTICS_ENABLED, NEXT_PUBLIC_ANALYTICS_TEST_MODE | ✓ | ✓ | — | ✓ |
| ANTHROPIC_API_KEY, NWS_USER_AGENT | ✓ | ✓ | ✓ | ✓ |
| FIREBASE_ADMIN_{PROJECT_ID,CLIENT_EMAIL,PRIVATE_KEY}, NEXT_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,MESSAGING_SENDER_ID,APP_ID} | ✓ | ✓ | ✓ | ✓ |
| LAUNCH_MODE, ANALYTICS_TRACKING_DISABLED, NOT_THE_RUG_BRIEF_DATA_DIR, BENCH_AI_SUMMARIES_ENABLED, BENCH_AI_MODEL, TWILIO_*, QSTASH_*, CHECKR_* | — | — | — | ✓ (optional/unused in deployment) |

**Test environment:** Preview uses the same Firebase Admin credentials, Resend key and founder recipient as Production. There is no isolated non-production Firebase project or synthetic recipient configured. Local/CI validation uses the `demo-not-the-rug` emulator project, which is sufficient for P1–P4. P2's real Google sign-in check and P5's preview flows need an owner decision (see Risks).

### 4. Dependency advisories (H04)

Detailed scan **not performed**; approval for sending dependency metadata to npm is still absent. Disclosure: `npm ci` performs npm's default audit, so the P0 install did transmit dependency metadata to the registry once before this was caught. It printed only a summary: **11 vulnerabilities (10 high, 1 critical)** for the current lockfile. No `npm audit --json` was run, no advisory IDs or paths were collected, and nothing was fixed. All further installs in this plan use `npm ci --no-audit`. H04 stays open pending explicit approval of the detailed scan.

### 5. Read-only production configuration (2026-10-05, gcloud/firebase as the project owner account)

| Item | Finding |
| --- | --- |
| Firestore rules | Release `cloud.firestore` → ruleset `98050a6d…`, updated 2026-09-29T22:32Z. Deployed source is **byte-identical** to `firestore.rules` at baseline. |
| Storage rules | Release for `not-the-rug.firebasestorage.app` → ruleset `2e328ac4…`, updated 2026-09-29T22:32Z. **Byte-identical** to `storage.rules`. |
| TTL policies | `analytics_events.expiresAt` ACTIVE, `analyticsRateLimits.expiresAt` ACTIVE. **`leadRateLimits` and `benchRateLimits` have no TTL policy.** Enabling them is a production action for owner authorization (P4/P5). |
| Backups | No Firestore backup schedules; point-in-time recovery disabled; delete protection disabled (database `(default)`, `nam5`). Owner decision for P4 runbook. |
| Auth providers | Google enabled. **Email/password sign-in also enabled** (`passwordRequired: true`). This makes H01's verified-email requirement material, not theoretical. |
| Project owner access | `roles/owner` held by one user principal (identity not recorded here). Single-owner is a handoff risk to note in P4. |
| GitHub | `main` is **not protected** (HTTP 404 "Branch not protected"); no rulesets. CI exists but is not a required check. |
| Email sender | Not verified: checking Resend domain status requires using the production API key. Left for P4/P5 with owner access. |

No customer records were read or exported.

## Risks and unresolved items

- Open: F01–F11, H01–H04. Nothing is fixed in P0.
- F06/F07/F09 were not re-measured live in P0 (production is unchanged at the audited SHA, so audit measurements stand); P3/P4 will re-measure before/after.
- **Owner decisions/actions needed later (none executed):**
  1. Approve or deny the detailed npm advisory scan (H04).
  2. Enable TTL on `leadRateLimits` and `benchRateLimits` (production change).
  3. Backup/PITR policy for Firestore.
  4. Whether to disable email/password sign-in, or rely on the P2 verified-email check.
  5. Enable branch protection with CI as a required check (after P2's CI changes).
  6. Designate an isolated test identity/recipient and decide whether Preview should keep production Firebase/Resend credentials.
  7. Add a second project owner for continuity.
- The F02 reproduction is mocked ordering; emulator conflict tests are a P1 requirement.

## Rollback

No application or infrastructure changes. Revert the P0 commit or delete the `codex/client-handoff-hardening` branch/worktree. Production remains `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1` at `905206d`.

## Review request

Request Codex approval for P0 at the candidate SHA above. No next phase has started.

## Reviewer decision — Codex only
PENDING
