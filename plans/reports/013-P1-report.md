# Plan 013 — P1 review request
Status: CHANGES REQUESTED ADDRESSED (Codex round 1 fixup; resubmission)
Base SHA: `3461c672b3298e87e180d2955d795eb82b6910d4` (approved P0), plus docs commit `a70713b`
Candidate SHA: **the commit that adds this revision of the report** (code identical to `66eebda22b6bcd855e5642c48a46d3f0a9750d66`, the SHA all checks below ran on; the report commit adds only `plans/reports/` files). Exact SHA is given in the relay message. Previous candidate `d2f73b2` reviewed in [013-P1-codex-review-1.md](013-P1-codex-review-1.md).
Branch/worktree: `codex/client-handoff-hardening`, `/Users/bballi/Documents/Repos/NotTheRug-013`. Not pushed (a pushed branch would create a Vercel Preview that shares production credentials).
Findings addressed: F01, F02, F03, F04, F11

## Result

| ID | Before | After |
| --- | --- | --- |
| F01 | Capture and final inquiry shared `leadRateLimits/<ipHash>_<window>`; 5 captures blocked the final submission. | Keys are `capture_<ipHash>_<window>` and `meetgreet_<ipHash>_<window>`. Limits (8 / 5), TTL seed, and fail-open policy unchanged. 429 now carries `Retry-After`. Old keys expire naturally. |
| F02 | Capture read a snapshot, derived `status`/`bookedSelfReported`, then merged stale values unconditionally; a conversion between read and write was reverted to `partial`, a stale `false` overwrote `true`. | `lib/server/leadTransitions.ts` (`recordCapture`, `recordConversion`): read with `updateTime` → decide → conditional merge (`currentDocument` precondition) inside `withOptimisticRetry` (max 5). Conversion is first-wins and never reverts; booking hint only goes false→true; `submittedAt` written once; capture never writes `status` over an existing row and, on a converted row, writes only `lastSeenAt` + true-only hint. Conversion before capture creates a converted marker row, so a later capture cannot create an outstanding row. Hint reaches the full lead in both arrival orders. |
| F03 | Token checked → upload → whole-document `saveBenchPerson` cleared the token: two concurrent requests both uploaded; a stale record overwrote an admin note. | File validated first (bad file does not spend the token). Token claimed by a conditional merge that clears the hash/expiry and sets `resumeAttemptId`/`resumeAttemptAt`; one winner, losers get the existing 403. Only the winner uploads; finalize writes only `resumePath`/`resumeKind`/`updatedAt`, conditional on owning the attempt. Claim refused if a resume is already stored. `saveBenchPerson` (whole-document replace) removed; resume, AI-summary, notification and admin writes are field-scoped (admin conditional on `updateTime`). |
| F04 | Capture buffered the whole body and checked `text.length`; >6 KB of multibyte text passed a 4,000-byte cap. | Shared `lib/server/readBoundedBody.ts` counts UTF-8 bytes from the stream, cancels on overflow, rejects an over-cap declared Content-Length up front, reports `missing`/`aborted`. Used by capture (413 / 400), meetgreet, track and bench intake (limits and responses unchanged except: a body stream that dies mid-read now gets 400 instead of a 500/413). |
| F11 | Firestore/Storage fetches had no deadline. | Every Firestore/Storage call, including the access-token step, runs under caller signal + timeout and throws `UpstreamTimeoutError` (distinct from HTTP failure and caller abort). Defaults: Firestore 8 s, Storage 15 s. Routes in the P1 intake path have explicit budgets: capture ≈8.75 s worst case of `maxDuration` 10; meetgreet ≈18.5 s of 20 (post-response conversion skipped and logged if past 19 s); resume, bench apply and admin bench people routes re-slice from an overall budget (27 s / 27 s / 17 s, each 3 s under `maxDuration`) before every Firestore call, skip best-effort persistence when <500 ms remains, and reserve the fixed 8 s email timeout. Unsliced but bounded and counted: `verifyAdmin`, the bench rate limiter (8 s default, fails open), `benchEmail`'s fixed 8 s send. Routes outside P1 (photos, generator, brief job, analytics report) only inherit the module defaults; they are not budgeted per route. Nothing retries automatically except precondition conflicts (including Firestore `ABORTED` on conditional commits); emails and uploads are never retried. |

Each budgeted route keeps a ~10-line inline budget closure rather than a new shared module, to keep the late fixup inside owned files; consolidation is optional cleanup.

