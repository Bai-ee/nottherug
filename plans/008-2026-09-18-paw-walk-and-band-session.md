# 008 — Paw walk + band layout session

Status: **UNCOMMITTED.** All of it sits in the working tree of
`/Users/bballi/Documents/Repos/NotTheRug-welcome-modal` (branch `feat/welcome-modal`,
HEAD `41bdf95`). Nothing here has been committed or deployed.

Written 2026-09-18 01:25 CDT. Session ran 2026-09-17 evening → 2026-09-18 early.
Read [006](006-homepage-ui-merge-handoff.md) first — this work lands on top of the
same uncommitted worktree that doc describes.

## Read this before anything else

**`localhost:3000` is served from `NotTheRug-welcome-modal`, not `NotTheRug`.**
The dev server's cwd is the sibling checkout. Editing `~/Documents/Repos/NotTheRug`
while watching localhost changes nothing on screen, and the two trees' home pages
differ (section order, components). Confirm with:

```
lsof -nP -iTCP:3000 -sTCP:LISTEN -t | xargs -I{} lsof -p {} -a -d cwd -Fn
```

The first request of the session was read against the wrong tree for this reason;
`components/marketing/HowItWorksStrip.tsx` in `NotTheRug` describes a page that is
not what localhost renders.

## What changed, in order

### 1. Paw trail gated to the product section

`lib/marketing/paw-walk-path.ts`, `components/marketing/hooks/useHomePawWalk.ts`

New `PAW_WALK_GATE_SELECTOR = '#home-personalized-care-section'`. `layoutPawWalk()`
measures that section's page-relative top (`gateTop`) and, for any print landing
above it, sets `display: none` and skips the timeline. The stride still advances
across the skipped span, so every print below the gate keeps the position, side and
wobble it had before. The reduced-motion static branch reuses the same layout, so it
is gated too.

Effect: the hero scrolls clean; the first paw lands as the rates section comes into
view. ~96 prints laid out, down from ~142.

### 2. Stacking: what the paws pass behind

- `components/marketing/GroupWalkFeatureCard.tsx` — `#home-group-walk-feature-card`
  gains `position: relative; z-index: 5`, clearing the paw layer (`#home-paw-walk-layer`,
  z-index 4). Prints walk behind the card instead of across its price and form.
- `app/globals.css` — `.social-proof-strip` z-index 3 → 5, same reason.

No ancestor of either element creates a stacking context, so both compare directly
against the paw layer.

### 3. Paw tone over the green bands

`lib/marketing/paw-walk-path.ts` — `DARK_SECTION_SELECTOR` gained
`#home-team-section` (and, for a while, `#home-how-it-works-section`; see §8).
Prints inside a listed band get `data-paw-tone="dark"` → `filter: invert(1)` → chalk.

**Still open:** `#home-featured-reviews-section` is a green band holding roughly
45 prints — the longest stretch of the trail — and is *not* in the selector, so
those prints are inked dark on green and barely read. One token fixes it.

### 4. File-stamp headers

The zine "file" stamps (`.home-band-block-header` + `.stamp-label stamp-label-dark
stamp-label-heading` + h2) were added to blocks that lacked them, with downstream
numbers shifted each time to keep page order. Two of those headers were later
deleted again; net state is in §8.

The headline "From the first hello to your dog's *daily routine*" is deliberately
reused across blocks — that was chosen explicitly, not an accident.

### 5. Closing trust section

- `app/globals.css` — `#home-closing-trust-section` gains `padding-bottom: 0`.
  `margin-bottom` was already 0; the 96px gap came from `.section`'s padding, which
  is what got zeroed. Section height 618px → 522px.
- `components/marketing/ClosingTrust.tsx` — `#home-closing-williamsburg-pitch` and
  `#home-closing-safety-list` swapped in the JSX, so the pitch renders left and the
  credential rows right. Swapped in markup, not with CSS `order`, so screen-reader
  order matches the visual order. On the 1-column breakpoint the pitch now stacks first.

### 6. CTA copy

"Book Luis, for a Meet & Greet" → **"Contact Luis, to Get Started"** in four places:
`ClosingTrust.tsx`, `GroupWalkFeatureCard.tsx`, `SiteFooter.tsx`, `WelcomeWalkModal.tsx`.
`tests/e2e/public-routes.spec.ts:157` selector regex updated to match.

Ids kept stable (`#home-closing-book-luis-cta`, `#footer-book-luis-cta`) even though
they now read stale. `#hero-cta-secondary` already said "Contact Luis" and was left alone.

`docs/copy/COPY-REVIEW-TOOL.md` still shows the old wording in two slots — it is
generated (`npm run copy:extract`), so regenerate rather than hand-edit.

### 7. "Always included" callouts moved

`components/marketing/AlwaysIncluded.tsx` (GPS Tracking / Photo Report / Double-Leash
Safety / Direct Communication + the "No contracts" line) moved out of
`HowItWorksStrip` and now renders in `ClosingTrust`, directly under
`#home-closing-trust-grid`. It briefly carried its own file stamp; that header was
deleted and its original `border-top` hairline restored.

Because the closing-trust section's bottom padding is 0 (§5), these callouts sit
flush on the section's bottom hairline. A bottom pad on `#home-always-included`
alone would loosen it without restoring the section's 96px.

### 8. How It Works + principles moved into the contact band

The biggest structural change.

- `components/marketing/HowItWorksStrip.tsx` — root is now
  `<div id="home-how-it-works-block">`; it was `<section className="section"
  id="home-how-it-works-section">`. Its own `.container` wrapper is gone. Ref type
  is `HTMLDivElement`.
