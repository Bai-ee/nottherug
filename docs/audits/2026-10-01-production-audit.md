# Not The Rug — production code audit

**Issued:** October 1, 2026. **Baseline:** `905206d6c5e046eee6c42b44b42efd05ad0f1cf8`.
**Scope:** security, performance, reliability, and client handoff quality of the existing application.
**Execution plan:** [Plan 013](../../plans/013-client-handoff-hardening.md).

## Assessment

The application has a solid foundation and passes its normal build and automated checks. It needs targeted hardening before being represented as fully verified for client ownership. The most consequential findings concern lost or misclassified booking state and incomplete continuous verification. A redesign, framework replacement, new database, or general refactor is unnecessary.

No critical exploit or unauthenticated customer-data disclosure was demonstrated. This is a bounded code review with local reproductions and selected live checks, not a penetration-test certification. Production Firebase rules, enabled authentication providers, account ownership, backups, and positive authenticated workflows still require verification.

## Production identity

The audited directory is `/Users/bballi/Documents/Repos/NotTheRug`, remote `https://github.com/Bai-ee/nottherug.git`. The local branch is `copy/home-services-refresh`, but its HEAD matches the production build from `main`.

Vercel resolved `https://nottherug-ten.vercel.app/` to deployment `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1`, URL `https://nottherug-8a9o0ca91-baiees-projects.vercel.app`. Its build log explicitly records `Cloning github.com/Bai-ee/nottherug (Branch: main, Commit: 905206d)`. The build uses Node 24, overriding an older Node 20 project setting. Do not assume the locally named `main` branch is current; use the verified SHA.

Existing untracked `Not The Rug/` and `chino.txt` were excluded and left untouched. No application fix, rule deployment, email, customer submission, or production mutation was performed. Audit reproductions used mocked providers and synthetic data.

## Verification performed

| Check | Result | What it establishes |
| --- | --- | --- |
| Production build | Pass, Next 16.3.5 | Existing installed environment compiles and generates routes. Initial sandbox font-fetch failure was resolved by permitting the configured Google Fonts download. |
| Typecheck | Pass after build | Current generated route types and application types pass. |
| Application lint | 0 errors, 1 warning | Raw image in `SchedulingDialog.tsx:259`. |
| Pipeline lint | 0 errors, 1 warning | Unused `stat` import in `scripts/audit-public-assets.mjs:25`. |
| Existing Vitest suite | 538 passed, 61 skipped | Skips require unavailable Firebase emulators; they are not security passes. |
| Existing Playwright suite | 156 passed, 20 skipped | Desktop Chromium and mobile WebKit on isolated local production server; skips include analytics feature flags and device-specific exclusions. |
| Asset manifest | Pass | Versioned asset manifest verification succeeds. |
| Audit reproductions | 4 passed | Tests deliberately assert the current defects: shared quota, capture race, UTF-8 limit bypass, resume replay/stale write. |
| Live unauthenticated reads | 5 protected endpoints returned 401 | Leads, analytics, photo list, bench people, and latest brief reject missing credentials. Playground returns 404. |
| Live homepage browser samples | No uncaught page errors or horizontal overflow at 375/1440px | Limited sampled states, not exhaustive accessibility or device certification. |
| Dependency advisories | **Not completed** | Automatic approval review blocked sending dependency metadata to npm; explicit approval remains pending. No clean vulnerability result is claimed. |

The local browser server redirected Firestore to an unavailable loopback endpoint and disabled analytics. Form tests use existing request mocks. Passing browser tests therefore do not establish real Firebase persistence, email delivery, Calendly booking, or authenticated admin operations. A fresh `npm ci` was not performed in this audit. [Evidence and reproduction instructions](2026-10-01-evidence/verification.md).

## Findings and minimum remedies

Priority means remediation order, not a CVSS score. **P1** should be resolved before final client acceptance. **P2** is a concrete bounded fix or explicit documented acceptance. **H** is a hardening/verification item whose live risk is not established.

### F01 — P1: email capture consumes the final inquiry quota

