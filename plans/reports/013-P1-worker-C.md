# Plan 013 P1, Worker C notes (F03 resume claim + narrowed bench writers)

Status: complete. Merged with 013/p1-a (4b9a688); typecheck clean; lint 0 errors (1 pre-existing img warning).

## Record fields and writer ownership (benchPeople/{id})
| Writer | Fields it writes now | Condition |
|---|---|---|
| apply route, create | whole new record (fsCreateDoc, create-only) | doc must not exist |
| apply route, notification persist | `notifications`, `updatedAt`; for auto-invite also `stage`, `stageHistory` only if stage is still `review` | updateTime precondition, retry |
| resume route, claim | `resumeUploadTokenHash`=null, `resumeUploadExpiresAt`=null, `resumeAttemptId`, `resumeAttemptAt` | updateTime precondition, retry re-validates token |
| resume route, finalize | `resumePath`, `resumeKind`, `updatedAt` | updateTime precondition AND `resumeAttemptId` still ours |
| AI summary | `aiSummary`, `updatedAt` | `{exists:true}` |
| admin action POST | only the fields the action changes (`notes` / `shadowRating` / `onHold` / `stage`+`stageHistory`+`onHold`+`tier`, plus `updatedAt`) | updateTime precondition, re-read + re-check `actionAllowed` on retry |
| admin notification record | `notifications` only | updateTime precondition, retry |

`saveBenchPerson` (whole replace) had three callers (resume, summary, admin). All moved to `mergeBenchPerson` (new, in `lib/server/bench.ts`, precondition required); `saveBenchPerson` removed. `saveBenchSettings` untouched. `benchEmail.ts` has no write sites (it only sends); the notification writes lived in the apply and admin routes. `benchIntake.ts` not touched.

New optional contract fields: `resumeAttemptId`, `resumeAttemptAt` (`lib/bench/contract.ts`). Existing documents read fine without them.

## Resume state machine
1. Validate: size, multipart, file signature (415 before any token use; a bad file does not burn the link).
2. Claim (`withOptimisticRetry`): read + updateTime; require hash present, unexpired, matching; conditional merge clearing the token and setting `resumeAttemptId`. Losers re-read inside the retry, see no hash, get 403 (same as a used token). Admin edit between read and claim = one extra retry, token survives.
3. Winner uploads to `private/bench-resumes/{id}.{kind}` (path unchanged).
4. Finalize (`withOptimisticRetry`): re-read; require `resumeAttemptId` === ours; conditional merge of resume-owned fields only.
5. 200 `{ok:true}`.

Failure behavior
- Token missing/expired/wrong/used: 403, same copy as before, nothing written.
- Claim dependency failure, timeout or retry exhaustion: 503 "Could not save your resume right now. Your application is still on file." (new message). Token state is ambiguous only on a timed-out claim write; applicant falls back to email.
- Upload failure/timeout: 500 existing copy. Token stays consumed (NOT re-opened: a timed-out upload is ambiguous and a re-open would reintroduce replay). Best-effort `storageDelete` of our path (skipped if the record already pointed at that path). Application untouched; `resumeAttemptId` set with no `resumePath` = interrupted/failed attempt. Existing form copy already tells the applicant to email the resume for any non-OK response.
- Finalize failure: 500 existing copy. If attempt was lost (another attempt id): no write, no delete. Otherwise a fresh read decides: finalize actually landed (ambiguous timeout) -> 200; not finalized -> delete own object and 500; read failed -> keep the object (orphan private file beats a dangling pointer).
- No automatic retry of uploads or emails anywhere.

Budgets (resume route, 30 s maxDuration; 27 s internal budget): claim steps <=5 s each while reserving 20 s; upload <=15 s reserving 8 s; finalize steps <=5 s reserving 3 s; cleanup <=5 s; floor 1 s per call. Passed as `timeoutMs`. `UpstreamTimeoutError` is handled as an ordinary dependency failure by the generic catches (no special-case import needed). Apply-route notification persist: 5 s per call.