Smallest-fix rationale: no new dependency or database client; the concurrency primitive is the existing REST helper plus Firestore's `currentDocument` precondition. Preconditioned writes use `POST …:commit` because the emulator ignores `currentDocument.updateTime` on PATCH (it compared against version 0); unconditional merges still use the original PATCH path unchanged.

### Conflicting-write ordering, before and after

- **Capture vs conversion.** Before: capture `GET` (status `partial`) → meetgreet writes `converted` → capture `PATCH status=partial` ⇒ converted lead shows as outstanding. After: capture's write carries the `updateTime` it read; the interleaved conversion changes `updateTime`, so the write fails `FAILED_PRECONDITION`, capture re-reads, sees `converted`, and writes only `lastSeenAt`/hint.
- **Booking hint.** Before: two captures read `false`, one writes `true`, the other writes stale `false`. After: the stale write's precondition fails; the retry sees `true` and never lowers it.
- **Resume token.** Before: requests A and B both read a valid hash, both upload, both save the whole record (the later stale save drops an admin note). After: A and B race a conditional claim; one wins, the other's precondition fails and the retry sees no token → 403. Finalize merges only resume fields, so the admin note survives.

## Change scope

Code diff: `git diff --stat a70713b..66eebda`. Production files:

- **Shared (Worker A):** `lib/server/firestoreRest.ts`, `lib/server/firebaseStorage.ts`, `lib/server/errors.ts`, new `lib/server/readBoundedBody.ts`; reader swap only in `app/api/leads/meetgreet/route.ts`, `app/api/track/route.ts`, `lib/server/benchIntake.ts`.
- **Lead intake (Worker B):** `app/api/leads/capture/route.ts`, `app/api/leads/meetgreet/route.ts`, new `lib/server/leadTransitions.ts` (`captureIdForEmail` moved here from the capture route).
- **Bench (Worker C):** `app/api/bench/apply/resume/route.ts`, `app/api/bench/apply/route.ts`, `app/api/admin/bench/people/[id]/route.ts`, `lib/server/bench.ts`, `lib/server/benchSummary.ts`, `lib/bench/contract.ts` (optional `resumeAttemptId`, `resumeAttemptAt` only).

Public contract changes: `Retry-After` on lead 429s; capture 400 for missing/aborted body; meetgreet/track/bench intake 400 for a mid-read stream failure; resume route 503 ("Could not save your resume right now. Your application is still on file.") when the claim cannot complete — previously a Firestore read error surfaced as 403; admin bench POST 409 ("This applicant was just changed by someone else. Refresh and try again.") after exhausting conflict retries. Existing frontends already handle these: the application form shows the email-your-resume note for any non-OK upload; the admin PersonCard displays `data.error`. Response JSON shapes, copy, pricing and booking destinations unchanged. No new stored fields except the two optional bench fields and converted marker capture rows (`type: 'capture'`, `status: 'converted'`), which existing admin views already hide. No dependency, lockfile, config, CI, CSS or rules changes. `getBenchSettings`, `getBenchSettingsOrDefault`, `listBenchPeople` gained an optional options argument. Booking-hint carry to the full lead is now conditional on the lead existing (no stub lead for a deleted record). **Behavior change outside bench/leads:** every Storage caller now has the 15 s default deadline where it had none — `lib/not-the-rug-brief/run.ts` and `read.ts` (brief HTML ≈18–31 KB; routes `maxDuration` 60), admin photo routes and `lib/generator/server.ts` (uploads capped at 4 MB by `lib/photos/validate.ts`), admin resume download (≤4 MB). 15 s is ample for these sizes on normal links; a very slow link could now time out where it previously waited.

## Regression-test mapping

"Emulator" = runs against the real Firestore emulator (Storage behavior is an in-memory stub with fault injection in the bench emulator suite, because `firebaseStorage.ts` has no emulator mode and adding one was out of scope; Codex permitted mocked storage). "Mocked" = Vitest with an in-memory fake of the REST helpers or mocked `fetch`.

