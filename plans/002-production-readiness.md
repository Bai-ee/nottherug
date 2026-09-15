# Production readiness and code cleanup

Reviewed September 14, 2026. Base commit: `114dd85` plus the current working tree.

**Recommendation: hold production launch until the release gates below pass.** Fix the booking flow first, then simplify the application in small, reviewable changes. Keep Next.js, Firebase, Resend, and the existing visual design. This is a cleanup of one small business application, not a platform rewrite.

Execution status lives in [the tracker](002-production-tracker.md). Give Claude [the handoff prompt](002-claude-handoff.md) with this repository.

## Review scope and evidence

Inspected public pages, intake, admin authentication and APIs, media processing, daily brief generation, email, Firebase helpers, build configuration, content tools, and existing strategy documents. No production requests, database writes, emails, or paid model calls were made.

| Check | Result |
| --- | --- |
| `npm run lint` | Failed: 57 errors, 165 warnings. It also scans local `.claude` tooling. |
| ESLint scoped to `app components lib proxy.ts next.config.ts eslint.config.mjs` | Failed: 57 errors, 30 warnings. 54 errors are in `app/page.tsx`; the other three are in the service-card component and playground. |
| `npx tsc --noEmit --incremental false` | Passed against the current local dependencies and generated types. |
| `npm run build` | Failed fetching Google Fonts. This environment did not establish a successful production build; it does not prove Vercel will fail for the same reason. |
| Isolated execution of the real lead handler with mocked imports | Current form payload returns 400: `Missing: spayNeuter, dogSocial, strangerSocial`. JSON `null` and numeric `notes` cause unhandled exceptions. Zero database writes or external calls. |
| Runtime | Local Node 24.7.0; project requests Node 20.x. Installed Next.js 16.2.2 and Sharp 0.34.5. |
| Existing verification | No application test suite, CI workflow, or versioned Firebase rules found. |

Live Firebase rules, Vercel settings and function artifacts, email delivery, Calendly configuration, browser behavior, dependency audit results, and current business claims remain unverified. A type check is not evidence that booking works.

Preserve these pre-existing changes: modified `next.config.ts`; untracked `.vercelignore`, `docs/copy/`, and `scripts/`. Include the intended changes in the execution baseline before creating worker branches. Do not reset, overwrite, or silently omit them.

## Findings, ordered by impact

P1 means fix before exposing the affected feature in production. P2 means required cleanup or a bounded operational limitation. These are review priorities, not claims that every risk has been exploited.

