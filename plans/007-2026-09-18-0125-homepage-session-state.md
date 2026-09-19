# 007 — Homepage session state, 2026-09-18 01:25 CDT

Status: **All work uncommitted in the worktree.** Written at the end of a single
working session (2026-09-17 evening → 2026-09-18 01:25 CDT) so the next agent or
the next session starts from fact instead of re-deriving it.

## Where the work is

| | Path | Branch | State |
| --- | --- | --- | --- |
| This session's tree | `/Users/bballi/Documents/Repos/NotTheRug-welcome-modal` | `feat/welcome-modal` @ `41bdf95` | All changes uncommitted |
| Other tree | `/Users/bballi/Documents/Repos/NotTheRug` | `main` @ `f77e3d2` | Not touched this session |

`next dev` serves **the worktree**, not the main checkout — verified via the
listening process's cwd (`lsof -a -p <pid> -d cwd`). Everything below was edited
in the worktree and viewed at `http://localhost:3000`.

**Concurrency warning.** Another session edited the same files during this one.
Section ids, stamp numbers and page order changed underneath this work at least
three times (see "Breakage found and fixed"). Re-read a file before assuming its
contents match what this document describes.

## What changed, in order

### 1. Williamsburg content onto the home page
- **New** `components/marketing/HomeWilliamsburgBand.tsx` — the
  `/neighborhoods/williamsburg` content (coverage copy, park list, three "why
  this neighborhood" cards) as a home-page band, reading `lib/content/coverage.ts`
  so the route and the band cannot drift.
- `components/marketing/HomePageContent.tsx` — band inserted after the reviews.
- `app/globals.css` — revived the orphaned `#home-williamsburg-trust-section` /
  `#home-williamsburg-trust-features` / `.trust-park-tag` rules that a removed
  section had left behind, plus new layout rules.
- **This band was deleted again in step 10.** Its content survives elsewhere
  (see that step).

### 2. Nav scrolls to the band
- `components/SiteNav.tsx` — "Williamsburg" entry pointed at the home anchor, and
  a shared smooth-scroll handler added for every `/#…` nav entry: the `Link`
  still navigates (URL + history intact), it just hands the scroll over via
  `scroll={false}` on the home route only. Reduced motion gets the jump.
  `globals.css` deliberately omits `scroll-behavior: smooth`, so easing is
  opted into per caller.
- `tests/e2e/public-routes.spec.ts` — nav expectations updated; a new test
  asserts the entry actually scrolls the target into view.

### 3. Crease between the closing-trust and how-it-works bands
Both bands painted `bg_section_1.png` with `cover` at very different heights, so
the artwork was cut dead at the boundary. Fixed by fading each side's own edge to
flat olive over 180px (`::after` / `::before`, `z-index: -1` inside each
section's stacking context). **These rules are now dead** — see "Known dead
code".

### 4. Reviews band moved and recoloured
- Order is now: How It Works strip → marquee → **Voices** → (Instagram) → contact.
- `#home-featured-reviews-section` runs on cream (grain over `--cream`), and the
  entire "Reviews band inverted: cream type on the green field" block in
  `globals.css` was deleted — on cream the light poster defaults are correct
  again. Only the stat strip keeps overrides, because `.hero-stat-*` defaults
  assume the hero's charcoal panel.
- Headline accent `--gold-light` → `--sage-dark`; heading stamp lost
  `stamp-label-dark`.
- `padding-top: 0` and no `border-top`, so the band opens directly on the
  marquee (the marquee already draws a `border-bottom`).

### 5. Reviews relaid out, animation removed
- `components/marketing/FeaturedReviews.tsx` rewritten: four reviews from a
  `REVIEWS` array, all the same treatment. The large featured pull quote, the
  `Verified · Yelp` stamp, the `home-featured-review-card` id and the
  `home-featured-reviews-secondary` wrapper are gone.
- Grid is `repeat(4, 1fr)`, `gap: 0`, hairline `border-left` between columns;
  each card is a flex column with the byline pinned bottom (`margin-top: auto`)
  so the four attribution rules sit on one line. Steps down to 2 columns at
  1100px and 1 at 700px, separator moving from left edge to top edge.
- Meta shortened to `Rev. 0X · Yelp` (`white-space: nowrap`) — the longer string
  wrapped to different heights and stepped the hairlines.
- `components/marketing/hooks/useSectionReveals.ts` — `.review-card` selector now
  excludes this section, so the quotes render static.
- Rating strip is its own full-width row under the grid.

### 6. Parks list moved to the closing trust band
`Parks We Walk` + chips + "Our home neighborhood since 2011" moved from the
service-area band into `components/marketing/ClosingTrust.tsx`, directly under
the "every park, shortcut, and puddle to avoid" paragraph it proves. Ids renamed
`#home-williamsburg-parks-*` → `#home-closing-parks-*` and inverted for the olive
band (gold-light label, cream hairline, `#home-closing-trust-section
.trust-park-tag` override).

### 7. Footer rebuilt
- **Background**: `backgorund_dogs.png` (note the filename's typo — it is
  spelled that way on disk). It existed only in the main checkout and was copied
  into `public/img/` here. Desktop: offset `35vw` right, height-locked to `78%`,
  bottom-anchored. Tablet (≤1100px): anchors `right bottom` at `58%`. Phone
  (≤768px): centred at `auto 280px` — that breakpoint previously loaded a
  different image, `footer_image2.png`.
- **Colour match (step 11)**: the footer painted its veil over a flat
  `--sage-dark`, while the section above paints the same veil over
  `bg_section_2.png`, which lifts the green ~15%. The footer now paints the
  section's exact stack — grain → `rgba(79,90,61,0.85)` → `bg_section_2.png`
  cover → flat olive — with the dog collage between the veil and that photo.
- **Links**: every entry points at a real home-page location. Rates column links
  to per-rate anchors (`id={home-rate-<slug>}` added to `PreviewCard` in
  `ServicesPreview.tsx`, plus `scroll-margin-top`); Group Walk targets
  `#home-group-walk-feature-card`. Company column targets the bands.
- **Removed as having nowhere to land**: "Walk + Training" (no such rate),
  "Book a Walk" (a route, not a band), the placeholder `href="#"` Privacy and
  Terms links, and later "Our Story".
- **Layout**: `#footer-content-zone` off its 820px cap to full container width;
  link row spans it; the CTA row and legal line capped at `min(660px, 58%)`
  (`min(560px, 64%)` on tablet) so nothing reads over the artwork.
- **Columns**: `#footer-col-rates` / `#footer-col-service-area` /
  `#footer-col-company`. Below 1024px the brand block takes its own row and the
  three link columns stay side by side; below 560px two columns with Service Area
  ordered last, so Rates and Company keep sharing a row.
- **Chrome removed**: the hairline above the CTA row, and the
  `Brooklyn · Est. 2011` divider (its rules *were* the element, so the copy went
  with it — one-line restore if wanted).
- **Brand**: the display-serif "Not The Rug" wordmark replaced by the cream
  circle badge `/logos/notRugYellow.png` as `#footer-logo-badge`,
  `clamp(84px, 7vw, 112px)`.
- **CTA**: paragraph removed; button label "Contact Luis, to Get Started" →
  **"Contact Luis"**; row switched to `flex-start` so the button sits beside its
  label instead of drifting onto the artwork.

### 8. Hero CTA copy
`components/marketing/HomeHero.tsx` — `#hero-cta-secondary` reads **"Contact
Luis"** (was "Contact Us"). Still opens the welcome modal, still falls back to
`/contact` pre-hydration.

### 9. Coverage points moved into How It Works
`Your Assigned Walker` / `Local Park Routes` / `Fast Availability` moved from the
service-area band into `components/marketing/HowItWorksStrip.tsx` as
`#home-how-it-works-coverage-points` — their own group under the four steps,
separated by a rule, inverted for the olive band (cream `h4`,
`rgba(243,236,217,0.72)` body).

### 10. Service-area band deleted
`HomeWilliamsburgBand.tsx` **deleted** and removed from the page. Its content did
not die with it: coverage points are in How It Works (step 9), the parks list is
in the closing trust band (step 6), and the founder story lives in
`lib/content/about.ts`, still rendered by `/about`.

Follow-on edits: nav and footer "Williamsburg" now target
`#home-closing-parks-row` (which gained `scroll-margin-top`); footer "Our Story"
removed; the band's CSS deleted (surface rule, background-rotation entry,
header/headline/lede-row/seo-label/desc/cta-row block, founder-story prose and
taped-photo rules, responsive leftovers); e2e `WILLIAMSBURG_ANCHOR` repointed.

### 11. Instagram / reviews seam, footer green
- `#home-instagram-section` ran on `--warm-white` with a `border-top` while the
  voices band above runs on `--cream`, so the boundary read as two sheets. It now
  uses cream, and both hairlines at that seam are gone.
- Footer green matched to the section above (see step 7).

## Current home page order

`hero → rates (#home-personalized-care-section) → trust marquee bar →
#home-team-section → #home-closing-trust-section → proof marquee →
#home-featured-reviews-section → #home-instagram-section →
#home-contact-sheet-section (contains the How It Works block + the meet & greet
form) → footer`

## Breakage found and fixed (caused by concurrent edits, not by this work)

- `HowItWorksStrip` became `<div id="home-how-it-works-block">` nested in the
  contact band, having been `<section id="home-how-it-works-section">`. That left
  the nav's "How It Works" entry **and** the legacy `?page=how-it-works` redirect
  pointing at an id that no longer existed. Fixed in `SiteNav.tsx`,
  `lib/content/legacy-routes.ts` and the e2e constant.
- Nav entries for Safety & Trust and Reviews had become home anchors while the
  e2e test still expected `/safety` and `/reviews`. Test updated and renamed.
- Mobile `every "book" CTA reaches /book` broke when the footer's "Book a Walk"
  entry was removed — it was the last exact-match link reachable on mobile, since
  the nav CTA sits behind the hamburger. That assertion is now desktop-only, with
  the reason in the test.

## Known dead code

- `#home-how-it-works-section` rules in `globals.css` (~60 lines) no longer match
  anything, including the step-3 seam blender. Left in place rather than deleting
  another session's in-flight styling. **Decide before commit.**
- `#home-other-services-section` lost its shared background-rotation rule when the
  service-area selector next to it was deleted. That section is `{false && …}` and
  never renders.

## Open questions

1. **Stamp numbering.** Top to bottom the page now reads File 01 · The Team →
   File 04 · Voices → Roll 04 · Instagram → File 03 · How It Works → Form 02 ·
   Meet & Greet. Gapped and out of order. Renumber?
2. **Privacy / Terms.** Removed from the footer because they pointed at `href="#"`.
   If they are needed for legal reasons they should come back as real routes.
3. **Brooklyn · Est. 2011** line: removed with its rules. Restore as plain text?
4. **Footer seam artifact.** The footer and the contact section each scale their
   own copy of `bg_section_2.png` with `cover`, so a very faint 1px edge remains
   where they meet. Fix is to drop the photo layer from the footer and flat-fill
   with a lightened green.

## Test state

- `npx tsc --noEmit` — clean.
- `npx eslint` on touched files — clean except two pre-existing
  `@next/next/no-img-element` warnings (`SiteNav.tsx`, `SiteFooter.tsx`).
- `npx vitest run` — 125 passed, 13 skipped.
- `npx playwright test tests/e2e/public-routes.spec.ts --project=desktop`
  (against the dev server via `E2E_BASE_URL=http://127.0.0.1:3000`) — 20 passed,
  6 failed. **All 6 failures are pre-existing and unrelated**, reproduced with
  this session's changes stashed:
  - five assert the home `<h1>`, which the hero word-split animation re-emits
    without whitespace ("Your dogdeservessomeone theyknow.");
  - `/playground/service-cards returns 404 in production` needs a production
    build, not `next dev`.
- Mobile project additionally fails `mobile hamburger menu opens and its links
  navigate` — `#mobile-menu` never becomes visible. Also pre-existing; verified
  by stashing `SiteNav.tsx` and re-running.

## Not verified

Production build, real-device scroll feel, viewports above ~1900px (the footer
collage scales past its native 1536px width and softens).
