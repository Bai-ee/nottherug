import { test, expect, type Page } from '@playwright/test';

// Covers plans/002-production-readiness.md P2A acceptance: every new marketing
// route is directly loadable with a real <h1>, refresh/back/forward work,
// legacy `?page=`/`?hood=` links redirect, nav/CTA links use real navigation,
// no `alert()` ships anywhere, the playground is prod-gated, and disabled
// homepage sections never render.

const ROUTES: Array<{ path: string; h1: RegExp }> = [
  { path: '/', h1: /Your dog deserves/ },
  { path: '/services', h1: /Transparent pricing/ },
  { path: '/how-it-works', h1: /How it works/ },
  { path: '/about', h1: /15 years of walks/ },
  { path: '/safety', h1: /Why trust matters/ },
  { path: '/neighborhoods/williamsburg', h1: /Williamsburg is our/ },
  { path: '/reviews', h1: /What Brooklyn/ },
  { path: '/book', h1: /Book your free/ },
  { path: '/contact', h1: /real people/ },
];

const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/?page=services', to: '/services' },
  { from: '/?page=how-it-works', to: '/how-it-works' },
  { from: '/?page=about', to: '/about' },
  { from: '/?page=safety', to: '/safety' },
  { from: '/?page=reviews', to: '/reviews' },
  { from: '/?page=book', to: '/book' },
  { from: '/?page=contact', to: '/contact' },
  { from: '/?hood=williamsburg', to: '/neighborhoods/williamsburg' },
];

// Fails the test the instant a `window.alert`/`confirm`/`prompt` dialog
// fires anywhere on the page — the R02 regression this suite exists to catch.
function failOnDialog(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected ${dialog.type()} dialog fired: "${dialog.message()}"`);
  });
}

test.describe('public routes', () => {
  test.beforeEach(({ page }) => failOnDialog(page));

  for (const route of ROUTES) {
    test(`${route.path} loads directly with a 200 and its own <h1>`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1').first()).toContainText(route.h1);
    });
  }

  test('refresh preserves the page (no client-side-only routing)', async ({ page }) => {
    await page.goto('/services');
    await expect(page.locator('h1')).toContainText(/Transparent pricing/);
    await page.reload();
    await expect(page.locator('h1')).toContainText(/Transparent pricing/);
  });

  test('browser back/forward restores the right page', async ({ page }) => {
    // Navigates via goto() rather than clicking nav links, so this exercises
    // real-route back/forward on both the desktop nav-links row and the
    // mobile layout (where the nav-links row is hidden behind the hamburger).
    await page.goto('/');
    await page.goto('/services');
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.locator('h1')).toContainText(/Transparent pricing/);

    await page.goto('/about');
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('h1')).toContainText(/15 years of walks/);

    await page.goBack();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.locator('h1')).toContainText(/Transparent pricing/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toContainText(/Your dog deserves/);

    await page.goForward();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.locator('h1')).toContainText(/Transparent pricing/);
  });

  for (const redirect of LEGACY_REDIRECTS) {
    test(`legacy ${redirect.from} redirects to ${redirect.to}`, async ({ page }) => {
      await page.goto(redirect.from);
      await expect(page).toHaveURL(new RegExp(`${redirect.to.replace(/[/]/g, '\\/')}$`));
    });
  }

  test('legacy ?page=home stays on the homepage (no redirect loop)', async ({ page }) => {
    const response = await page.goto('/?page=home');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(/Your dog deserves/);
  });

  test('unknown legacy params fall back to the homepage', async ({ page }) => {
    const response = await page.goto('/?page=does-not-exist');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(/Your dog deserves/);
  });

  test('desktop nav links navigate to real routes', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop nav-links row is hidden behind the hamburger on mobile');
    await page.goto('/');
    for (const [label, expectedPath] of [
      ['How It Works', '/how-it-works'],
      ['Safety & Trust', '/safety'],
      ['Williamsburg', '/neighborhoods/williamsburg'],
      ['Reviews', '/reviews'],
    ] as const) {
      await page.getByRole('link', { name: label }).first().click();
      await expect(page).toHaveURL(new RegExp(`${expectedPath.replace(/[/]/g, '\\/')}$`));
      await page.goBack();
    }
  });

  test('mobile hamburger menu opens and its links navigate', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-menu-only interaction');
    await page.goto('/');
    await page.locator('#nav-hamburger-toggle').click();
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toBeVisible();
    await mobileMenu.getByRole('link', { name: 'About Us' }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test('every "book" CTA reaches /book', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Book Luis, for a Meet & Greet/ }).first().click();
    await expect(page).toHaveURL(/\/book$/);

    await page.goto('/');
    await page.getByRole('link', { name: 'Book a Walk', exact: true }).first().click();
    await expect(page).toHaveURL(/\/book$/);

    await page.goto('/neighborhoods/williamsburg');
    await page.getByRole('link', { name: /Book a Walk in Williamsburg/ }).click();
    await expect(page).toHaveURL(/\/book$/);
  });

  test('no alert() fires while browsing the former fake-form pages', async ({ page }) => {
    await page.goto('/services');
    await page.goto('/book');
    await page.goto('/contact');
    // failOnDialog (registered in beforeEach) would have thrown by now if any
    // of the removed mock "Book a Service" / "Ask a Question" alerts fired.
  });

  test('/playground/service-cards returns 404 in production', async ({ page }) => {
    // This suite's webServer always runs `npm run start` (a production
    // build) — `process.env.NODE_ENV` inside this test file describes the
    // test runner's own process, not the server's, so the only thing safe to
    // assert here is production's 404. Dev-mode reachability (`npm run dev`)
    // is verified manually and reported in the P2A handoff; automating it
    // would need a second Playwright project pointed at a dev server via
    // E2E_BASE_URL.
    const response = await page.goto('/playground/service-cards');
    expect(response?.status()).toBe(404);
  });

  test('disabled homepage sections never render', async ({ page }) => {
    await page.goto('/');
    for (const id of [
      'home-personalized-care-pin-stage',
      'home-other-services-section',
      'home-weekday-benefits-section',
      'home-visit-includes-section',
      'founder-quote-section',
      'home-williamsburg-hood-card',
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(0);
    }
  });
});

// P4: 375/768/1440 responsive check. `document.body.scrollWidth` exceeding
// the viewport is exactly the class of bug the /contact grid-item overflow
// was (scrollWidth 1884px at a 1440px viewport, 720px at 375px) — this would
// have caught it on every route, not just the one a screenshot happened to
// catch.
test.describe('no horizontal overflow at any checked width', () => {
  for (const width of [375, 768, 1440] as const) {
    for (const route of ROUTES) {
      test(`${route.path} at ${width}px has no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        // +1px tolerance for sub-pixel layout rounding, not for real overflow.
        expect(scrollWidth).toBeLessThanOrEqual(width + 1);
      });
    }
  }
});

