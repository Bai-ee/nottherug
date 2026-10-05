# Plan 013 P1 independent review (Worker D)

Reviewed `git diff a70713b..9ea4684` on branch `codex/client-handoff-hardening`. Findings verified in code, not from worker reports.

## Verdict: APPROVE-FOR-SUBMISSION

No high or medium defects found. Remaining items are low severity or proof gaps that only real Firestore can close.

## Findings (by severity)

1. LOW - `lib/server/leadTransitions.ts` recordCapture (existing-row patch, ~L96-101): a capture arriving on an already-converted row still overwrites `email` and `source` with the latest capture's values. Status, convertedLeadId, convertedAt, submittedAt and bookedSelfReported are protected; email/source drift on a row the admin hides. Fix if wanted: skip `source` when `data.status === 'converted'`.
2. LOW - `app/api/bench/apply/resume/route.ts` finalize failure branch (~L158-166): a timed-out finalize write is ambiguous. If the follow-up read (`finalizedByThisAttempt`) says "not finalized", the object is deleted; if the timed-out write lands after that read, resumePath points to a deleted object. Narrow window; the email fallback covers it. No code change needed, accept and document.
3. LOW - same file claim catch (~L120-124): comment says "the token is untouched" for any non-token failure, but a claim write that times out is ambiguous and may have landed (token consumed, no upload). Applicant gets 503 and the existing email-fallback note. Comment/accuracy only.
4. LOW - same route budgets: `slice()` is computed once per step but each step runs a read and a merge, each given that slice. Worst case if every call stalls to its cap (claim ~10s, upload ~9s, finalize ~10s, cleanup 5s) is about 34s against maxDuration 30. Requires several simultaneous stalls; ROUTE_BUDGET_MS only bounds each step's cap, not the sum. Minimal fix: halve the per-call slice or re-slice before the merge in each step.
5. LOW - `app/api/admin/bench/people/[id]/route.ts` (~L152 onwards): stage change is stored before the email is sent, and the email is never retried. If the function dies between the two writes, the stage moved with no email and the admin cannot repeat the action (409 not-allowed). This is the intended no-duplicate-email trade-off. Verified no duplicate path: a double click gets 409 from the re-read, and a precondition conflict past 5 attempts returns 409 before any send.
6. LOW (apply) `app/api/bench/apply/route.ts` persistNotifications: if an admin already moved the person out of `review`, the auto-invite stage move is skipped but the shadow-invite email was already sent (the notification outcome is still recorded). Admin state wins; flag for owner awareness.
7. LOW (tests) `tests/unit/bench-apply-route.test.ts` ~L240: the test "400s a malformed person id before touching Firestore" now asserts `storageUploadPrivate` not called instead of `fsGetDoc` not called. It no longer proves Firestore is untouched. Restore with a spy exported from `bench-fs-fake`. No other assertions were removed; mock-to-fake swaps are equivalent or stronger.
8. INFO (scope/dead code) `app/api/leads/capture/route.ts` keeps a Content-Length precheck that `readBoundedBody` already performs. Redundant, harmless.
9. INFO `readBoundedBody` strips a UTF-8 BOM via TextDecoder where the old `Buffer.toString` kept it; a BOM-prefixed JSON body that used to fail to parse now parses. Negligible.

## Checklist results

