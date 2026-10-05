# Plan 013 — Codex Phase 0 review

## Decision

APPROVED P0 3461c672b3298e87e180d2955d795eb82b6910d4

Approved to begin **P1 only**, from this candidate on `codex/client-handoff-hardening`. The proposed three Sonnet implementation workers and separate independent reviewer are appropriate, subject to available concurrency and the tracker's shared-file ownership/dependencies. Report P1 back to this Codex task for approval before P2.

This approves the baseline/inventory phase. It does not approve production readiness, any production/configuration change, a registry scan, or a deployment.

## Review scope and evidence

- Inspected the candidate commit and its parent, the entire changed-file list, P0 report, execution tracker, and master plan.
- Confirmed the candidate is directly based on `905206d6c5e046eee6c42b44b42efd05ad0f1cf8` and contains ten documentation/evidence files only. No application, dependency, configuration, or rule changes are in the commit.
- Confirmed the copied audit, plan, and original evidence files are byte-identical to those in the original audit checkout.
- Confirmed the review worktree is clean and the original checkout still has its existing untracked items.
- Accepted the report's 599/599 emulator results and 156-pass/20-skip E2E results as phase evidence. These results were not independently rerun during this documentation-only review. The new cloud-configuration observations are reported P0 evidence, not independently re-queried in this review.
- The dependency scan remains explicitly incomplete. Its reported aggregate severity counts do not establish which packages, runtime paths, or production behaviors are vulnerable.

No blocking issue in the documentation-only candidate prevents P1.

## Instructions carried into P1

1. Record this exact approval and candidate SHA in the tracker. Preserve the P0 report as historical evidence; include this review in the next phase's documentation without amending the approved commit merely to insert its own SHA.
2. Correct future-install instructions in the working plan to `npm ci --no-audit` and set `npm_config_audit=false` in worker install environments. The original Codex plan incorrectly used plain `npm ci` despite the pending metadata-transfer approval. Do not repeat the transfer implicitly through installation or automatically triggered CI. This correction does not authorize a detailed scan or remediate the prior transfer.
3. Run P1 against demo Firebase emulators and mocked email/storage providers as appropriate. Preview has reported shared production credentials and must not be treated as an isolated test environment. Avoid pushing work that automatically provisions a credential-sharing preview until that behavior and its scope are controlled. No production-connected synthetic writes or emails are approved.
4. Worker A owns shared request/concurrency primitives. Workers B and C can prepare their tests in parallel, but must integrate against A's agreed implementation rather than create competing helpers. The independent reviewer reviews the combined result.
5. P1 acceptance requires actual emulator concurrency tests in addition to the supplied mocked reproductions. Preserve both arrival orders, monotonic conversion/booking flags, single-winner resume claims, concurrent admin edits, bounded failure paths, and lead persistence when notification delivery fails.
6. Preserve fresh, sanitized P1 command outputs and relevant evidence with the report. The October 1 audit logs are historical; do not present them as fresh evidence for later candidates.

## Open gates

- H04: explicit authorization for the detailed npm registry scan; classification and remediation or explicit disposition of applicable advisories before release acceptance. The accidental summary reported 10 high and 1 critical; do not characterize those as confirmed exploitable production defects without advisory details.
- H01: email/password being enabled makes verified-email enforcement a material P2 requirement. It does not by itself prove an account-takeover exploit. Test verified, unverified, revoked, disabled, allowed, and denied identities.
- P2 requires an isolated real sign-in check before its approval. That requirement cannot be deferred to P5 merely because emulator tests pass. Prepare an isolation/recipient proposal early; obtain the required owner authorization for external changes.
- Missing TTL policies, backup/PITR policy, required branch checks, ownership continuity, sender verification, and test-environment configuration remain operational acceptance items. No settings changes or live-data expiry are approved here.

## Nonblocking cleanup

`git diff --check` flags carriage-return/trailing-blank-line formatting in two copied historical log files. Normalize those text artifacts in a later documentation commit while preserving their contents; this is not a reason to rerun the baseline or block P1.

## Relay to the implementer

Proceed with P1 from the approved SHA using the planned workers and independent reviewer. Follow the constraints above, submit the exact integrated candidate and evidence to Codex, and stop for the P1 review gate. No later phase or external production action is approved by this decision.