| ID | Priority | Finding and evidence | Required outcome |
| --- | --- | --- | --- |
| R01 | P1 | `components/MeetGreetForm.tsx:115` submits a different schema from `app/api/leads/meetgreet/route.ts:42`. Three required fields are absent; new reactivity, allergy, and phone-consultation fields are discarded. | One validated contract used by intake, persistence, email, admin display, and export. Preserve historical lead readability. |
| R02 | P1 | `app/page.tsx:1405` only alerts that booking would connect to Time To Pet. At line 1436, another button says “Message sent!” without submitting anything. These are in the services page, not a disabled homepage block. | Remove the mock forms and route users to real intake or the verified contact method. No false success states. |
| R03 | P1 | `package.json` pins Next.js 16.2.2, within the affected range of the August AVIF advisory, and Node 20.x. Actual exploitability depends on image inputs and hosting. The application also invokes Sharp directly. | Update to a currently patched compatible Next/React/Sharp set and Node 24; inspect direct image decoding separately. Recheck advisories at execution time. |
| R04 | P1 | `app/api/leads/meetgreet/route.ts:34–75` assumes object-shaped JSON, leaves optional types unchecked, and has no application-level size bounds or abuse control. Each accepted request writes a lead and can email an arbitrary supplied address. | Reject malformed input predictably; constrain fields and body size; add persistent rate limiting and a low-friction bot check. Validate all public input on the server. |
| R05 | P1 | The lead is saved before two sequential email calls (`route.ts:78–130`), but delivery failures only enter logs. A timeout followed by resubmission can create another lead. | Stable submission idempotency; saved notification status; bounded email calls; safe retry per recipient without re-creating the lead. |
| R06 | P1 | `proxy.ts:18` uses a permanent 308 for a temporary launch restriction. `app/contact/page.tsx:25` is always noindex. Root metadata describes booking, and no robots/sitemap files were found. | Explicit preview/live indexing policy; temporary launch redirect; valid sitemap, robots, canonicals, and page metadata. |
| R07 | P1 verification | Server routes use `verifyAdmin`, which is a useful existing boundary. Client pages also read `admins/{email}` directly. Firebase rules are absent from the repository, so whitelist write protection and direct data access cannot be verified. | Version and test rules; deny public lead reads and admin self-enrollment; distinguish unauthenticated, forbidden, and service failure responses. |
| R08 | P1 for media | Photo upload trusts MIME type, buffers the file without an app limit, and can leave objects after metadata failure. Delete accepts a client-supplied storage path, swallows object deletion errors, then deletes metadata. Both UIs hide rows without checking the response. See `app/api/admin/photos/{upload,delete}/route.ts`, photos page line 329, generator page line 1160. | Enforce supported formats, bytes and pixels; derive object paths from stored records; handle partial failures and thumbnails; display truthful results. |
| R09 | P1 for private data | `lib/server/firebaseStorage.ts:67–78` logs upload responses and permanent token-bearing download URLs. Private brief HTML uses the same public-link upload helper (`lib/not-the-rug-brief/server.ts:599`). | Redact logs and keep private briefs behind authenticated reads. Separate private artifacts from intentionally shareable marketing images. |
| R10 | P1 for brief preview | `app/admin/dashboard/brief/page.tsx:501` uses unsandboxed `srcDoc`. Reporter HTML escapes text but places source URLs in links without checking their scheme (`not-the-rug-brief/reporter.js:640`, 783). | Sandbox previews, allow only safe link protocols, and apply an appropriate CSP to HTML responses. Existing escaping is useful; do not claim raw text is wholly unescaped. |
| R11 | P1 for brief operation | Brief routes declare 60-second limits but run multiple remote stages; local Python research is also optional. Persistence failures are swallowed (`lib/not-the-rug-brief/server.ts:773–790`). The only checked-in cron generates a brief; the two email cron handlers are not scheduled in `vercel.json`. | Define one deliberate schedule and delivery path; bound stages, persist outcomes, prevent duplicate runs/sends, and label stale or incomplete data. Verify hosting settings rather than relying on old comments. |
| R12 | P1 for packaging | `next.config.ts` manually lists a large dependency tree and excludes Sharp for brief routes, while `lib/not-the-rug-brief/server.ts` imports the Sharp generator and attempts image generation. Local fallback logos live in excluded `app-assets/`. | Prove deployed dependencies and assets exist; split read/email operations from generation; replace broad tracing workarounds with measured, narrow rules. Runtime failure is a risk here, not a reproduced deployment result. |
| R13 | P2 | `app/page.tsx` is 2,317 lines, mixing nine virtual pages, global `window` functions, DOM mutation, and animation. `showPage` does not update browser history; the large async effect has no outer cleanup. It globally kills ScrollTriggers. | Real routes, ordinary links, small client interaction boundaries, and cleanup owned by each animation component. |
| R14 | P2 | Admin dashboard is 1,668 lines, generator 1,677, service cards 1,256, form 583, and global CSS 2,173. Auth and request handling repeat across admin pages; some auth callbacks lack failure handling. | Thin page composition, feature components, a shared admin session boundary and request helper, and scoped styles. |
| R15 | P1/P2 | Form labels lack associations and steps have no validation. Calendly has dialog semantics but no focus management or Escape handling. `setPhoneConsult(false)` at line 144 means later success UI forgets the submitted choice. | Accessible fields, step validation, preserved submission summary, and a keyboard-usable scheduling dialog. |
| R16 | P2 | Public “Tune Paws” control at `app/page.tsx:2302`; public playground route; disabled experiments in `{false && (...)}`. Eight font families load at root. `public/` is 276 MB on disk, which is not the same as transferred page weight. | Remove production tuning UI; keep experiments explicitly outside the launch surface; measure and reduce actual font/image costs. |
| R17 | P2 | CSV escaping only covers commas/quotes/newlines (`app/admin/dashboard/leads/page.tsx:103`); submitted formula-like values remain executable in spreadsheet software. `getLeadStats` labels a maximum 1,000 records “allTime”; lead listing caps at 500 without a cursor. | Spreadsheet-safe export; truthful bounded totals or aggregation; pagination where needed; date-boundary tests. |
| R18 | P2 | Strategy docs describe both Calendly intake and future Time To Pet integration. Coverage and credentials need reconciliation; placeholder Instagram URLs remain. No conversion instrumentation found in application code. Copy tooling relies on source file locations and line ranges. | One launch funnel, approved facts, measurable intake events, and a copy workflow that survives file extraction. |

