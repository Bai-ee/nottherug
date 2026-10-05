# Plan 013 P1 — Worker B final report (F01, F02, F04, F11 budgets)

## Field / state model found
- Capture row: `leads/capture_<sha256(lowercased email)[0..32]>`. Fields: id, type 'capture', schemaVersion, status 'partial' | 'converted', email, source, submittedAt (first seen), lastSeenAt, bookedSelfReported (visitor-browser hint), and on conversion convertedLeadId + convertedAt. Admin hides converted captures (`isConvertedCapture`).
- Full lead: `leads/<hash of submission + 1h bucket>` written by meetgreet via fsCreateDoc; optional `bookedSelfReported`, `notifications`.
- Rate counters: `leadRateLimits/<ipHash>_<windowStart>` (field `count`, seeds `windowStart` number + `expiresAt` Date for TTL), limits capture 8 / meetgreet 5 per 15 min, fail open.

## Rules implemented (lib/server/leadTransitions.ts)
- recordCapture (capture route), inside withOptimisticRetry (5 attempts, deadline-bound):
  - no row: create with precondition {exists:false}: status partial, submittedAt=lastSeenAt=now, bookedSelfReported=booked.
  - row exists: merge with precondition {updateTime} only {email, source, lastSeenAt}, plus submittedAt only if missing, status 'partial' only if the row has no status, bookedSelfReported:true only if booked and not already true. Never writes status over an existing row; never writes false.
  - returns convertedLeadId if row is converted; route then merges {bookedSelfReported:true} onto that lead (idempotent, best effort, no precondition).
- recordConversion (meetgreet, after response), same retry:
  - no capture row: create converted marker (precondition {exists:false}) with type 'capture', status 'converted', convertedLeadId, convertedAt, submittedAt/lastSeenAt=conversion time, source of the final submission, bookedSelfReported false. A later capture then only touches lastSeenAt/source/true-hint.
  - row converted already: first conversion wins, no write.
  - else merge {status, convertedLeadId, convertedAt} with updateTime precondition.
  - returns row's bookedSelfReported at that read; meetgreet carries it to the lead if the lead did not already have it.
