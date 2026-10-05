# Plan 013 P1 - Worker A report (shared server primitives)

Branch `013/p1-a`, base 3461c67. Covers F04 (bounded reader), F11 (deadlines) and the precondition primitive for F02/F03.

## Interface as built (matches the contract, no deviations)
- `lib/server/errors.ts`: `UpstreamTimeoutError { service: 'firestore'|'storage'; operation }`, `FirestorePreconditionError`. Both re-exported from `lib/server/firestoreRest.ts`.
- `lib/server/firestoreRest.ts`: `FsRequestOptions { signal?, timeoutMs? }`; `fsGetDoc` (+`updateTime`); `fsMergeDoc(path, data, opts?: FsRequestOptions & { precondition?, deleteFields? }) -> { updateTime? }`; `withOptimisticRetry(attempt, { maxAttempts = 5 })`. Every other `fs*` helper gained trailing `opts?: FsRequestOptions` (after existing defaulted params, e.g. `fsIncrementField(path, field, amount, seed, opts)`, `fsQueryRange(..., limit, direction, opts)`).
- `lib/server/firebaseStorage.ts`: every `storage*` function has trailing `opts?: FsRequestOptions`. Extra exports (not in contract, additive): `DEFAULT_FS_TIMEOUT_MS`, `DEFAULT_STORAGE_TIMEOUT_MS`, `withUpstreamDeadline`.
- `lib/server/readBoundedBody.ts`: `readBoundedBody(req, maxBytes) -> BoundedBodyResult` exactly as specified.

## Deadlines
- One helper, `withUpstreamDeadline`, wraps each whole helper call (token step, fetch, body read) under `AbortSignal.any([caller, AbortSignal.timeout(ms)])`. It also races the abort, so a stuck credential refresh or a fetch that ignores its signal still rejects.
- Timeout -> `UpstreamTimeoutError`. Caller abort -> rejects with the caller's reason (never `UpstreamTimeoutError`; caller wins if both fired). HTTP failures keep the old `Error` messages. Nothing retries inside the helpers.
- Defaults: Firestore **8000 ms** (capture/track routes are 10 s; leaves ~2 s to respond/persist status). Storage **15000 ms** (payload-bearing; resume route is 30 s). The budget is per helper call, not per route. `storageUploadPrivate` spends one budget across upload + token clear; its failure-cleanup delete gets its own fresh default deadline.
- Timed-out writes have unknown outcome. Callers must not blind-retry.

## Preconditions: emulator-observed (sanitized)
Probed on the Firestore emulator with owner bearer:
- Stale updateTime -> HTTP 400, `error.status: "FAILED_PRECONDITION"`, message "the stored version (...) does not match the required base version (...)".
- `exists:false` on an existing doc -> HTTP 409, `ALREADY_EXISTS`, "entity already exists: ...".
- `exists:true` on a missing doc -> HTTP 404, `NOT_FOUND`, "no entity to update: ...". (Not created.)
These three (status + `error.status` code pair) map to `FirestorePreconditionError`, and only when a precondition was sent; unconditional merges never map.

**Deviation in mechanism (not in interface):** the emulator ignores the `currentDocument.updateTime` query param on PATCH (always compares against version 0, so even the current updateTime fails with 400). Preconditioned merges therefore go through `POST ...:commit` with a write carrying `updateMask` + `currentDocument: {updateTime}|{exists}`, which behaves the same on the emulator and returns `writeResults[0].updateTime`. Unconditional `fsMergeDoc` still uses PATCH exactly as before. Real-Firestore behavior of the commit path was not exercised (no production access); commit preconditions are the standard documented API.

## Bounded reader and swaps
- Counts received UTF-8 bytes, cancels on overflow, streaming `TextDecoder`, `missing` for no body, `aborted` on stream error. Also keeps the declared-Content-Length fast path (`too_large` if declared > cap), so the routes' own pre-check remains and is redundant but harmless.
- meetgreet, track, benchIntake private readers replaced by thin adapters over it. Limits and 413 responses unchanged. Absent body still reads as empty text (as before: `req.text()` gave `''`). Only behavior change: a stream that errors mid-read used to throw (unhandled -> 500); it now returns the same 413 path as an oversize body (the client is gone). Capture's reader untouched (Worker B).

