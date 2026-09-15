import { test, expect } from '@playwright/test';

// P3A acceptance: denied/expired/network cases never hang. This covers the
// baseline case — no session at all — reaching a real signed-out state
// rather than spinning forever or leaking admin data. It never attempts a
// real Google sign-in; Firebase resolves onAuthStateChanged to "no user" on
// its own in a fresh browser context, which is the path asserted here.

const ADMIN_ROUTES = ['/admin/dashboard', '/admin/dashboard/leads', '/admin/dashboard/photos', '/admin/dashboard/generator'];

test.describe('admin auth gate', () => {
  for (const path of ADMIN_ROUTES) {
    test(`unauthenticated visit to ${path} reaches a signed-out state, not admin data`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      // Reaches the signed-out state screen rather than hanging on "Checking session…".
      await expect(page.locator('#admin-session-signed-out-shell')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Go to sign in')).toBeVisible();

      // Never renders the authenticated page content underneath.
      await expect(page.locator('#brief-hero-band')).toHaveCount(0);
      await expect(page.locator('#leads-page-shell')).toHaveCount(0);
      await expect(page.locator('#admin-photos-shell')).toHaveCount(0);
      await expect(page.locator('#admin-gen-shell')).toHaveCount(0);
    });
  }

  test('the signed-out link points back to the admin sign-in page', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const link = page.locator('#admin-session-signed-out-link');
    await expect(link).toBeVisible({ timeout: 15_000 });
    await expect(link).toHaveAttribute('href', '/admin');
  });
});
