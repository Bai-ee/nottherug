# Animation plans

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-reversible-section-reveals.md) | Make section reveal animations reverse on scroll-up (play in, play out) | MEDIUM | DONE |

## Execution order

Just 001 for now — single self-contained change to `initSectionReveals()` in
`app/page.tsx`. No dependencies on other plans.

## Notes

001 was written directly from a described requirement ("apply animations to
each section and reverse in/out as users scroll"), not from a full
audit — the existing motion setup (GSAP + ScrollTrigger, `initSectionReveals`
using `ScrollTrigger.batch` with `once: true`) was reconned just enough to
spec the change. It intentionally affects the shared reveal mechanism used
by every SPA page (home, services, about, safety, neighborhoods, reviews,
contact) since that's the only reveal code path, not a homepage-only patch.