- `components/marketing/WalkPrinciples.tsx` — **new file**. Holds the principles
  block lifted out of `HomeWilliamsburgBand`. Ids unchanged
  (`#home-williamsburg-principles`, `-label`, `-list`) so its CSS travels with it.
- `components/marketing/HomeWilliamsburgBand.tsx` — principles block and its
  `PRINCIPLES` import removed.
- `components/marketing/HomePageContent.tsx` — `<HowItWorksStrip />` and
  `<WalkPrinciples />` render inside `#home-contact-sheet-section`'s container,
  above `#home-contact-sheet-header`.
- `app/globals.css` — `#home-williamsburg-principles + #home-contact-sheet-header
  { margin-top: clamp(44px, 5vw, 72px) }` replaces the gap the section break gave
  the form's stamp.
- `lib/marketing/paw-walk-path.ts` — `#home-how-it-works-section` removed from
  `DARK_SECTION_SELECTOR`; that element no longer exists and
  `#home-contact-sheet-section` already covers the same stretch.

Contact section now reads: File 03 · How It Works + 4 steps → principles panel →
Form 02 · Meet & Greet → form, on one unbroken green field.

**Dead CSS left deliberately:** the `#home-how-it-works-section` rules (background,
borders, `position`/`z-index`, its entry in the cream-h2 selector list) no longer
match anything. Kept so the move can be reverted cheaply. Strip them once the layout
is settled.

### 9. Paw route made visible

`app/globals.css` — `#home-paw-walk-path` was `fill: none; stroke: none`. Now:

```css
#home-paw-walk-path {
  fill: none;
  stroke: var(--paw-route-stroke, rgba(120, 128, 96, 0.55));
  stroke-width: var(--paw-route-width, 2);
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
```

Retune by setting `--paw-route-stroke` / `--paw-route-width` on `#home-paw-walk-layer`.
`path.getTotalLength()` ≈ 13214 user units at desktop width — the number to dash with
for a draw-on.

Two constraints worth knowing: one path spans the whole page, so it cannot change
colour per band the way the prints do (the sage mid-tone is a compromise that reads
on both cream and green); and `vector-effect: non-scaling-stroke` resolves dash
lengths in screen space while `getTotalLength()` reports path space, so a dash
animation may need the vector-effect dropped.

## Current page order

```
HomePawWalk (layer)
HomeHero
ServicesPreview            #home-personalized-care-section   ← paw gate
TrustBar
TeamBand                   File 01 · The Team
ClosingTrust               pitch | credentials, then AlwaysIncluded
  (HowItWorksStrip moved out of here)
ProofMarquee
FeaturedReviews            File 04 · Voices, File 05 · Story & Service Area
HomeWilliamsburgBand       (principles removed)
contact section            File 03 · How It Works → principles → Form 02 → form
SiteFooter
```

Stamp numbering has a gap: 01, 03, 04, 05. How It Works kept `File 03` after the
File 02 block was deleted; renumbering was left to the owner.

## Dev tooling for the paw walk

Both already existed; neither needs a code change and neither ships
(`pawWalkDevFlags()` hard-returns false in production; `PawWalkTuner` is an
`ssr: false` dynamic import).

- `http://localhost:3000/?pawpath` — MotionPathHelper editor: draggable anchors and
  bezier handles, paws re-walk on every drag. `copy(__pawWalkPath())` in the console,
  then paste over `HOME_PAW_WALK_PATH` in `lib/marketing/paw-walk-path.ts`. The
  editor stretches the viewBox to a square aspect while open and converts back on export.
- `http://localhost:3000/?pawtune` — slider panel (paw size, stride, footfall, scrub
  lag, land line, opacity, track width). Live: every move re-walks the route and
  rebuilds the timeline. Persists to `localStorage` key `nottherug:paw-walk-tuning`.
  **Copy values** puts a ready-to-paste `PAW_WALK_DEFAULTS` block on the clipboard
  for `lib/marketing/paw-walk-tuning.ts`; **Reset** restores the defaults.
- Both flags can be combined: `?pawpath&pawtune`.

## Verification

Run this session: `npm run typecheck` (clean) after every change; `npm run lint`
once (0 errors, 26 pre-existing warnings); live DOM assertions and screenshots in
Chrome for each visual change.

**Not run:** `npm run test:e2e`. The selector edit in §6 is mechanical but unexecuted.
No unit tests were run. Nothing was checked below the desktop breakpoint — the
column swap (§5) and the nested blocks (§8) both change the 1-column stacking order.

One testing gotcha: programmatic `window.scrollTo()` does **not** reliably drive the
scrubbed paw timeline. Prints read as `opacity: 0` after a JS scroll while real wheel
scrolling reveals them correctly. Verify paw state with real scroll events, not
`scrollTo` + assertion.

## Open items

1. `#home-featured-reviews-section` → `DARK_SECTION_SELECTOR` (§3). ~45 prints
   currently unreadable on green.
2. Stamp numbering gap: 01, 03, 04, 05 (§8).
3. Dead `#home-how-it-works-section` CSS (§8).
4. Bottom pad for `#home-always-included` (§7).
5. `docs/copy/COPY-REVIEW-TOOL.md` regeneration (§6).
6. Mobile / narrow-width pass on §5 and §8.
7. e2e suite run.

## Note on concurrent edits

The owner edited files in this tree while the session was running (labels renumbered
by hand, a second CTA removed from `ClosingTrust`, `#home-closing-cta-row` added).
Re-read a file before patching it rather than trusting an earlier read in the same
session.