**Evidence:** `app/api/leads/capture/route.ts:57` and `app/api/leads/meetgreet/route.ts:101` use the identical `leadRateLimits/<ipHash>_<window>` key. Capture permits eight requests; final submission permits five. A mocked sequence of five successful captures followed by a valid final submission returns 429. This also affects different customers sharing an IP address.

**Likely criticism:** “A legitimate customer can finish the form and be rejected because they interacted with an earlier step.”

**Minimum fix:** Namespace counters by endpoint purpose (`capture`, `meetgreet`), keeping the existing durable counter and TTL design. Preserve a finite limit; do not merely raise it until the test passes. Add a cross-route regression and verify each route still enforces its own limit.

### F02 — P1: capture writes can undo conversion or booking state

**Evidence:** `app/api/leads/capture/route.ts:115–139` reads a snapshot, derives `status` and `bookedSelfReported`, then merges those stale values. A concurrent conversion between read and write leaves `status: partial` alongside `convertedLeadId`. The audit reproduces this ordering. A stale false booking value can likewise overwrite a true value. The separate capture-hint read and conversion in `meetgreet/route.ts` create additional orderings that require tests.

**Impact:** The owner can see an already completed inquiry as outstanding, duplicate apparent leads, or lose a booking hint. This is a data-integrity defect, not a claim that a browser-reported booking is authoritative.

**Minimum fix:** Make conversion and positive booking flags monotonic through a narrow shared server transition helper. Use a Firestore transaction or update-time precondition with bounded retries for conflicting updates. Support a conversion marker when the capture has not arrived yet. Preserve `submittedAt`, `convertedLeadId`, and `convertedAt`; never reset true to false. Test both arrival orders and simultaneous writes using the emulator. Continue labeling bookings as self-reported.

### F03 — P2: resume token is not atomically single-use; saves overwrite concurrent edits

**Evidence:** `app/api/bench/apply/resume/route.ts:56–75` checks the token, uploads, then clears the token through `saveBenchPerson`. `lib/server/bench.ts:49` replaces the entire document. The reproduction makes two requests with the same token pass together and demonstrates loss of an admin note edited while the upload was in progress. Similar whole-record saves exist in the application notification path and bench admin operations.

**Impact:** Duplicate/replaced uploads and lost applicant-management edits. Exploitation requires possession of a valid, unexpired upload token; this is not arbitrary public access to existing resumes.

**Minimum fix:** Validate the file, atomically claim the existing token before storage, and finalize only resume-owned fields. Use an attempt identifier and conditional updates so cleanup cannot unlock another attempt. If a process dies after the claim, preserve the saved application and offer the existing email-resume fallback. Narrow notification/summary updates to their own fields. Test concurrent replay, admin edits during upload, expiry, storage failure, and finalization failure.

### F04 — P2: capture body limit is neither a byte limit nor a streaming cap

**Evidence:** `app/api/leads/capture/route.ts:47–50` buffers the entire request and checks `text.length`. A body over 6 KB containing multibyte text is accepted under a nominal 4,000-byte cap when `Content-Length` is absent. The meet-and-greet and bench JSON handlers already contain byte-counted stream readers.

**Minimum fix:** Reuse a small shared bounded reader, count actual UTF-8 bytes, cancel over-limit streams, and return a safe 413. Test absent/dishonest content length, Unicode, exact boundary, and aborted body reads. Vercel provides a larger platform cap; do not describe this as an unlimited remote-memory exploit on the current host.

### F05 — P1 verification gate: CI can be green without testing the data boundary

**Evidence:** `.github/workflows/ci.yml:19–52` runs Vitest without starting emulators; the rules and round-trip suites explicitly skip when unavailable. The browser job does not set the build-time analytics flags or `E2E_ANALYTICS_ENABLED`. `booking.spec.ts` and `walk-with-us.spec.ts` also skip certain tests if their target route is unavailable. The current 61 unit skips and some browser skips are therefore expected from the configuration, not proof of acceptance.

