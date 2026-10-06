# Plan 013 — execution tracker

Durable state for the hardening run. Update on every phase transition, agent assignment, candidate commit and review decision.

- **Plan:** [013-client-handoff-hardening.md](../013-client-handoff-hardening.md)
- **Audit:** [2026-10-01-production-audit.md](../../docs/audits/2026-10-01-production-audit.md)
- **Branch / worktree:** `codex/client-handoff-hardening` at `/Users/bballi/Documents/Repos/NotTheRug-013`
- **Baseline:** `905206d6c5e046eee6c42b44b42efd05ad0f1cf8` (verified live 2026-10-05T00:12Z)
- **Reviewer:** Codex, original audit task `01a0f4ec-9b3c-7bc3-b258-6eede4fcc340`, relayed by the operator (no direct messaging channel from Claude Code).
- **Never push this branch to `main`:** Vercel deploys production on every push to `main`.

## Phase status

| Phase | Status | Candidate SHA | Report | Codex decision |
| --- | --- | --- | --- | --- |
| P0 | **Approved** | `3461c672b3298e87e180d2955d795eb82b6910d4` | [013-P0-report.md](013-P0-report.md), [Codex review](013-P0-codex-review.md) | `APPROVED P0 3461c672b3298e87e180d2955d795eb82b6910d4` |
| P1 | **Approved** | `7833d996f002925ef87a3dd58fb956a1161bb5e7` | [013-P1-report.md](013-P1-report.md), [round 1](013-P1-codex-review-1.md) | `APPROVED P1 7833d99` (relayed by operator) |
| P2 | **Approved** | `6e5b76440c56a9ff86c04a738ff5c0285b54a711` | [013-P2-report.md](013-P2-report.md), [CI addendum](013-P2-ci-addendum.md) | `APPROVED P2 6e5b764` (CI run 37340047637) |
| P3 | **Approved** | `f7b235c` (in candidate `f410241`) | [013-P3P4-report.md](013-P3P4-report.md) | `APPROVED P3+P4 f410241` (CI 37359972154) |
| P4 | **Approved** | `e415730` (in candidate `f410241`) | [013-P3P4-report.md](013-P3P4-report.md) | `APPROVED P3+P4 f410241` |
| P5 | Resubmitted after Codex CHANGES REQUESTED on `8733c40` | resubmission commit | [013-P5-release-packet.md](013-P5-release-packet.md) | `8733c40`: an approval line was relayed, then superseded by Codex's final review **CHANGES REQUESTED** (resume finalize deletion); resubmission PENDING |

## Findings

| ID | Phase | Baseline status (P0) | Owner | Status |
| --- | --- | --- | --- | --- |
| F01 | P1 | Reproduced | B | Fixed; approved in P1 |
| F02 | P1 | Reproduced (mocked ordering) | B | Fixed; approved in P1 |
| F03 | P1 | Reproduced | C | Fixed; approved in P1 |
| F04 | P1 | Reproduced | A + B | Fixed; approved in P1 |
| F05 | P2 | Confirmed: CI skips 61 emulator tests and 6 analytics E2E | F | Fixed; approved in P2 |
| F06 | P3 | Not re-measured in P0 | H | Fixed; approved in P3/P4 |
| F07 | P3 | Not re-measured in P0 | H + I | Fixed; approved in P3/P4 |
| F08 | P3 | Confirmed: build marks `/` as dynamic (ƒ) | J | Fixed; approved in P3/P4 |
| F09 | P4 | Not re-probed in P0 | K | Fixed; approved in P3/P4 |
| F10 | P4 | Source unchanged since audit | L | Fixed; approved in P3/P4 |
| F11 | P1 | Source unchanged since audit | A + B + C | Fixed; approved in P1 |
| H01 | P2 | Email/password sign-in **enabled** alongside Google | E | Fixed; approved in P2 |
| H02 | P2 | Not tested in P0 | E | Fixed; approved in P2 |
| H03 | P4/P5 | Rules match; TTL 2 of 4; no backups/PITR | M | Documented in runbook (P4); production actions parked for owner |
| H04 | P2 | Detailed scan blocked on approval; see P0 report | coordinator | Fixed; approved in P2 |

## P1 worker split (dispatched 2026-10-05; briefs in [013-P1-dispatch.md](013-P1-dispatch.md))

Shared files have a single owner. Workers use `npm ci --no-audit` with `npm_config_audit=false`. Worktrees: `NotTheRug-013-A/B/C` on branches `013/p1-a`, `013/p1-b`, `013/p1-c` from `3461c67`. **No branch is pushed** (a pushed branch creates a Preview deploy that shares production credentials).

| Worker | Findings | Owns | Depends on |
| --- | --- | --- | --- |
| A — primitives | F11, shared reader for F04, concurrency primitive | `lib/server/firestoreRest.ts`, `lib/server/firebaseStorage.ts`, new request-body helper | — |
| B — lead intake | F01, F02, F04 consumers | `app/api/leads/{capture,meetgreet}/**`, lead tests | A |
| C — bench | F03, narrowed bench writers | `app/api/bench/apply/**`, `lib/server/{bench,benchIntake}.ts`, bench tests | A |
| D — review | Independent review of A–C | read-only | A–C |

## Approvals / external gates

