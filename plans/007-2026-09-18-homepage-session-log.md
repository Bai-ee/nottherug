# 007 — Homepage layout session log

Written **2026-09-18 01:26 CDT**. Covers the working session of **2026-09-17, ~18:45 → 23:26 CDT**.
Companion to `006-homepage-ui-merge-handoff.md` — that doc describes the two-tree merge problem;
this one records what changed in the worktree during this session and what the tree looks like now.

Status: **all work uncommitted** in `/Users/bballi/Documents/Repos/NotTheRug-welcome-modal`
(branch `feat/welcome-modal`, HEAD `41bdf95`). Nothing was committed or pushed.

> **Read the divergence note in §5 first.** The tree was edited by another party after this
> session ended, and one of the larger pieces of work below no longer exists in it.

---

## 1. Environment

| | |
| --- | --- |
| Tree worked in | `/Users/bballi/Documents/Repos/NotTheRug-welcome-modal` (git worktree) |
| Branch / HEAD | `feat/welcome-modal` @ `41bdf95` |
| Dev server | `npm run dev -- -p 3000` → http://localhost:3000, Next.js 16.3.5 (Turbopack) |
| Other tree | `/Users/bballi/Documents/Repos/NotTheRug` on `main` @ `f77e3d2` — **not** the one to serve |

The session opened by starting the dev server in the wrong tree (`main`). `main` has the analytics
and admin-dashboard work but not the homepage UI. The worktree is identified by having the newer
mtimes and the homepage components (`HomePawWalk`, `TeamBand`, `AlwaysIncluded`, `lib/marketing/`).
**Serve the worktree, not `main`.**

---

## 2. Work completed, in order

### 2.1 Black marquee moved below the rates
- `TrustBar` (`.trust-bar`, `--charcoal` fill — the black scrolling credential strip) moved from
  above `ServicesPreview` to directly below it in `HomePageContent`.
- Its container got a stable id: **`#home-trust-marquee-bar`**.
- `lib/marketing/paw-walk-path.ts` `DARK_SECTION_SELECTOR` matches `.trust-bar` against
  `#page-home`'s direct children — still valid at the new position, no edit needed.

### 2.2 Rates section header removed
- Deleted `#home-williamsburg-trust-panel` from `ServicesPreview` — the "Our Home Neighborhood"
  label and the "A Williamsburg service" headline.
- Dropped the `marginTop` clamp on `#home-rates-preview-featured-row` that only existed to clear it.

### 2.3 Team band headline
- `#home-team-band-headline` went "Meet your dog's people" → "HOW IT WORKS" →
  **"From the first hello to your dog's *daily routine*"** (gold accent on the last two words).
- The same headline was removed from `HowItWorksStrip`; its wrapper `#home-how-it-works-header`
  went with it (the h2 was its only child) along with that wrapper's 64px bottom margin.

### 2.4 Team roster redesigned
- `#home-team-scroller-track`: flex `max-content` track → **CSS grid**,
  `repeat(auto-fit, minmax(80px, 1fr))`, so the roster spans the band edge to edge and wraps
  on its own. Measured: 1 row from 700px up, 2 rows at 600px and below.
- `#home-team-scroller` `overflow: hidden` → `visible` (the grid wraps, nothing overflows —
  and hidden clipped the tape), plus `padding-top: 14px`.
- "Join the team" chip removed → **six walkers**. Dead `Link` import removed.
- Chips became **polaroids**: `li.home-team-chip.polaroid` wrapping `.polaroid-window` +
  `.polaroid-caption`, the same components the hero uses. Frame padding `14px 14px 16px`,
  caption `padding-top: 12px` — measured identical to `#hero-polaroid-frame`.
- Top rule removed from chips; photo border removed; hero's `contrast(.96) saturate(.9)` print
  treatment added. Name → `--ink`, role → `--muted-ink` (they sit on cream paper now).
- **Tape** on four of six prints (`nth-child` 2/3/5/6), alternating sides and angles, width `58%`
  of the frame so it scales with the grid track. Uses the existing scans in `public/img/tape/`.

### 2.5 Group Walk card
- Removed the `::after` skyline watermark on `#home-group-walk-feature-content`
  (`bg_section_graphic_1.png` @ 0.09). `SKYLINE_IMAGE` still used by the card's photo panel.

