import PageViewTracker from '@/components/marketing/PageViewTracker';
import SectionRail from '@/components/marketing/SectionRail';
import SectionJump from '@/components/marketing/SectionJump';
import '../section-rail.css';
import '../section-jump.css';

// Route-group layout for the public marketing site. Purely organizational —
// see plans/002-production-readiness.md target structure. No shared chrome
// lives here because /book and /contact intentionally render without the
// SiteFooter that the other marketing pages use (matching their existing,
// pre-extraction design); each page composes its own SiteNav/SiteFooter.
//
// The section nav (SectionRail on desktop, SectionJump on mobile) is the
// second exception: it is
// fixed-position chrome that floats over the page rather than sitting in the
// flow, and it renders nothing on routes with no entry in the section-nav
// contract (lib/navigation/sections.ts), so mounting it once here leaves
// /book and /contact exactly as they were. Its stylesheet is imported here
// too, keeping it off the admin bundle.
//
// PageViewTracker is the other exception: it renders nothing, so it doesn't
// disturb that per-page chrome, and this boundary is exactly what keeps it
// off admin/API routes (plans/003-admin-dashboard-and-tracking.md — "mount
// one lightweight pageview observer here, not globally").
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker />
      {children}
      <SectionRail />
      <SectionJump />
    </>
  );
}
