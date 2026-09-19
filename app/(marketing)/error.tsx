'use client'; // Error boundaries must be Client Components (Next 16 docs).

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SiteNav from '@/components/SiteNav';
import { reportBoundaryError } from '@/lib/server/reportError';

/**
 * Route-segment error boundary for every page under app/(marketing). Wraps
 * page.tsx/loading.tsx/not-found.tsx for this segment but not the layout
 * above it (MarketingLayout keeps rendering SectionRail/SectionJump), so
 * this brings its own SiteNav for continuity since the crashed page's own
 * SiteNav never mounted. `retry()` re-renders the segment without a full
 * reload; only a safe generic message is shown, never `error.message`.
 */
export default function MarketingError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    reportBoundaryError({ boundary: 'marketing-error', route: pathname, error });
  }, [error, pathname]);

  return (
    <>
      <SiteNav />
      <main
        id="marketing-error-main"
        className="container"
        style={{ padding: '160px 32px 120px', textAlign: 'center' }}
      >
        <h1 id="marketing-error-heading" style={{ marginBottom: '16px' }}>
          Something went wrong.
        </h1>
        <p id="marketing-error-body" style={{ maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          This page hit a snag loading. You can try again, or head home and pick up from there.
        </p>
        <div
          id="marketing-error-actions"
          style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Go home
          </Link>
          <Link href="/contact" className="btn btn-ghost">
            Contact us
          </Link>
        </div>
      </main>
    </>
  );
}
