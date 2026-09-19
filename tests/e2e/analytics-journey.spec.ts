import { test, expect, type Request } from '@playwright/test';

/**
 * One real browser journey, checked at the wire: what the page actually POSTs
 * to /api/track (plan 009 P5 browser acceptance). The companion test in
 * analytics-pageview.spec.ts proves a single pageview; this one walks a
 * visitor through a pageview, a CTA click and the start of the booking form,
 * and then checks that nothing personal rode along.
 *
 * NEXT_PUBLIC_ANALYTICS_ENABLED and NEXT_PUBLIC_ANALYTICS_TEST_MODE are
 * build-time values that Next.js inlines into the client bundle, so this can
 * only run against a build made with both set. Run it as:
 *
 *   NEXT_PUBLIC_ANALYTICS_ENABLED=true NEXT_PUBLIC_ANALYTICS_TEST_MODE=true npm run build
 *   E2E_ANALYTICS_ENABLED=1 E2E_BASE_URL=http://127.0.0.1:<port> npm run test:e2e -- analytics-journey
 *
 * Without E2E_ANALYTICS_ENABLED=1 it skips with a reason. A skip is not a pass.
 */

const ANALYTICS_E2E_ENABLED = process.env.E2E_ANALYTICS_ENABLED === '1';

const SKIP_REASON =
  'Requires a build made with NEXT_PUBLIC_ANALYTICS_ENABLED=true and ' +
  'NEXT_PUBLIC_ANALYTICS_TEST_MODE=true, pointed at by E2E_BASE_URL. See this file\'s header.';

/** Every event body this page sent, flattened out of the batched POSTs. */
type SentEvent = Record<string, unknown>;

function collectEvents(requests: Request[]): SentEvent[] {
  const events: SentEvent[] = [];
  for (const req of requests) {
    try {
      const batch = JSON.parse(req.postData() || '[]');
      if (Array.isArray(batch)) events.push(...batch);
    } catch {
      // A body we cannot parse is a failure of its own assertion, not this one.
    }
  }
  return events;
}

test.describe('analytics journey (real browser -> /api/track)', () => {
  test.skip(!ANALYTICS_E2E_ENABLED, SKIP_REASON);

  test('a visit, a footer CTA and a form keystroke each report exactly once', async ({ page }) => {
    const trackRequests: Request[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/track') && req.method() === 'POST') trackRequests.push(req);
    });

    await page.goto('/');
    await expect
      .poll(() => collectEvents(trackRequests).filter((e) => e.event === 'page_view').length, {
        timeout: 8000,
      })
      .toBeGreaterThan(0);

    const pageview = collectEvents(trackRequests).find((e) => e.event === 'page_view');
    expect(pageview?.route).toBe('/');
    expect(pageview?.mode).toBe('test');

    // A locked booking CTA in the footer. Clicking it navigates to /book.
    await page.locator('#footer-book-luis-cta').click();
    await page.waitForURL('**/book');

    await expect
      .poll(() => collectEvents(trackRequests).filter((e) => e.cta === 'footer_book').length, {
        timeout: 8000,
      })
      .toBe(1);

    // First real keystroke in the questionnaire starts the funnel, once.
    const firstField = page.locator('form input[type="text"], form input[type="email"]').first();
    await firstField.click();
    await firstField.type('Journey Test');
    await firstField.press('Tab');

    await expect
      .poll(
        () => collectEvents(trackRequests).filter((e) => e.event === 'booking_form_start').length,
        { timeout: 8000 }
      )
      .toBe(1);
  });

  test('no personal data reaches the tracking endpoint', async ({ page }) => {
    const trackRequests: Request[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/track') && req.method() === 'POST') trackRequests.push(req);
    });

    await page.goto('/book');
    const email = page.locator('form input[type="email"]').first();
    await email.fill('journey-test@example.com');
    await email.press('Tab');

    await expect
      .poll(() => trackRequests.length, { timeout: 8000 })
      .toBeGreaterThan(0);

    const bodies = trackRequests.map((req) => req.postData() || '').join('\n');
    expect(bodies).not.toContain('journey-test@example.com');
    expect(bodies).not.toContain('example.com');

    // Field-level check as well, so a future field name cannot smuggle values.
    for (const event of collectEvents(trackRequests)) {
      for (const key of Object.keys(event)) {
        expect(['event', 'id', 'sid', 'route', 'ts', 'cta', 'step', 'src', 'ref', 'camp', 'mode']).toContain(key);
      }
    }
  });
});
