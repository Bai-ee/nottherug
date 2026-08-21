# Design Direction: Texture, Tape, and Polaroid Elements

Use this document to update an existing website design with the reference visual language. The goal is not to redesign the whole site. Keep the current structure, content, and main user flow intact, then layer in paper texture, tape details, and polaroid-style image treatments in a controlled way.

## Core Direction

The design should feel like a printed flyer, scrapbook page, or neighborhood bulletin piece that has been scanned back into the web. It should still function like a clean modern website, but the surface should feel physical.

Prioritize:

- Warm paper backgrounds instead of flat white.
- Subtle grain, speckle, fading, and imperfect edges.
- Tape used as a visual anchor for cards, photos, feature blocks, or section headers.
- Polaroid frames for important photos, testimonials, team images, or featured content.
- Slight rotation and layering only where it helps the composition feel handmade.

Avoid:

- Heavy grunge that makes text hard to read.
- Random scrapbook decoration with no content purpose.
- Too many rotated elements on the same screen.
- Fake depth that feels glossy, app-like, or overly polished.
- Replacing the existing website layout with a poster layout unless a specific section calls for it.

## Texture System

Apply texture as a site-wide atmospheric layer, not as a one-off background image on every component.

### Background Texture

Use an off-white or aged paper base color with a subtle grain overlay.

Suggested colors:

```css
:root {
  --paper: #f3ecd9;
  --paper-warm: #eadfca;
  --ink: #242321;
  --muted-ink: #575044;
  --olive: #4f5a3d;
  --tape: rgba(224, 207, 157, 0.56);
  --shadow-paper: rgba(35, 31, 24, 0.22);
}
```

Implementation notes:

- Add paper texture to `body` or the main page wrapper.
- Use a low-opacity noise image, CSS noise texture, or generated grain overlay.
- Keep grain opacity around `0.04` to `0.12`.
- Add small speckles and worn edges only on larger surfaces.
- Do not put strong texture directly behind small text.

Example:

```css
body {
  background-color: var(--paper);
  color: var(--ink);
}

.site-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.08;
  background-image: url("/textures/paper-grain.png");
  background-size: 600px 600px;
  mix-blend-mode: multiply;
  z-index: 1;
}
```

## Torn Paper Edges

Use torn or rough edges sparingly on hero panels, major section backgrounds, or featured callout blocks.

Best use cases:

- Hero section background.
- Featured content panel.
- Quote or testimonial area.
- Image collage container.
- Footer top edge.

Implementation notes:

- Use a transparent PNG mask, CSS mask image, or SVG edge asset.
- Keep the rough edge subtle.
- Do not apply torn edges to every card.
- Preserve clean alignment for buttons, nav, and forms.

Example direction:

```css
.paper-panel {
  background: var(--paper);
  box-shadow: 0 14px 32px var(--shadow-paper);
  position: relative;
}

.paper-panel.is-torn {
  mask-image: url("/textures/torn-paper-mask.svg");
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
}
```

## Tape Elements

Tape should look like masking tape holding content in place. Use it as a purposeful layer over photo frames, cards, section labels, and pinned notes.

### Tape Rules

- Tape is semi-transparent, warm beige, and slightly uneven.
- Tape can sit across the top of a polaroid, corner of a card, or edge of a section label.
- Tape should overlap the element it is attaching.
- Use soft blur, mild grain, and low opacity.
- Rotate tape between `-6deg` and `6deg`.
- Keep tape behind important text unless the text is intentionally printed on the tape.

Suggested CSS:

```css
.taped {
  position: relative;
}

.taped::before {
  content: "";
  position: absolute;
  top: -14px;
  left: 18px;
  width: 132px;
  height: 32px;
  background: var(--tape);
  transform: rotate(-2deg);
  box-shadow: 0 2px 5px rgba(35, 31, 24, 0.12);
  filter: saturate(0.85);
  opacity: 0.9;
  z-index: 3;
}
```

Tape placement variants:

| Variant | Use |
| --- | --- |
| Top strip | Hero photo, feature card, announcement panel |
| Corner tab | Small card, stat block, testimonial |
| Diagonal strip | Polaroid image or collage item |
| Label tape | Small category label or eyebrow text |

Do not use tape on every card. One or two taped elements per viewport is enough.

## Polaroid Image Treatment

Use polaroids as the main treatment for key images. This is best for human, lifestyle, event, product, or brand photos.

### Polaroid Rules