| ID | Mocked tests | Real emulator tests |
| --- | --- | --- |
| F01 | `lead-intake-regression.test.ts` › F01 (5): five captures do not exhaust final submission; each route keeps its own limit with `Retry-After`; TTL seed kept; fail-open on error/stall | `lead-intake-emulator.test.ts`: five captures from one IP do not block the final submission |
| F02 | `lead-intake-regression.test.ts` › F02 (5, plus meetgreet over-cap declared length → 413 with no Firestore call): conversion between read and write survives; stale false never overwrites true; later non-booked capture keeps true; capture after conversion keeps source/email; first-seen preserved. Also `lead-intake.test.ts`, `lead-capture-honeypot.test.ts` (updated to assert resulting state) | `lead-intake-emulator.test.ts` (8 ordering tests): capture→convert; convert→capture (marker, no outstanding row); conversion committed between capture read and write; hint landing mid-conversion; booked capture racing a conversion that commits first; concurrent true/false hints; simultaneous first captures → one row, stable first-seen; capture racing final submission ends converted. Plus duplicate final submission → one lead, one founder email; notification failure keeps the lead, nothing sent twice; booking hint for a missing lead creates nothing, for an existing lead sets true |
| F03 | `bench-resume-race.test.ts` (2): one token authorizes exactly one upload; replay refused while first upload in flight, admin note kept. `bench-resume-budget.test.ts` (3, fake timers). `bench-apply-route.test.ts`, `bench-admin-routes.test.ts`, `bench-summary.test.ts` (updated) | `bench-resume-emulator.test.ts` (17): stores and consumes; exactly one of several simultaneous requests uploads; replay 403; admin note edited during upload kept; expired token 403 and untouched; refuses claim when a resume already exists; wrong token does not consume the real one; bad file rejected before token spent; storage failure keeps application, token consumed, only own object cleaned; finalization failure keeps application, deletes own object; no finalize/delete when another attempt owns the record; duplicate apply → one person, one email, one token; notification outcome does not overwrite concurrent admin edit; auto-invite stage move not applied over an admin move; AI summary after admin edit adds only `aiSummary`; AI summary for deleted person does not recreate it; admin note after resume leaves resume fields |
| F04 | `read-bounded-body.test.ts` (10): missing body; no Content-Length; exact boundary ±1 byte; UTF-8 bytes vs characters; multibyte split across chunks; Content-Length lying low/high; declared over-cap; cancel on overflow without draining; mid-read error → aborted. `lead-intake-regression.test.ts` › F04 (3): Unicode >4,000 bytes without Content-Length → 413; declared over-cap → 413 before any read; dying stream → 400 | — (no storage/database behavior involved) |
| F11 | `upstream-deadlines.test.ts` (11, incl. 3 for `ABORTED`: retried on conditional commit; plain error on unconditional; unknown 409 status stays plain): stalled fetch → `UpstreamTimeoutError` within budget and underlying fetch aborted; fetch that ignores its signal; caller abort vs timeout; HTTP failure vs timeout; default vs explicit budget; retry helper retries only precondition errors, not others, rethrows after max. `lead-intake-regression.test.ts` › F11 (4): per-call timeouts on every capture/meetgreet dependency; stalled read → clean 500; stalled create → clean 500, no email. `bench-resume-budget.test.ts` (5): stalled claim read and stalled claim **merge** → 503 within cap; stalled upload + cleanup, stalled finalize read/merge + confirm + cleanup finish inside the 27 s budget. `bench-route-budget.test.ts` (7): admin route all-slow + stalled email within 18 s; stalled stage write fails within budget, no email; no-email action with stalled write; stalled outcome write after email still 200; apply route all-slow + stalled limiter and email within 29 s, application saved; stalled outcome write still 200; stalled create → 500, no email | — |
| Primitive | — | `firestore-preconditions.test.ts` (7): stale vs current `updateTime`; `exists:false` on existing/missing; `exists:true` on missing does not create; unconditional failure not mapped to precondition; `deleteFields`; `withOptimisticRetry` with two concurrent read-modify-write increments both applied |

**Original audit reproductions.** Run unchanged against `66eebda` (copied to temporary test files, then removed): 4 of 4 bug-asserting tests now fail. **Only F04 counts as verified by the original reproduction** — it fails on behavior (`expected 413 to be 200`). The other three fail for reasons that are not behavioral proof: F01 `expected 500 to be 200`, F02 `TypeError: captureIdForEmail is not a function`, F03 `expected [503, 503] to deeply equal [200, 200]` — their mocks predate the new helper interfaces. F01, F02 and F03 are evidenced by the replacement tests above (`lead-intake-regression.test.ts`, `bench-resume-race.test.ts`) and by the emulator suites.

## Evidence

All results are fresh for `66eebda22b6bcd855e5642c48a46d3f0a9750d66`, run 2026-10-05T01:58:33Z–02:00:05Z in the integration worktree. Logs: `plans/reports/013-P1-evidence/` (`summary.txt` + one log per command; scanned for key/token patterns, none present).

