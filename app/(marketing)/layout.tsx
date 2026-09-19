import PageViewTracker from '@/components/marketing/PageViewTracker';

// Route-group layout for the public marketing site. Purely organizational —
// see plans/002-production-readiness.md target structure. No shared chrome
// lives here because /book and /contact intentionally render without the
// SiteFooter that the other marketing pages use (matching their existing,
// pre-extraction design); each page composes its own SiteNav/SiteFooter.
//
// PageViewTracker is the one exception: it renders nothing, so it doesn't
// disturb that per-page chrome, and this boundary is exactly what keeps it
// off admin/API routes (plans/003-admin-dashboard-and-tracking.md — "mount
// one lightweight pageview observer here, not globally").
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker />
      {children}
    </>
  );
}