- Booking-hint propagation, both orders: (1) capture-before-conversion: meetgreet reads hint when building lead, and conversion re-reads it transactionally and carries it; (2) conversion-before-capture (or capture write racing a conversion): capture write conflicts, retries, sees convertedLeadId, carries true onto the lead.
- Rate limits: ids now `leadRateLimits/capture_<ipHash>_<win>` and `leadRateLimits/meetgreet_<ipHash>_<win>`; same limits, TTL seed, fail-open (also on UpstreamTimeoutError). 429 carries `Retry-After` (seconds to window end).
- F04: capture uses readBoundedBody(req, 4000): too_large -> 413 'Request body too large'; aborted/missing -> 400 'Invalid request body'. Content-Length precheck kept. Capture no longer exports captureIdForEmail (helper owns it; route modules should export only handlers).
- Budgets: capture: rate-limit call 1.5 s; write path deadline 7 s, per-call cap 2.5 s (call timeouts shrink to remaining budget, min 250 ms) => worst ~8.75 s of 10. meetgreet: rate 1.5 s; pre-email Firestore calls share 8 s (per-call cap 3 s); emails unchanged (8 s, concurrent, never retried); notification status write 2 s => worst ~18.5 s of 20; post-response conversion must finish by 19 s from request start or is skipped (best effort, logged). Any error incl. UpstreamTimeoutError/exhausted conflict retries takes the existing dependency-failure path (500 for capture/create; best-effort steps just log).
- Not touched: readCappedBody in meetgreet (Worker A's reader swap), email logic, response shapes.

## Tests
- tests/unit/lead-intake-regression.test.ts (fake Firestore with preconditions): five captures then final allowed + namespaced counter keys; each route's own limit + Retry-After; TTL seed; fail-open incl. timeout; conversion between read and write survives; stale false hint never overwrites true; first-seen preserved; Unicode >4000 bytes rejected 413 with no writes; aborted stream 400; every dependency call gets bounded timeoutMs; stalled read/create -> clean 500, no email; notification failure (error result and throw) keeps lead, no retry; duplicate final submission sends one email.
- tests/unit/lead-intake-emulator.test.ts (real emulator, deterministic interleave via fsGetDoc wrapper): capture-then-convert; convert-then-capture (marker, no outstanding row, hint reaches lead); conversion between capture read/write; booked capture mid-conversion; booked capture racing conversion that commits first; concurrent true/false signals (fresh + existing row); 4 simultaneous first captures; capture vs final submission race x4; five captures do not block final; duplicate final (parallel) -> one lead, one founder email; notification failure keeps lead, converts capture, no duplicate sends.
- Shared helper tests/unit/lead-firestore-fake.ts; existing lead-capture-honeypot and lead-intake mocks updated to spread real firestoreRest (for withOptimisticRetry/errors).
- Intake-repro #3 (Unicode) and #2 (revert) and #1 (quota) are all inverted above.

## Before / after conflicting-write ordering
- Before: capture read the row, derived `status`/`bookedSelfReported` from that snapshot, then merged them unconditionally. A conversion committed in between was overwritten with `partial` (convertedLeadId kept, status reverted); a stale false could overwrite a true hint; conversion with no capture row wrote nothing, so a later capture made a fresh outstanding row.
- After: every write is a conditional merge (updateTime or exists:false) retried up to 5 times within a deadline; capture never writes `status` over an existing row; true-only hint; conversion-before-capture leaves a converted marker.

## Status-code / contract changes
- capture: aborted or missing body now 400 'Invalid request body' (was: unreachable/500); oversize still 413 (now by true UTF-8 bytes). 429 adds `Retry-After`. Success/error JSON shapes unchanged.
- meetgreet: a stream that dies mid-read is now 400 'Invalid request body' (A's adapter reports 'aborted'; was 413). 429 adds `Retry-After`. Shapes unchanged.
- Rate-limit doc ids gained a `capture_`/`meetgreet_` prefix (old counters simply expire via TTL). Converted marker rows (type 'capture', status 'converted') may now exist for leads that never had a capture; admin already hides converted captures. `captureIdForEmail` moved to lib/server/leadTransitions.ts (only importers: meetgreet route and tests).

## Verification
- `PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH firebase emulators:exec --config firebase.worker.json --only firestore,storage --project demo-not-the-rug "npx vitest run"`: 71 files, 653 tests passed, 0 skipped, 0 failed (includes A's suites). Lead files only (`tests/unit/lead-`): 10 files, 114 passed.
- `npm run lint`: 0 errors; 1 pre-existing warning (SchedulingDialog img). `npm run typecheck`: clean.
- `npm run build`: not completed in this worktree (no .env.local; admin pages fail at "collect page data" with missing Firebase admin env, also with dummy env). Compile and type phases passed; not an effect of this change but not independently proven.
- Existing test changes: lead-capture-honeypot.test.ts and lead-intake.test.ts mocks now spread the real firestoreRest (for withOptimisticRetry/errors); no assertions weakened. The honeypot booked-carry test now asserts resulting state instead of an exact merge call.
- Emulator project id `demo-lead-intake-emulator` works under singleProject.

## Limitations
- Post-response conversion must finish within 19 s of request start; if the route is that slow (slow Resend + Firestore) it is skipped and logged ('capture conversion failed'). Degraded case: lead saved, capture row may stay `partial` (shows as outstanding) until a later capture/conversion for that address. Admin repair not built.
- First conversion wins: a second final submission from the same email (different content) does not move convertedLeadId; its own lead still gets the hint at creation/conversion.
- Capture returns 500 if five conflict retries or the 7 s budget are exhausted; the client is fire-and-forget.
- The meetgreet bucket-boundary double-submit limitation (documented in the route) is unchanged.

## Review fixes
- `recordCapture` no longer overwrites `email`/`source` on a converted row (only `lastSeenAt` and the true-only hint); asserted in the emulator suite (convert-then-capture keeps source 'book-page') and in the fake-backed regression suite.
- Removed capture's duplicate Content-Length precheck; `readBoundedBody` performs the identical check (same 413). Covered by a new over-cap declared Content-Length test.
- Full suite under emulators: 71 files, 655 passed, 0 skipped; lint 0 errors (1 pre-existing warning); typecheck clean.

## Codex review fixup
- `carryBookedHintToLead` now merges with `precondition: { exists: true }`; a FirestorePreconditionError (lead missing) is a silent no-op, so no stub row is created. Emulator test covers missing lead (nothing created) and existing lead (set true).
- Removed meetgreet's duplicate declared Content-Length precheck (readBoundedBody performs it, same 413); new test asserts 413 with zero Firestore calls.
- Repaired the spliced bucket-boundary lookback comment in meetgreet (text only).
