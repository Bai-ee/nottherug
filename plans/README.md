# Project plans

**Current work:** [013 — client handoff hardening](013-client-handoff-hardening.md) (phase reports in [`reports/`](reports/)). For running and operating the site, use the [README](../README.md) and the [operations runbook](../docs/operations-runbook.md). Plans 001–010 below are historical records, each carrying a banner saying so.

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-reversible-section-reveals.md) | Make section reveal animations reverse on scroll-up (play in, play out) | MEDIUM | DONE |
| [002](002-production-readiness.md) | Production readiness, code cleanup, and Claude execution plan | HIGH | PLANNED |
| [003](003-admin-dashboard-and-tracking.md) | Admin dashboard, shared styling, and first-party website tracking | FEATURE | SUPERSEDED BY 009 FOR SEQUENCING |
| [004](004-frontend-tracking-coverage.md) | Frontend instrumentation coverage for the analytics dashboard | FEATURE | SUPERSEDED BY 009 FOR SEQUENCING |
| [006](006-homepage-ui-merge-handoff.md) | Homepage UI merge handoff (two trees, uncommitted) | HIGH | OPEN |
| [007](007-homepage-instagram-section-2026-09-18.md) | Homepage Instagram section — session record, 2026-09-18 | MEDIUM | BUILT, UNCOMMITTED |
| [008](008-2026-09-18-paw-walk-and-band-session.md) | Paw walk + band layout session, 2026-09-18 | MEDIUM | UNCOMMITTED |
| [009](009-full-tracking-dashboard-integration.md) | Full tracking and custom dashboard integration | HIGH | IN PROGRESS |
| [010](010-production-final-mile-optimization.md) | Production final-mile code quality and performance optimization | HIGH | IMPLEMENTED 2026-09-19 — see its "Release evidence" section |
| [011](011-backup-walker-bench.md) | Backup walker bench: recruit, stack and dispatch backup walkers | FEATURE | PHASES 0–2 BUILT 2026-09-29 (Join Our Team + Team Applications) |
| [012](012-tracking-integrity.md) | Tracking integrity: analytics, Calendly, email, lead capture | HIGH | NOT LANDED as a branch — 4 commits on `fix/tracking-integrity` are not on `main` by patch id (dd5cab3, c57766d, 20e88ff, b710fb3). The lead-merge commit is superseded by 013 P1; the leads-digest cron entry is already on `main` via other commits; the dashboard and digest commits are undecided — owner to drop or re-port (2026-10-05) |
| [013](013-client-handoff-hardening.md) | Client handoff hardening (security, reliability, operations) | HIGH | IN PROGRESS — see `reports/013-tracker.md` |

## Execution order

001 is complete. For production cleanup, follow the phases in 002 and update
[its tracker](002-production-tracker.md). Use [the Claude handoff](002-claude-handoff.md)
to coordinate Sonnet workers with separate file ownership.

003 extends the current system. Its implementation is uncommitted and locally
verified; preview and production activation remain pending. It does not replace
or complete the remaining production gates in 002. Refer to the 002 tracker for
current release status.

Use [the analytics preview handoff](003-analytics-preview-handoff.md) to give a
new agent the current state, constraints and remaining work.

004 is the focused implementation plan for turning existing public-site actions
into the meaningful dashboard events defined in 003. It must be completed and
verified in test mode before 003's preview and production activation steps.

010 is the final-mile optimization plan for the fully integrated analytics and
booking-first branch. It follows 002 and 009 rather than replacing either one.
Start it only after the owner's current CSS/navigation pass has a recoverable
checkpoint; it deliberately stops before deployment or external activation.
Its required [asset specification](010-asset-optimization-spec.md) sizes every
image, background, video and font from its measured maximum rendered box.

## Notes

001 was written directly from a described requirement ("apply animations to
each section and reverse in/out as users scroll"), not from a full
audit — the existing motion setup (GSAP + ScrollTrigger, `initSectionReveals`
using `ScrollTrigger.batch` with `once: true`) was reconned just enough to
spec the change. It intentionally affects the shared reveal mechanism used
by every SPA page (home, services, about, safety, neighborhoods, reviews,
contact) since that's the only reveal code path, not a homepage-only patch.