### 2.6 Closing trust / credentials
- Section header removed (label + "Insured, background-checked, and local since 2011").
- `CertificationStrip` (NAPPS Member / Background Checked / Fully Insured) removed from this
  section. The component stays — `/safety` still uses it.
- Moved above `HowItWorksStrip`, directly under the team band. The band seam moved with it:
  `#home-closing-trust-section` now carries `border-top: none; padding-top: 0` **in its base
  block** (an earlier override placed above it lost on source order), keeping its bottom hairline
  as the split before the steps.
- Primary CTA: "Book a Walk in Williamsburg" → **"Book Luis, for a Meet & Greet"**,
  `btn btn-primary btn-accent` (terracotta `#C4674B`), id `#home-closing-book-luis-cta`.
  `.btn-accent` is styling-only — no click behavior attached.

### 2.7 Story + Service Area merged into one file block *(since removed — see §5)*
- `File 05 · Story` was lifted out of `FeaturedReviews` and merged with `File 07 · Service Area`
  into one section in `HomeWilliamsburgBand.tsx`, placed under File 03, restamped **File 04**.
  `File 04 · Voices` was renumbered to **File 05** to keep the dossier in order.
- Cards removed throughout: `.trust-card` ×3 → `.home-coverage-point` hairline-divided columns;
  parks panel lost its fill/border/radius/shadow.
- Icons then removed from the coverage points; their reveal animation was added and then removed.
- Portrait moved out of the story row into the coverage row (4:3, capped 420px, taped) so it
  stopped outranking the copy; story prose became the closing long read at 72ch.
- `ABOUT_STATS` display (2011 / 5★) removed from the home page. The export stays — `/about` uses it.
- `File 06 · How We Work` folded in as a compact principles block, later restyled as a **dark
  olive panel** with 66px gold numerals, 4 across → 2 → 1.
- **`VALUES` moved from `ValuesGrid.tsx` into `lib/content/about.ts` as `PRINCIPLES`** so /about
  and the home summary read one source. *This change survives — see §5.*
- Band background went `bg_section_graphic_2.png` → `multi_dog_walk.png` → **`bg_section_2.png`**
  (the postmark sheet: Brooklyn Bridge line art, WILLIAMSBURG cancellation stamp, water tower)
  under a lighter veil (`0.76 → 0.70`) so the stamps actually print.

### 2.8 Other
- `#home-how-it-works-section` given `padding-top: 0` (was 64px) so it butts onto the band above.
- `useSectionReveals` — `.home-coverage-point` added, then removed again per instruction.

---

## 3. Verification performed

Run against the live dev server at each step, not assumed:

- `npx tsc --noEmit` — clean after every change.
- `npx eslint <changed files>` — clean (one pre-existing `@next/next/no-img-element` warning
  in `AlwaysIncluded.tsx` / `GroupWalkFeatureCard.tsx`, untouched).
- `npm run test` — **19 files, 125 passed, 13 skipped** after every change.
- Headless Playwright measurement at 1440 / 1024 / 900 / 768 / 700 / 600 / 430 / 375 for the
  roster wrap points, polaroid frame/caption spacing, band seams, grid column counts, computed
  backgrounds and horizontal-overflow checks.

**Not verified:** nothing was committed, no e2e suite run, no production build, no cross-browser
or real-device check.

### Screenshot gotcha
Element screenshots of home sections come back blank cream. Two causes: `useSectionReveals` does
not fire in headless, and **`WelcomeWalkModal` opens on load and locks scroll**. Workarounds that
work: launch the context with `reducedMotion: 'reduce'`, dismiss the modal (`text=No thanks`)
before scrolling, then take a full-page screenshot rather than an element one.

---

## 4. Files touched this session

| File | What |
| --- | --- |
| `components/marketing/HomePageContent.tsx` | Section order: TrustBar, ClosingTrust, HomeWilliamsburgBand |
| `components/marketing/TrustBar.tsx` | `#home-trust-marquee-bar` id |
| `components/marketing/ServicesPreview.tsx` | Neighborhood panel removed |
| `components/marketing/TeamBand.tsx` | Headline copy + id |
| `components/marketing/TeamScroller.tsx` | Join chip removed, polaroid markup |
| `components/marketing/HowItWorksStrip.tsx` | Header block removed |
| `components/marketing/ClosingTrust.tsx` | Header, cert strip, CTA copy/color, second CTA |
| `components/marketing/AlwaysIncluded.tsx` | CTA added then reverted (net: unchanged by me) |
| `components/marketing/GroupWalkFeatureCard.tsx` | Skyline watermark removed |
| `components/marketing/FeaturedReviews.tsx` | Story + principles blocks removed, File renumber |
| `components/marketing/ValuesGrid.tsx` | Reads `PRINCIPLES` from shared content |
| `components/marketing/HomeWilliamsburgBand.tsx` | Merged section *(file no longer present — §5)* |
| `components/marketing/hooks/useSectionReveals.ts` | Selector added then removed |
| `lib/content/about.ts` | `PRINCIPLES` export added |
| `app/globals.css` | All of the above styling |

