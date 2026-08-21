# Not The Rug — PRODUCT.md

## Register
brand — marketing site; design IS the product surface. (Admin dashboard under /admin is product register, out of scope for brand styling.)

## What
Marketing site for Not The Rug, a Williamsburg (Brooklyn) dog-walking and pet-care service. Est. 2011, owner-led (Luis), small local team. Services: group/solo walks, puppy visits, senior dog care, boarding/overnight sitting, cat visits.

## Who
Williamsburg/Greenpoint dog owners — busy professionals who want a trusted neighborhood person, not a gig app. Skews design-literate; values local, personal, analog.

## Why / positioning
"A Williamsburg service, not a platform." Anti-Rover/Wag: same walker every time, insured, background-checked, GPS + photo reports. Trust and neighborhood roots are the sell.

## Brand personality
Handmade, analog, warm. Printed-flyer / scrapbook / neighborhood-bulletin scanned back into the web. Paper grain, tape, polaroids, vintage NYC etching prints, rubber stamps. Functional modern site under a physical surface.

## Design system (source of truth: docs/design.md, docs/design-system.md, app/globals.css)
- Palette: paper cream `#f3ecd9`, ink `#242321`, sage/olive `--sage-dark #4f5a3d`, gold/tape accents.
- Type: display serif (`--font-display`), mono stamp labels (`--font-mono`), body sans (`--font-type`).
- Motifs: tape strips, polaroid frames, torn edges, paw trails, collage prints (`/img/bg_section_*.png`), paper grain overlay (`/textures/paper-grain.png`).
- Motion: GSAP + ScrollTrigger reveals; `prefers-reduced-motion` respected.

## Anti-references
Glossy SaaS, app-store gradients, glassmorphism, sterile white cards, corporate pet-brand cuteness. Avoid heavy grunge that hurts readability; avoid rotation soup.

## Strategic principles
- Physical surface, digital function: texture never blocks legibility or conversion.
- One CTA arc: meet & greet booking (form → Calendly).
- Trust proof (insured, local since 2011, GPS reports) always near the ask.
- Keep desktop behavior; mobile-first fixes are presentation-only.
