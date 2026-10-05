# Plan 013 P2, Worker C fold-in: auto-invite ordering (apply route)

Issue (Worker D): in the all-stalled case the auto-invite email could go out while the `shadow_invited` stage move and outcome record were skipped, leaving the person in `review` after an invite.

Change (`app/api/bench/apply/route.ts` only, plus tests)
- Emails this route sends: closed (knockout), shadow invite (auto-invite), received (default). Only the invite path changed.
- Order now matches the admin route: conditional stage write (read + updateTime-preconditioned merge of stage/stageHistory/updatedAt, each call budgeted at <=3 s while reserving the email's 8 s) BEFORE the invite email. The invite is sent only if that write landed; never retried.
- Stage write fails or no budget: no invite; the application stays saved in `review` and the normal confirmation ("received") email is sent instead.
- Admin already moved the person out of `review`: no write, no email (admin state wins).
- Outcome record (`notifications` only) is persisted afterwards, best-effort and budgeted, as before; the old auto-invite stage logic was removed from it.
- Worst case unchanged at about 27 s: after rate 8 + settings 3 + create 4 + coverage 3 = 18 s the claim gets about 1 s of read and no write, so no invite, then the 8 s confirmation email.

Tests
- Emulator (`bench-resume-emulator.test.ts`): stage is `shadow_invited` at the moment the invite email is sent, exactly one email; admin rejects between create and the stage write: no invite email, stage stays `rejected` (replaces the old test whose scenario can no longer occur).
- Fake timers (`bench-route-budget.test.ts`): stalled stage write: 200, application in `review`, one email, not the invite, within 29 s.

## Ambiguous auto-invite stage write is confirmed before choosing the email (Codex P2)
The earlier "accepted risk" is gone: a stage write that times out but commits would leave `shadow_invited` with the "received" email, and `invite_shadow` is not available from `shadow_invited` (lib/bench/stages.ts), so the admin could not send the invite later.

Fix (`app/api/bench/apply/route.ts`)
- Any throw from the stage claim (timeout, dependency error, retry exhaustion, no budget) is treated as ambiguous. `autoInviteStageLanded` re-reads the person once (cap 2 s, reserving the email's 8 s). If `stage === 'shadow_invited'` and `stageHistory` holds an entry with `by: 'auto-invite'` and this request's `at`, the invite is sent. Only this request can write that entry (the create is idempotent per email), so no new field was needed.
- Not ours, still `review`, the confirm read fails, or no budget remains: the confirmation ("received") is sent. A definite "admin already moved" result still sends nothing (admin state wins). The stage write is never retried after a timeout and no email is retried.

Worst-case math (27 s budget, maxDuration 30)
- From the claim on: read 3 + write 3 + confirm 2 + email 8 = 16 s. The claim reserves confirm + email (10 s) when slicing, so it only starts if those fit; the confirm read reserves the email. After rate 8 + settings 3 + create 4 + coverage 3 = 18 s, nothing is left for the claim, so no invite attempt: confirmation email only (8 s) = 26 s, outcome save skipped and logged.
- Residual: a committed write whose confirm read fails sends "received" while the stage is `shadow_invited` (the admin cannot invite from there); this needs two consecutive stalls and is logged.

Tests
- Fake timers (`bench-route-budget.test.ts`, 11 total): committed-but-timed-out write then confirm read: invite exactly once, no confirmation, <= 29 s; timed-out write that did not commit: confirmation only; committed write plus stalled confirm read: confirmation, <= 29 s.
- Emulator (`bench-resume-emulator.test.ts`): the conditional commit succeeds but the caller sees a network error; the confirm read finds our entry and the invite is sent once.
