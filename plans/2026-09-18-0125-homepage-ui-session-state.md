# Homepage UI session — state document

**Timestamp:** 2026-09-18 01:25 CDT
**Repo:** `/Users/bballi/Documents/Repos/NotTheRug-welcome-modal` (the checkout serving `localhost:3000`)
**Branch:** `feat/welcome-modal` · HEAD `41bdf95 Record the one intended schedule and the unverified duration gate`
**Nothing committed this session.** Every change below is in the working tree.

> **Repo note:** the Claude session's working directory was `/Users/bballi/Documents/Repos/NotTheRug`, but
> `next-server` (pid 3266) runs from `NotTheRug-welcome-modal`. All edits were made in the served
> checkout so they were visible live. The sibling `NotTheRug` checkout did **not** receive them.

---

## 1. What changed, in order

### Rates section (`components/marketing/ServicesPreview.tsx`)

1. **Featured card moved below the other rates.** `#home-rates-preview-featured-row`
   (GroupWalkFeatureCard, the `$26` promo) now renders after `#home-rates-preview-other-cards`;
   spacing swapped from `marginBottom: 20px` to `marginTop: clamp(40px, 6vw, 84px)`.
   Pre-move copy of the file saved at
   `/private/tmp/claude-501/.../scratchpad/ServicesPreview.before.tsx`.
2. **One stamped sticker per rate.** New `RATE_STICKERS` map + `stickerSlug()` in the same file;
   labels reuse the `/services` catalog badges where one existed:

   | Rate | Label | Placement |
   |---|---|---|
   | Solo Walk | `Premium` | above the name |
   | Senior Dog Visits | `Gentle Pace` | below the description |
   | Puppy Walk | `Puppy Pace` | above the name |
   | Boarding & Overnight Sitting | `7+ Day Discounts` | below the description |
   | Cat Visits | `Cats Too` | above the name |

   `Gentle Pace`, `Puppy Pace`, `Cats Too` are **new copy** written this session — flagged for review.
3. **Placement iterated three times** and landed on in-flow, not absolute:
   floated at corners/sides → tightened under 768px → flowed under the description ≤1023px →
   **flowed at every breakpoint**, alternating above the name / below the description.
   Spot classes are now `home-rate-sticker-above` / `-below` (were `-top-left`, `-left`,
   `-bottom-right`, …, which described a layout that no longer exists). Ids unchanged:
   `home-rate-sticker-<slug>`.
4. **Tilt moved out of CSS into GSAP** (`STICKER_ROTATION = [-2, 1.5, -1.5, 2, -2.5]`). GSAP writes the
   whole transform inline while it scrubs `y`, so a stylesheet `rotate()` never won. This is recorded
   in both files' comments.

### Sticker/rate parallax (`components/marketing/hooks/useRateStickerParallax.ts`, new)

- Two layers moving against each other: `.home-rate-sticker` (foreground) drifts up,
  `.home-rate-item` (background) drifts down.
- `gsap.matchMedia` tiers: wide (≥1024) `sticker 10 / item 5`; compact `7 / 4`.
  Odd-index stickers travel 35% further (`ALTERNATE_DEPTH`).
- Scroll owns `y` (px); hover owns `x` + `yPercent`, so the two effects compose in one transform
  rather than overwriting each other.
- Hover lean via `gsap.quickTo`: sticker `0.9s power3.out`, column `1.2s power3.out` (the lag
  difference is what reads as depth); travel sticker `x 8 / yPercent 10`, column `x 3 / yPercent 2`.
  Fine pointers only (`(hover: hover) and (pointer: fine)`).
- Smoothing pass: `scrub` 0.6 → `1.1` wide / `0.9` compact, ease `none` → `sine.inOut`
  (deliberate deviation from the usual scrub rule — this is ambient drift, not a scroll-controlled
  sequence; documented in the file).
