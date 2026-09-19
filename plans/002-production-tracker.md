# Production cleanup tracker

Source: [review and execution plan](002-production-readiness.md).

Last updated: September 15, 2026. Implementation is complete on `main` and locally verified. **Nothing has been deployed anywhere** — no preview, no production — and no production data, rules, or credentials have been touched.

The coordinator is the only writer of this file. Workers report their task ID, changed paths, commit, checks, and blockers.

**Completion is tracked in four separate stages, because they are not the same claim.**

| Stage | What it means |
| --- | --- |
| **Impl** | The code is written, reviewed by someone who did not author it, and merged. |
| **Local** | Its acceptance checks pass on this machine: unit, integration, emulator, browser. |
| **Preview** | Verified on a deployed preview against real services with test credentials. |
| **Prod** | Released and verified in production. |

A task is only `DONE` when **every** acceptance check in its plan section has passed at the
stage that check requires. A check that can only be satisfied against real infrastructure
cannot be closed by a local run, and a skipped test is not a pass. Anything short of that is
`IMPL DONE` — code complete, verification outstanding — with the outstanding item named.

## Task board

| ID | Phase / task | Impl | Local | Preview | Status | Outstanding |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Baseline, ownership, contracts, test setup | ✅ | ✅ | n/a | **DONE** | — |
| P1A | Intake contract, validation, delivery, accessible form | ✅ | ✅ | ❌ | **IMPL DONE** | No lead has ever been written and no notification sent, in any environment. Needs one synthetic lead through persistence → admin → CSV → delivery on a preview. |
| P1B | Auth, Firebase rules, storage lifecycle/privacy | ✅ | ✅ | ❌ | **IMPL DONE** | Rules now pass against a real emulator (13/13). The **deployed** rules have still never been audited or diffed. No real upload, render or delete has run against Storage. |
| P1C | Dependency/runtime update and CI | ✅ | ✅ | ❌ | **IMPL DONE** | CI workflow has never executed — no push has triggered it. |
| P2A | Public routes, components, motion, copy tooling | ✅ | ✅ | ❌ | **IMPL DONE** | Verified against a local production server only. |
| P3A | Admin shell, feature components, stats/export | ✅ | ✅ | ❌ | **IMPL DONE** | Only the signed-out path is exercised. No authenticated admin session has been driven end to end. |
| P3B | Brief/generator services and job reliability | ✅ | ⚠️ | ❌ | **IMPL DONE** | The pipeline has never run. Duration unmeasured, so the 60-second limit is unverified; scheduled generation is disabled because of it. Private brief read-back untested against real Storage. |
| P3C | Packaged function verification | ✅ | ✅ | ❌ | **IMPL DONE** | Trace manifests inspected from a local build. Whether the traced files are enough at runtime is only provable on a deployment. |
| P4 | Launch strategy, SEO, performance, docs | ✅ | ✅ | ❌ | **IMPL DONE** | `PUBLIC_BASE_URL` points at a host not attached to this project, so canonicals, the sitemap and OG URLs cannot be confirmed until that is settled. |
| P5A | Integrated review and preview acceptance | ✅ | ✅ | ❌ | **IN_PROGRESS** | Local half complete on `1737c48`. Preview acceptance not started — no deployment exists. |
| P5B | Authorized release and production verification | — | — | — | **BLOCKED** | No go-live instruction. Nothing deployed. Checklist and rollback in [docs/release-checklist.md](../docs/release-checklist.md). |

