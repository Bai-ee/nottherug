# Plan 014 — Web award master plan (extended: stabilize first)

**Status:** planned 2026-10-12; no phase approved or started.
**Source brief:** `NotTheRug-013/Not The Rug — Web Award Plan.md` (Oct 12, 2026). This plan supersedes it for execution order; the brief stays the reference for award research, fees and criteria.
**Baseline:** `origin/main` at `0e7658f` or newer (record the exact SHA in S0). **Not** `905206d`.
**Roles:** *Orchestrator* = execution thread that dispatches Sonnet workers and integrates. *Reviewer* = this planning thread (Claude Opus). *Owner* = Bryan. Luis approves client-facing copy/content.

## Order of work

1. **Track S — Stabilize and speed (now).** Performance, accessibility, and cleanup of the codebase as it exists today. No redesign, no new features, no new animation. Ordered by *most important × easiest*.
2. **Track F — Features and story (after Track S is approved).** Homepage restructure, type consolidation, signature moment, section and transition animation, award submission kits.

The only exception is the **Webby early deadline (Oct 30)**: the owner can launch the domain and submit the Webby entry once S2 lands. The entry only needs the site live, and it can be strengthened later.

## Review of the brief — corrections applied

1. **Measurements are probably stale.** The brief measured `905206d`. `main` has since shipped plan 013 P3/P4 (`f7b235c`, `e415730`): usable hero at once, lighter media, static homepage, fixed sitemap/robots. S0 re-measures before anything is fixed.
2. **Half of the brief's "Fix before any submission" list is done** (F06–F09, approved in 013). Those become verify items.
3. **Domain cutover is decided and documented** (`c127f46`, `761dc83`). What's left is owner action, not code.
4. **Signature ideas overlap existing code.** `HomePawWalk` already walks a paw trail along an SVG route; `SampleWalkReportCard` exists (orphaned from the homepage, see S-backlog H2). Track F builds on them.
5. **Restructure collides with Luis's change log** (20 items, call Oct 13). Copy lands first; structural cuts need Luis's sign-off → Track F.
6. **Five font families** (Fraunces, Outfit, Oswald, Bebas, Courier Prime) — cutting to three is a design change → Track F, owner decision D3. Track S only fixes font *loading* (preloads).
7. **Unverified brief claims** (Webby edit-after-entry, third-party fees, Horizon fee): confirm on each submit page before paying.
8. **Stale checkout trap:** `/Users/bballi/Documents/Repos/NotTheRug` is on `copy/home-services-refresh` at `905206d` with uncommitted edits, behind `main`. Workers must not branch from it.

---

# Track S — Stabilize and speed

## How the agent sorts the work (S0 triage)

Score every backlog item, then fix in tier order. The orchestrator may re-rank with evidence; the reviewer approves the final ranked list before S1.

| Field | Values |
| --- | --- |
| **Impact** | H = moves a Lighthouse/a11y score, user-visible bug, or judge-visible defect · M = load weight, maintainability, handoff clarity · L = tidiness |
| **Effort** | S = < 1 h, one file/asset · M = half day, a few files · L = multi-file or needs design input |
| **Risk** | Low = no visual/behavior change · Med = visual change needing screenshot sign-off · High = touches booking/data/auth → **out of Track S** |
| **Certainty** | Known (evidence in repo/report) · Suspected (needs measurement first) |

**Tiers:**
- **Tier 1 — do first:** Impact H/M, Effort S, Risk Low, Known.
- **Tier 2:** Impact H, Effort M, Risk Low/Med.
- **Tier 3:** Impact M/L, or Suspected items that S0 confirmed.
- **Parked:** needs owner decision, Risk High, or design input → listed in the report, not built.

## Seed backlog (S0 verifies, adds, and scores)

Evidence comes from `origin/main`, the plan 013 P3/P4 report (`plans/reports/013-P3P4-report.md`, Parked items table), and the Oct 1 audit.

**Performance**

