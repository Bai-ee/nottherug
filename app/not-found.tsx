import type { Metadata } from 'next';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/marketing/SiteFooter';

/**
 * Root 404. Renders with the site's real nav/footer (both are plain
 * client components with no provider/context dependency — see SiteNav.tsx
 * and SiteFooter.tsx) so a mistyped or dead link still lands on branded,
 * navigable chrome instead of a bare error page. Reuses existing button
 * classes (.btn/.btn-primary/.btn-outline) rather than introducing new
 * styles. Next.js auto-injects `<meta name="robots" content="noindex">` for
 * 404 responses, so this metadata only needs the title.
 */
export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main id="not-found-main" className="container" style={{ padding: '160px 32px 120px', textAlign: 'center' }}>
        <p id="not-found-eyebrow" style={{ fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sage-dark, #5c6b4a)', marginBottom: '16px' }}>
          404
        </p>
        <h1 id="not-found-heading" style={{ marginBottom: '16px' }}>We couldn&apos;t find that page.</h1>
        <p id="not-found-body" style={{ maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          The link may be old, or the address may have a typo. Head back to the homepage, or reach out if you were
          trying to book a walk.
        </p>
        <div id="not-found-actions" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">Go home</Link>
          <Link href="/contact" className="btn btn-outline">Contact us</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