**Environment.** macOS, Node v24.7.0, firebase-tools 15.15.0, OpenJDK 21.0.12 (`PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH`). `npm_config_audit=false`; installs via `npm ci --no-audit` only. Build/test env uses the CI throwaway pattern: `FIREBASE_ADMIN_PROJECT_ID=ci-build`, `FIREBASE_ADMIN_CLIENT_EMAIL=ci-build@ci-build.iam.gserviceaccount.com`, `FIREBASE_ADMIN_PRIVATE_KEY=<fresh openssl genrsa 2048 per run>`, `NEXT_PUBLIC_FIREBASE_*` = `ci-build` placeholders, `PUBLIC_BASE_URL=https://example.test`. No real credential, production endpoint, email or storage was used.

**Emulator hosts (explicit).** Port 8080 on this machine is held by an unrelated Python `http.server` from another project; it was left untouched. The repo's emulator tests default to `127.0.0.1:8080` when `FIRESTORE_EMULATOR_HOST` is unset, so every emulator run here used an untracked, git-excluded `firebase.worker.json`:

| Emulator | Port |
| --- | --- |
| Firestore | 8580 |
| Storage | 9599 |
| Hub | 4540 |
| Logging | 4550 |

`firebase emulators:exec` sets `FIRESTORE_EMULATOR_HOST=127.0.0.1:8580` and `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9599` for the child process. Workers used 8180/9199, 8280/9299, 8380/9399 (A/B/C) in separate worktrees. Project: `demo-not-the-rug` (lead emulator suite uses its own `demo-lead-intake-emulator` id, accepted under `singleProject`).

| Command | Exit | Result |
| --- | --- | --- |
| `npm run lint` | 0 | 0 errors, 1 pre-existing warning (`SchedulingDialog.tsx` `<img>`, P4) |
| `npm run lint:pipeline` | 0 | 0 errors, 1 pre-existing warning (unused `stat`, P4) |
| `npm run build` | 0 | Next 16.3.5 |
| `npm run typecheck` | 0 | — |
| `firebase emulators:exec --config firebase.worker.json --only firestore,storage --project demo-not-the-rug "npx vitest run"` | 0 | 75 files; **692 passed, 0 skipped** |
| `FIRESTORE_EMULATOR_HOST=127.0.0.1:1 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:1 npx vitest run` (CI-equivalent: no emulator) | 0 | 75 files; 595 passed, **97 skipped** (emulator suites; F05/P2) |
| `npm run verify:assets` | 0 | pass |
| Audit reproductions (above) | 1 | 4 of 4 bug assertions fail (expected); only F04 is behavioral |
| `npx next start --hostname 127.0.0.1 --port 3194` with `FIRESTORE_EMULATOR_HOST=127.0.0.1:1 ANALYTICS_TRACKING_DISABLED=true`; `E2E_BASE_URL=http://127.0.0.1:3194 npx playwright test --workers=4` | 0 | 156 passed, 20 skipped (6 analytics-flag skips = F05/P2; 14 deliberate device exclusions), same as P0. The E2E server points Firestore at an unreachable host and uses existing request mocks, so **E2E exercises no real writes**; write paths are covered only by the emulator unit suites. |

Baseline comparison (P0, 905206d): unit 599/599 with emulators, 538 + 61 skipped without; E2E 156/20. The +93 tests are P1's.

## Independent review (Worker D, did not author P1 code)

