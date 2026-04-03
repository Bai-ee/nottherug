# Not The Rug — Brand & Design Style Guide

> Reference document for building any complementary page or microsite that matches the NTR visual identity.

---

## 1. Brand Overview

**Brand name:** Not The Rug  
**Tagline:** Brooklyn Dog Walking  
**Voice:** Warm, confident, locally grounded. Serif display headlines with a hint of editorial softness. Friendly but not cutesy.

---

## 2. Logo Assets

All logos live in `/logos/`.

| File | Use case |
|------|----------|
| `ntr_offwhite_horiz.png` | **Primary nav logo** — used in dark nav (sage-dark background). Off-white version. Width: 128px in nav. |
| `ntr_logo_green_horiz.png` | Horizontal logo on light backgrounds (cream/warm-white). |
| `logo_horiz.png` | Standard horizontal lockup. |
| `circle_logo.jpg` | Avatar / profile / social use. |
| `Not the rug logo design.png` | Full design reference / full-color version. |
| `Not_The_Rug_2023_clipped_web.mp4` / `.webm` | **Hero background video** — looping, muted, autoplay. Used as full-bleed background in the hero's right panel. |

**Logo sizing rule:** Nav uses `width: 128px; height: auto`. Never distort aspect ratio.

---

## 3. Color Palette

All colors defined as CSS custom properties in `:root`.

### Core Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--cream` | `#EEF4DB` | Default page background |
| `--warm-white` | `#F5F9EE` | Card backgrounds, elevated surfaces |
| `--charcoal` | `#1F2318` | Primary text, footer, dark CTAs |
| `--mid-gray` | `#5C6455` | Body copy, secondary text, labels |
| `--light-gray` | `#D5E0BE` | Borders, dividers, placeholder backgrounds |

### Sage (Primary Brand Color)

| Token | Hex | Usage |
|-------|-----|-------|
| `--sage` | `#7A9068` | Accents, eyebrow dots, inline pops |
| `--sage-light` | `#B4C89E` | Placeholder gradients, soft fills |
| `--sage-dark` | `#4E5A42` | **Primary CTA button**, nav background, mobile menu |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--terracotta` | `#C4674B` | Warm accent, alerts, highlight text |
| `--terracotta-light` | `#E8A896` | Soft terracotta fills |
| `--gold` | `#C9A96E` | Star ratings, premium accents |
| `--gold-light` | `#E8D4A8` | Label text on dark, soft gold fills |

### Section Backgrounds

| Class | Color | Text |
|-------|-------|------|
| `.bg-cream` | `#EEF4DB` | `--charcoal` |
| `.bg-warm` | `#F5F9EE` | `--charcoal` |
| `.bg-light` | `#D5E0BE` | `--charcoal` |
| `.bg-charcoal` | `#1F2318` | white |
| `.bg-sage` | `#4E5A42` | white |

### Placeholder Image Gradients

```css
.img-ph-1 { background: linear-gradient(135deg, #C8D8C4 0%, #9DB89A 100%); } /* sage-green */
.img-ph-2 { background: linear-gradient(135deg, #DFD4C4 0%, #C4A888 100%); } /* warm tan */
.img-ph-3 { background: linear-gradient(135deg, #D4C8D8 0%, #A88EC4 50%, #9DB89A 100%); } /* lavender-sage */
.img-ph-4 { background: linear-gradient(135deg, #D8C8C4 0%, #B89090 100%); } /* terracotta-blush */
.img-ph-5 { background: linear-gradient(135deg, #C4D4D8 0%, #88A8C4 100%); } /* sky-slate */
```

---

## 4. Typography