- `will-change: transform` set through GSAP inside the matchMedia branch, so it reverts at the
  breakpoint. Skipped entirely under `prefers-reduced-motion`. Own `matchMedia`/context, reverted on
  unmount, listeners removed — follows the ownership rule in `hooks/gsapLoader.ts`.
- **Bug fixed during build:** two tweens sharing one `scrollTrigger` config object; each now gets a
  fresh `range()`.

### Hero (`components/marketing/HomeHero.tsx`, `app/globals.css`)

- `#hero-stats-strip` bottom margin removed (`0 auto 56px` → `0 auto`).
- Proof band restyled to the inverted treatment: grain over `var(--ink)`, `--cream` figures,
  `--gold` star figures, labels `rgba(243,236,217,0.62)`, dividers `rgba(243,236,217,0.28)`,
  link hover `--gold-light` (the shared `.btn-accent`-style opacity fade was invisible on dark).
  Briefly olive per request, then returned to charcoal.
- Band width pulled onto the site gutter: `width: calc(100% - 64px)`,
  `max-width: calc(var(--max-w) - 64px)`, and `calc(100% - 40px)` in the ≤768px tier where the
  gutter is 20px. Measured at 853px: left 32 / right 821 / width 789 — matches other sections.
- Hero paragraph's closing sentence removed ("Because peace of mind starts with knowing exactly
  who's holding the leash."). Paragraph height dropped 48px; **hero height did not change at
  desktop** because `.hero` is `min-height: 100vh/100svh`. Only ≤767px (`min-height: auto`) gets
  shorter.

### Navigation (`components/SiteNav.tsx`)

- All six nav items plus the mobile menu's Contact now scroll to home-page sections:

  | Item | Target |
  |---|---|
  | Services | `#home-personalized-care-section` |
  | How It Works | `#home-how-it-works-section` |
  | About Us | `#home-team-section` |
  | Safety | `#home-closing-trust-section` |
  | Williamsburg | `#home-williamsburg-trust-section` |
  | Reviews | `#home-featured-reviews-section` |
  | Contact (mobile) | `#home-contact-sheet-section` |

- Label shortened `Safety & Trust` → `Safety`; `href` and `dataPage: 'safety'` unchanged so the
  anchor and analytics key still resolve.
- `/book` and `/admin` untouched.

### Footer (`components/marketing/SiteFooter.tsx`, `app/globals.css`)

- Green at every breakpoint. The ≤768px `#main-footer` rule used `var(--cream)` + the footer photo;
  it now layers grain + `linear-gradient(rgba(79,90,61,0.88) …)` + the photo over `var(--sage-dark)`,
  so the photo still shows through under a green scrim.
- CTA is terracotta: `btn-accent` + `id="footer-book-luis-cta"`, with a scoped
  `:hover` → `--terracotta-light` / ink text (the shared `.btn-accent:hover` goes olive, which
  disappears on a green footer).

### Section seams (`app/globals.css`)

- `#home-closing-trust-section` `border-bottom` removed (the hairline dividing it from the strip below).
- Then `padding-bottom: 0` → `clamp(48px, 6vw, 88px)`, because that zero only worked while the band
  "closed on its hairline" — without it the last line of copy sat flush against the proof marquee.
  Measured 88px clearance.
- `#home-featured-reviews-header-row` (File 04) — `border-bottom` and its 20px `padding-bottom`
  removed; the 64px `margin-bottom` carries separation.
- `#home-williamsburg-header` (File 05) — `border-bottom: none` + `padding-bottom: 0`, overriding the
  shared `.home-band-block-header` rule.
- Still ruled, if the page should go fully rule-free: `#home-team-section` `border-top`,
  `#home-how-it-works-section` `border-bottom`, `.home-band-block-header` (team + principles blocks).

### File 05 · Story & Service Area — layout redesign

Invoked the `nothing-design` skill, scoped by request to **layout only** — no colour, font, or token
changes, brand hairline/tape vocabulary kept.

