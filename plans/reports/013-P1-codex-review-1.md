# Plan 013 — Codex P1 review, round 1 (candidate d2f73b2)

Relayed by the operator on 2026-10-05. Recorded here verbatim in substance; the decision recommended approval with a small fixup commit. Per the approval contract, the fixup changes the SHA, so approval is requested again for the fixup candidate (see [013-P1-report.md](013-P1-report.md)).

**Verdict:** approve P1 (d2f73b2); nothing blocks it; three small low-risk fixes worth folding in; cleanup can wait.

Reviewer ran typecheck (clean) and the no-emulator unit suite (582 passed, 96 skipped) on the worktree; did not rerun emulator or E2E tests.

## Findings
1. Low — admin bench people route and apply-route notification save passed no timeout (8 s default each); admin worst case ≈40 s vs 20 s limit. Report overclaimed "every call has a deadline that fits its route".
2. Low — `carryBookedHintToLead` wrote unconditionally and could create a stub `leads/<id>` for a hand-deleted lead.
3. Low — Firestore 409 `ABORTED` treated as an outage instead of retried.
4. Cleanup — unindented deadline-wrapped helper bodies; three thin `readCappedBody` wrappers; meetgreet still had its own Content-Length check; spliced comment in meetgreet.
5. Behavior change outside bench/leads — `lib/not-the-rug-brief/run.ts` gains the 15 s default Storage timeout; not mentioned in the report.

## Risks noted
Previews share production credentials (keep the branch local); emulator-only proof of precondition codes, Storage cancellation and `after()` timing; E2E runs with Firestore unreachable, so write paths are covered only by emulator unit tests; documented accepted risks are reasonable for this traffic.

## Recommended next step
Approve and request a fixup commit (1–3 plus re-indent) before P2, or track them in P2. Do not push until preview isolation is decided.