### Font Stack

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Outfit:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet">
```

### Font Roles

| Token | Family | Use |
|-------|--------|-----|
| `--font-display` | `'Fraunces', 'DM Serif Display', serif` | `h2`, `h3`, section headlines, logo text |
| `--font-body` | `'Outfit', sans-serif` | All body copy, nav links, buttons, labels |
| `--font-italic` | `'Fraunces', serif` | Italic callouts, eyebrows, `.label`, `em` tags in headlines |

### Type Scale

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| `h1` | `clamp(44px, 5.5vw, 76px)` | 700 | Playfair Display — hero only |
| `h2` | `clamp(32px, 3.5vw, 52px)` | 400 | Fraunces |
| `h3` | `clamp(22px, 2vw, 30px)` | 400 | Fraunces |
| Body | `16px` | 400 | Outfit, `line-height: 1.6` |
| `.hero-p` | `18px` | 400 | `color: --mid-gray`, `line-height: 1.7` |
| `.label` | `15px` | 300 | Fraunces italic, `color: --mid-gray` |
| Nav links | `14px` | 500 | Outfit |
| Small/meta | `13px` | 400–500 | Outfit |
| Micro | `11–12px` | 500 | Uppercase, `letter-spacing: 0.06em` |

### Headline Italic Pattern

Italic `<em>` inside headlines uses `--font-italic` (Fraunces) and `color: var(--sage-dark)`:

```html
<h1>Premium dog walking <em>you can trust</em></h1>
```

---

## 5. Spacing & Layout

### Global Tokens

```css
--nav-h: 72px;       /* Fixed nav height */
--max-w: 1240px;     /* Max content width */
--section-pad: 96px; /* Default section top/bottom padding */
--radius: 12px;      /* Default border-radius */
--radius-lg: 24px;   /* Card border-radius */
```

### Grid System

```css
.grid-2 { grid-template-columns: 1fr 1fr; gap: 32px; }
.grid-3 { grid-template-columns: repeat(3, 1fr); gap: 28px; }
.grid-4 { grid-template-columns: repeat(4, 1fr); gap: 24px; }
```

### Container

```css
.container { max-width: 1240px; margin: 0 auto; padding: 0 32px; }
.section { padding: 96px 0; }
.section-sm { padding: 56px 0; }
.pt-nav { padding-top: calc(72px + 24px); } /* offset for fixed nav */
```

---

## 6. Components

### Buttons

```css
/* Primary — sage-dark fill */
.btn-primary { background: #4E5A42; color: white; }
.btn-primary:hover { background: #1F2318; transform: translateY(-1px); }

/* Outline — dark border */
.btn-outline { border: 2px solid #1F2318; color: #1F2318; }
.btn-outline:hover { background: #1F2318; color: white; }

/* Outline white — for dark backgrounds */
.btn-outline-white { border: 2px solid rgba(255,255,255,0.6); color: white; }
.btn-outline-white:hover { background: white; color: #1F2318; }

/* Ghost — text only with arrow */
.btn-ghost { color: #1F2318; padding: 14px 0; }
.btn-ghost::after { content: ' →'; }

/* Base sizing */
.btn { padding: 13px 24px; border-radius: 6px; font-size: 15px; font-weight: 600; }
.btn-sm { padding: 10px 20px; font-size: 13px; }
```

### Cards

```css
.card {
  background: #F5F9EE;
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 24px; /* --radius-lg */
  overflow: hidden;
}
.card-pad { padding: 32px; }
.card-hover:hover { transform: translateY(-3px); box-shadow: 0 4px 14px rgba(0,0,0,0.05); }
```

### Navigation

- Fixed, `z-index: 100`
- Background: `rgba(78, 90, 66, 0.96)` (sage-dark semi-transparent)
- `backdrop-filter: blur(12px)`
- Bottom border: `1px solid rgba(255,255,255,0.08)`
- Nav CTA button: white bg, `--sage-dark` text, `border-radius: 6px`, `font-weight: 600`

### Labels / Eyebrows

```css
.label {
  font-family: 'Fraunces', serif;
  font-size: 15px; font-weight: 300; font-style: italic;
  color: #5C6455; /* --mid-gray */
  margin-bottom: 12px;
}
.label-dark { color: #E8D4A8; } /* --gold-light, for dark backgrounds */
```

### Eyebrow Pattern (Hero)

```html
<div class="hero-eyebrow">
  <div class="hero-eyebrow-dot"></div> <!-- 6px circle, --sage fill -->
  <span>Brooklyn, NY · Est. 2018</span> <!-- Fraunces italic, --mid-gray -->
</div>
```

### Divider

```css
.divider { width: 32px; height: 1px; background: #D5E0BE; margin: 20px 0; }
.divider-center { margin: 24px auto; }
```

### Badges / Tags

```css
.badge {
  padding: 4px 10px; border-radius: 4px;
  font-size: 12px; font-weight: 500;
  border: 1px solid rgba(0,0,0,0.1);
  color: #5C6455; /* --mid-gray */
}
```

### Stars / Ratings

```css
.stars { color: #C9A96E; /* --gold */ font-size: 14px; letter-spacing: 1px; }
```

### Trust Bar

- Full-width, `background: --charcoal`, `padding: 14px 0`
- Items: `display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 500; opacity: 0.85`

### Social Buttons

```css
.social-btn {
  width: 38px; height: 38px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
}
.social-btn:hover { background: rgba(255,255,255,0.1); }
```

---

## 7. Background Texture

Subtle noise/dot pattern used on some sections:

```css
.bg-texture {
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
```

---

## 8. Motion & Animation

### Page fade-in

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page.active { animation: fadeIn .4s ease; }
```

### Standard transitions

- Buttons: `transition: all .2s`
- Cards: `transition: all .25s`
- Hover lift: `transform: translateY(-1px)` (buttons), `translateY(-3px)` (cards)
- Nav links: `transition: all .2s`
- Dropdowns: `transition: all .2s` with `opacity`/`visibility` toggle

---

## 9. Hero Section Pattern

Split 50/50 grid. Left: content. Right: full-bleed video/image.

```html
<section class="hero">
  <div class="hero-content"> <!-- max-width 660px, padding 80px 64px 80px 32px -->
    <div class="hero-eyebrow">...</div>
    <h1 class="hero-h1">Headline with <em>italic accent</em></h1>
    <p class="hero-p">18px mid-gray body copy</p>
    <div class="hero-actions">
      <a class="btn btn-primary">Primary CTA</a>
      <a class="btn btn-ghost">Secondary CTA</a>
    </div>
    <div class="hero-stats">
      <!-- stat items with dividers -->
    </div>
  </div>
  <div class="hero-visual">
    <video autoplay muted loop playsinline id="hero-bg-video">
      <source src="logos/Not_The_Rug_2023_clipped_web.webm" type="video/webm">
      <source src="logos/Not_The_Rug_2023_clipped_web.mp4" type="video/mp4">
    </video>
    <div class="hero-img-overlay"></div>
  </div>
</section>
```

**Hero stats bar:**
- Background: `--cream`, `border-radius: --radius`, `padding: 32px 28px`
- Stat numbers: `font-family: --font-display`, `font-size: 40px`, `letter-spacing: -0.02em`
- Stat labels: `11px`, uppercase, `letter-spacing: 0.06em`, `--mid-gray`
- Dividers between items: `1px` vertical line, `--light-gray`

---

## 10. Footer Pattern

```
Grid: 2fr 1fr 1fr 1fr
Background: --charcoal (dark)
Padding: 72px 0 40px
```

- Brand column: logo + tagline (`font-size: 15px; color: rgba(255,255,255,0.55); max-width: 280px`) + social buttons
- Link columns: small header (`font-size: 13px; opacity: 0.55; text-transform: none`) + list links (`font-size: 14px; color: rgba(255,255,255,0.65)`)
- Bottom bar: copyright `rgba(255,255,255,0.35)` left, legal links right

---

## 11. Utility Classes Quick Reference

```
Text colors:   .text-sage  .text-terra  .text-gold  .text-mid
Backgrounds:   .bg-cream   .bg-warm     .bg-light   .bg-charcoal  .bg-sage
Layout:        .container  .section     .section-sm  .pt-nav
Grids:         .grid-2  .grid-3  .grid-4
Type:          .label   .label-dark
Divider:       .divider  .divider-center
Badges:        .badge  .badge-sage  .badge-terra  .badge-gold
Buttons:       .btn  .btn-primary  .btn-outline  .btn-outline-white  .btn-ghost  .btn-sm
Cards:         .card  .card-pad  .card-hover
Images:        .img-placeholder  .img-ph-1  .img-ph-2  .img-ph-3  .img-ph-4  .img-ph-5
```

---

## 12. Google Fonts — Direct URLs

```
Fraunces (display, italic):
https://fonts.google.com/specimen/Fraunces

DM Serif Display (display fallback):
https://fonts.google.com/specimen/DM+Serif+Display

Outfit (body):
https://fonts.google.com/specimen/Outfit

Playfair Display (h1 hero):
https://fonts.google.com/specimen/Playfair+Display
```

**Full embed string (copy-paste ready):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Outfit:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet">
```

---

## 13. CSS Variables Block (Copy-Paste)

Drop this into any new page to match the design system:

```css
:root {
  /* Colors */
  --cream:             #EEF4DB;
  --warm-white:        #F5F9EE;
  --charcoal:          #1F2318;
  --mid-gray:          #5C6455;
  --light-gray:        #D5E0BE;
  --sage:              #7A9068;
  --sage-light:        #B4C89E;
  --sage-dark:         #4E5A42;
  --terracotta:        #C4674B;
  --terracotta-light:  #E8A896;
  --gold:              #C9A96E;
  --gold-light:        #E8D4A8;

  /* Typography */
  --font-display: 'Fraunces', 'DM Serif Display', serif;
  --font-body:    'Outfit', sans-serif;
  --font-italic:  'Fraunces', serif;

  /* Layout */
  --nav-h:        72px;
  --max-w:        1240px;
  --section-pad:  96px;
  --radius:       12px;
  --radius-lg:    24px;
}
```

---

## 14. Key Design Decisions (Do/Don't)

| Do | Don't |
|----|-------|
| Use Fraunces for all display headlines | Use system serifs or Georgia |
| Use Outfit for all body/UI text | Mix in additional sans-serif families |
| Use `--cream` as the default page bg | Use pure white (`#fff`) as the base bg |
| Keep CTA buttons `--sage-dark` on light, white on dark | Use bright/primary blue or generic green |
| Keep italic `<em>` in headlines `--sage-dark` | Leave italic in the default body color |
| Use `border-radius: 24px` on cards | Use sharp corners or excessive rounding |
| Subtle hover lifts (`translateY(-1px)` to `-3px`) | Dramatic scale transforms |
| Keep section padding at `96px` vertical | Use tight `40px` section padding |
| Use `--charcoal` nav text, `rgba(255,255,255,0.7)` on dark nav | Full opacity white on all nav items |