test.describe('keyboard access', () => {
  test('desktop nav is reachable and operable by keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop nav-links row is hidden behind the hamburger on mobile');
    await page.goto('/');
    const bookCta = page.locator('#main-nav .nav-cta');
    await bookCta.focus();
    await expect(bookCta).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/book$/);
  });

  test('mobile hamburger toggle opens the menu on Enter, not just click', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-menu-only interaction');
    await page.goto('/');
    const toggle = page.locator('#nav-hamburger-toggle');
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mobile-menu')).toBeVisible();
  });

  test('booking form fields are reachable by Tab', async ({ page }) => {
    await page.goto('/book');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    let reachedFormField = false;
    for (let i = 0; i < 25 && !reachedFormField; i++) {
      await page.keyboard.press('Tab');
      reachedFormField = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && el.closest('#book-form-body') !== null;
      });
    }
    expect(reachedFormField).toBe(true);
  });
});

test.describe('prefers-reduced-motion', () => {
  test('home hero content is visible immediately, not waiting on an animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // useHomeHeroMotion (components/marketing/hooks) skips its entrance
    // timeline entirely under reduced motion — nothing here is ever hidden
    // via CSS pending a GSAP tween, so all of this should already be visible.
    await expect(page.locator('.hero-h1')).toBeVisible();
    await expect(page.locator('.hero-eyebrow')).toBeVisible();
    await expect(page.locator('.hero-actions')).toBeVisible();
    await expect(page.locator('.hero-stats')).toBeVisible();
  });
});