- White or warm-white frame.
- Thicker bottom margin than the top and sides.
- Slight paper shadow.
- Optional small rotation.
- Image should be inset inside the frame, not edge-to-edge.
- Can overlap badges, stickers, or circular logo marks.
- Can be taped at the top or one corner.

Suggested CSS:

```css
.polaroid {
  display: inline-block;
  background: #f7f1e3;
  padding: 14px 14px 48px;
  box-shadow:
    0 18px 28px rgba(35, 31, 24, 0.2),
    inset 0 0 0 1px rgba(35, 31, 24, 0.08);
  transform: rotate(2deg);
  position: relative;
}

.polaroid img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  filter: contrast(0.96) saturate(0.9);
}

.polaroid::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.1;
  background-image: url("/textures/paper-grain.png");
  background-size: 420px 420px;
  mix-blend-mode: multiply;
}
```

Recommended image usage:

- Hero image: one large polaroid, slightly rotated.
- Testimonials: small polaroid portraits.
- Case studies: stacked polaroid previews.
- About/team: candid photo inside one clear polaroid frame.
- Blog/feature cards: use polaroid only for highlighted posts, not every post.

## Layout Integration

Keep the website usable first. The reference style should be layered into existing components.

### Hero Section

Recommended hero structure:

- Keep the existing headline and primary CTA readable.
- Add paper background texture across the full hero.
- Use one large polaroid image on the side or behind the content.
- Add one tape strip across the top of the polaroid.
- Optional stamped label or small outlined tag above the headline.

Do not make the entire hero a busy collage unless the site already uses an editorial layout.

### Cards

Cards can become paper notes, but keep them structured.

Use:

- Warm paper card background.
- Fine grain overlay.
- Thin ink border or no border.
- Small tape tab on featured cards only.
- Slight shadow for physical layering.

Avoid:

- Deep rounded corners.
- Glassmorphism.
- Gradient-heavy cards.
- Perfectly clean white cards on textured backgrounds.

### Buttons

Buttons should stay easy to identify.

Use:

- Solid ink or olive fills.
- Slightly distressed texture only if it does not hurt legibility.
- Squared or lightly rounded corners.
- Strong hover states.

Avoid turning buttons into decorative tape unless they are secondary labels. Primary actions need to remain obviously clickable.

## Type Treatment

The reference uses bold condensed headline typography and typewriter-style supporting copy. Apply this only where it strengthens the existing hierarchy.

Recommended direction:

- Headlines: condensed, bold, uppercase, high impact.
- Subheads/body: clean serif, mono, or typewriter-style accent.
- Labels: uppercase, letter-spaced, stamped or boxed.
- Keep body copy readable and modern if the existing site already has strong typography.

Suggested pairings:

- Headline: `Bebas Neue`, `Anton`, `Oswald`, or existing condensed brand font.
- Accent/body note: `Courier Prime`, `IBM Plex Mono`, or existing mono font.
- Main body: keep the site's current body font if it works.

## Motion And Interaction

Use motion lightly.

Good interactions:

- Polaroid lifts by `2px` on hover.
- Tape opacity shifts slightly on hover.
- Paper card shadow gets slightly stronger on hover.
- Grain stays static or moves extremely slowly.

Avoid:

- Wobbling tape.
- Constant rotation animations.
- Excessive parallax.
- Motion that makes the page feel like a novelty template.

## Responsive Rules

On mobile:

- Remove or reduce rotations.
- Keep tape smaller and less intrusive.
- Stack polaroids below headline content.
- Avoid overlapping important text.
- Reduce shadows so elements do not feel cramped.
- Keep rough edges and texture subtle.

Example:

```css
@media (max-width: 720px) {
  .polaroid {
    transform: rotate(0deg);
    padding: 10px 10px 34px;
  }

  .taped::before {
    width: 96px;
    height: 24px;
    top: -10px;
  }
}
```

## Implementation Checklist For Fable

1. Preserve the existing website structure and main conversion path.
2. Add a global warm paper background and subtle grain overlay.
3. Convert selected image modules into polaroid frames.
4. Add tape only to featured images, hero visuals, and select content blocks.
5. Add mild paper shadows and imperfect edges to major panels.
6. Adjust typography toward bold editorial headlines and typewriter-style accents where appropriate.
7. Keep buttons, navigation, forms, and pricing sections clean and readable.
8. Verify mobile layouts with rotations reduced or removed.
9. Keep all decorative effects secondary to content clarity.

## Final Style Target

The finished site should feel physical, editorial, and slightly handmade, like a sharp printed flyer translated into a website. The texture, tape, and polaroid elements should support trust, personality, and memory without making the site feel messy or hard to use.
