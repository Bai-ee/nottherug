# Project plans

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-reversible-section-reveals.md) | Make section reveal animations reverse on scroll-up (play in, play out) | MEDIUM | DONE |
| [002](002-production-readiness.md) | Production readiness, code cleanup, and Claude execution plan | HIGH | PLANNED |
| [006](006-homepage-ui-merge-handoff.md) | Homepage UI merge handoff (two trees, uncommitted) | HIGH | OPEN |
| [007](007-homepage-instagram-section-2026-09-18.md) | Homepage Instagram section — session record, 2026-09-18 | MEDIUM | BUILT, UNCOMMITTED |
| [008](008-2026-09-18-paw-walk-and-band-session.md) | Paw walk + band layout session, 2026-09-18 | MEDIUM | UNCOMMITTED |

## Execution order

001 is complete. For production cleanup, follow the phases in 002 and update
[its tracker](002-production-tracker.md). Use [the Claude handoff](002-claude-handoff.md)
to coordinate Sonnet workers with separate file ownership.

## Notes

001 was written directly from a described requirement ("apply animations to
each section and reverse in/out as users scroll"), not from a full
audit — the existing motion setup (GSAP + ScrollTrigger, `initSectionReveals`
using `ScrollTrigger.batch` with `once: true`) was reconned just enough to
spec the change. It intentionally affects the shared reveal mechanism used
by every SPA page (home, services, about, safety, neighborhoods, reviews,
contact) since that's the only reveal code path, not a homepage-only patch.