Legend: ✅ passed · ⚠️ partial, see Outstanding · ❌ not done · n/a not applicable.

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
| Application lint, final | **0 errors**, 23 warnings (all `<img>`-vs-`<Image>` advisories). Down from 57 errors. No suppressions, no `any`, no `ts-nocheck` added. |
| Pipeline lint, final | **0 errors, 0 warnings.** Down from 2 errors / 5 warnings. |
| Type check | `npx tsc --noEmit` passed at `b5a81a1` |
| Build (before) | Review environment failed fetching Google Fonts |
| Build (after) | `npm run build` succeeded at `b5a81a1` on Next 16.3.5 / Node 24.7.0; 32 routes generated. The earlier font failure was environmental, not a code defect. |
| Dependency audit (before) | 29 findings: 3 critical, 9 high, 15 moderate, 2 low |
| Dependency audit (after) | `npm audit` → 0 findings. next 16.3.5, react/react-dom 19.3.0, sharp 0.35.4, firebase-admin 14.4.0. Unused `@anthropic-ai/sdk` removed; `gaxios`' bundled `uuid` overridden to the patched line. |
| Booking regression (reproduced) | The live form payload returns 400 `Missing: spayNeuter, dogSocial, strangerSocial`; JSON `null` and a numeric `notes` throw. Reproduced against the real handler with Firebase and Resend mocked — zero writes, zero sends. |
| Baseline routes | `/`, `/?page={services,how-it-works,about,safety,reviews,book,contact}`, `/?hood=williamsburg`, `/book`, `/contact`, `/admin`, `/playground/service-cards` all 200. `/robots.txt` and `/sitemap.xml` 404. |
| Baseline screenshots | Desktop 1440x900 and mobile 375x812 full-page captures of all 12 public/admin routes, retained in the session scratchpad (not committed — 41 MB). |
| Unit / integration tests, final | **217 passed, 0 skipped** across 23 files. Includes 15 emulator-backed rules tests (previously skipped entirely), 10 booking tests against a real Firestore rather than mocks, 11 real-Sharp rendering tests, and 50 admin route-hardening tests. |
| Clean-install reproducibility | `rm -rf node_modules && npm ci` reproduces a passing tree. Note: `npm uninstall` drops optional native bindings (npm optional-dependency bug) and breaks vitest's rolldown binary — edit `package.json` and reinstall instead. |
| External side effects during execution | None. No emails sent, no production data or rules touched, no paid generation invoked. |

Review-time logs under `/tmp/ntr-review-*` were diagnostic conveniences, not acceptance evidence; every result above was re-run on the implementation tree.

## Release record

