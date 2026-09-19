'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toTrackedRoute } from '@/lib/analytics/events';
import { isAnalyticsEnabled, track } from '@/lib/analytics/track';
import { watchEngagement } from '@/lib/analytics/session';

/**
 * Mounted once in app/(marketing)/layout.tsx — never in admin (see that
 * file's comment). Records one page_view per real navigation, including
 * client-side transitions where this component stays mounted and only
 * usePathname() changes; a route Next.js merely prefetches never mounts or
 * commits this component's tree, so prefetching cannot trigger it.
 *
 * React 18/19 StrictMode runs an effect, its cleanup, then the effect again
 * on every commit in development. `lastRecorded` is keyed on the pathname
 * that was actually recorded (not a plain boolean), so the repeated
 * StrictMode invocation for the *same* pathname is a no-op for page_view
 * while a genuine pathname change still records. The engagement watcher is
 * still re-armed on every invocation regardless — it's cheap and
 * self-deduplicating (see watchEngagement in lib/analytics/session.ts) — so
 * the instance left running after StrictMode settles is the real one.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const lastRecorded = useRef<string | null>(null);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (!toTrackedRoute(pathname)) return; // unlisted route — record nothing

    if (lastRecorded.current !== pathname) {
      lastRecorded.current = pathname;
      track('page_view', {});
    }

    return watchEngagement(() => track('engagement', {}));
  }, [pathname]);

  return null;
}