- `#home-williamsburg-headline` capped at `22ch`; header gap raised to `clamp(48px, 7vw, 96px)`.
  Hierarchy comes from measure + isolation, not a size bump.
- `#home-williamsburg-lede-row` → `1.28fr / 0.72fr`, `align-items: start`; DOM order changed in
  `HomeWilliamsburgBand.tsx` so the **claim leads and the photo answers** (also fixes the stacking
  order on phones).
- `#home-story-founder-photo` → 380px, `justify-self: end`, `width: 100%`.
  **Bug fixed:** `margin-left: auto` collapsed it to 3×2px — it is an empty div, so an auto margin
  dropped it to shrink-to-fit.
- Coverage columns: interior vertical hairlines dropped for a `28–48px` gap; title→copy tightened to
  6px; mobile per-item rules dropped for gap-only.
- `#home-story-prose` → `62ch`, `margin: clamp(64px,9vw,112px) 0 0 auto` (offset right), hairline removed.

### File 04 · Voices (`components/marketing/FeaturedReviews.tsx`, `app/globals.css`)

- Rating stat strip deleted — two `5★` items, `79 Verified reviews`, both dividers and the top
  hairline. **`79 Verified reviews` went with it** (it was the third item in the same row); not yet
  re-added anywhere.
- Replaced by `#home-featured-reviews-clickout-row` with two large clickouts, using the URLs the old
  star items already pointed at:
  - `#home-reviews-yelp-clickout` → `https://www.yelp.com/biz/not-the-rug-brooklyn-8`
  - `#home-reviews-google-clickout` → `https://share.google/xbrJjkZt4eoHUOxBl`
  - 321×71px, `target="_blank" rel="noopener"`, two-up to 600px then stacked.
