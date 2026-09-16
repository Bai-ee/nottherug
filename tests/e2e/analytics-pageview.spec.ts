import { test, expect } from '@playwright/test';

/**
 * A real browser visit should fire one page_view POST to /api/track (plan
 * A6 acceptance: "Public pageviews and selected interactions reach Firestore
 * using the existing tracker").
 *
 * NEXT_PUBLIC_ANALYTICS_ENABLED is a build-time env var: Next.js inlines it
 * into the client bundle, so tracking can only be exercised by a build made
 * WITH it set. The server this repo's playwright.config.ts reuses on
 * E2E_BASE_URL (or starts via `npm run start`) was not built with it set —
 * confirmed by checking .env.local, which defines none of the three
 * analytics env vars — and this suite must not rebuild in place: doing so
 * would overwrite the `.next` directory out from under whatever server is
 * already serving it (observed running as `next-server`, i.e. `next start`,
 * on port 3000 at the time this suite was written), which the task
 * instructions explicitly say not to disrupt.
 *
 * So this test is real and will run for a build that has tracking on, but is
 * gated behind E2E_ANALYTICS_ENABLED=1 rather than silently passing (or
 * silently failing) against a build that has it off. Set that flag together
 * with a base URL pointing at a build made with NEXT_PUBLIC_ANALYTICS_ENABLED=true
 * and NEXT_PUBLIC_ANALYTICS_TEST_MODE=true (so the resulting traffic is
 * clearly test-mode, not real business data) to actually exercise it:
 *
 *   NEXT_PUBLIC_ANALYTICS_ENABLED=true NEXT_PUBLIC_ANALYTICS_TEST_MODE=true npm run build
 *   E2E_ANALYTICS_ENABLED=1 E2E_BASE_URL=http://127.0.0.1:<port> npm run test:e2e -- analytics-pageview
 */

const ANALYTICS_E2E_ENABLED = process.env.E2E_ANALYTICS_ENABLED === '1';

test.describe('analytics pageview (real browser -> /api/track)', () => {
  test('a homepage visit fires a page_view POST to /api/track', async ({ page }) => {
    test.skip(
      !ANALYTICS_E2E_ENABLED,
      'Requires a build with NEXT_PUBLIC_ANALYTICS_ENABLED=true (a build-time env var — see this file\'s header comment ' +
        'and docs/analytics-operations.md). The server already running on port 3000 during this acceptance pass was built ' +
        'without it, and rebuilding in place would risk breaking that live server. Set E2E_ANALYTICS_ENABLED=1 and point ' +
        'E2E_BASE_URL at a tracking-enabled build to actually run this test — it is not verified in this run.'
    );

    const trackRequest = page.waitForRequest(
      (req) => req.url().includes('/api/track') && req.method() === 'POST',
      { timeout: 8000 }
    );
    await page.goto('/');
    const req = await trackRequest;
    const body = JSON.parse(req.postData() || '[]');
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].event).toBe('page_view');
  });
});