| ID | Item | Evidence | Likely tier |
| --- | --- | --- | --- |
| P1 | Re-measure mobile/desktop Lighthouse ×3 medians; name the LCP element and the top long tasks | Brief numbers are from `905206d` | S0 task |
| P2 | Split/defer the heavy homepage JS chunks (GSAP plugins, paw walk, intro, welcome modal) to idle/visibility | Brief: two chunks ~5 s CPU each on mobile; 013 found "no evidence-backed JS change", so S0 must profile at 4× CPU first | 2 (if confirmed) |
| P3 | Preload the LCP image with `fetchpriority="high"` if it isn't already | Brief | 1 |
| P4 | Fraunces italic (82 KB) is preloaded on every route but unused on `/` | 013 parked #4 | 1–2 |
| P5 | `ntr_offwhite_horiz.png` 2.1 MB, `backgorund_dogs.png` 1.3 MB, `notRugYellow.png` 0.7 MB in `public/` — check which are on public routes (consumers: `ContactSheetSection.tsx`, admin generator) and serve WebP/AVIF derivatives under **new filenames** | `git ls-tree -l` | 1–2 |
| P6 | 540p hero clip: WebM larger than MP4; built by hand, not by `build-assets.mjs` | 013 L5, parked #3 | 2 |
| P7 | Verify static `/` edge caching (`x-vercel-cache`), iOS Safari video start with `preload="none"`, real-phone LCP | 013 parked #9 | S0 task |
| P8 | Verify `next/image` sizes/`loading` on below-fold images; no eager decorative images | Audit F07 residue | 3 |

**Accessibility (target 100)**

| ID | Item | Evidence | Likely tier |
| --- | --- | --- | --- |
| A1 | Orange CTA contrast (darken token or dark label — pick the smaller visual change) | Brief | 1 (Med risk: screenshot sign-off) |
| A2 | Heading order skips (h3 → h4) | Brief | 1 |
| A3 | Accessible name ≠ visible label: rate stickers, Details buttons (`ServicesPreview.tsx`) | Brief | 1 |
| A4 | Visible `:focus-visible` on every interactive element | Brief | 2 |
| A5 | Reduced-motion audit across GSAP hooks | Brief strength; verify no regressions | 3 |

**Codebase hygiene**

| ID | Item | Evidence | Likely tier |
| --- | --- | --- | --- |
| H1 | `{false && <OtherServicesTeaser />}` + `DisabledHomeSections.tsx` dead path on the homepage | `HomePageContent.tsx:109` | 1 (remove call site + unused exports; keep git history as the restore path) |
| H2 | `HowItWorksPageContent.tsx` has no importer (orphan); it is the only user of `SampleWalkReportCard` | grep on `origin/main` | 1 (delete orphan; **keep** `SampleWalkReportCard` for Track F) |
| H3 | Playground (`app/playground/**`, `AnimatedServiceCards.tsx`, `PawWalkTuner.tsx`) ships in the production build; only robots-disallowed | `robots.ts:15` | 2 (gate to dev with `notFound()` in prod, or move out — orchestrator proposes, reviewer picks) |
| H4 | Stale comment in `globals.css:963` points at `app/page.tsx`; sweep for comments naming files/flows that no longer exist | grep | 1 |
| H5 | `console.log` in `app/api/cron/founder-brief` and `leads-digest` routes | grep | 1 if debug-only; keep if they are intentional server logs (say which) |
| H6 | Unreferenced `public/img/pawl.png`, `pawr.png` | 013 parked #6 | 1 |
| H7 | Repo-root clutter: `index.html`, `optimize_video.py`, `Not-The-Rug-Platform-Setup-Guide.docx`, `misc/`, `not-the-rug-brief/`, `dogs/`, `logos/` (root), `app-assets/`, `style-guide/` | `git ls-tree` | 3 — **inventory only**: what each is, who uses it, keep/move/delete proposal. No deletion in Track S without owner OK |
| H8 | Unused deps/exports: run a dead-code scan (`npx knip` via npx, not added to package.json) | — | 2–3 |
| H9 | Misspelled asset `backgorund_dogs.png` — rename only alongside P5 derivative work (new filename anyway) | — | with P5 |
| H10 | `plans/README.md` status drift (012 listed PLANNED; 013/014 missing) | 013 parked #12 | 1 |
| H11 | Lint/typecheck must stay at zero warnings; record counts | 013 P4 | gate |

