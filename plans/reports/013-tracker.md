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
| P1 | Resubmitted after Codex round 1 fixup | report commit (code = `66eebda`) | [013-P1-report.md](013-P1-report.md), [round 1](013-P1-codex-review-1.md) | Round 1 (`d2f73b2`): approve with fixup; fixup candidate PENDING |
| P2 | Not started | — | — | — |
| P3 | Not started | — | — | — |
| P4 | Not started | — | — | — |
| P5 | Not started | — | — | — |

## Findings

| ID | Phase | Baseline status (P0) | Owner | Status |
| --- | --- | --- | --- | --- |
| F01 | P1 | Reproduced | B | Fixed in P1 candidate; awaiting Codex |
| F02 | P1 | Reproduced (mocked ordering) | B | Fixed in P1 candidate; awaiting Codex |
| F03 | P1 | Reproduced | C | Fixed in P1 candidate; awaiting Codex |
| F04 | P1 | Reproduced | A + B | Fixed in P1 candidate; awaiting Codex |
| F05 | P2 | Confirmed: CI skips 61 emulator tests and 6 analytics E2E | — | Open |
| F06 | P3 | Not re-measured in P0 | — | Open |
| F07 | P3 | Not re-measured in P0 | — | Open |
| F08 | P3 | Confirmed: build marks `/` as dynamic (ƒ) | — | Open |
| F09 | P4 | Not re-probed in P0 | — | Open |
| F10 | P4 | Source unchanged since audit | — | Open |
| F11 | P1 | Source unchanged since audit | A + B + C | Fixed in P1 candidate; awaiting Codex |
| H01 | P2 | Email/password sign-in **enabled** alongside Google | — | Open |
| H02 | P2 | Not tested in P0 | — | Open |
| H03 | P4/P5 | Rules match; TTL 2 of 4; no backups/PITR | — | Open |
| H04 | P2 | Detailed scan blocked on approval; see P0 report | — | Open (blocked) |

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
| npm registry advisory scan (H04) | Not approved. `npm ci` default audit already transmitted metadata once in P0; disclosed in report. |
| Production deploy / rules / TTL / secrets | Not authorized |
| Real email, paid brief generation | Not authorized |

## Log

- 2026-10-05 — P0 executed in isolated worktree; report saved; awaiting operator relay to Codex.
- 2026-10-05 — Codex `APPROVED P0 3461c67…` (relayed by operator). Carried instructions: `--no-audit` everywhere; demo emulators + mocked providers only; no pushes that create credential-sharing previews; A owns primitives, B/C prepare tests in parallel then integrate on A; fresh sanitized P1 evidence; normalize two evidence logs (done). P1 started.
- 2026-10-05 — A merged (`c96d622`), C (`f1dd726`), B (`9ea4684`). Integration run found 73 failures caused by an unrelated process on port 8080 (left untouched); rerun on private emulator ports 8580/9599 green.
- 2026-10-05 — Worker D review: APPROVE-FOR-SUBMISSION, 8 low findings. Fixes B `cceac4d`, C `a7e197e`; merged `63414c8`, `469fb9a`; D re-review APPROVE-FOR-SUBMISSION. Full verification on `469fb9a` green. P1 report saved; awaiting operator relay to Codex. P2 not started.
- 2026-10-05 — Codex round 1 on `d2f73b2`: approve with 3 low fixes + cleanup. Fixups A `a0a0634`, B `4c0a0a6`, C `f3ab1d2`; merged `b1c1cc7`, `e3f76fa`, `66eebda`. Worker D re-review APPROVE-FOR-SUBMISSION. Full verification on `66eebda` green (692/692 emulator; 595 + 97 skipped no-emulator; E2E 156/20). Resubmitted; P2 not started.
