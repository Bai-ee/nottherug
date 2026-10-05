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