**Out of Track S (listed so nobody "fixes" them):** booking/API/Firebase/auth logic, analytics, admin, Firestore rules, production config (013 parked #10–11), pricing/copy, `/walk-with-us` indexing (#1), domain choice (#8), base-URL fail-on-invalid (#7). These remain owner items.

## Phases

| Phase | Focus | Workers (Sonnet) | Depends on | Target date |
| --- | --- | --- | --- | --- |
| S0 | Re-measure, verify, score and rank the backlog | 1 | — | Oct 14 |
| S1 | Tier 1 batch (quick wins) | 3 parallel | S0 approved | Oct 17 |
| S2 | Tier 2 batch (perf deep work, a11y finish, playground gate) | 3 parallel | S1 approved | Oct 24 |
| S3 | Tier 3 + hygiene inventory decisions | 1–2 | S2 approved + owner decisions on H7 | Oct 31 |

**Owner, in parallel after S2:** domain cutover → re-run Lighthouse on `nottherug.com` → Webby entry by **Oct 30** (kit spec in F-W below; a worker can draft it during S3).

### S0 — re-measure and rank (1 worker, no code)

1. Fresh worktree from `origin/main`; record SHA, Node version, production deployment URL/ID.
2. Lighthouse 12.x on the deployed URL, 3 cold runs mobile + desktop: medians for Perf, LCP (+ element), TBT, TTI, CLS, A11y, SEO, BP, transfer (video separate).
3. Chrome trace at 4× CPU: top 10 long tasks with owning module/chunk. Production build chunk list for `/` with sizes and contents.
4. Axe + Lighthouse a11y findings with exact selectors.
5. Verify every seed item (true / false / already fixed), add anything new found, score with the rubric, and output a **ranked table** split into Tier 1 / 2 / 3 / Parked, with a proposed worker split for S1 that has no overlapping files.
6. Output: `plans/reports/014-S0-report.md` + `014-S0-evidence/`. Stop.

### S1 / S2 / S3 — fix batches

- Branch `award/s<N>` off the approved SHA; one worktree + branch per worker (`award/s<N>-w<k>`); orchestrator merges.
- **File ownership:** the orchestrator assigns from S0's split. Fixed rule: `app/globals.css` has exactly one owner per phase; others route CSS through the orchestrator.
- **Each fix:** smallest diff; no visual change unless the item is marked Med risk, and those need before/after screenshots at 390/768/1440.
- **Asset swaps:** new filenames, never in-place overwrites (cache trap). Masters stay out of delivery paths. Deliberately produced derivatives go through `build-assets.mjs` where possible.
- **Deletions:** only items S0 proved unreferenced (grep + build + E2E). List every deleted file in the report.

**Gate per phase (combined report `014-S<N>-report.md`):**
- Lighthouse medians before → after, same settings as S0. Phase must not regress any metric; S2 targets mobile Perf ≥ 90 (floor 85 with a measured tradeoff), LCP < 2.0 s, TBT < 200 ms, CLS < 0.05, A11y 100.
- `npm run lint` (0 warnings), typecheck, unit, full public E2E green; no console or hydration errors.
- Screenshots for Med-risk items; reduced-motion check.
- Stop for `APPROVED S<N> <sha>`.

**Track S exit:** all Tier 1–2 done, Tier 3 done or explicitly deferred, Parked list handed to owner, `plans/README.md` current, and a merge to `main` that the owner authorizes (main auto-deploys).

---

# Track F — Features and story (after Track S)

Outlined only; each phase gets a detailed brief from the reviewer once Track S closes, using the then-current numbers.

## Owner decisions (defaults if unanswered)

| # | Decision | Default |
| --- | --- | --- |
| D1 | Who pays entry fees | BAI-EE; Webby = 2 categories max |
| D2 | Signature moment | **Walk the neighborhood** (evolve `HomePawWalk`) + **Live report card** (evolve `SampleWalkReportCard`); leash cursor optional |
| D3 | Type families 5 → 3 | Condensed display (Bebas *or* Oswald) + Courier Prime + Outfit; Fraunces kept only if S0 shows a required use |
| D4 | Homepage arc | Hero → Team → What a walk looks like → Reviews → Rates → Meet & greet; Rates position is Luis's call |
| D5 | Mobile hero recrop | Dog in frame, headline + CTA above the fold at 390×844 |

## Phases

| Phase | Focus | Notes |
| --- | --- | --- |
| F-W | Webby kit (can run during S3) | `docs/awards/webby-2027/`: 2 categories, entry statement, 100-word description, credits (Bryan / BAI-EE, client Luis Baro), tech/fonts, 3–5 screenshots, 1600×1200 cover. Owner verifies fees, pays, submits by Oct 30 |
| F1 | Story tightening | No-code IA proposal first (Luis + reviewer approve) → merge trust ticker/list/icon row/How It Works extras into one section, reorder to D4, ~50% of current height, D3 fonts, D5 mobile hero |
| F2 | Section and transition animation | Reveal/transition pass across sections in the new order; load `improve-animations` + `gsap-scrolltrigger` skills first. Rules: lazy below the fold, ≤ +50 ms TBT, full reduced-motion fallback |
| F3 | Signature moment | Scroll-drawn Williamsburg route (parks stamp in) + self-assembling report card; booking form stamp/tape step transitions (CSSDA UI) |
| F4 | Award kits + submissions | Recording, cover, screenshots, per-award copy; owner submits: CSSDA (~Nov 23) → Awwwards at 7+ confidence → CSS Winner + galleries → Horizon by Dec 11 → WebAward spring 2027 → Webby People's Voice April |

Every Track F phase keeps the Track S gate: no metric may regress below Track S exit numbers.

---

## Orchestrator rules (execution thread)

- Read this plan, `AGENTS.md` (Next.js docs under `node_modules/next/dist/docs/` before framework changes) and the current phase. Dispatch only that phase.
- One worktree per worker from the phase base SHA. Never use `/Users/bballi/Documents/Repos/NotTheRug` (stale branch). Never touch `Not The Rug/`, `chino.txt`, or other worktrees.
- Workers edit only owned files; cross-owner needs go through the orchestrator.
- Always out of scope: booking/API/Firebase/auth logic, analytics, admin, unapproved copy/pricing, new libraries (`npx` one-off tools for analysis are fine), production deploys, DNS, payments, award submissions.
- Frontend rule: every meaningfully edited container gets a stable kebab-case `id`; list them in the report.
- Conventional Commits per worker; push branches; no merge to `main` without owner say-so.
- After integrating: run the gate, write the report, **stop**. Owner pastes it into the reviewer thread. Continue only on `APPROVED <phase> <sha>`; `CHANGES REQUESTED` → revise the same phase.

### Worker dispatch prompt

```
You are Sonnet worker [S1-W2] for Not The Rug plan 014, phase [S1].
Read plans/014-web-award-master-plan.md (Track S rules) and plans/reports/014-S0-report.md (ranked backlog).
Worktree: [path], branch [award/s1-w2], base SHA [sha].
Backlog items: [IDs + one line each]. Owned files: [list]. Edit nothing else; if you need a change elsewhere, stop and describe it.
Constraints: smallest diff; no visual/copy change unless the item is Med risk (then before/after screenshots 390/768/1440);
new filenames for assets; no new dependencies; reduced-motion preserved; stable ids on edited containers.
Verify: lint (0 warnings), typecheck, unit, affected E2E, Lighthouse mobile+desktop x3 medians vs S0.
Return the report below. Do not merge, deploy, or push to main.
```

### Report format

```
## <phase>/<worker> — <one-line result>
SHA / branch:
Backlog items closed (ID → outcome):
Files changed / deleted:
Behavior changed (exact):
Untouched on purpose:
New/changed DOM ids:
Verification (commands + pass/fail counts):
Metrics before → after (medians):
Screenshots: <paths>
Risks / not verified:
Needs from owner/other worker:
```

## Rollback

Each phase is one branch; revert its merge commit. Assets use new filenames, so old URLs keep working through a rollback. No data, DNS or account changes happen inside any worker task.