Full text: `plans/reports/013-P1-review.md`. Initial verdict APPROVE-FOR-SUBMISSION with 8 low findings; re-review of fixes at `469fb9a`: APPROVE-FOR-SUBMISSION (code read; tests run by coordinator).

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | Capture on a converted row still overwrote `email`/`source` | Fixed (`cceac4d`): converted rows get only `lastSeenAt` + true-only hint; mocked and emulator assertions added |
| 2 | Timed-out finalize write is ambiguous; if the confirm read says "not finalized" and the write lands later, `resumePath` may point at a deleted object | Accepted risk, documented (narrow window; applicant's email-resume fallback) |
| 3 | Claim catch comment claimed "token untouched" though a timed-out claim may have landed | Fixed (`a7e197e`): comment states the ambiguity and the 503 + email fallback |
| 4 | Resume route per-step slices let read + merge each use the full cap (≈34 s worst case vs 30 s) | Fixed (`a7e197e`): re-slice from remaining 27 s budget before every call; <500 ms left → claim/upload/finalize fail, confirm/cleanup skipped; `bench-resume-budget.test.ts` added |
| 5 | Admin bench POST stores the stage before sending the email, never retried; a crash between loses the email | Accepted risk, documented (chosen to rule out duplicate emails; no duplicate path found) |
| 6 | Apply auto-invite: shadow-invite email may already be sent when an admin has moved the person out of `review`; the stage move is then skipped | Accepted risk, documented (admin state wins) |
| 7 | Malformed-id test no longer asserted Firestore untouched | Fixed (`a7e197e`): `fsGetDoc` not-called assertion restored alongside the storage assertion |
| 8 | Duplicate Content-Length precheck in capture; reader now strips a leading BOM | Precheck removed (`cceac4d`) with a test; BOM handling accepted (a BOM-prefixed JSON body now parses) |

Reviewer's residual note from round 1 (stalled merge not tested) is now covered by `bench-resume-budget.test.ts`.

### Codex round 1 (d2f73b2) and fixup

Codex recommended approval with fixes; full text in [013-P1-codex-review-1.md](013-P1-codex-review-1.md).

| Codex item | Resolution (commit) |
| --- | --- |
| 1. Admin people route and apply notification save lacked route budgets; report overclaimed | Fixed (`f3ab1d2`): sliced budgets as in the resume route; F11 row corrected to state exactly what is and is not budgeted |
| 2. `carryBookedHintToLead` could create a stub lead | Fixed (`4c0a0a6`): `exists:true` precondition, missing lead is a no-op; emulator test |
| 3. Firestore `ABORTED` not retried | Fixed (`a0a0634`): mapped to the precondition/retry path only on conditional commits; tests |
| 4. Unindented helpers; meetgreet duplicate length check; spliced comment | Fixed (`a0a0634` whitespace-only re-indent, verified with `git diff -w`; `4c0a0a6` check removed with test, comment repaired). The three thin `readCappedBody` adapters are kept (duplication, not a defect) |
| 5. Brief job inherits 15 s Storage timeout, unmentioned | Documented in Change scope with sizes for every Storage caller |
| Risk: E2E exercises no writes | Stated in Evidence |

Worker D re-reviewed the fixup (`66eebda`): APPROVE-FOR-SUBMISSION, no blocking issues. Non-blocking notes: (a) in the all-stalled case an auto-invite email can go out while the stage move to `shadow_invited` and the outcome record are skipped, so the person stays in `review` (extends accepted risk 6); (b) an `ABORTED` on the best-effort booking-hint carry is dropped silently like a missing lead; (c) `getBenchSettingsOrDefault` may get a ~500 ms read when the budget is starved and falls back to defaults (fail-open, as before P1).

## Risks and unresolved items

- **Not provable locally:** real Firestore's precondition error mapping (400 `FAILED_PRECONDITION`, 409 `ALREADY_EXISTS`, 404 `NOT_FOUND` observed on the emulator; `ABORTED` mapping is from documentation, never observed) and the `:commit` request against production; real Storage cancellation; how Vercel counts `after()` time against `maxDuration`; production latency/contention. These need the P2/P5 isolated preview, which needs an owner decision (Preview currently shares production credentials).
- **Degraded cases, documented:** meetgreet's post-response conversion skipped past 19 s leaves the lead saved but the capture row possibly `partial` until the next capture/conversion for that address; a timed-out claim may consume the token (applicant uses email fallback); first conversion wins when the same email submits two different final inquiries.
- **Storage** is mocked in P1 tests; Firestore claim/finalize run on the real emulator.
- **CI** still skips the 96 emulator tests (F05, P2). Branch protection is off (P0 owner action).
- No production backfill; existing inconsistent capture rows (if any) are untouched. A dry-run repair would be a separate, owner-approved proposal.
- Remaining open: F05–F10, H01–H04 (later phases). Owner actions from P0 unchanged.

## Rollback

Revert the P1 merges on `codex/client-handoff-hardening` (`git revert -m 1 66eebda e3f76fa b1c1cc7 469fb9a 63414c8 9ea4684 f1dd726 c96d622`, newest first) or reset the branch to `a70713b`. Nothing is deployed: production remains `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1` at `905206d`. Data compatibility if P1 is later released and rolled back: new fields (`resumeAttemptId`, `resumeAttemptAt`) are optional and ignored by the prior code; namespaced rate-limit counters expire by their TTL timestamp (note `leadRateLimits` has no TTL policy in production — P0 owner action); converted marker capture rows are read by prior admin code as converted captures, which it already hides. No data deletion or migration.

## Review request

Request Codex approval for P1 at the fixup candidate SHA in the relay message (supersedes `d2f73b2`). No P2 work has started.

## Reviewer decision — Codex only
PENDING
