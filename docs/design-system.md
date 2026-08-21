# Not The Rug — Design System (as-built)

Reference for the design system as it currently exists in the codebase. Source of truth is
`app/globals.css` (tokens + components) and `app/layout.tsx` (fonts). This documents what IS —
for the aspirational *direction* (texture/tape/polaroid rationale) see `docs/design.md`, and for
how that direction maps onto tokens see `docs/design-ntr-mapping.md`.

- **Tokens / components:** `app/globals.css` (`:root` at top; sections labeled in ALL-CAPS banners)
- **Fonts:** `app/layout.tsx` (next/font/google → CSS variables)
- **Markup:** `app/page.tsx` (single-page app), `components/SiteNav.tsx`, `components/MeetGreetForm.tsx`

## Design language
A warm, printed-paper aesthetic — a neighborhood flyer or scrapbook page scanned back into the web.
Clean modern layout underneath, physical surface on top: aged-paper backgrounds with baked-in grain,
masking-tape accents, polaroid photo frames, stamped/typewriter labels. Restrained, not grunge. Keep
text legible; use tape/rotation only where it helps a composition feel hand-placed.

---

## 1. Color tokens
Two layers: **primitives** (the paper palette) and **semantic aliases** most components consume. Prefer
the semantic names in new work.

### Primitives (`:root`)
| Token | Value | Role |
|---|---|---|
| `--paper` | `#f3ecd9` | Base page background (aged paper) |
| `--paper-warm` | `#eadfca` | Warm paper surface (polaroid window) |
| `--ink` | `#242321` | Primary text / near-black |
| `--muted-ink` | `#575044` | Secondary text |
| `--olive` | `#4f5a3d` | Brand green (nav band, primary CTA) |
| `--tape` | `rgba(224,207,157,.56)` | Masking-tape fill |
| `--shadow-paper` | `rgba(35,31,24,.22)` | Paper drop-shadow color |

### Semantic aliases
| Token | Value | Notes |
|---|---|---|
| `--cream` | `var(--paper)` | Page/base cream |
| `--warm-white` | `#f7f1e3` | Card / warm section surface |
| `--charcoal` | `var(--ink)` | Dark surfaces + text |
| `--mid-gray` | `var(--muted-ink)` | Body-secondary text |
| `--light-gray` | `#ddd4bd` | Hairline borders, dividers, placeholder base |
| `--sage` | `#7A9068` | Accent green (labels, meta) |
| `--sage-light` | `#B4C89E` | Light green accents (eyebrows on dark) |
| `--sage-dark` | `var(--olive)` | Primary green (CTA, nav) |
| `--terracotta` / `--terracotta-light` | `#C4674B` / `#E8A896` | Warm accent — **use sparingly** |
| `--gold` / `--gold-light` | `#C9A96E` / `#E8D4A8` | Stars, gold eyebrows on dark |

> Terracotta + gold read as "premium" accents — keep frequency low so the paper/sage system stays dominant.

---

## 2. Typography
Five typefaces via `next/font/google`, each exposed as a CSS variable.

| Variable | Family | Used for |
|---|---|---|
| `--font-display` | **Fraunces** | h2/h3 headings, display numerals |
| `--font-headline` | **Bebas Neue** | h1 only — big uppercase poster headline |
| `--font-italic` | **Fraunces** (italic) | `.label` eyebrows, emphasis `<em>` |
| `--font-stamp` | **Oswald** | buttons, nav CTA, stamped labels, word-dividers |
| `--font-body` | **Outfit** | all body copy (`body` default) |
| `--font-type` | **Courier Prime** | typewriter voice: polaroid captions, quotes, label-tape |

### Type scale (fluid `clamp`)
| Element | Size | Treatment |
|---|---|---|
| `h1` | `clamp(44px, 5.5vw, 76px)` | Bebas, uppercase, `letter-spacing:.015em` |
| `h2` | `clamp(32px, 3.5vw, 52px)` | Fraunces, weight 400, `line-height:1.15` |
| `h3` | `clamp(22px, 2vw, 30px)` | Fraunces |
| `.label` | `15px` | Fraunces **italic**, weight 300, sentence case, `--mid-gray` — the standard eyebrow |
| body | `16px` / `line-height:1.6` | Outfit |

Text-color helpers: `.text-sage` `.text-terra` `.text-gold` `.text-mid`. `.label-dark` recolors eyebrows to `--gold-light` on dark sections.

---

## 3. Layout & spacing
| Token | Value |
|---|---|
| `--max-w` | `1240px` (`.container` width, 32px side padding) |
| `--nav-h` | `72px` |
| `--section-pad` | `96px` (`.section` vertical; `.section-sm` = 56px) |
| `--radius` | `12px` |
| `--radius-lg` | `14px` (intentionally shallow — paper reads flat) |

Grids: `.grid-2` (1fr/1fr, 32px, centered), `.grid-3` (3×, 28px), `.grid-4` (4×, 24px).
Helpers: `.container`, `.section` / `.section-sm`, `.pt-nav`.