**Minimum fix:** Add one emulator-backed CI job with a pinned Firebase CLI, compatible Java runtime, demo project, and a mode that fails if required integration suites cannot run. Enable analytics in the dedicated E2E test build and use interception/emulators so tests cannot write production traffic. Make required route outages fail CI. Retain legitimate device-specific skips and report their reasons. Verify required branch checks in GitHub separately; repository YAML does not prove branch protection is enabled.

### F06 — P2: the homepage intentionally delays usable content

**Evidence:** `HomeIntroOverlay.tsx:26` hides the page until the intro releases. `useHomeIntroSequence.ts:109` waits up to 2,500 ms for assets and then **adds** 800 ms; the “floor” is additive rather than concurrent. `useHomeHeroMotion.ts:104` adds a staged entrance before the hero CTA becomes fully visible. Live samples observed hero CTA opacity/visibility reaching its final state at approximately **5.18 seconds mobile / 5.44 seconds desktop**, without CPU or network throttling.

**Minimum fix:** Render the headline and primary action immediately. Keep any decorative entrance independent of font/video readiness and do not hide usable content behind it. If an intro remains, make it brief, dismissible by completion/failure, and honor reduced motion. This is a targeted interaction fix; keep existing visual identity and copy.

### F07 — P2: homepage downloads sizable decorative and below-fold images early

**Evidence:** Live resource samples recorded **3.64 MB mobile / 3.83 MB desktop** of completed resource transfers by the end of the entrance. These are lower bounds and exclude unfinished video transfers. Two paw PNGs account for about 530 KB. Six eagerly fetched team CSS images total about 1.41 MB. The selected hero WebM is a 4.55 MiB source file. Five public font families account for roughly 243 KB transferred in the sample.

Consumers include `components/marketing/HomePawWalk.tsx:42`, `components/marketing/TeamScroller.tsx`, `lib/content/team.ts:25`, `components/marketing/HomeHero.tsx`, and `app/layout.tsx`.

**Minimum fix:** Generate appropriately sized transparent WebP paw derivatives and responsive team derivatives; preserve the existing crops. Lazy-load below-fold portraits through image elements or a small visibility boundary. Use the poster on constrained/reduced-motion clients, and load a smaller mobile video only when appropriate. Audit fonts by actual use before changing them. Do not delete large local source assets simply because a file-size listing finds them; several are already excluded from deployment.

### F08 — P2: legacy query handling makes the marketing homepage dynamic

**Evidence:** `app/(marketing)/page.tsx:27` awaits `searchParams` to resolve old links. The build classifies `/` as dynamic, and the live response is `private, no-cache, no-store` with an edge cache miss.

**Minimum fix:** Move the existing allowlisted legacy redirects into `proxy.ts` (or equivalent supported redirect configuration), respecting launch-mode and preview-indexing behavior, and render the ordinary homepage statically. Preserve duplicate-parameter precedence and hash destinations. Verify `?welcome=1`, campaign parameters, and client navigation still work. Do not cache booking submissions, authenticated responses, or live application settings to obtain a better cache score.

### F09 — P2: live sitemap/robots URLs are malformed and include retired pages

**Evidence:** The live robots file advertises `https://nottherug-ten.vercel.app//sitemap.xml`; every sitemap location has a double slash after the host. `lib/content/site.ts:7` accepts a trailing slash and URL builders concatenate paths. `PUBLIC_ROUTES` still lists `/services` and `/how-it-works`, both now redirecting to home anchors. The application page is linked in the navigation but the old exclusion rationale still says otherwise.

**Minimum fix:** Normalize and validate the configured base URL once; build URLs with URL semantics. Remove redirected routes from the sitemap. Explicitly record the owner's intended indexing policy for `/walk-with-us` and preserve the current intentional `/contact` exclusion. Test base URLs with and without trailing slashes and all sitemap destinations. Do not switch the canonical hostname without a domain decision.

### F10 — P2: partial analytics failures can be presented as genuine zero activity

**Evidence:** `lib/analytics/report.ts:668–695` catches all four dependencies, but only leads/events update the degraded state. A failed live query becomes zero visits; a failed earliest-event query becomes a null tracking start. The rest of the response can still say `ok`.