- Styling: olive at rest (from `.btn-primary`; `btn-accent` removed since it forced terracotta with
  `!important`), `--terracotta` on hover + 1px lift, `scale(0.97)` active, `transform: none` to kill
  the paper-ticket tilt, `justify-content: end` to right-justify (right edge lands on the review
  grid's 1448px).
- `Read All Reviews` link removed from the header row, along with the file's now-unused
  `next/link` import.
- Dead CSS deleted: `#home-featured-reviews-stat-strip` base rule, its divider margin and its three
  colour overrides; the hero band's comment that referenced it was corrected.

### Principles block (`app/globals.css`)

- `#home-williamsburg-principles` lost its panel: darker olive + grain + photo background, 1px
  border and inset padding all removed, so it sits on the band's green at full container width
  (verified 272→1448px, matching `#home-contact-sheet-header`). `margin-top` raised to
  `clamp(64px, 8vw, 112px)` to match the other blocks' rhythm.
- Column hairlines → `clamp(24px, 3.4vw, 44px)` gap; 900px/560px media queries reduced to gap-only.
- `text-align: center` on the block (label, numerals, titles).
- Gold numerals / cream titles kept — still on green, so the inverted ink is contrast, not decoration.

### Reveal animation (`components/marketing/hooks/useSectionReveals.ts`)

- The meet & greet sheet ("A little about you") no longer fades up. Selector is now
  `.booking-form:not(#home-rates-intake-sheet):not(#home-contact-sheet-form-sheet)`.
  The animation came from the shared card reveal batch (`autoAlpha 0→1`, `y: 52→0`), not from
  `MeetGreetForm` or `BookingSteps`. Verified: no inline `transform`/`opacity`/`visibility` left on
  the sheet.

### Coverage points (`app/globals.css`)

- `text-align: center` on `#home-how-it-works-coverage-points`.
- **Note:** these points moved during the session (user-side edit) out of the service-area band and
  into `HowItWorksStrip`, renamed from `#home-williamsburg-coverage-points`. The centring was applied
  to the live id.

---

## 2. Files touched this session

| File | Nature |
|---|---|
| `components/marketing/ServicesPreview.tsx` | sticker data + markup + section CSS, featured card order |
| `components/marketing/hooks/useRateStickerParallax.ts` | **new** — scroll + hover parallax |
| `components/marketing/hooks/useSectionReveals.ts` | contact sheet excluded from reveals |
| `components/marketing/HomeHero.tsx` | closing sentence removed |
| `components/marketing/HomeWilliamsburgBand.tsx` | lede row DOM order (claim before photo) |
| `components/marketing/FeaturedReviews.tsx` | stat strip → clickouts; header CTA + import removed |
| `components/marketing/SiteFooter.tsx` | CTA accent class + id |
| `components/SiteNav.tsx` | anchor hrefs; `Safety` label |
| `app/globals.css` | hero band, footer tier, seams, File 04/05, principles, coverage centring |

The working tree also carries a large amount of **pre-existing and concurrent user work** not from
this session (welcome modal, paw walk, team band, Instagram grid, analytics lib, route deletions,
`plans/006-homepage-ui-merge-handoff.md`, …). `git diff HEAD --stat` at the time of writing:
30 files changed, 2118 insertions, 677 deletions, plus ~25 untracked paths.

---

## 3. Verification status

- `npx tsc --noEmit` run after every TypeScript edit — clean each time.
- Layout and colour claims were verified by reading **computed styles and measured rects** in the
  live page (not by eye): band widths and gutters, sticker `position`/`order`, button colours and
  geometry, border removals, centring axes, reveal inline styles.
- **Motion was never visually confirmed.** The automated Chrome tab has `requestAnimationFrame`
  frozen (backgrounded renderer — a 600ms rAF probe timed out), so the GSAP ticker never advances
  there. What was confirmed live: both parallax ScrollTriggers exist on the row, range 656→2173,
  progress tracked correctly (0.5 at section centre) with the tween progress following it.
  **Scroll drift, hover lean and their easing still need a human pass.**
- Breakpoint coverage is uneven: the DevTools emulated viewport was controlled from the user's side
  (375 → 853 → 1561 px during the session) and `resize_window` could not override it. The ≤768px
  footer tier was verified by reading the CSSOM rule, not by rendering it.

---

## 4. Open items

1. **Standalone pages — decision pending (the only blocked item).** Nav no longer links to them, but
   the routes still exist: `/about`, `/safety`, `/reviews`, `/contact`
   (`/services` and `/how-it-works` were already deleted in the tree before this session).
   Still pointing at them, and would 404 the moment the routes go:
   - `SiteFooter.tsx` — About Us, Safety & Trust, Reviews, Contact
   - `FeaturedReviews.tsx` — (the `/reviews` CTA has since been removed)
   - `HomeHero.tsx` — hero secondary CTA → `/contact`
   - `TeamGrid.tsx` — "Learn More" → `/contact`
   - `NeighborhoodDetail.tsx` — "Ask About Coverage" → `/contact`

   Recommended order: repoint those links to anchors → add `next.config.ts` redirects (there is
   already a `redirects()` block) from the old paths to `/#section` → delete the route folders.
   Keep `/book` and `/neighborhoods/williamsburg`.
2. **New sticker copy** (`Gentle Pace`, `Puppy Pace`, `Cats Too`) needs sign-off or replacement.
3. **`79 Verified reviews`** stat is currently nowhere on the page.
4. **Footer still says "Safety & Trust"** in its Company column while the nav now says "Safety".
5. **Parallax tuning** is unverified by eye — the scrub (1.1) and the drift amounts (10/5, 7/4) are
   the dials.
6. **Remaining hairlines** listed under "Section seams" above, if the rule-free treatment should
   extend to the whole page.
7. **Nothing-design scope:** applied to File 05 layout only. Colours, fonts and the rest of the page
   were explicitly left alone; no Space Grotesk/Mono/Doto was added.