| Field | Value |
| --- | --- |
| Integration baseline commit | `711fbe1` |
| Release candidate commit | `e629768` |
| Preview deployment | **None.** No deployment of any kind was made. |
| Runtime and framework versions | Node 24.7.0 (`engines: 24.x`, which overrides the Vercel project setting), Next 16.3.5, React 19.3.0, sharp 0.35.4, firebase-admin 14.4.0 |
| Clean install | `rm -rf node_modules .next && npm ci` → reproducible |
| Dependency audit | `npm audit` → **0 vulnerabilities**, from 29 (3 critical, 9 high) at review time |
| Application lint | `npm run lint` → **0 errors**, 23 warnings, from 57 errors. No suppressions added |
| Pipeline lint | `npm run lint:pipeline` → 0 errors, 0 warnings, from 1 error and 5 warnings |
| Type check | `npm run typecheck` → clean |
| Unit / integration tests | `npm test` → **217 passed, 0 skipped** (23 files), including 15 emulator-backed rules tests and 10 booking tests against a real Firestore |
| Production build | `npm run build` → succeeds, 40 routes |
| Browser tests | `npx playwright test` → **132 passed, 4 skipped, 0 failed** across desktop 1440x900 and mobile iPhone 13 |
| Route verification | All 9 public routes, `/admin`, `/robots.txt`, `/sitemap.xml` → 200. `/playground/service-cards` → 404 in production. All 8 legacy `?page=`/`?hood=` URLs → 307 to the correct new path |
| Unauthenticated access | `/admin/leads`, `/api/admin/photos/list`, `/api/cron/founder-brief` → 401 |
| Indexing headers | Non-production responses carry `X-Robots-Tag: noindex, nofollow`; robots.txt disallows `/admin`, `/playground`, `/api`; sitemap lists 8 routes and correctly omits the noindexed `/contact` |
| Screenshots | Desktop and mobile full-page captures before and after, retained in the session scratchpad. Design preserved; the only intended visual changes are the removed Tune Paws control, the restored `/contact` Instagram badge, and the new contact sentence on `/services` |
| Firebase rules, emulator | **Verified locally.** 13/13 pass against Firestore and Storage emulators on OpenJDK 21. Covers: public denied on leads, photo and brief collections; no client write to `admins/**`; a signed-in user reads only their own admin doc; the private storage prefix closed to both anonymous and authenticated clients; no tokenless read under `photos/` |
| Firebase rules, deployed | **Not verified.** The rules actually live on the Firebase project have never been read or diffed against these files |
| Test lead ID and notification status | **Not performed.** No lead has been written and no email sent, in any environment. This is the single biggest untested path |
| Media rendering, local | **Verified with real bytes.** libvips 8.18.6 / sharp 0.35.4 on darwin arm64. Composites real fixtures, decodes the output back, confirms pixels change under the logo and not outside it, confirms opacity is applied, renders JPEG/PNG/WebP, and proves the re-encode strips bytes appended past the end-of-image marker. No mocks |
| Media operations, real Storage | **Not verified.** No upload, render or delete has run against a real bucket |
| Timed brief run / schedule / email evidence | **Not measured.** A real run invokes a paid model, which was not authorized. The run record now persists `durationMs`, so the first authorized run measures itself |
| Approved business facts | **Pending.** See [docs/launch-facts-review.md](../docs/launch-facts-review.md) |
| Go-live instruction | **Not given.** Nothing deployed |
| Previous deployment / rollback steps | Recorded in [docs/release-checklist.md](../docs/release-checklist.md). The rollback target must be captured before deploying |
| Production smoke result | Not performed |
| Operations owner / observation outcome | Unassigned. The 24–48 hour observation has not begun |

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
| Firebase rules had never been exercised against an emulator — both suites skipped for want of a Java runtime. | P1B | Coordinator | **Closed.** OpenJDK 21 installed, emulator run, **13/13 pass**. Running them surfaced a real defect: both suites upload rules to the same emulator and one opens a `withSecurityRulesDisabled` window, so run together they clobbered each other and one failed. Files now run serially (`1737c48`, `6b85c7d`). `npm run emulators` and `npm run test:rules` added. |
| Deployed Firebase rules have not been audited or diffed against the new files. | P1B | Coordinator | **Pending gate**, separate from the emulator run. First deploy goes through `firebase deploy --only firestore:rules,storage:rules`, not blind. |
| Already-issued public download tokens for existing storage objects were not revoked. | P1B | Owner | **Open decision.** Revoking breaks any link already shared. Nothing was changed. |
| `leadRateLimits/*` documents accumulate with no expiry. A native Firestore TTL needs `windowStart` stored as a Timestamp, which requires a `Date` branch in the coordinator-owned `toValue()`. | P1A | Coordinator | Documented in code. Low urgency — the collection is write-only and safe to clear at any time. |
| `LeadStats.totals.allTime` survived as a deprecated alias for two unmigrated readers. | P1A | Coordinator | **Closed.** Both readers migrated; the alias is deleted. |
| `npm install`/`npm uninstall` silently prune optional native bindings (npm/cli#4828), which breaks vitest's rolldown binary and corrupts the lockfile. It bit P1B once. | P1B | Coordinator | Change dependencies by editing `package.json` then reinstalling, and verify `@rolldown/binding-*` entries survive in the lockfile. Verified clean at `56af17f`. |

### Phase 3 findings the review did not anticipate

| Finding | Where | Resolution |
| --- | --- | --- |
| Hero video `<source>` paths were relative (`logos/...`). They resolved only because everything was served from `/`; on any real route they would have 404'd. | `app/page.tsx` | Fixed during extraction. The e2e suite now fails on any response >= 400, which catches the whole class. |
| `/contact` had horizontal overflow at every viewport — `document.body.scrollWidth` was 1884px at 1440px and 720px at 375px — because the booking form's step carousel reported its full unclipped width as the grid item's min-content size. | `app/globals.css`, `/contact` | Fixed with `min-width: 0` on the grid item, scoped by id. `/book`, `/services` and the homepage are untouched. |
| Three brief routes that can render an image were traced with the sharp binaries excluded, and the generator's local logo fallback read from `app-assets`, which the shared exclude list dropped with nothing adding it back. Either would fail only at runtime in a deployed function. | `next.config.ts` | Fixed in `7b9f5af`. |
| `rendererUsed` recorded `'ffmpeg'` whenever ffmpeg was requested, although sharp always ran. The admin UI also still offered the choice. | photo render route, generator controls | Record fixed in `05bc2a6`/`bcbeff6`; the UI control is assigned back to P3A. |
| `public/logos` held 223 MB of untracked source video that `.vercelignore` did not exclude, and the hero `.webm` was gitignored while being served first. | deploy config | Fixed in `15c897e`. |

## Independent review results

Each slice was reviewed by a worker that did not author it, against the plan.

### P1B and P3B — reviewed by Worker A. Verdict: accept with fixes.

| Severity | Finding | State |
| --- | --- | --- |
| High, live | `not-the-rug-brief/services/reddit.js:15` and `weather.js:80` still fall back to a `ScoutCrittersQuest/1.0` user agent. `REDDIT_USER_AGENT` is set nowhere, so a real run identifies itself to Reddit's API under an unrelated project's name — from a file edited in the commit whose message said that inherited content was removed. Coordinator verified independently. | Returned to the author. |
| Moderate | A `pending` send claim has no expiry. A hard kill between the atomic claim and its catch block leaves it pending with no error recorded and no retry, permanently skipping that day's send, with nothing surfacing it. | Returned to the author. |
| Moderate | `storageUploadPrivate` throws correctly if the token-clearing PATCH fails, but leaves the uploaded object in place with its auto-issued download token live. Not an active leak — the function discloses nothing — but there is no remediation. | Returned to the author. |
| Moderate | `LEASE_STALE_MS` is ten minutes while every caller caps at sixty seconds. The guarantee holds only because of those caps, not because the lease self-verifies. | Returned to the author. |
| Moderate | Image validation accepts a buffer whose header decodes cleanly but which may carry appended bytes, and stores it verbatim. | Returned to the author. |
| Moderate | The founder-brief preview rendered "Sent to undefined · email id undefined" when a send was correctly skipped — a success message for a request that sent nothing, and the only signal a human would have had for a stuck claim. | Fixed in `ceb18f9`. |
| Low | A record missing `storagePath` throws a raw TypeError that the delete route's typed catch does not match, producing an unhandled 500 instead of the structured error. Still fails closed. | Returned to the author. |

Confirmed holding under review: the `..` prefix-escape concern is not exploitable, since
Storage object names are a flat namespace and the trailing-slash prefix check rejects a
sibling prefix; the Firebase rules are correct including the reasoning for not granting a
rules-based public read on photos; `isSafeUrl` resists protocol-relative URLs, uppercase
schemes, embedded tabs and newlines, and unicode in the scheme position; the run lease,
per-day send claims, CSP, the 904-line module split and the FFmpeg removal all hold. No
scope drift found.

### P1A and P3A — reviewed by Worker B. Verdict: accept with fixes.

| Severity | Finding | State |
| --- | --- | --- |
| High | The lead idempotency key uses a clock-aligned hour bucket, not a rolling window. An identical retry four seconds later that straddles `:00` creates a second lead and a second round of founder and customer emails. The code comment and the commit message both overstated the guarantee, and no test covered a boundary-straddling retry. | Returned to the author. |
| Moderate | `app/admin/dashboard/brief/page.tsx` and `.../preview/founder-brief/page.tsx` were left out of the R14 session consolidation and still silently bounce a non-admin to `/admin`. Their `getDoc` calls are not wrapped, so a network error leaves the page on its loading state forever — worse than the pages the finding was written about. Neither route is in the e2e admin list either. Server authorization is unaffected; `verifyAdmin` still runs. | Returned to the author. |
| Moderate | `readCappedBody`'s non-streaming branch buffers the whole body before checking the cap, so the "checked again while reading" claim does not hold on that path. Not demonstrated reachable. | Returned to the author. |
| Moderate | The step progress dots let a user jump to the final step without passing earlier validation, and the submit handler ignores the `details` field-error array the route already returns, so the "focus the first invalid field" behavior never fires on that path. Server-side validation still rejects the payload. | Returned to the author. |
| Low | Resend provider error strings are logged verbatim and could embed a recipient address. | Returned to the author. |
| Low | The CSV comment overclaims how every spreadsheet renders a leading apostrophe. The mitigation itself is correct. | Returned to the author. |

Confirmed holding under review: one genuine shared lead contract; select option lists that
cannot drift; a real atomic rate limiter with its fail-open tradeoff honestly documented;
working focus trap, Escape handling and pre-reset submission snapshot; escaped email
templates; CSV quoting that resists field breakout; delete handlers that only remove a row
inside the success branch; both iframes sandboxed without `allow-scripts`. No
authorization bypass, no XSS vector, and no unprompted feature found in either slice.

## Second independent review, September 15

Two reviewers re-examined the critical paths **against the acceptance criteria in the
plan**, not against what the commits claimed. Both found real defects that the first
round of review had missed.

### Booking, retry and idempotency

| Severity | Finding | State |
| --- | --- | --- |
| Moderate | The lead route was the only email-sending route with no duration budget, while running two 8-second-bounded sends in series. A cut-off mid-flight would save the lead but lose the status write and the response, showing the customer an error for an inquiry that saved. | Fixed in `e629768`: sends run concurrently, `maxDuration = 20`. |
| Moderate | The previous-bucket lookback closes the idempotency boundary for a sequential retry, but two genuinely simultaneous requests either side of the hour boundary can each finish their lookback before the other's create commits. | Documented as a known limitation rather than putting a transaction on every booking. The plan's "concurrent retries create one lead" was broader than what the code guarantees. |
| Low | The rate limit is keyed on `x-forwarded-for`, which is only safe because Vercel's edge overwrites it. True, but written down nowhere. | Documented at the point the IP is derived. |

Confirmed holding: the option lists are structurally single-sourced, so the R01 drift
cannot recur; `fsCreateDoc`'s 409-only handling matches Firestore's error model; the body
cap enforces on bytes received regardless of headers; CSV neutralisation survives a
combined formula-and-quote payload without breaking out of its field; notification status
is never upgraded to `sent` unless the provider returned no error.

### Authorization and storage

| Severity | Finding | State |
| --- | --- | --- |
| **High** | Eleven of sixteen admin routes still collapsed every `verifyAdmin` failure into a hardcoded 401 **and returned the internal detail to the client**. The property P1B was supposed to establish — a dependency outage is a 500, not "unauthorized" — held for five routes out of sixteen. | Fixed in `877ac9d`. All sixteen use the typed boundary; every route is now tested for 401/403/500 and for not leaking detail. |
| Moderate | The photo render route passed client-supplied `sourceStoragePath` and `logoStoragePath` straight to `storageDownload`, which uses Admin credentials and bypasses `storage.rules`. Any admin request could read any object in the bucket, including the `private/` prefix. | Fixed in `877ac9d`: both paths asserted under their expected prefixes before any read, validated paths persisted, renderer internals no longer echoed. |
| Low | Cron bearer secrets compared with `===`, which short-circuits at the first differing byte. | Fixed in `877ac9d` with a constant-time comparison. Unset secret was already fail-closed. |
| Low | No test proved the rules catch-all denies an *unlisted* Firestore collection — `notTheRugBriefLeases` and `leadRateLimits` rely on it entirely. | Fixed in `e629768`. |

Confirmed holding: every route handler is gated; `verifyAdmin` itself is correct and
tested; delete derives paths from the stored record and rejects a prefix sibling; the
private-upload failure path deletes the object and does not leak the token; upload cleans
up on metadata failure and reports whether cleanup worked; no code path logs a download
token, a full email address, or a credential.

## Deferred proposals

Ideas raised during the cleanup that are real product decisions, not defects. None of
them ship in this work.

| Proposal | Origin | Why it is deferred |
| --- | --- | --- |
| First-visit welcome modal that asks two qualifying questions and prefills `/book`. | Built unprompted during P2A; removed. | A conversion experiment, not a correctness fix. Shipping it inside this cleanup would make it impossible to attribute any change in booking numbers. The plan defers changes to the qualification questions until there is completion data. The owner decides whether to run it, after launch. |
| Split `app/globals.css` (2,173 lines) into component-scoped modules. | P2A, declined with reasoning. | Several rules are documented as depending on cascade order. A wrong split silently changes the design, which is the one outcome this cleanup must avoid. Needs its own reviewed pass. |
| Delete `components/AnimatedServiceCards.tsx` and its tuning sidebar entirely. | P2A. | Its only consumers are a `{false && ...}` block and the dev playground that 404s in production, so nothing ships. Deleting a disabled experiment the owner may still want is not this cleanup's call. |
| Revoke public download tokens already issued for older brief reports and photos. | P1B, P3B. | Revoking breaks any link already shared. New private artifacts no longer get public tokens; the existing ones are an owner decision. |

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