### Current platform references

- The [August Next.js release](https://nextjs.org/blog/august-2026-security-release) identifies 16.3.3 as its patched 16.x release. Check for newer fixes before installing. [The advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) describes the AVIF input condition. Patching Next does not by itself establish safety of separate Sharp calls.
- [Vercel's Node 20 notice](https://vercel.com/changelog/node-js-20-is-being-deprecated) sets October 1, 2026 as the cutoff for new deployments; existing deployments are treated differently.
- [Function limits](https://vercel.com/docs/functions/limitations) document a 4.5 MB request limit and different duration limits by configuration. The repository's comment that Hobby always caps at 60 seconds is outdated; the explicit 60-second route setting still matters.

## Target structure

Keep one Next.js application. Keep existing domain names under `lib/`; do not move the entire repository into `src/` or introduce a monorepo. Use native React state, CSS Modules, and small explicit functions.

```text
app/
  (marketing)/
    layout.tsx
    page.tsx
    services/page.tsx
    how-it-works/page.tsx
    about/page.tsx
    safety/page.tsx
    neighborhoods/williamsburg/page.tsx
    reviews/page.tsx
    book/page.tsx
    contact/page.tsx
  admin/                         # pages compose feature components
  api/                           # parse, authorize, call service, respond
  robots.ts
  sitemap.ts
components/
  marketing/                    # nav, footer, homepage sections, motion
  booking/                      # form, steps, scheduling dialog
  admin/                        # shell, session, leads, photos, generator, brief
  ui/                           # only genuinely shared small controls
lib/
  content/                      # approved services, contact details, coverage
  leads/                        # contract, validation, submission, stats, CSV
  photos/                       # validation, storage lifecycle, types
  generator/                    # rendering and geometry
  not-the-rug-brief/             # types, reads, persistence, orchestration
  server/                       # auth, config, Firebase adapters, request errors
  email/                        # templates and delivery
not-the-rug-brief/               # retain CommonJS pipeline initially
tests/                          # focused regression and browser tests
```

Rules for readability:

- Components should represent something a developer can name: `ServiceList`, `BookingSteps`, `PhotoLibrary`. Do not extract every wrapper or invent a generic form/page framework.
- Route files should mostly compose or delegate. About 200–300 lines is a review signal, not an enforced quota. Larger cohesive modules need a reason.
- Keep server imports out of shared contracts and client components. Validate `unknown` at boundaries; use typed objects internally.
- Keep global CSS for reset, tokens, fonts, and shared layout foundations. Move feature rules with their components without redesigning them.
- Comments explain a non-obvious constraint or decision. Delete narration, section banners, obsolete claims, and implementation diaries. Do not remove useful failure-handling explanations merely to hit a comment count.
- Avoid blanket lint/type suppression, empty catches, unexplained fallbacks, and misleading success responses. Do not rewrite the CommonJS pipeline to TypeScript solely for consistency.

## Phased execution

Use one coordinator and up to three Sonnet workers. The coordinator alone edits shared configuration and the tracker. A worker owns a complete vertical slice, including its regression tests. Worktree branches are preferred; seed them from a baseline containing the user's intended uncommitted work.

### Phase 0 — Establish the baseline

**P0 — Coordinator: baseline, contracts, and launch decisions.**

1. Preserve the working tree and record the exact integration commit. Read `PRODUCT.md`, this plan, and `docs/copy/README.md`; do not execute stale strategy documents as new feature requirements.
2. Record screenshots and working URLs before moving files, including `/?page=services`, `/?hood=williamsburg`, `/contact`, `/book`, and admin tools. List disabled sections separately so extraction does not accidentally publish them.
3. Record the canonical route map, lead schema, feature ownership, and defaults below. Request only missing business facts; continue independent engineering while waiting.
4. Add a small test harness: Vitest for validation/services with mocked dependencies and Playwright for critical browser paths. Tests must not send real emails or invoke paid generation by default.
5. Give each worker explicit paths and a task ID. Shared-file requests go to the coordinator rather than simultaneous edits.

**Gate:** baseline captured; ownership agreed; test commands run; external checks marked pending, not passed.

### Phase 1 — Repair the launch blockers

**P1A — Worker A: intake contract and delivery.** Own `components/MeetGreetForm.tsx`, new `components/booking/**`, `lib/leads/**`, `lib/email/templates.ts`, `lib/email/resend.ts`, and the lead API. Depends on P0. Resolves R01, R04, R05, R15 and prepares R17.

- Define the current form contract, including reactivity, allergies, and phone preference. Do not add fictitious defaults for removed survey answers. Preserve old optional fields when reading existing records; use a versioned additive schema for new submissions.
- Validate object shape, strings, email, option values, boolean preference, maximum lengths, and body bytes. Return 400/413/429 consistently. Add honeypot and a durable, atomic rate limit using existing Firebase capabilities; an in-memory map alone is insufficient on serverless instances.
- Use a stable submission key for retries, bound to the request content. Concurrent retries create one lead. Persist independent founder/customer notification outcomes; use provider idempotency where supported. A saved lead remains a success even if notification delivery needs retry. Preserve a safe retry path that does not duplicate delivery.
- Split steps and dialog from form orchestration. Add label associations, autocomplete, inline validation, focus on the invalid field, status announcements, and Enter submission. Trap/restore dialog focus and handle Escape.
- Preserve submitted phone preference separately from cleared draft state. Never equate opening Calendly with a completed appointment. Missing Calendly configuration still allows intake and an honest next-step message.
- Provide a shared safe CSV serializer and lead display contract for the later admin worker.

**Acceptance:** regression tests cover today's payload, malformed JSON, `null`, wrong types, oversized content, invalid enum/email, concurrent repeat submissions, Firebase failure, either email failing, and successful retry. Browser tests cover both phone and scheduling branches. New fields appear in stored records and both intended downstream views/templates.

**P1B — Worker B: safe admin and storage boundaries.** Own `lib/server/**`, `lib/firebase-admin.ts`, `lib/firebase.ts`, Firebase rules/config, `app/api/admin/photos/**`, and `lib/photos/**`. Depends on P0. Resolves R07–R09 and server validation in R08.

- Retain server verification on every protected route. Add typed auth/service errors and sanitized responses. Verify token policy and whitelist lookup; do not replace server authorization with a client context.
- Add environment validation without printing values. Keep optional pipeline configuration separate from required booking configuration. Explain missing configuration at the feature boundary.
- Version Firestore and Storage rules and test with the emulator: public cannot read leads, write admin membership, or access private artifacts; permitted admin access works. Audit actual deployed rules as a separate release check.
- Validate media by supported decoded format, file size and pixel limits. For launch, accept bounded JPEG/PNG/WebP below the function payload ceiling with a clear client limit; large direct-to-storage uploads can wait unless required by the owner.
- Delete by collection and record ID; derive approved storage paths on the server. Handle thumbnails and dependent renders deliberately. Return failure/pending cleanup if object deletion fails; do not erase the only retry metadata. Clean up uploads when metadata persistence fails.
- Remove token-bearing logging. Add distinct private artifact storage and authenticated download behavior. Keep public image sharing only where intended; assess already-issued private artifact tokens before any revocation.
- Export the small auth/error/request conventions that remaining route owners will adopt. Do not edit their routes concurrently.

**Acceptance:** unauthorized and non-admin requests cause no reads of private content or writes; malformed IDs/paths and oversized/unsupported images fail safely; storage and metadata failure tests preserve retryability; logs contain no download tokens. Production rules are a pending gate until inspected.

**P1C — Coordinator: supported build and quality checks.** Own `package*.json`, runtime pins, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.vercelignore`, `.gitignore`, test configuration, and CI. Depends on P0. Resolves R03 and begins R12/R16.

- Verify current advisories, update compatible Next/React/Sharp dependencies, align `eslint-config-next`, and select Node 24 across local and deploy configuration. Inspect lockfile changes and run an actual dependency audit; do not use blind force-fixes.
- Check Sharp's direct decoder dependencies and reject unsupported AVIF inputs until a verified safe path exists.
- Exclude local agent/tool caches and generated output from application lint, while adding a separate lint command for the retained CommonJS brief pipeline and owned copy scripts. Do not hide errors in shipped code.
- Add `typecheck`, `test`, `test:e2e`, and `check` scripts and CI. Build/type checks should generate fresh Next route types in a clean checkout. Configure tests and previews to use fixtures/emulators and test recipients.
- Record, then reduce trace exceptions only with artifact evidence. Do not delete the user's existing tracing fixes on the assumption that they are unnecessary.

**Gate:** P1A/B regression checks pass; supported dependencies are installed reproducibly; source lint debt remains assigned to the structural tasks, with no newly introduced suppressions.

### Phase 2 — Separate the public site

**P2A — Worker C: public routing, content, styles, and motion.** Own public route files, `app/page.tsx`, `app/globals.css`, `app/page.module.css`, `components/SiteNav.tsx`, `components/AnimatedServiceCards.tsx`, new marketing components/content, `scripts/copy/**`, and associated copy inventory. Start after P1A is merged; do not modify booking internals. Resolves R02, R13, R16, and part of R18.

- Extract the existing active pages into the route map above. Route grouping must preserve `/book` and `/contact`. Keep home, services, story, trust, reviews, and Williamsburg content; do not add neighborhood pages merely because an old plan names them.
- Replace `window.showPage`, `showNeighborhood`, inline HTML injection, and hash placeholders with links and React composition. Maintain an explicit compatibility map for old `?page=` and `?hood=` links, including `page=book` and `page=contact`. Use actual browser navigation and direct-loadable URLs.
- Replace mock booking/contact tabs with the real booking path and verified contact links. The coordinator uses `/book` as canonical intake; `/contact` retains useful contact information and the same shared form if needed.
- Extract a shared nav/footer and reusable sections. Move approved service prices, contact information, and coverage to typed content data. Preserve visible copy and section order during extraction; record disputed claims for P4.
- Move GSAP code into component-owned hooks or wrappers with refs and scoped contexts. Cancel delayed initialization, remove listeners/timers, revert owned timelines, and leave other components' triggers intact. Respect reduced motion and show usable content if animation fails to load.
- Remove Tune Paws and production tuning state. Keep disabled concepts archived or in a development-only playground that returns 404 in production. Do not re-enable the currently disabled card carousel.
- Move styles gradually with components. Update the copy extraction/apply workflow for new file paths and content modules; preserve stale-edit checks and safe escaping. Regenerate inventory and prove a dry-run copy edit still targets the right content.

**Acceptance:** all mapped URLs load directly; refresh/back/forward work; navigation and core content remain usable without animation; CTA links reach working intake; no fake success alerts or tuning controls ship. Desktop/mobile screenshots match the baseline except listed fixes. Copy extraction round trip and stale-edit rejection pass.

### Phase 3 — Separate admin features and make operations reliable

Run the following two slices concurrently after their dependencies merge. Worker A owns admin UI; Worker B owns brief/generator services. Coordinator handles shared build/cron adjustments.

**P3A — Worker A: shared admin shell and feature components.** Own `app/admin/**/page.tsx`, `app/admin/layout.tsx`, `components/admin/**`, `app/admin/leads/route.ts`, and lead stats/export refinements. Depends on P1A/B. Resolves R14, R17, client side of R08, preview side of R10.

- Add one session provider and admin shell with loading, denied, expired-session, network-error, retry, and sign-out states. Client session UI supplements server authorization.
- Add a small authenticated request helper with status checks and cancellation. Remove duplicate token/auth logic from each page; avoid introducing a state-management framework.
- Extract dashboard summary/history, brief preview, lead table/filter/export, photo library/upload, and generator editor/preview/export. Keep specialized geometry in `lib/generator`.
- Await successful deletion before removing rows, or use an explicit optimistic rollback. Display backend cleanup failures and allow retry.
- Use the shared lead contract, include new survey/preference fields, and keep historical records readable. Add cursor pagination to the listing or make bounded results explicit; replace the false “all time” total with a real count or clearly named recent-record total. Test New York date boundaries and DST.
- Use a sandboxed brief preview without scripts/same-origin privileges. Permit only the minimal link behavior needed.

**Acceptance:** thin page files and shared auth flow; denied/expired/network cases never hang; deletion failures remain visible; new and historical leads display/export correctly; spreadsheet formulas are neutralized without losing readable phone values; preview cannot execute fixture script content.

**P3B — Worker B: brief orchestration, media rendering, and persistence.** Own `lib/not-the-rug-brief/**`, `not-the-rug-brief/**`, `lib/generator/**`, `lib/media/**`, generator API routes, admin non-page brief/email routes, cron route handlers, and brief/digest email templates. Depends on P1B/C. Resolves R10–R12 and rendering aspects of R08/R18.

- Split brief types, persisted reads, report loading, and run orchestration. Read-only and email routes must not import image rendering or the full generation pipeline.
- Preserve the existing working CommonJS pipeline. Put local Python research behind a capability check; report unavailable sources and stale timestamps. Do not call absent research “complete.” Remove unrelated inherited game/crypto assumptions only after checking their actual use.
- Add bounded provider timeouts/retries, run IDs, an atomic shared lease, and per-run temporary directories. Parallel invocations must not overwrite the same `latest` files or double-spend on generation. Publish latest state only after successful persistence; report partial failures explicitly and retain last good state.
- Define generation and notification as separate operations with persisted status and per-day/per-recipient idempotency. Coordinator records one intended schedule; a generation-only cron must not be described as a daily email delivery system. Do not schedule both digests unless the owner wants both.
- Default to the existing Vercel job only if measured duration fits verified hosting limits with margin. Configure a supported duration explicitly. If it does not fit, leave scheduled generation disabled with a clear admin state and document the smallest worker option; this requires an explicit scope decision, not a silent “done.” Avoid adding a queue merely to tidy code.
- Validate generator request fields and finite placement values. Derive paths from records, include required logo assets, and use a deliberate fallback when no source photo exists. Use Sharp as the production renderer; remove the unsupported FFmpeg choice and record the actual renderer used.
- Allow only HTTP(S) source links in generated HTML/email and sandbox direct HTML responses. Read private reports through authorization rather than permanent public URLs.

**Acceptance:** fixture pipeline succeeds and persists; timeouts, missing optional source, failed artifact upload, failed database save, duplicate trigger, and duplicate send produce truthful states. Generated logos render without dependence on local-only paths. Read-only deployment bundles exclude generation code. Live timed run remains a separate controlled release check.

**P3C — Coordinator: verify packaged functions.** Depends on P3B and P1C. Own shared configuration.

- Inspect built function traces and deployed preview behavior for lead intake, protected list/read, photo upload/render/delete, generator, brief read, generation, and email. Record size and required assets per affected function.
- Replace handwritten transitive dependency inventories where normal tracing works. Keep only demonstrated includes/excludes; do not optimize to a speculative byte target.
- Confirm `.vercelignore` excludes local tooling/raw artifacts without removing runtime assets. Verify deployment from a clean checkout with no local caches.

**Gate:** admin workflows and pipeline regression checks pass; hosting-dependent checks have recorded evidence or a visible blocker. Retained features cannot be marked complete just because their navigation was hidden.

### Phase 4 — Align launch strategy and public quality

**P4 — Worker C, with coordinator-owned launch configuration.** Depends on P2A; business inputs can be gathered earlier. Own marketing content/metadata, robots/sitemap, performance fixes, and documentation. Coordinator owns `proxy.ts`, `app/layout.tsx`, deployment environment and shared dependency edits. Resolves R06, R16, R18.

- Keep one acquisition goal: a qualified meet-and-greet or phone consultation. Use `/book` consistently. Keep Time To Pet as a future/existing-client integration only if a working URL is supplied; do not build payments, subscriptions, a CMS, or a new CRM in this cleanup.
- Produce a short owner-review table for pricing/tax wording, coverage, phone/email, certifications versus membership, insurance/background checks, review attribution, real photos, and the two-hour response promise. Reconcile `PRODUCT.md`, active copy, and current owner answers. Do not restore fictional testimonials from older docs.
- Preserve the form while engineering is underway. Propose reducing optional qualification questions later, based on completion data; do not launch a new experiment during a regression fix. Stop inviting door/access codes in a public lead form; document the actual handling of submitted contact/pet data in plain language.
- Record anonymous CTA click, form start, lead saved, and scheduling-open events. Track appointment completion only through a verified provider event or integration; filter iframe messages by expected origin. Never send names, notes, phone numbers, or email addresses in analytics.
- Implement the live/preview/launch-mode route matrix: preview noindex; live public routes indexable; admin/playground noindex or unavailable; temporary launch redirect; valid canonicals and public-only sitemap. Preserve assets needed by the launch page, including textures.
- Trim unused font families and repeated Google Font imports. Measure before converting images; optimize large above-the-fold assets and reserve their dimensions. Check 375px, 768px, and 1440px layouts, keyboard access, reduced motion, mobile menu, and scheduling iframe.
- Update README with setup, env names/examples, module map, test commands, deployment, and operations. Mark historical docs as historical and update `PRODUCT.md` to the accepted launch scope. Keep the existing copy-review tool working.

**Acceptance:** approved facts or explicitly unresolved owner items; no placeholder destinations; accurate booking claims; correct indexing/redirects in each mode; analytics proves events without personal data. New developers can find a service price, booking validation, email template, and admin authorization from the README.

### Phase 5 — Review and release

**P5A — Coordinator and reviewing worker: independent integration review.** Depends on every implementation task.

- Run clean install, scoped lint and pipeline/script lint, fresh type generation, typecheck, unit/integration tests, production build, and browser tests on the same candidate commit.
- Use fixtures/emulators for failure cases. In a controlled preview using test credentials, verify a saved lead, admin retrieval, email delivery to approved test recipients, and Calendly handoff. No bulk live test submissions or accidental paid brief loops.
- Verify unauthorized access and deployed Firebase rules, native Sharp rendering, logo assets, cron auth, private report access, and one timed brief run if it remains enabled. Check logs for secrets and misleading success messages.
- Review the combined diff for dead imports/files, stale docs, comments that narrate code, duplicate data, broad lint ignores, accidental design changes, and over-generalized abstractions. A second worker reviews each slice, including its tests.
- Record viewport screenshots, commands/results, commit, preview URL, pending decisions, and rollback steps in the tracker. No arbitrary coverage percentage or perfection target; all critical behaviors below must pass.

**P5B — Coordinator: release handoff and production verification.** Depends on P5A and production authorization.

- Prepare the exact release candidate, environment checklist, cron settings, Firebase rule diff, and rollback deployment before requesting final go-live authorization. Never infer deployment authorization from this review request.
- After authorization, deploy the reviewed commit, confirm domains/HTTPS/redirects/indexing and the live intake path using an agreed test identity, verify founder delivery, then observe errors and failed notifications.
- Roll back if intake cannot persist, protected data is accessible, critical routes fail, or image processing crashes. Pause failing cron work independently. Preserve new lead records; schema changes must be additive so rollback remains possible.
- Name the person responsible for failed leads/email retries and weekly dependency/backup checks. Monitor for 24–48 hours through the agreed operational system; do not mark that observation complete before it happens.

## Business decisions and defaults

| Decision | Working default | Who closes it |
| --- | --- | --- |
| New-client funnel | `/book` → saved inquiry → optional Calendly; phone preference skips scheduling. `/contact` remains useful. | Coordinator implements; owner confirms wording. |
| Existing-client platform | No new Time To Pet integration; use a verified destination only if provided. | Owner supplies URL or accepts omission. |
| Service area, pricing, credentials | Preserve current active copy during extraction; flag inconsistencies before launch. Do not fabricate facts. | Owner approves the prepared facts table. |
| Brief tools | Retain and fix; disable scheduling until its gates pass. No new worker platform by default. | Coordinator measures; owner decides only if additional hosting is required. |
| Brief email | Prefer one founder digest after a successful generation; do not enable both existing email handlers by default. | Owner confirms cadence/recipient using existing configuration. |
| Public/private artifacts | Marketing exports may be shareable; lead data and internal brief reports require authorization. | Coordinator implements; owner confirms any broader sharing. |
| Production push | Prepare candidate and all evidence; release after explicit go-live instruction. | Owner. |

## Launch gates

- [ ] Intake works from every public CTA; no fake forms or success alerts remain.
- [ ] Lead schema is consistent across form, API, Firestore, email, admin, and CSV; historical records work.
- [ ] Duplicate requests and email retries do not create duplicate leads or notifications.
- [ ] Public input and media boundaries reject invalid/oversized requests safely.
- [ ] Admin access, Firebase rules, private reports, and token-free logging are verified.
- [ ] Supported runtime/dependencies and a clean production build are proven on the release candidate.
- [ ] Packaged media and retained brief functions work in preview; cron schedule, duration, failure state and send semantics are verified.
- [ ] Routes, navigation, responsive layout, keyboard interaction, reduced motion, metadata, and live indexing pass.
- [ ] Business facts and contact destinations are approved; analytics distinguishes inquiries from completed appointments.
- [ ] Code is organized by feature, lint passes, tests cover the failures above, and onboarding/rollback instructions are usable.
- [ ] Release authorization and post-deploy evidence are recorded separately from implementation completion.

## Keep out of this project

New branding, additional neighborhood campaigns, payments, a CMS, subscriptions, broad dependency replacement, microservices, a generalized component framework, and a complete AI-pipeline rewrite. Revisit these only after the launch funnel is working and measured. Existing safety, correctness, and private-data issues are not optional polish.