Admin action POST, ordering change (needed so a retry cannot resend email): validate -> (invite_shadow only) read settings -> conditional stage write -> send email once -> conditional `notifications` merge. Previously: email -> whole-record save. If the stage write conflicts past the retry limit: 409 "just changed by someone else. Refresh and try again." (new message). If only the outcome record fails to persist: logged, 200 returned (stage saved, email sent).

## Tests
- `tests/unit/bench-resume-race.test.ts` (mock-level, inverted audit repro): simultaneous requests -> one upload, [200,403], note preserved; replay while first upload in flight -> 403.
- `tests/unit/bench-resume-emulator.test.ts` (Firestore emulator; storage/email/AI/admin-auth stubbed): happy path; 4 simultaneous requests -> exactly one upload; replay; admin note edit during upload (real admin route); expired token; wrong token; bad file does not burn token; storage failure (app on file, token consumed, own object deleted); finalization failure (Firestore PATCH 503 after upload -> own object deleted); lost attempt (no finalize, no delete); duplicate application; notification write vs admin edit; auto-invite vs admin reject; AI summary vs admin edit; AI summary for deleted person; admin note after resume.
- `tests/unit/bench-fs-fake.ts`: in-memory fake of A's contract for the existing mocked suites.
- Updated: `bench-apply-route.test.ts`, `bench-admin-routes.test.ts` (use the fake), `bench-summary.test.ts` (asserts only `aiSummary` merged, `{exists:true}`).

## Verification
- Full suite under emulators: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH firebase emulators:exec --config firebase.worker.json --only firestore,storage --project demo-not-the-rug "npx vitest run"` -> 71 files, 644 tests passed, 0 skipped, 0 failed.
- This worker's files: `... "npx vitest run tests/unit/bench-resume-emulator.test.ts tests/unit/bench-resume-race.test.ts"` -> 2 files, 19 tests passed (emulator file has 17 incl. the stored-resume refusal).
- Preconditioned merges go through A's `:commit` path; the finalization-failure test fails both PATCH and `:commit`.

## Overwrite of a stored resume
Tokens are issued only in the apply route at record creation (`resumePath` null) and never re-issued, so a prior resume cannot exist today. As a guard, the claim now refuses (403) when `resumePath` is already set, so an upload can never overwrite a stored object. Cleanup also never deletes a path the record already pointed at.

## Frontend check (no code changes needed)
- Applicant form: any non-OK resume response shows the "email your resume" note, so the new 503 is covered.
- Admin `PersonCard.run`: displays `data.error`, so the new 409 text shows as-is.

## Limitations
- Storage behavior mocked (firebaseStorage has no emulator mode); Firestore claim/finalize on emulator.
- Real-Firestore `ABORTED` under contention is not mapped to a precondition error (A's open risk); it surfaces as a dependency failure (503 / 409-less 500).
- Admin POST: email now follows the stage write; a crash between the two leaves a stage change with no email.
- A timed-out claim write is ambiguous; applicant falls back to email.

## Review fixes / accepted risks
Fixes
- Claim catch comment corrected: a timed-out claim write is ambiguous (the token may be consumed); the applicant gets 503 plus the email fallback.
- Budget: the route re-slices from the remaining overall budget (27 s, 3 s under maxDuration) before every call, reserving time for later steps; a call is not started when under 500 ms remains (claim/finalize fail, confirm/cleanup are skipped). Summed worst case with every call stalling to its deadline is about 27 s. `tests/unit/bench-resume-budget.test.ts` (3 tests, fake timers, no real waits) asserts a stalled claim ends within 5 s, and stalled upload+cleanup and stalled finalize+confirm+cleanup each end within 28 s.
- `bench-apply-route.test.ts` malformed-id test again asserts `fsGetDoc` is not called (plus the storage assertion).

Accepted risks
- Finalize timeout ambiguity: if the confirming read also fails or the finalize landed late, `resumePath` can point at an object that was deleted or never finalized. Narrow window; the email fallback covers it.
- Admin POST stores the stage before sending the email and never retries; a crash between the two loses the email, with no duplicate-send path.
- Apply-route auto shadow-invite email may already be sent when an admin moved the person out of `review` during the send; admin state wins and the stage move is skipped.
