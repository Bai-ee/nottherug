// Route-group layout for the public marketing site. Purely organizational —
// see plans/002-production-readiness.md target structure. No shared chrome
// lives here because /book and /contact intentionally render without the
// SiteFooter that the other marketing pages use (matching their existing,
// pre-extraction design); each page composes its own SiteNav/SiteFooter.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
