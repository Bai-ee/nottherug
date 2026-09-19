'use client'; // Error boundaries must be Client Components (Next 16 docs).

import { useEffect } from 'react';
import { reportBoundaryError } from '@/lib/server/reportError';

/**
 * Last-resort boundary for failures in the root layout itself (see
 * node_modules/next/dist/docs/.../file-conventions/error.md#global-error).
 * It replaces the entire document when active, so it must render its own
 * <html>/<body> and cannot rely on app/layout.tsx or app/globals.css (the
 * docs note global-error does not inherit global styles). Kept intentionally
 * plain: no fonts, no site chrome, inline styles only, so it never depends on
 * the thing that just failed.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    reportBoundaryError({ boundary: 'global-error', error });
  }, [error]);

  return (
    <html lang="en">
      <body
        id="global-error-body"
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          background: '#faf7f2',
          color: '#2a2a28',
        }}
      >
        <div
          id="global-error-panel"
          role="alert"
          style={{ maxWidth: '480px', textAlign: 'center' }}
        >
          <h1 style={{ fontSize: '22px', marginBottom: '12px' }}>
            Something went wrong.
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: '24px', color: '#5c5c58' }}>
            The page failed to load. You can try again, or head back to the homepage.
          </p>
          <div
            id="global-error-actions"
            style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              onClick={() => retry()}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                fontSize: '15px',
                borderRadius: '999px',
                border: 'none',
                background: '#C4674B',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* Plain <a>, not next/link's <Link>: this file replaces the
                entire document specifically when something in the root
                render tree has already failed, so it must not add a new
                dependency on the app router being in a working state. A full
                navigation is also the correct recovery here regardless — it
                re-requests the document instead of trying to resume a broken
                client-side router. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '15px',
                borderRadius: '999px',
                border: '1px solid #2a2a28',
                color: '#2a2a28',
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