### Responsive breakpoints
`1024px` (grids collapse), `1100px` (nav/hero reflow), `768px` (mobile: hamburger, stacked grids, tape/polaroid sizes reduced). Plus a `max-height:760px` landscape guard for the hero.

---

## 4. Core components

### Buttons (`.btn`)
Oswald, uppercase, `letter-spacing:.08em`, `radius:6px`, press feedback (`:active` scale .97).
- `.btn-primary` — sage-dark fill, white; hover → charcoal + lift
- `.btn-outline` — 2px charcoal border; hover → charcoal fill
- `.btn-outline-white` — for dark/photo sections
- `.btn-ghost` — text-only, auto ` →` affix; hover → sage
- `.btn-sm` — compact

### Cards (`.card`)
Warm-white + paper-grain, `1px` ink-12% border, `radius-lg`, soft shadow. `.card-pad` (32px),
`.card-hover` (lift + deeper shadow). On the homepage, `.service-card` / `.pricing-card` /
`.review-card` / `.cta-band` auto-receive a masking-tape `::before` strip (alternating angle per
`:nth-child` so the collage feels hand-placed).

### Badges (`.badge` + `-sage`/`-terra`/`-gold`)
Small pill, hairline border. **Note:** all three variants currently render neutral (transparent bg,
`--mid-gray` text) — the color suffixes are legacy hooks, not active colors.

### Section backgrounds
`.bg-charcoal` `.bg-sage` (white text) · `.bg-cream` `.bg-warm` `.bg-light` (grain-textured) · `.bg-texture` (grain only).

### Trust bar (`.trust-bar`)
Charcoal strip, centered row of `.trust-item` (icon + 13px label, ~85% opacity).

### Navigation
Fixed 72px green band (`rgba(78,90,66,.96)` + blur). Signature move: `.nav-logo` is an oversized
paper label (grain bg, tape `::before`/`::after`, `rotate(-2deg)`) that breaks out below the band over
the hero, then tucks back in on scroll (`#main-nav.nav-scrolled`). Neighborhood `.nav-dropdown` on hover;
`.mobile-menu` (sage-dark) under 768px.

### Placeholder images (`.img-placeholder` + `.img-ph-1…5`)
Gradient stand-ins with optional `.img-label`. Being replaced by real photos where available
(see `docs/content-update-plan.md`, Phase 0/C).

### Forms
See `components/MeetGreetForm.tsx` and `.form-control` / `.form-group` / `.form-row` / `.booking-form` in globals.css.

---

## 5. Signature "paper" system
The elements that carry the brand. Use deliberately — 1–2 tape/polaroid moments per viewport max.

- **Polaroid** (`.polaroid`): grain-paper frame, inset+drop shadow, `--polaroid-tilt` (`.polaroid-tilt-left/right` = ∓1.5°). `.polaroid-window` holds the media (`contrast .96 / saturate .9` for a scanned look); `.polaroid-caption` (Courier); `.polaroid-badge` (circular logo overlapping a corner).
- **Tape** (`.taped`, `.taped-center`, `.taped-corner`): `::before` masking-tape strip; variants change position/angle. `--tape` fill, slight rotation, soft shadow.
- **Label-tape** (`.label-tape`): eyebrow printed on tape (Courier, tape bg, `rotate(-1.5deg)`).
- **Stamp-label** (`.stamp-label`): Oswald caps in an inked outline box, `rotate(-1.2deg)` — the hero eyebrow.
- **Word-divider** (`.divider-word` / `-dark`): centered Oswald caps flanked by rules ("Brooklyn · Est. 2011").
- **Social-proof strip** (`.social-proof-strip` / `.proof-*`): auto-scrolling review ticker under the hero polaroid, edge-faded.

---

## 6. Motion
GSAP + ScrollTrigger (loaded in `app/page.tsx`). Hero: word-split headline reveal, clip-path image wipe,
stat counters, parallax. Sections: `ScrollTrigger.batch` reveals for headings + cards (`.service-card`,
`.team-card`, etc.). Cards lift on hover (`.card-hover`). **All entrance/parallax motion is gated behind
`prefers-reduced-motion` and hover behind `@media (hover:hover)`** — respect both when adding animation.

---

## 7. Assets & conventions
- **Textures:** `public/textures/paper-grain.png` (300×300 tile), baked into `body`, `.card`, `.nav-logo`, warm sections.
- **Fonts:** loaded once in `layout.tsx`; never import font files directly — reference the CSS variable.
- **Images:** dog/team photos under `public/img/…` and `dogs/`; logos under `public/logos/`. `.mp4`/`.webm` are gitignored.
- **DOM ids:** meaningful, edited containers carry stable kebab-case ids (e.g. `#hero-polaroid-frame`, `#home-pricing-section`). Keep this pattern — name by function, not styling.

## 8. Do / Don't
**Do:** warm paper over flat white · grain as an atmospheric layer · tape/polaroid as content anchors · shallow radii · sage + paper as the dominant read.
**Don't:** heavy grunge that hurts legibility · decoration with no content purpose · many rotated elements per screen · glossy/app-like depth · frequent terracotta/gold · poster layouts replacing real page structure.
