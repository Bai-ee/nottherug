# Production cleanup tracker

Source: [review and execution plan](002-production-readiness.md).

Last updated: September 14, 2026. Implementation is in progress on `main`. No production deployment has been made and no production data, rules, or credentials have been touched.

The coordinator is the only writer of this file. Workers report their task ID, changed paths, commit, checks, and blockers. Use `TODO`, `IN_PROGRESS`, `REVIEW`, `BLOCKED`, or `DONE`. A task becomes `DONE` only after its acceptance checks pass and review evidence is recorded. `BLOCKED` must name the missing input and leave independent tasks runnable.

## Task board

| ID | Phase / task | Owner | Depends on | Status | Evidence / next action |
| --- | --- | --- | --- | --- | --- |
| P0 | Baseline, ownership, contracts, test setup | Coordinator | — | DONE | Baseline `711fbe1`; primitives + screenshots `9f7cae8`. Working tree preserved, not reset. |
| P1A | Intake contract, validation, delivery, accessible form | Sonnet A | P0 | DONE | `55f51e7`. R01/R04 reproduced first, then fixed. tsc clean, vitest 80/13 skipped, eslint clean on owned paths, build passes, both booking branches pass in Playwright with the API intercepted. |
| P1B | Auth, Firebase rules, storage lifecycle/privacy | Sonnet B | P0 | DONE | `56af17f`. Coordinator review rejected an over-broad `allow read: if true` on the `photos/**` storage rule; worker corrected it and re-ran checks. Emulator rules tests skip explicitly (no Java runtime here) — a pending gate, not a pass. |
| P1C | Dependency/runtime update and CI | Coordinator | P0 | DONE | `b5a81a1`. Advisories rechecked at execution time; user's tracing fixes retained. |
| P2A | Public routes, components, motion, copy tooling | Sonnet C | P1A | IN_PROGRESS | Started in parallel against the frozen `MeetGreetForm` prop contract. |
| P3A | Admin shell, feature components, stats/export | Sonnet A | P1A, P1B | IN_PROGRESS | Consuming the landed error, lead-display and CSV contracts. |
| P3B | Brief/generator services and job reliability | Sonnet B | P1B, P1C | IN_PROGRESS | Must measure pipeline duration before any schedule is enabled. |
| P3C | Packaged function verification | Coordinator | P3B, P1C | TODO | Record per-function dependencies, assets, and sizes. |
| P4 | Launch strategy, SEO, performance, docs | Sonnet C + coordinator | P2A | TODO | Owner facts table below; coordinator owns `proxy.ts`, `app/layout.tsx`, `vercel.json`. |
| P5A | Integrated review and preview acceptance | Coordinator + reviewer | All above | TODO | Test the same clean candidate commit. |
| P5B | Authorized release and production verification | Coordinator | P5A, go-live instruction | TODO | Not authorized. Prepare rollback before deployment. |

### Execution model

