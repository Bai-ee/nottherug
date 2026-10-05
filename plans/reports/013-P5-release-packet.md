# Plan 013 — P5 release packet
Status: READY FOR TECHNICAL REVIEW (no production action taken)
Release candidate SHA: **the commit that adds this packet** (exact SHA and its GitHub Actions run via draft PR #1 are given in the relay message)
Branch: `codex/client-handoff-hardening` (draft PR #1). `main` is an ancestor of the candidate, so the release can be a fast-forward of `main` to exactly this SHA.
Prior approvals: P0 `3461c67`, P1 `7833d99`, P2 `6e5b764`, P3+P4 `f410241`.

Gates are separate: **Codex technical approval** of this packet → **owner authorization** of the release and of each production action below. Nothing in this packet has been executed.

## 1. What P5 changed (since the approved `f410241`)

| Change | Files | Why |
| --- | --- | --- |
| Booking E2E waits for hydration before interacting; asserts each step transition | `tests/e2e/booking.spec.ts`, new `tests/e2e/helpers/hydration.ts` | CI flake on mobile WebKit: clicks before hydration were dropped (reproduced by delaying JS chunks 2.5 s). No product defect. |
| Hero-video test proves the property by frames, not a wall clock: CTA operable on every rendered frame while the video request is held forever or aborted; video never finished, no data events, `readyState 0`; 15 s hang guard only | `tests/e2e/home-entrance.spec.ts`, `tests/e2e/home-image-delivery.spec.ts` | CI flake: 1.5 s wall-clock bound measured runner speed; Codex asked for reliability, not a looser limit |
| Domain decision `nottherug.com` and cutover steps; plan 012 true status; release checklist wording | `docs/operations-runbook.md`, `docs/decisions-needed.md`, `docs/release-checklist.md`, `.env.example`, `lib/content/site.ts` (comment), `plans/README.md` | Parked items 8 and 12 |

Independent review (`013-P5-review.md`, approve with fixes) found: two timeouts raised to 15 s had dropped the intro-ceiling property; `waitForHydration` resolved at render time so two video assertions could pass vacuously; cutover missed email DNS records and Firebase authorized domains; plan 012 wording. All fixed: intro end time is asserted on the page's own clock (≤ `INTRO_CEILING_MS` + 1.5 s); hero-decision waits for passive effects (`history.scrollRestoration === 'manual'`) then an idle callback queued after the hero's; `#page-home` opacity asserted; route-handler evaluate guarded. Mutation check: removing the reduced-motion/save-data early returns made those tests fail 20/20; restored. Worker N evidence: `--repeat-each=50 --workers=4 --retries=0` of home-entrance, home-image-delivery and booking specs — mobile 750 passed / 50 skipped (desktop-only test) / 0 failed / 0 flaky; desktop 800 passed / 0 flaky. Independent review: `013-P5-review.md`.

## 2. Finding-to-fix matrix

| ID | Pri | Phase / commit | Status | Evidence |
| --- | --- | --- | --- | --- |
| F01 capture consumes inquiry quota | P1 | P1 (`7833d99`) | Fixed | Namespaced counters; regression + emulator tests (013-P1-report) |
| F02 capture undoes conversion/booking | P1 | P1 | Fixed | Conditional writes + optimistic retry; 8 emulator ordering tests |
| F03 resume token replay / stale overwrite | P2 | P1 | Fixed | Single-winner claim, field-scoped writes; 17 emulator tests |
| F04 capture byte limit | P2 | P1 | Fixed | Shared bounded reader; original audit repro now fails on behavior (413) |
| F05 CI skips data-boundary tests | P1 | P2 (`6e5b764`) | Fixed | `emulators` job with required mode + zero-executed guard; `e2e-analytics` job; route outages fail in CI |
| F06 homepage delays usable content | P2 | P3 (`f7b235c`) | Fixed | Mobile CTA 8.07 → 1.56 s, desktop 6.76 → 0.67 s (013-P3P4-report) |
| F07 early media weight | P2 | P3 | Fixed | Images −46% mobile / −61% desktop; video deferred, 540p mobile clips |
| F08 dynamic homepage | P2 | P3 | Fixed | `/` static (`○`); redirects in `proxy.ts` |
| F09 malformed SEO URLs | P2 | P4 (`e415730`) | Fixed | One normalizer, URL builders, clean sitemap/robots |
| F10 analytics failures shown as zero | P2 | P4 | Fixed | `meta.unavailable`, `partial_failure`, "Unavailable" UI |
| F11 no outbound deadlines | P2 | P1 | Fixed | Deadlines on every Firestore/Storage call; route budgets |
| H01 identity guarantees | H | P2 | Fixed in code; **rules deploy pending** | `checkRevoked`, `email_verified`; rules mirror in `firestore.rules`; owner Google sign-in verified locally against production Auth; email/password provider now disabled (verified 2026-10-05) |
| H02 private response caching | H | P2 | Fixed | `Cache-Control: private, no-store` on all admin routes |
| H03 production ownership | H | P4 docs + owner actions | **Documented; actions pending** | Runbook + checklist; TTL 2/4, no backups, single owner (verified 2026-10-05) |
| H04 dependency advisories | H | P2 | Fixed / risk-accepted | `next` 16.3.8, `grpc-js` 1.14.5; three residual advisories accepted by owner 2026-10-05 |

## 3. Verification for the candidate

- Local, **fresh worktree** at `48e456d` (code identical to the candidate), `npm ci --no-audit`, Node v24.7.0, firebase-tools 15.15.0, CI throwaway env, emulators on 8580/9599, 2026-10-05T19:56–19:58Z. Logs: `013-P5-evidence/`.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run lint` / `npm run lint:pipeline` | 0 / 0 | 0 warnings |
| `npm run build`, `typecheck`, `verify:assets` | 0 | `/` static |
| `npx vitest run` (no emulator, as CI `check`) | 0 | 696 passed, 101 skipped |
| `npm run test:emulators` under emulators (CI `emulators`) | 0 | **797 passed, 0 skipped**; guard: 102 emulator-backed tests, 11 suites |
| `CI=1 E2E_PORT=3400 npm run test:e2e` | 0 | **201 passed, 21 skipped, 0 flaky** |
| analytics build + `npm run test:e2e:analytics` | 0 | 6 passed |
- GitHub Actions on the exact candidate SHA via draft PR #1: given in the relay message (all four jobs: `check`, `e2e`, `emulators`, `e2e-analytics`).

Not verified (no isolated environment exists; Preview shares production credentials and is disabled): real inquiry persistence and email delivery, real resume upload/private download, real photo upload, Calendly hand-off, admin edit preservation against production Firestore, real Firestore precondition codes and `ABORTED` behavior, Storage cancellation, Vercel edge caching of static `/`, iOS Safari video start. These are covered by emulator/mocked tests only and are listed as post-release smoke checks (§6) or need an isolated environment (owner decision).

## 4. Rollback targets (recorded 2026-10-05)

| What | Current production value | How to restore |
| --- | --- | --- |
| Vercel deployment | `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1` (`905206d`, alias `nottherug-ten.vercel.app`) | Vercel dashboard → Deployments → that deployment → Promote / Instant Rollback |
| `main` | `905206d6c5e046eee6c42b44b42efd05ad0f1cf8` | Revert on `main` (do not force-push) |
| Firestore rules | ruleset `98050a6d-75ce-4ce7-9168-6fa04c605c9b` | Firebase console → Firestore → Rules → history → that version → Publish, or `firebase deploy --only firestore:rules` from `905206d` |
| Storage rules | ruleset `2e328ac4-dacb-41de-9be9-678eb7f45116` (unchanged by this release) | — |
| TTL / settings | TTL active on `analytics_events`, `analyticsRateLimits` only | TTL policies can be removed in the console |

Data compatibility: all new stored fields are optional; namespaced rate-limit rows and converted capture markers are ignored or hidden by the prior code; old asset URLs are retained. No migration, no deletion.

## 5. Release steps (each needs owner authorization; none executed)

| # | Step | Target | Sends email? | Costs? | Modifies data? | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Optional first: protect `main` requiring `check`, `e2e`, `emulators`, `e2e-analytics` | GitHub settings | No | No | No | Remove rule |
| 2 | Release: fast-forward `main` to the candidate SHA (`git push origin <SHA>:main`, or merge PR #1 with "Create a merge commit" only if a new SHA is acceptable — a fast-forward keeps the exact reviewed SHA). Vercel deploys production automatically. | GitHub `main` → Vercel production | No | Build minutes | No | §4 Vercel rollback |
| 3 | Verify Vercel production deployment is built from the candidate SHA and `nottherug-ten.vercel.app` points to it; Node 24 in build log | Vercel | No | No | No | — |
| 4 | Deploy Firestore rules from the released SHA: `firebase deploy --only firestore:rules --project not-the-rug`; confirm the active ruleset source equals `firestore.rules` | Firebase | No | No | Access rules only | §4 rules rollback |
| 5 | Enable TTL on `leadRateLimits.expiresAt` and `benchRateLimits.expiresAt` (`gcloud firestore fields ttls update expiresAt --collection-group=<name> --enable-ttl --project=not-the-rug`) | Firestore | No | Negligible | **Deletes expired rate-limit rows only** | Disable TTL policy |
| 6 | Smoke checks (§6) | Production | Only if the owner designates a test recipient | No | Only synthetic test rows if run | Delete the synthetic rows by hand |
| 7 | Domain cutover to `nottherug.com` — separate, later step; follow runbook "Domain cutover" (keep `PUBLIC_BASE_URL` on vercel.app until the domain serves this app) | Vercel domains, GoDaddy DNS, env | No | Possibly domain/DNS | No | Runbook cutover rollback |

Not part of this release: backups/PITR, second owner, Preview isolation, Resend sender verification, brief generation (stays unscheduled) — owner checklist in the runbook.

## 6. Post-release smoke checks

Without customer data or real email unless the owner designates a synthetic identity:

1. `https://nottherug-ten.vercel.app/` loads; CTA usable immediately on a phone; intro looks right (parked item 2); mobile video plays or poster shows (item 3); no console errors.
2. `curl -sI /` shows a cached static response (`x-vercel-cache: HIT` after a second request); `/?page=about` → 307 `/about`; `/?welcome=1` loads.
3. `/robots.txt` has one clean `Sitemap:` line; `/sitemap.xml` has 7 clean URLs.
4. Unauthenticated `GET /api/admin/analytics` → 401 with `Cache-Control: private, no-store`.
5. Owner signs in at `/admin` with Google; dashboard loads; "Unavailable" never shows unless a query fails.
6. With a designated synthetic identity only: one booking inquiry (lead saved once, notification outcome recorded), one walker application with a small test resume (single upload, private download from admin), then delete those synthetic rows.
7. Watch Vercel function errors and Resend delivery for 24–48 h (the maintainer; no automated alerting is configured).
8. After confirming the release: delete `public/img/pawl.png`, `pawr.png` (parked item 6) in a follow-up commit.

**Rollback triggers:** inquiry persistence fails; owner loses admin access; private content reachable anonymously; duplicate notifications; broken cron; material visual/performance regression; unexplained production errors → §4.

## 7. Known limitations carried into release

- No isolated test environment; real-flow verification is limited to §6.
- Real Firestore conditional-commit error codes are verified on the emulator only.
- Team portraits need JavaScript (accepted); entrance timing changed (owner visual check).
- No backups/PITR; TTL on two rate-limit collections pending (§5.5); single owner.
- Plan 012 partly landed; four commits on `fix/tracking-integrity` need an owner decision (drop or re-port).
- 21 E2E skips are deliberate desktop-only/mobile-only exclusions.

## 8. Responsible owner

Project owner (sole Firebase/Vercel/GitHub owner today) authorizes and executes §5; the maintainer runs §6 and monitors. Owner to confirm separately: Resend and Calendly account ownership, backups (parked 11).

## Review request

Request Codex technical approval of this release packet at the candidate SHA in the relay message. No production action has been taken; release requires the owner's separate authorization.

## Reviewer decision — Codex only
PENDING