1. F01: namespace `capture_` / `meetgreet_` prefix only; limits 8/5, window, 48h `expiresAt` Date, fail-open unchanged; old keys expire. Retry-After added. OK.
2. F02: every write is a conditional merge (`updateTime` or `exists:false`) with bounded retry (5 attempts, budget deadline). Conversion-before-capture creates a converted marker row. Capture on a converted row returns the lead id and carries the hint to the lead; conversion reads the hint under precondition and carries it. I traced all interleavings (capture/convert either order, mid-read conversion, concurrent true/false) and found none that clears a flag or reverts conversion. `submittedAt` set once. No stale read followed by an unconditional write except `carryBookedHintToLead`, which merges only `true` (idempotent) and has no admin delete path to resurrect a stub. 19 s skip leaves the capture row "partial" and the hint uncarried (best effort, as before). Consumers: `components/admin/leads/adminLeadRecord.ts` and `lib/analytics/report.ts` use only `type`/`status`/`bookedSelfReported`; converted marker rows are treated like converted captures. Existing bookedLeads double count (capture row plus carried lead) is baseline behavior, not introduced.
3. F03: single-winner claim via updateTime precondition; validation (size, signature) precedes claim; finalize and cleanup gated on attempt id and path; the only delete is this attempt's own path. No `saveBenchPerson` usage remains (grep clean); `fsSetDoc` remains only in bench.ts import and non-bench callers (cron, brief), not in bench write paths. Admin POST: validation and settings read precede write; write is field-scoped under precondition; email sent once after the stored change. New 503/409 are handled by the frontend (`components/bench/WalkerApplicationForm.tsx` treats any non-OK upload as the email-fallback note).
4. F04: UTF-8 byte count from stream chunks, cancel on overflow, `missing` vs `aborted` distinct, Content-Length precheck. meetgreet/track/benchIntake limits unchanged; only change is aborted stream gives 400 (capture, meetgreet) instead of a thrown/413 path, as documented.
5. F11: every Firestore and Storage helper, including token acquisition, runs under `withUpstreamDeadline` (AbortSignal.any plus a race so a signal-ignoring token step also settles). Timeout is `UpstreamTimeoutError`, HTTP failure a plain Error, caller abort wins. Budgets: capture 1.5 + 7 s under 10; meetgreet 8 pre-email + 8 email + 2 persist under 20; resume see finding 4; apply/admin under 30/20 in practice. No auto retry of email, upload or ambiguous writes; `withOptimisticRetry` retries only `FirestorePreconditionError`, max 5 with 10-30 ms jittered sleeps (and the deadline stops lead loops).
6. `:commit` body: `writes[0].update.name` full resource path, `updateMask.fieldPaths` (fieldPath-quoted), `currentDocument` `{updateTime}` or `{exists}`; response `writeResults[0].updateTime`. Unconditional path still uses PATCH with the same mask as baseline; empty-mask guard unchanged. Only provable on real Firestore: HTTP status/`error.status` mapping for failed preconditions (400 FAILED_PRECONDITION, 404 NOT_FOUND, 409 ALREADY_EXISTS, taken from emulator observation plus docs), updateTime string precision/round-trip, and commit behavior under real contention latency.
7. Tests: emulator suites genuinely race real documents (Promise.all, interleaved hooks between read and write). Inverted repros (`lead-intake-regression`, `bench-resume-race`) cover all four audit scenarios with correct-outcome assertions: shared counters, converted overwritten by stale capture, booked hint overwritten, 4,000-char vs byte cap (now byte cap and 413/400), double resume upload, stale whole-record erasing admin note. Residual: emulator suites skip when the emulator is unreachable, so the no-emulator CI run does not exercise them (P2 CI concern, not a P1 defect).
8. Scope: changed files match P1 (the extra `lib/bench/contract.ts` optional `resumeAttemptId/At` fields are backward compatible). No new dependencies, no debug logs, no copy/pricing change, no response-shape change other than Retry-After header and the new 503/409 statuses.

## Risks not provable locally
- Real Firestore precondition error codes and updateTime semantics (item 6).
- Real Firebase Storage upload/delete cancellation behavior and credential refresh abort in production.
- Vercel `after()` budget accounting versus `maxDuration` for the post-response conversion.
- Real contention/latency; emulator is far faster than production.

## Tests run
Command: firebase emulators:exec (private ports, firestore emulator) with `npx vitest run`.
Result: Test Files 73 passed (73); Tests 673 passed (673); exit 0. Not run: lint, build, typecheck, e2e (relied on `plans/reports/013-P1-evidence/summary.txt`, all exit 0).

## Re-review of fixes (469fb9a)

Code-read of `git diff 9ea4684..469fb9a`. No tests run (suite in use by coordinator).

| # | Status | Notes |
|---|--------|-------|
| 1 | RESOLVED | `recordCapture` on a converted row now patches only `lastSeenAt` (plus true-only hint, first-seen backfill). Email/source kept. Non-converted rows unchanged. Asserted in the fake-backed regression test and the emulator convert-then-capture test (`source: 'book-page'`). No new defect. |
| 2 | ACCEPTED, documented | Worker C "Accepted risks": finalize-timeout ambiguity. |
| 3 | RESOLVED | Claim catch comment now states a timed-out claim is ambiguous and the token may be consumed. |
| 4 | RESOLVED (logic verified by reading) | `slice()` re-derives from remaining overall budget (27 s) before every call, including each merge, via `need()`. Each call's end is bounded by `27 s - reserve` for its step, so claim <= 7 s, upload <= 19 s, finalize <= 24 s, confirm/cleanup <= 27 s, under maxDuration 30. Under 500 ms left: claim/upload/finalize steps throw (claim -> 503, upload -> 500 with no object written, finalize -> confirm path); confirm read returns null and cleanup is skipped. Pre-claim work (rate limit up to its 8 s default, formData) is counted because `startedAt` is request start. A `need()` throw inside the claim retry is a non-precondition error, so it is not retried. No new defect found. |
| 5 | ACCEPTED, documented | Worker C "Accepted risks": admin stage-before-email, crash loses email, no duplicate path. |
| 6 | ACCEPTED, documented | Worker C "Accepted risks": auto-invite email already sent when admin moved stage. |
| 7 | RESOLVED | Test again asserts `fsGetDoc` not called (spy is the mocked helper the route would use) in addition to the storage assertion. |
| 8 | RESOLVED | Duplicate Content-Length check removed from capture; `readBoundedBody` rejects over-cap declared length identically (new test: 413, no Firestore read). BOM note remains informational. |

`tests/unit/bench-resume-budget.test.ts`: genuinely exercises stalls (mocked helpers sleep for the exact `timeoutMs` the route passes, under fake timers; elapsed is measured on the fake clock; it also records the handed deadlines). Not mere constants. Residual weaknesses, LOW and non-blocking: the 28 s ceiling is loose against the real worst case (test 3 actually spends about 12 s), and no case stalls a merge (the original 34 s scenario needed read plus merge stalling in one step), so that specific path is covered by code reading only.

### Updated verdict: APPROVE-FOR-SUBMISSION
No remaining defects; only the LOW test-strength note above.
