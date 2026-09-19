# 007 · Homepage Instagram section

**Written:** 2026-09-18 01:25 CDT
**Checkout:** `/Users/bballi/Documents/Repos/NotTheRug-welcome-modal` (branch `feat/welcome-modal`)
**Status:** built, running on localhost:3000, uncommitted
**Base commit at session start:** `41bdf95` Record the one intended schedule and the unverified duration gate

Session record for the homepage Instagram strip. Everything below shipped into
the working tree in one sitting; nothing is committed yet.

---

## 1. Which checkout, and why it matters

`next dev` on :3000 is served from **`NotTheRug-welcome-modal`**, not the main
`NotTheRug` repo dir (confirmed via `lsof -p <pid> -a -d cwd`). All work in this
session landed in the welcome-modal checkout. **The main repo has none of it.**

## 2. What was asked, in order

1. Add a homepage section showing the top 5 Instagram posts from @nottherug.
2. On hover, show likes/views. Add a new background image to the section.
3. Move the section above `File 05 · Story & Service Area`.
4. Make the follow CTA a green button with orange hover, reading "Follow us on Instagram".
5. Remove the "principles behind every walk" section entirely.

## 3. Decisions taken

**Data source: curated static, not the API.** Chosen over the Instagram Graph
API and Meta's `embed.js`. @nottherug would need converting to a Business or
Creator account plus a long-lived token refreshed every 60 days; `embed.js`
loads a third-party script and locks the tiles to Instagram's own chrome. The
curated file is the refresh mechanism — edit `lib/content/instagram.ts`.

**Counts are optional fields, never generated.** `likes` / `comments` / `views`
are all optional on `InstagramPost`. The overlay renders only the counts a post
actually carries, so an unfilled post degrades to the link cue instead of
showing an invented number.

**Hover overlay is gated on `@media (hover: hover)`.** On touch there is no
hover state, and an overlay that appears mid-tap would cover the photo it
belongs to. Touch users get photo + caption; the whole tile is still the link.

## 4. Files, as they now stand

| File | State | What it holds |
|---|---|---|
| `lib/content/instagram.ts` | new, untracked | `InstagramPost` interface + `INSTAGRAM_POSTS` (5). Header comment carries the swap procedure. |
| `components/marketing/InstagramGrid.tsx` | new, untracked | The section. Tiles, tilt rotation, `TileStats` overlay, inline heart/comment/play SVGs, `formatCount` (4820 → 4.8K). |
| `public/img/instagram/placeholder-01..05.jpg` | new, untracked | Placeholder photos, downscaled from `public/dogs` via `sips` (~110–175KB each). |
| `components/marketing/HomePageContent.tsx` | modified | Mounts `<InstagramGrid />`; `<WalkPrinciples />` and its import removed. |
| `app/globals.css` | modified | Instagram block appended at EOF; principles block deleted; one adjacency selector repointed. |
| `components/marketing/WalkPrinciples.tsx` | **deleted** | Was never committed — see §8 before assuming git can restore it. |

### DOM identifiers introduced

`#home-instagram-section`, `#home-instagram-header`, `#home-instagram-headline`,
`#home-instagram-lede`, `#home-instagram-grid`, `#home-instagram-follow-row`,
`#home-instagram-follow-cta`, and classes `.instagram-tile`,
`.instagram-tile-window`, `.instagram-tile-caption`, `.instagram-tile-stats`,
`.instagram-tile-stats-row`, `.instagram-tile-stat`, `.instagram-tile-stats-cue`.

## 5. Section behavior as built

- **Placement:** `<FeaturedReviews />` → **Instagram** → `<HomeWilliamsburgBand />` (File 05) → contact sheet.
- **Layout:** five square polaroids across, alternating `polaroid-tilt-left` / `-right`, reusing the existing `.polaroid` system. Below 900px the grid becomes a full-bleed scroll-snap swipe strip (`margin: 0 -32px`, tiles at `flex: 0 0 68%`).
- **Captions:** clamped to two lines with a two-line `min-height`, so one-line and two-line captions keep tile heights equal.
- **Hover/focus:** `rgba(36,35,33,.62)` ink veil, cream type, counts row + "View on Instagram" cue. Revealed on `:hover` and `:focus-visible` (keyboard parity). `prefers-reduced-motion` drops the transition.
- **Background:** `bg_section_graphic_2.png` (dog walk → Brooklyn Bridge collage) bottom-anchored at `auto 62%` under a 0.86/0.80 paper veil. It was the only section photo not already in rotation — `bg_section_1/2` and `bg_section_graphic_1` carry other bands. `padding-bottom: clamp(140px, 14vw, 220px)` keeps the CTA clear of the bridge.
- **CTA:** `.btn btn-primary` (olive `#4f5a3d`, cream text), with `#home-instagram-follow-cta:hover` overriding to terracotta. The override exists because `.btn-primary:hover` goes lighter sage, which barely reads against this band.
- **Links:** every tile and the CTA open `permalink ?? INSTAGRAM_URL` in a new tab with `rel="noopener noreferrer"`.
- **Reveal animation:** none. The tile classes are deliberately absent from `CARD_SELECTOR` in `hooks/useSectionReveals.ts`, so the strip renders static.

