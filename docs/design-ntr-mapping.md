# NTR Mapping — companion to docs/design.md

> `docs/design.md` (texture/tape/polaroid direction) is the source of truth. This file maps its generic rules onto the existing NTR codebase. No layout/copy/flow changes.

## Token reconciliation (globals.css `:root`)

| design.md token | Value | Existing token | Action |
|---|---|---|---|
| `--paper` | `#f3ecd9` | `--cream #F1F3E3` | Repoint `--cream` → `#f3ecd9` (propagates sitewide); add `--paper` alias |
| `--paper-warm` | `#eadfca` | `--warm-white #F5F9EE` | Add `--paper-warm`; repoint `--warm-white` for cards → warm paper |
| `--ink` | `#242321` | `--charcoal #1F2318` | Repoint `--charcoal` → `#242321`; add `--ink` alias |
| `--muted-ink` | `#575044` | `--mid-gray #5C6455` | Repoint `--mid-gray` → `#575044` |
| `--olive` | `#4f5a3d` | `--sage-dark #4E5A42` | Repoint `--sage-dark` → `#4f5a3d` (nav, primary CTA follow automatically) |
| `--tape` | `rgba(224,207,157,.56)` | — | Add |
| `--shadow-paper` | `rgba(35,31,24,.22)` | — | Add |

Terracotta/gold: keep, reduce frequency (they carry the "Claude" read). Sage/sage-light: keep.

## Texture assets to create (`public/textures/`)

- `paper-grain.png` — tileable 600×600 grain/speckle, generated (or SVG feTurbulence data-URI fallback)
- `torn-paper-mask.svg` — reusable torn-edge mask (hero panel, footer top edge)
- Tape = pure CSS (`--tape` bg + rotation), no asset

## Element mapping (where applicable)

| design.md element | NTR target |
|---|---|
| Global grain overlay | `.site-shell::before` fixed layer in `app/layout.tsx` wrapper — `id="site-texture-overlay"` |
| Hero polaroid + top tape strip | Hero right visual (video panel) framed as large polaroid — `id="hero-polaroid-frame"` |
| Stamped label above headline | Existing hero eyebrow gains stamp/boxed variant |
| Torn edges | Hero panel bottom, footer top edge, one featured callout only |
| Polaroid portraits | Testimonials, dog photos (`dogs/`), team/about imagery |
| Taped corner tab | Featured cards + stat blocks (max 1–2 per viewport) |
| Cards → paper notes | `.card`: warm paper bg, grain, thin ink border, `--radius-lg 24px → 12px` (design.md: avoid deep rounding) |
| Label tape | Category labels/eyebrows in sections |
| Circular logo mark overlap | `notRugGreen.png` badge overlapping hero polaroid corner (matches generator promo composites) |

## Typography decisions

- **Body/section headlines: keep Fraunces + Outfit** — design.md: "keep the site's current body font if it works." It does; it's brand voice.
- **Condensed caps accent** (labels, stamps, select hero eyebrow): `Oswald` (closest to logo lockup's condensed slab).
- **Typewriter accent** (annotations, captions, tape labels): `Courier Prime`.
- Two new Google Font families max, accent roles only. No headline font swap in Phase 1–2; revisit after visual review.

## Motion constraints (per design.md)

- Grain static (no WebGL grain shader — dropped from earlier draft)
- Hover only: polaroid 2px lift, tape opacity shift, card shadow deepen
- No wobble/rotation animation, minimal parallax
- Mobile: rotations → 0, tape smaller, shadows reduced

## Scope

- Public pages: home (`app/page.tsx`), book, contact
- Excluded: `/admin/*`, all logic, forms/nav/pricing stay clean per design.md checklist §7