**Minimum fix:** Represent unavailable live/start-date dependencies explicitly and show “unavailable” rather than fabricated zero/no-history states. Keep successful sections usable. Add a test for each independently failing query. Do not build rollups, a warehouse, or a replacement analytics service for this small site.

### F11 — P2: core outbound data calls lack application-level deadlines

**Evidence:** The fetch calls in `lib/server/firestoreRest.ts` and `lib/server/firebaseStorage.ts` do not set an abort signal or timeout. Routes declare finite execution budgets, but one stalled dependency can consume the budget before fallback/error handling runs. A fail-open rate limiter only fails open once the underlying request actually fails.

**Minimum fix:** Apply bounded, cancellable request deadlines appropriate to the calling route and leave time for persistence/error reporting. Distinguish timeout from denial; do not blindly retry non-idempotent email or storage operations. Add stalled-fetch tests and verify legitimate uploads under the chosen limit. Keep lead persistence successful even when notification delivery fails, as the current design intends.

## Hardening and operational acceptance

These should be addressed in the plan without overstating current exposure:

- **H01 — identity guarantees:** `verifyAdmin.ts:23–35` validates the token and email whitelist but does not require `email_verified` or request revocation checking. Verify enabled providers and actual owner claims, require verified email, and test revoked/disabled users. Google-only login reduces the unverified-email concern; enabled providers were not inspected. Whitelist removal already provides an immediate server-side denial path.
- **H02 — sensitive response caching:** Make successful private admin data responses explicitly `Cache-Control: private, no-store` and test them with synthetic authenticated fixtures. Existing missing-token responses carry Vercel's public revalidation header; this observation does **not** demonstrate cached private data.
- **H03 — production ownership:** Verify deployed rules match the versioned default-deny rules; verify TTL for `analytics_events`, `analyticsRateLimits`, `leadRateLimits`, and `benchRateLimits`; record backups, restore steps, owner access, admin removal, verified email sender, failed-notification triage, cost alerts, and retention/deletion ownership for leads and resumes. No bulk deletion or policy change is authorized by this report.
- **H04 — dependency advisories:** Complete an approved registry scan, classify runtime versus development exposure, and address applicable high/critical advisories with minimal compatible upgrades. Do not run `npm audit fix --force` or infer vulnerability status from version age.

A global CSP is absent but already documented as deferred for Firebase/Calendly compatibility. Treat a tested report-only CSP as a later hardening option, not an emergency patch. Resume signature checks are not malware scanning; the client should not be promised that guarantee. The brief-generation duration gate is already documented and generation is unscheduled; keep it disabled until an authorized paid run measures it.

## Controls worth preserving

The checked API handlers use server-side admin authorization, separate 401/403/service errors, and safe client error text. Firestore/Storage source rules default to deny; resumes use private storage. Lead fields and analytics events are allowlisted, lead creation is idempotent, email failure does not invalidate a saved lead, CSV export has formula defenses, image uploads are decoded/re-encoded with pixel limits, Calendly messages verify their origin/source, and cron secrets use constant-time comparison. Live responses include HSTS, MIME protection, frame protection, referrer policy, and permissions policy. These are meaningful safeguards.

## Handoff quality and scope limits

The repository contains useful operational documentation but competing historical “current” plans and stale descriptions. The README still references removed service pages and an older production-readiness plan; copy review tooling still requires a code deploy despite its heading. Promote one current operations entry point and mark historical plans as history. Large files (4,473-line CSS, 1,430-line welcome modal) increase review cost, but their size alone does not justify splitting them during stabilization. Limit extraction to shared request/state helpers needed by these findings.

A code-proficient client is most likely to challenge: deterministic booking behavior under retries, skipped security tests, production configuration evidence, the delayed hero CTA, malformed SEO output, and whether “zero” dashboard values are trustworthy. Plan 013 supplies bounded fixes, acceptance evidence, and an approval gate for each phase. No phase is pre-approved by this audit.