---

## 5. Divergence — the tree changed after this session

Between **2026-09-18 00:00 and 01:22 CDT**, after this session's last edit (23:26), the worktree
was edited by another party. Confirmed by file mtimes and by diffing against what was left.

**Removed:**
- `components/marketing/HomeWilliamsburgBand.tsx` — **deleted**, and its import dropped from
  `HomePageContent`. The whole §2.7 merged File 04 section is gone from the page.
- All of its CSS: `#home-williamsburg-*`, `#home-story-prose`, `#home-story-founder-photo`,
  `#home-williamsburg-principles`, `.home-principle-*`, and the `multi_dog_walk` / `bg_section_2`
  background swap. Cleanly removed — no orphaned rules found for these.

**Added (not by this session):**
- `components/marketing/InstagramGrid.tsx`, `lib/content/instagram.ts`, `public/img/instagram/`
- `components/marketing/hooks/useRateStickerParallax.ts`, `public/img/backgorund_dogs.png`
- `.home-coverage-point` was **kept and relocated into `HowItWorksStrip.tsx`**, with its
  `border-left` dropped (`padding: 0`).

**Current home order** (`HomePageContent`): HomeHero → ServicesPreview → TrustBar → TeamBand →
ClosingTrust → ProofMarquee → FeaturedReviews → InstagramGrid → contact sheet
(with `HowItWorksStrip` now rendered inside the contact-sheet section).

**Still present from this session:** `#home-trust-marquee-bar`, the polaroid roster and its tape,
`#home-team-band-headline`, the orange `#home-closing-book-luis-cta`, the cert-strip removal, and
`PRINCIPLES` in `lib/content/about.ts` (consumed by `ValuesGrid`).

---

## 6. Open items

1. **Uncommitted.** Everything above, plus the other party's work, sits in the working tree only.
   `006` is still the governing plan for merging this tree with `main`.
2. **`File 06 · How We Work` has no home.** It was removed from `FeaturedReviews` during §2.7 and
   its replacement (the principles panel) was deleted with `HomeWilliamsburgBand`. `PRINCIPLES`
   still exists in `lib/content/about.ts` and `/about` still renders the full grid, but the home
   page no longer states the principles anywhere. **Decide: restore, or drop from home.**
3. **File stamp numbering.** `FeaturedReviews` is stamped `File 05 · Voices` (renumbered in §2.7 to
   make room for File 04). With File 04 deleted, the home page now reads 01 → 02 → 03 → 05.
   Either renumber Voices back to 04 or reintroduce a File 04.
4. **Service-area content was re-homed, not lost.** The parks list now lives in `ClosingTrust` as
   `#home-closing-parks-row`, and both `SiteNav` and `SiteFooter` were repointed at
   `/#home-closing-parks-row` — that anchor resolves. The coverage points moved into
   `HowItWorksStrip`. What did not survive: the `WILLIAMSBURG.seo` / `WILLIAMSBURG.desc` coverage
   copy and the "See the Williamsburg Page" link to `/neighborhoods/williamsburg`.
   Note the other party also recopied the CTA — `#home-closing-book-luis-cta` now reads
   **"Contact Luis, to Get Started"**, not the "Book Luis, for a Meet & Greet" set in §2.6.
5. **Founder story is absent from home.** `FOUNDER_STORY` / `FOUNDER_PHOTO` remain in
   `lib/content/about.ts` and are still rendered by `/about`, but nothing on the home page
   uses them now. Decide: restore somewhere, or leave the story to `/about`.
6. **Mobile headline wrap.** "15 years of walks, one neighborhood" fit one line at ≥768px and
   wrapped to two at 375px — moot if that section stays deleted.
