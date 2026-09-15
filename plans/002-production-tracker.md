# Production cleanup tracker

Source: [review and execution plan](002-production-readiness.md).

Last updated: September 14, 2026. Implementation has not started. The review and plan are complete; no production changes have been made.

The coordinator is the only writer of this file. Workers report their task ID, changed paths, commit, checks, and blockers. Use `TODO`, `IN_PROGRESS`, `REVIEW`, `BLOCKED`, or `DONE`. A task becomes `DONE` only after its acceptance checks pass and review evidence is recorded. `BLOCKED` must name the missing input and leave independent tasks runnable.

## Task board

| ID | Phase / task | Owner | Depends on | Status | Evidence / next action |
| --- | --- | --- | --- | --- | --- |
| P0 | Baseline, ownership, contracts, test setup | Coordinator | — | TODO | Preserve dirty working tree; capture baseline and decisions. |
| P1A | Intake contract, validation, delivery, accessible form | Sonnet A | P0 | TODO | Reproduce R01 before changing it. |
| P1B | Auth, Firebase rules, storage lifecycle/privacy | Sonnet B | P0 | TODO | Inspect deployed rules separately; use emulator for tests. |
| P1C | Dependency/runtime update and CI | Coordinator | P0 | TODO | Recheck security advisories; retain tracing fixes until tested. |
| P2A | Public routes, components, motion, copy tooling | Sonnet C | P1A | TODO | Own all public extraction files; preserve disabled sections. |
| P3A | Admin shell, feature components, stats/export | Sonnet A | P1A, P1B | TODO | Use shared contracts; coordinate preview interface with B. |
| P3B | Brief/generator services and job reliability | Sonnet B | P1B, P1C | TODO | Split read path from generation first. |
| P3C | Packaged function verification | Coordinator | P3B, P1C | TODO | Record per-function dependencies, assets, and sizes. |
| P4 | Launch strategy, SEO, performance, docs | Sonnet C + coordinator | P2A | TODO | Owner facts table; coordinator edits shared config. |
| P5A | Integrated review and preview acceptance | Coordinator + reviewer | All above | TODO | Test the same clean candidate commit. |
| P5B | Authorized release and production verification | Coordinator | P5A, go-live instruction | TODO | Prepare rollback before deployment. |

## Parallel schedule

1. Coordinator completes P0.
2. A: P1A; B: P1B; coordinator: P1C. C can read and map public routes without editing A's form.
3. Once prerequisites merge: C: P2A; A: P3A; B: P3B. Coordinator integrates shared-file requests one at a time.
4. C: P4; coordinator: P3C. Other workers review completed slices they did not author.
5. Coordinator completes P5A, then P5B after authorization. No worker independently pushes production.

Dependencies are minimum requirements. Each worker must start from an integration revision containing the contracts they consume. Do not cherry-pick a dependent change ahead of its prerequisite.

## Baseline evidence

| Item | Recorded result |
| --- | --- |
| Review base | `114dd85` plus pre-existing working-tree changes |
| Whole-repo lint | 57 errors / 165 warnings |
| Scoped application lint | 57 errors / 30 warnings |
| Type check | Passed locally |
| Build | Failed fetching Google Fonts; no successful production build established |
| Booking regression | Current payload → 400 missing three fields; malformed optional type and `null` throw |
| External side effects during review | None |
| Browser and deployed checks | Not run |

Temporary review logs were written under `/tmp/ntr-review-*`; they are diagnostic conveniences, not durable acceptance evidence. Re-run checks on the implementation branch.

## Release record

| Field | Value |
| --- | --- |
| Integration baseline commit | Pending |
| Release candidate commit | Pending |
| Preview deployment | Pending |
| Runtime and framework versions | Pending |
| Unit / integration / browser check results | Pending |
| Firebase rules and private-data checks | Pending |
| Test lead ID and notification status | Pending; record synthetic identifiers only |
| Media rendering evidence | Pending |
| Timed brief run / schedule / email evidence | Pending |
| Approved business facts | Pending |
| Go-live instruction | Pending |
| Previous deployment / rollback steps | Pending |
| Production smoke result | Pending |
| Operations owner / observation outcome | Pending |

## Worker completion report

Copy this into the worker's response; the coordinator transfers the evidence here.

```text
Task ID:
Commit:
Changed paths:
Behavior fixed:
Checks run and results:
Acceptance criteria still open:
Shared-file changes requested:
Data/rollback considerations:
Reviewer and outcome:
```

## Decision and blocker log

| Date | Task | Decision / blocker | Owner | Resolution |
| --- | --- | --- | --- | --- |
| 2026-09-14 | P0 | Business claims, live service settings, and deployed Firebase rules were not verified during code review. | Coordinator / business owner | Prepare concrete review items while independent engineering proceeds. |

## Evidence log

Append one short entry per reviewed task, including commit, commands/results, and links to retained screenshots or reports. Do not store credentials, customer payloads, Firebase download tokens, or full email addresses here.
