# Plan 013 — P1 dispatch briefs (prepared; not dispatched)

Dispatch only after `APPROVED P0 3461c672b3298e87e180d2955d795eb82b6910d4` is recorded.
Base for all workers: that SHA. Model: Sonnet. Installs: `npm ci --no-audit`.
Emulators: `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH firebase emulators:exec --only firestore,storage --project demo-not-the-rug "<cmd>"`.
All workers: no production access, no deploy, no push, no edits outside owned files, no `Not The Rug/` or `chino.txt`. Report to `plans/reports/013-P1-worker-<X>.md` in their worktree. Commit on their own branch only.

## Shared-code facts (from read-only survey)

- `lib/server/firestoreRest.ts` (382 lines): REST helpers `fsGetDoc`, `fsSetDoc` (whole-doc replace, no mask), `fsMergeDoc` (top-level updateMask), `fsCreateDoc` (409 idempotency), `fsIncrementField`, `fsDeleteDoc`, queries. No `AbortSignal`, no precondition support. Emulator via `FIRESTORE_EMULATOR_HOST`.
- `lib/server/firebaseStorage.ts` (209 lines): `storageUpload`, `storageUploadPrivate`, `storageDownload`, `storageDelete`, `storageList`. No deadlines.
- Three duplicated byte-capped stream readers: `app/api/leads/meetgreet/route.ts:51`, `app/api/track/route.ts:53`, `lib/server/benchIntake.ts:50`. Capture (`app/api/leads/capture/route.ts:77`) has its own `readCappedBody` that counts `text.length` (F04).
- Whole-document bench writers via `saveBenchPerson` (`lib/server/bench.ts:49` → replace): `app/api/bench/apply/resume/route.ts:69`, `lib/server/benchSummary.ts:129`, `app/api/admin/bench/people/[id]/route.ts:123`.

## Worker A — shared primitives (runs first)

- **Findings:** F11; shared reader for F04; concurrency primitive for F02/F03.
- **Owns:** `lib/server/firestoreRest.ts`, `lib/server/firebaseStorage.ts`, new `lib/server/readBoundedBody.ts`, their unit/emulator tests.
- **Deliver:**
  1. Optional per-call deadline (`AbortSignal.timeout`/caller signal) on every Firestore/Storage fetch, plus a typed timeout error distinct from HTTP failure. Defaults conservative; callers pass budgets (capture/track 10 s, inquiry 20 s, resume 30 s route budgets, leaving headroom).
  2. Conditional update: `fsMergeDoc` variant accepting `currentDocument.updateTime` / `exists` precondition, returning `{updateTime}`; `fsGetDoc` returns `updateTime`. Precondition failure surfaces as a distinct `PreconditionFailedError`. Small `withOptimisticRetry(read→decide→conditionalWrite, maxAttempts=5)` helper. Prefer this over REST transactions unless an emulator test shows it insufficient.
  3. `readBoundedBody(req, maxBytes)` counting UTF-8 bytes from the stream, cancelling the reader on overflow, handling aborted streams; returns a discriminated result. Switch the three existing readers to it without changing their limits or responses.
- **Tests:** emulator tests for precondition conflict and retry; stalled-fetch timeout test; reader tests for absent/dishonest Content-Length, multibyte, exact boundary, aborted stream.
- **Must not touch:** route business logic beyond swapping in the reader.

## Worker B — lead intake (after A merges)

- **Findings:** F01, F02, F04 (capture adoption).
- **Owns:** `app/api/leads/capture/route.ts`, `app/api/leads/meetgreet/route.ts`, a narrow lead-transition helper (e.g. `lib/server/leadTransitions.ts`), lead tests.
- **Deliver:** namespaced rate-limit keys (`capture` vs `meetgreet`), same limits/TTL/fail policy, `Retry-After` if trivial. Capture uses `readBoundedBody`. Monotonic transitions via A's conditional write: conversion never reverts, `bookedSelfReported` true never cleared, `submittedAt`/`convertedLeadId`/`convertedAt` preserved, conversion-before-capture leaves a converted marker, not an outstanding row. Booking-hint propagation both arrival orders. Pass route budgets.
- **Tests:** invert `intake-repro` assertions; emulator tests of both arrival orders and concurrent true/false booking; duplicate submission; notification failure preserves lead with no duplicate email.

## Worker C — bench / resume (after A merges; parallel with B)

- **Findings:** F03, narrowed bench writers.
- **Owns:** `app/api/bench/apply/**`, `lib/server/bench.ts`, `lib/server/benchIntake.ts`, `lib/server/benchSummary.ts`, `lib/server/benchEmail.ts` (only write sites), bench tests. Admin route `app/api/admin/bench/people/[id]/route.ts` only to make its write field-scoped/conditional.
- **Deliver:** validate file, atomically claim token (conditional write clears hash + sets `resumeAttemptId`) before upload; only the winner uploads; finalize/cleanup conditional on attempt ownership; field-scoped merges instead of whole-person saves for resume, summary and notification; admin edits not lost. Document existing email fallback for an interrupted claimed attempt.
- **Tests:** invert `resume-repro`; emulator tests for replay, admin edit during upload, expired token, storage failure, finalization failure.

## Worker D — independent review (after B and C)

- Read-only review of A+B+C combined diff against Plan 013 P1 acceptance criteria; run the full suite with emulators; report findings to `plans/reports/013-P1-review.md`. Not the author of any P1 code.

## Integration (coordinator)

Merge A → run full emulator suite → merge B and C → full suite, lint, build, typecheck, E2E booking/application flows with mocks → D review → fix → P1 report.