Workers run concurrently in one working tree on `main` with strictly disjoint file ownership; the coordinator integrates, reviews, and commits. Files owned by the coordinator alone: `lib/server/firestoreRest.ts`, `proxy.ts`, `app/layout.tsx`, `vercel.json`, `package*.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `eslint.pipeline.mjs`, `.vercelignore`, `.gitignore`, and this tracker.

## Parallel schedule

1. Coordinator completes P0.
2. A: P1A; B: P1B; coordinator: P1C. C can read and map public routes without editing A's form.
3. Once prerequisites merge: C: P2A; A: P3A; B: P3B. Coordinator integrates shared-file requests one at a time.
4. C: P4; coordinator: P3C. Other workers review completed slices they did not author.
5. Coordinator completes P5A, then P5B after authorization. No worker independently pushes production.

Dependencies are minimum requirements. Each worker must start from an integration revision containing the contracts they consume. Do not cherry-pick a dependent change ahead of its prerequisite.

## Baseline evidence

| Item | Recorded result |
| --- | --- |
| Review base | `114dd85` plus pre-existing working-tree changes |
| Integration baseline | `711fbe1` — the user's uncommitted `next.config.ts` trace fixes, `.vercelignore`, `docs/copy/`, and `scripts/` committed as-is. Nothing reset or discarded. |
| Whole-repo lint (before) | 57 errors / 165 warnings |
| Scoped application lint (before) | 57 errors / 30 warnings |
| Application lint after scoping config | 57 errors / 36 warnings. 54 errors are in `app/page.tsx` and belong to P2A. No suppressions added. |
| Pipeline lint (new command) | 2 errors / 5 warnings in `not-the-rug-brief/` and `scripts/copy/`, assigned to their owning tasks |
| Type check | `npx tsc --noEmit` passed at `b5a81a1` |
| Build (before) | Review environment failed fetching Google Fonts |
| Build (after) | `npm run build` succeeded at `b5a81a1` on Next 16.3.5 / Node 24.7.0; 32 routes generated. The earlier font failure was environmental, not a code defect. |
| Dependency audit (before) | 29 findings: 3 critical, 9 high, 15 moderate, 2 low |
| Dependency audit (after) | `npm audit` → 0 findings. next 16.3.5, react/react-dom 19.3.0, sharp 0.35.4, firebase-admin 14.4.0. Unused `@anthropic-ai/sdk` removed; `gaxios`' bundled `uuid` overridden to the patched line. |
| Booking regression (reproduced) | The live form payload returns 400 `Missing: spayNeuter, dogSocial, strangerSocial`; JSON `null` and a numeric `notes` throw. Reproduced against the real handler with Firebase and Resend mocked — zero writes, zero sends. |
| Baseline routes | `/`, `/?page={services,how-it-works,about,safety,reviews,book,contact}`, `/?hood=williamsburg`, `/book`, `/contact`, `/admin`, `/playground/service-cards` all 200. `/robots.txt` and `/sitemap.xml` 404. |
| Baseline screenshots | Desktop 1440x900 and mobile 375x812 full-page captures of all 12 public/admin routes, retained in the session scratchpad (not committed — 41 MB). |
| Clean-install reproducibility | `rm -rf node_modules && npm ci` reproduces a passing tree. Note: `npm uninstall` drops optional native bindings (npm optional-dependency bug) and breaks vitest's rolldown binary — edit `package.json` and reinstall instead. |
| External side effects during execution | None. No emails sent, no production data or rules touched, no paid generation invoked. |

Review-time logs under `/tmp/ntr-review-*` were diagnostic conveniences, not acceptance evidence; every result above was re-run on the implementation tree.

## Release record

| Field | Value |
| --- | --- |
| Integration baseline commit | `711fbe1` |
| Release candidate commit | Pending |
| Preview deployment | Pending |
| Runtime and framework versions | Node 24.7.0 (engines `24.x`), Next 16.3.5, React 19.3.0, sharp 0.35.4, firebase-admin 14.4.0 |
| Unit / integration / browser check results | Pending |
| Firebase rules and private-data checks | Pending |
| Test lead ID and notification status | Pending; record synthetic identifiers only |
| Media rendering evidence | Pending |
| Timed brief run / schedule / email evidence | Pending |
| Approved business facts | Pending |
| Go-live instruction | Pending |
| Previous deployment / rollback steps | Pending |
| Production smoke result | Pending |
| Operations owner / observation outcome | Pending |

## Worker completion report

Copy this into the worker's response; the coordinator transfers the evidence here.

```text
Task ID:
Commit:
Changed paths:
Behavior fixed:
Checks run and results:
Acceptance criteria still open:
Shared-file changes requested:
Data/rollback considerations:
Reviewer and outcome:
```

## Open items carried out of Phase 1

| Item | Raised by | Owner | State |
| --- | --- | --- | --- |
| Firebase rules have never been exercised against an emulator. `firestore.rules`/`storage.rules` are versioned and their tests are written and wired, but the Firestore emulator needs a Java runtime this machine does not have, so both suites skip with an explicit reason (13 skipped, visible in every run). | P1B | Coordinator / CI | **Pending gate.** Run `firebase emulators:start --only firestore,storage --project demo-not-the-rug` then `npx vitest run tests/unit/rules-*.test.ts` on a Java-capable machine. |
| Deployed Firebase rules have not been audited or diffed against the new files. | P1B | Coordinator | **Pending gate**, separate from the emulator run. First deploy goes through `firebase deploy --only firestore:rules,storage:rules`, not blind. |
| Already-issued public download tokens for existing storage objects were not revoked. | P1B | Owner | **Open decision.** Revoking breaks any link already shared. Nothing was changed. |
| `leadRateLimits/*` documents accumulate with no expiry. A native Firestore TTL needs `windowStart` stored as a Timestamp, which requires a `Date` branch in the coordinator-owned `toValue()`. | P1A | Coordinator | Documented in code. Low urgency — the collection is write-only and safe to clear at any time. |
| `LeadStats.totals.allTime` survives as a deprecated alias so two unmigrated readers still compile. | P1A | P3A + P3B | Both readers are being migrated to `recentCount` now; the alias is deleted once they land. |
| `npm install`/`npm uninstall` silently prune optional native bindings (npm/cli#4828), which breaks vitest's rolldown binary and corrupts the lockfile. It bit P1B once. | P1B | Coordinator | Change dependencies by editing `package.json` then reinstalling, and verify `@rolldown/binding-*` entries survive in the lockfile. Verified clean at `56af17f`. |

## Decision and blocker log

| Date | Task | Decision / blocker | Owner | Resolution |
| --- | --- | --- | --- | --- |
| 2026-09-14 | P0 | Business claims, live service settings, and deployed Firebase rules were not verified during code review. | Coordinator / business owner | Open. Concrete review items prepared in P4; independent engineering proceeding. |
| 2026-09-14 | P0 | A stale empty `.git/index.lock` (8 hours old, no git process running) blocked the baseline commit. | Coordinator | Removed. No repository state was lost. |
| 2026-09-14 | P1C | `firebase-admin` 13.x carried critical `protobufjs` and high `@grpc/grpc-js` advisories with no in-major fix. | Coordinator | Upgraded to 14.4.0. Usage is only `initializeApp` + `getAuth`; `tsc --noEmit` and `next build` pass. |
| 2026-09-14 | P1C | `@anthropic-ai/sdk` was a declared dependency of the root app. | Coordinator | Removed. The brief pipeline calls the Anthropic HTTP API with `fetch` and never imported the SDK. `not-the-rug-brief/package.json` still declares it; P3B to confirm and drop. |
| 2026-09-14 | P1C | `uuid` is a direct dependency used only for `v4()`. | Coordinator | Owners are replacing it with `node:crypto` `randomUUID` in their files; the dependency is dropped once all have. |
| 2026-09-14 | P1C | `@google-cloud/storage@8` pins `gaxios@6`, whose bundled `uuid@9` carries a buffer-bounds advisory. | Coordinator | `overrides.gaxios.uuid` pinned to the patched line rather than forcing a major on a transitive dependency. |
| 2026-09-14 | P1C | The Vercel project `nottherug` still shows **Node 20.x** in its project settings, and Vercel stops accepting new Node 20 deployments on October 1, 2026. | Coordinator | Resolved in code. [Vercel's documentation](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) states `engines.node` in `package.json` overrides the project setting, and `b5a81a1` sets it to `24.x`. The stale project setting needs no change, but confirm the build log reports Node 24 on the release deploy. |
| 2026-09-14 | P4 | The project has no custom domain attached: only `nottherug-ten.vercel.app` and `nottherug-baiees-projects.vercel.app`. `app/layout.tsx` and every public page default `PUBLIC_BASE_URL` to `https://nottherug.com`, so canonicals and OG image URLs point at a host this deployment does not serve. The project also reports `live: false`. | Owner | **Open.** Either attach `nottherug.com` to this project, or set `PUBLIC_BASE_URL` to the host that will actually serve the site. Indexing cannot be verified until this is settled. |
| 2026-09-14 | P0 | `public/logos` holds 223 MB of untracked raw source video that `.vercelignore` did not exclude, so a CLI deploy uploaded all of it. The hero `<video>` also listed a `.webm` source first that `.gitignore` excluded, so a git-integration deploy would 404 it on every page load. | Coordinator | Resolved in `15c897e`: source videos excluded from deploys, both web-optimised hero clips tracked. |
| 2026-09-14 | P4 | Eight Google Font families load at the root layout. Geist, Geist Mono and Playfair Display are referenced by nothing except a dead `app/page.module.css`. | Coordinator | In progress. P2A deletes the dead stylesheet; the coordinator then drops the three unused families from `app/layout.tsx`. |

## Evidence log

Append one short entry per reviewed task, including commit, commands/results, and links to retained screenshots or reports. Do not store credentials, customer payloads, Firebase download tokens, or full email addresses here.