## Tests (all new)
- `tests/unit/read-bounded-body.test.ts` (10): absent body, honest/dishonest/absent Content-Length, multibyte under/over cap, split multibyte char, exact boundary, mid-read error, cancel called once on an endless stream.
- `tests/unit/upstream-deadlines.test.ts` (8): stalled fetch -> `UpstreamTimeoutError` in budget with underlying signal aborted and one fetch call; signal-ignoring fetch; caller abort distinct; HTTP 503 distinct; default 8000/explicit budget wired; `withOptimisticRetry` retry/no-retry/exhaustion.
- `tests/unit/firestore-preconditions.test.ts` (7, emulator): stale vs current updateTime; `exists:false` on existing and missing; `exists:true` on missing/existing; unconditional failure not mapped; `deleteFields`; empty data + deleteFields; no-op with neither; two concurrent read-modify-write increments end at 2 with at least one retry.

Commands (from the worktree):
- Full suite: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH firebase emulators:exec --config firebase.worker.json --only firestore,storage --project demo-not-the-rug "npx vitest run"` -> **69 files, 624 tests passed, 0 skipped, 0 failed**.
- `npm run lint` -> 0 errors, 1 pre-existing warning (`SchedulingDialog.tsx` img; P4 item). `npm run typecheck` -> clean (no build needed). `next-env.d.ts` untouched.

## For Workers B / C
- Read-modify-write pattern: `withOptimisticRetry(async () => { const cur = await fsGetDoc(p, o); ... await fsMergeDoc(p, patch, { ...o, precondition: cur.exists ? { updateTime: cur.updateTime! } : { exists: false } }) })`. Wrap one `withOptimisticRetry` per logical operation, and pass a route-appropriate `timeoutMs` (each attempt gets its own budget; the whole loop is not bounded by one deadline, so share a `signal` if you need an overall cap).
- Only `FirestorePreconditionError` is retried; `UpstreamTimeoutError` and other errors propagate.
- A mid-air delete between your get and a `{updateTime}` write surfaces as a stale-version precondition error (retry sees `exists:false`).
- `deleteFields` names are top-level only; a key present in both `data` and `deleteFields` is deleted.
- Tests that `vi.mock('@/lib/server/firestoreRest')` and also load real `firebaseStorage` would now miss `withUpstreamDeadline`; none in the current suite do.

## Open risks
- Real-Firestore `ABORTED` (409) under heavy write contention on a conditional commit is not mapped to `FirestorePreconditionError` (not observed on the emulator, so left out per "map exactly what was observed"). Treat as a dependency failure for now; revisit if seen in production.
- Wrapped helper bodies in firestoreRest/firebaseStorage were not re-indented to keep the diff reviewable; formatting-only cleanup can follow.
- Storage default (15 s) exceeds the capture/track route limits; those routes never touch Storage today.

## Codex review fixup
- `ABORTED` (409, `error.status: "ABORTED"`) now maps to `FirestorePreconditionError` on the preconditioned `:commit` path only (not emulator-observed; Firestore's documented contended-commit status). Mapping is by `error.status` plus HTTP 409, so `ALREADY_EXISTS` is unchanged and unknown 409s stay plain errors. Unconditional PATCH writes never map. Mocked-fetch tests in `upstream-deadlines.test.ts`: conditional ABORTED retried by `withOptimisticRetry`; unconditional ABORTED stays a plain error; unknown 409 stays plain.
- Re-indented the deadline-wrapped helper bodies (`fsIncrementField`, `fsQueryCollection`, `runRangeQuery`, `fsQueryRangeCount`, `storageUpload`, `storageUploadPrivate`, `storageList`). Whitespace only; `git diff -w` shows just the ABORTED change.
- Storage callers now inherit the 15 s default (previously no deadline):
  - `lib/not-the-rug-brief/run.ts`: two parallel `storageUploadPrivate` of the generated brief HTML (sample briefs in the repo are ~18-31 KB). Routes allow `maxDuration = 60`. 15 s is ample for tens of KB; each call is one budget across upload and token-clear.
  - `lib/not-the-rug-brief/read.ts`: `storageDownload` of the same HTML (small). Ample.
  - `app/api/bench/apply/resume/route.ts` (resume upload, <= 4 MB, route `maxDuration = 30`) and `app/api/admin/bench/people/[id]/resume/route.ts` (download, <= 4 MB): 15 s is ample on a normal link; Worker C/B may pass a larger `timeoutMs` if desired.
  - `app/api/admin/photos/{upload,render,assets,delete}` and `lib/generator/server.ts`: admin image upload/download/render (photo sizes bounded by the upload route's image validation, typically a few MB; JPEG renders similar). 15 s is adequate but is the least roomy case: a very large image on a slow connection could time out where it previously waited. Not measured; flagged as the main behavioral risk of the new default.