## 6. Principles section removal

`WalkPrinciples` rendered `#home-williamsburg-principles` inside
`#home-contact-sheet-section`, above the meet & greet form. Removed outright
rather than `{false && ...}`-disabled.

- Component file deleted; import and render removed from `HomePageContent`.
- CSS deleted: `#home-williamsburg-principles`, `-label`, `-list`, `.home-principle-item`, `.home-principle-mark`, `.home-principle-title`, the `:nth-child(even)` lean rule, and the 560px media query.
- **One rule repointed:** `#home-williamsburg-principles + #home-contact-sheet-header` → `#home-how-it-works-block + #home-contact-sheet-header`. The steps block is now the header's previous sibling, and it still needs that `clamp(44px, 5vw, 72px)` gap. Confirmed live: computed `margin-top: 72px`.
- **Kept:** `PRINCIPLES` in `lib/content/about.ts` — still feeds `ValuesGrid` on /about. `#home-principles-block` in CSS is a different block and was not touched.

## 7. Verification performed

- `npx tsc --noEmit` — clean after every change.
- `npm run lint` — 0 errors throughout. Two `@next/next/no-img-element` warnings on `InstagramGrid`, matching repo convention (no `next/image` anywhere in `components/marketing`).
- Live on localhost:3000: 5 tiles render, all 5 images return 200 and decode, tile heights equal at 217px, no horizontal page overflow, background image resolves, hover overlay shows `214 likes / 11 comments` and the reel tile `4.8K views / 309 likes`, CTA rest olive and hover terracotta, DOM order confirmed reviews → Instagram → File 05, principles element absent.

**Not verified:** the sub-900px swipe strip. Chrome refused to shrink the
viewport below 967px in this session, so that branch is code-reviewed only.
Check it on a real phone or with devtools device emulation.

## 8. Open items for whoever picks this up

1. **Replace the placeholder content.** Five real square post images into `public/img/instagram/`, real permalinks, captions, and the real like/comment/view counts into `lib/content/instagram.ts`. The counts currently in the file are invented alongside the placeholder photos — do not ship them. Delete the fields rather than guess; the overlay handles their absence.
2. **Mobile pass** on the swipe strip (see §7).
3. **Two textured bands now meet** — the Instagram collage runs directly into File 05's postmark photo. It reads acceptably (hairline rule + surface shift), but dropping the Instagram band to flat `--warm-white` is a one-line change if it feels heavy.
4. **Nothing is committed.** `WalkPrinciples.tsx` was never committed on this branch, so its deletion leaves no git trace and `git checkout` will not bring it back. Its source is preserved in the appendix below.
5. **The main `NotTheRug` checkout does not have any of this.** Port or merge deliberately.

---

## Appendix · deleted `components/marketing/WalkPrinciples.tsx`

Preserved verbatim because the file was untracked when deleted.

```tsx
import { PRINCIPLES } from '@/lib/content/about';

/** kebab id per row so each principle is addressable for later tuning. */
function principleSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Principles at headline level only — the four titles, no copy; the full grid
 * with its reasoning lives on /about. Sits above the meet & greet form inside
 * #home-contact-sheet-section.
 *
 * Printed as a ruled index: a hairline over each row, an inked paw where the
 * 01–04 numerals used to be. The numerals read as a ranking, and as the
 * block's heaviest element they pulled weight off the titles — which are the
 * content. The paws also tie the block to the paw trail crossing the page.
 * Ids are unchanged, so the block's placement styles travel with it.
 */
export default function WalkPrinciples() {
  return (
    <div id="home-williamsburg-principles">
      <div className="stamp-label stamp-label-dark stamp-label-heading" id="home-williamsburg-principles-label">
        The principles behind every walk
      </div>
      <ul id="home-williamsburg-principles-list">
        {PRINCIPLES.map((principle) => (
          <li
            className="home-principle-item"
            id={`home-principle-${principleSlug(principle.title)}`}
            key={principle.title}
          >
            <svg
              className="home-principle-mark"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <ellipse cx="12" cy="16.2" rx="6.1" ry="5.1" />
              <circle cx="5.4" cy="9.2" r="2.5" />
              <circle cx="9.7" cy="5.6" r="2.7" />
              <circle cx="14.3" cy="5.6" r="2.7" />
              <circle cx="18.6" cy="9.2" r="2.5" />
            </svg>
            <span className="home-principle-title">{principle.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```