| Gate | Status |
| --- | --- |
| npm registry advisory scan (H04) | Approved and run once (2026-10-05). Three residual advisories risk-accepted by owner (2026-10-05). |
| Production deploy / rules / TTL / secrets | Not authorized |
| Real email, paid brief generation | Not authorized |

## Log

- 2026-10-05 — P0 executed in isolated worktree; report saved; awaiting operator relay to Codex.
- 2026-10-05 — Codex `APPROVED P0 3461c67…` (relayed by operator). Carried instructions: `--no-audit` everywhere; demo emulators + mocked providers only; no pushes that create credential-sharing previews; A owns primitives, B/C prepare tests in parallel then integrate on A; fresh sanitized P1 evidence; normalize two evidence logs (done). P1 started.
- 2026-10-05 — A merged (`c96d622`), C (`f1dd726`), B (`9ea4684`). Integration run found 73 failures caused by an unrelated process on port 8080 (left untouched); rerun on private emulator ports 8580/9599 green.
- 2026-10-05 — Worker D review: APPROVE-FOR-SUBMISSION, 8 low findings. Fixes B `cceac4d`, C `a7e197e`; merged `63414c8`, `469fb9a`; D re-review APPROVE-FOR-SUBMISSION. Full verification on `469fb9a` green. P1 report saved; awaiting operator relay to Codex. P2 not started.
- 2026-10-05 — Codex round 1 on `d2f73b2`: approve with 3 low fixes + cleanup. Fixups A `a0a0634`, B `4c0a0a6`, C `f3ab1d2`; merged `b1c1cc7`, `e3f76fa`, `66eebda`. Worker D re-review APPROVE-FOR-SUBMISSION. Full verification on `66eebda` green (692/692 emulator; 595 + 97 skipped no-emulator; E2E 156/20). Resubmitted; P2 not started.
- 2026-10-05 — Codex `APPROVED P1 7833d99` (relayed). Carry into P2: optional fold-in of "finding 1" — interpreted as Worker D's fixup note (a): in the all-stalled case the apply-route auto-invite email can be sent while the stage move to `shadow_invited` and the outcome record are skipped (person stays in `review`). Operator to confirm interpretation. P2 started.
- 2026-10-05 — P2: E `79f1828`, F `5a28aac`, C `a70530a` merged (`ed9db24`, `26d9741`, `2f2a49d`); approved npm scan run; deps + vercel.json `0e2bcc5`; review fix `69a2beb`. Worker D APPROVE-FOR-SUBMISSION. Local CI replication green on `69a2beb`. Owner sign-in (a) passed on local server against production Auth; b–d skipped by operator. Push by operator pending; GitHub CI pending.
- 2026-10-05 — Codex P2 round 1 on `35bb336`: CI verified (run 37328742633); fix auto-invite lost-ack case; owner accepted all three H04 risks. Fix `a2eac7a` + test fix `05ba349` (Worker D found first test vacuous; mutation-checked). Resubmission awaiting operator push to PR #1 for CI.
- 2026-10-05 — Codex `APPROVED P2 6e5b764` (CI 37340047637). Owner accepted all three H04 risks. Operator: run P3 and P4 back to back, independent review per phase, separate commit per phase, fold in stale apply-route comment, park owner decisions, one combined report; no P5, no push to main, no deploys, no Firebase/Vercel changes.
- 2026-10-05 — P3 (G, H, I, J; integration fix for a hydration scroll race; review approve after fixes) committed as `f7b235c`; P4 (K, L, M; review minor fixes applied) committed as `e415730`. Final local checks green on `e415730`. Combined report `013-P3P4-report.md` with 12 parked owner items. Awaiting operator push for CI on PR #1.
- 2026-10-05 — Codex `APPROVED P3+P4 f410241` (CI run 37359972154; 2 mobile WebKit flaky-on-retry tests disclosed). Parked decisions: 1 keep `/walk-with-us` as is; 4 skip italic-preload change; 5 accept JS-only team portraits; 6 delete `pawl.png`/`pawr.png` after release confirmed; 7 keep logged base-URL fallback; **8 canonical domain `nottherug.com`**; 2, 3, 9, 10, 12 into P5; 11 owner confirms separately. Owner reports email/password sign-in disabled. P5 started; first item: make `home-entrance.spec.ts:162` and `booking.spec.ts:37` reliable on mobile WebKit. Stop before `main`/production.
- 2026-10-05 — P5: flaky tests fixed (Worker N `5ca1410`, review fixes `bf6b0d5`; mutation-checked); domain decision and cutover docs; plan 012 status; read-only production checks (email/password disabled; rules unchanged; TTL 2/4; no backups; single owner; main unprotected; nottherug.com not attached, served elsewhere via GoDaddy DNS). Fresh-worktree verification green on `48e456d`. Release packet awaiting operator push for CI and Codex review. Removed 12 finished worker worktrees (branches kept) after the disk filled.
- 2026-10-06 — Codex relayed `APPROVED P5 8733c40` (CI 37390339544), then its final review returned **CHANGES REQUESTED** on `8733c40`: resume finalize deleted the upload after a negative confirmation read although a timed-out write could still commit. Fixed (keep object on ambiguous errors; delete only on definite precondition rejection; attempt-lost never deletes — shared per-person path), regression tests added, runbook documents the possible private leftover file. Post-release test hygiene unchanged: `section-nav.spec.ts:66`; GSAP-blocked intro-ceiling test. No release step executed.
