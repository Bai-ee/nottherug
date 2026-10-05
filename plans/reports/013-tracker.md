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
| P0 | Ready for review | see report commit | [013-P0-report.md](013-P0-report.md) | PENDING |
| P1 | Not started (gated on P0) | — | — | — |
| P2 | Not started | — | — | — |
| P3 | Not started | — | — | — |
| P4 | Not started | — | — | — |
| P5 | Not started | — | — | — |

## Findings

| ID | Phase | Baseline status (P0) | Owner | Status |
| --- | --- | --- | --- | --- |
| F01 | P1 | Reproduced | — | Open |
| F02 | P1 | Reproduced (mocked ordering) | — | Open |
| F03 | P1 | Reproduced | — | Open |
| F04 | P1 | Reproduced | — | Open |
| F05 | P2 | Confirmed: CI skips 61 emulator tests and 6 analytics E2E | — | Open |
| F06 | P3 | Not re-measured in P0 | — | Open |
| F07 | P3 | Not re-measured in P0 | — | Open |
| F08 | P3 | Confirmed: build marks `/` as dynamic (ƒ) | — | Open |
| F09 | P4 | Not re-probed in P0 | — | Open |
| F10 | P4 | Source unchanged since audit | — | Open |
| F11 | P1 | Source unchanged since audit | — | Open |
| H01 | P2 | Email/password sign-in **enabled** alongside Google | — | Open |
| H02 | P2 | Not tested in P0 | — | Open |
| H03 | P4/P5 | Rules match; TTL 2 of 4; no backups/PITR | — | Open |
| H04 | P2 | Detailed scan blocked on approval; see P0 report | — | Open (blocked) |

## Proposed P1 worker split (not yet dispatched)

Shared files have a single owner. Workers use `npm ci --no-audit`.

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
