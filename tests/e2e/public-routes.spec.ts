import { test, expect, type Page } from '@playwright/test';
import { suppressWelcomeModal } from './helpers/welcomeModal';

// Covers plans/002-production-readiness.md P2A acceptance: every new marketing
// route is directly loadable with a real <h1>, refresh/back/forward work,
// legacy `?page=`/`?hood=` links redirect, nav/CTA links use real navigation,
// no `alert()` ships anywhere, the playground is prod-gated, and disabled
// homepage sections never render.

// Every headline is set as display lines separated by <br> and upper-cased in
// CSS, so `textContent` runs the words together ("Your dogdeserves…"). These
// patterns are matched against the normalized innerText (see expectH1) — the
// sentence a visitor actually reads — hence the /i flag.
// The home h1 carries two copies (components/marketing/HomeHero.tsx): the
// desktop lines and the phone lines, shown by breakpoint. Either is the one
// sentence a visitor reads at that width.
const HOME_H1 = /^(Your dog deserves someone they know\.|Professional dog walkers)$/i;
const ABOUT_H1 = /^15 years of walks, one neighborhood$/i;
const SAFETY_H1 = /^Why trust matters more than price$/i;

const ROUTES: Array<{ path: string; h1: RegExp }> = [
  { path: '/', h1: HOME_H1 },
  { path: '/about', h1: ABOUT_H1 },
  { path: '/safety', h1: SAFETY_H1 },
  { path: '/neighborhoods/williamsburg', h1: /^Williamsburg is our backyard$/i },
  { path: '/reviews', h1: /^What Brooklyn dog owners say$/i },
  { path: '/book', h1: /^Book your free Meet & Greet$/i },
  // `.` stands in for the apostrophe: the copy uses a typographic one.
  { path: '/contact', h1: /^We.re real people with a real number$/i },
];

// The standalone /services and /how-it-works routes were folded into the home
// page; the old routes and their legacy `?page=` links land on those anchors.
const SERVICES_ANCHOR = '/#home-personalized-care-section';
const HOW_IT_WORKS_ANCHOR = '/#home-how-it-works-block';
// The Williamsburg route's content also runs on the home page — the parks
// list under the neighborhood claim in the closing trust band — and the nav
// entry scrolls there instead of leaving the page (the route still exists).
const WILLIAMSBURG_ANCHOR = '/#home-closing-parks-row';

const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/?page=how-it-works', to: HOW_IT_WORKS_ANCHOR },
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

// Asserts the page's own headline. innerText (not textContent) so the <br>
// display line breaks come back as whitespace instead of being dropped, then
// collapsed to single spaces — the full sentence, not a fragment of it.
async function expectH1(page: Page, expected: RegExp) {
  await expect
    .poll(async () => (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim())
    .toMatch(expected);
}

// The home route opens behind a full-screen loading wipe: HomeIntroOverlay
// sets `data-home-intro` on <html> before first paint and globals.css hides
// #main-nav and #page-home until it is 'done'. Nothing on home can be clicked
// or focused before that, so every home navigation here waits the wipe out.
// Other routes never set the attribute and fall straight through.
async function gotoSettled(page: Page, path: string) {
  const response = await page.goto(path);
  await page.waitForFunction(() => {
    const state = document.documentElement.dataset.homeIntro;
    return state === undefined || state === 'done';
  });
  return response;
}

test.describe('public routes', () => {
  test.beforeEach(({ page }) => failOnDialog(page));

  for (const route of ROUTES) {
    test(`${route.path} loads directly with a 200 and its own <h1>`, async ({ page }) => {
      const response = await gotoSettled(page, route.path);
      expect(response?.status()).toBe(200);
      await expectH1(page, route.h1);
    });
  }

  test('refresh preserves the page (no client-side-only routing)', async ({ page }) => {
    await page.goto('/safety');
    await expectH1(page, SAFETY_H1);
    await page.reload();
    await expectH1(page, SAFETY_H1);
  });

  test('browser back/forward restores the right page', async ({ page }) => {
    // Navigates via goto() rather than clicking nav links, so this exercises
    // real-route back/forward on both the desktop nav-links row and the
    // mobile layout (where the nav-links row is hidden behind the hamburger).
    await gotoSettled(page, '/');
    await page.goto('/safety');
    await expect(page).toHaveURL(/\/safety$/);
    await expectH1(page, SAFETY_H1);

    await page.goto('/about');
    await expect(page).toHaveURL(/\/about$/);
    await expectH1(page, ABOUT_H1);

    await page.goBack();
    await expect(page).toHaveURL(/\/safety$/);
    await expectH1(page, SAFETY_H1);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expectH1(page, HOME_H1);

    await page.goForward();
    await expect(page).toHaveURL(/\/safety$/);
    await expectH1(page, SAFETY_H1);
  });

  for (const redirect of LEGACY_REDIRECTS) {
    test(`legacy ${redirect.from} redirects to ${redirect.to}`, async ({ page }) => {
      await page.goto(redirect.from);
      await expect(page).toHaveURL(new RegExp(`${redirect.to.replace(/[/]/g, '\\/')}$`));
    });
  }

  test('retired /services redirects to the home rates panel', async ({ page }) => {
    await gotoSettled(page, '/services');
    await expect(page).toHaveURL(new RegExp(`${SERVICES_ANCHOR.replace(/[/]/g, '\\/')}$`));
    await expectH1(page, HOME_H1);
  });

  test('legacy ?page=services lands on the home rates panel', async ({ page }) => {
    await page.goto('/?page=services');
    await expect(page).toHaveURL(new RegExp(`${SERVICES_ANCHOR.replace(/[/]/g, '\\/')}$`));
  });

  test('legacy ?page=home stays on the homepage (no redirect loop)', async ({ page }) => {
    const response = await gotoSettled(page, '/?page=home');
    expect(response?.status()).toBe(200);
    await expectH1(page, HOME_H1);
  });

  test('unknown legacy params fall back to the homepage', async ({ page }) => {
    const response = await gotoSettled(page, '/?page=does-not-exist');
    expect(response?.status()).toBe(200);
    await expectH1(page, HOME_H1);
  });

  // The bar carries five plain-language entries (SiteNav.NAV_LINKS); each
  // still lands on the band that answers it. Scoped to .nav-links because the
  // footer links to the same anchors under its own labels. Safety, Reviews and
  // Contact are footer-only now; the standalone routes they used to point at
  // are still live.
  test('desktop nav links reach their home-page band', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop nav-links row is hidden behind the hamburger on mobile');
    await suppressWelcomeModal(page);
    await gotoSettled(page, '/');
    for (const [label, expectedPath] of [
      ['What We Do', '/#home-personalized-care-section'],
      ['Who Does It', '/#home-team-section'],
      ['Where We Do It', WILLIAMSBURG_ANCHOR],
      ['How It Works', HOW_IT_WORKS_ANCHOR],
      ['Let’s Get Started', '/#home-contact-sheet-section'],
    ] as const) {
      await page.locator('.nav-links').getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${expectedPath.replace(/[/]/g, '\\/')}$`));
      await page.goBack();
    }
  });

  test('the nav "Where We Do It" entry scrolls to the home parks list', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop nav-links row is hidden behind the hamburger on mobile');
    await suppressWelcomeModal(page);
    await gotoSettled(page, '/');
    await page.locator('.nav-links').getByRole('link', { name: 'Where We Do It' }).click();
    await expect(page).toHaveURL(new RegExp(`${WILLIAMSBURG_ANCHOR.replace(/[/]/g, '\\/')}$`));
    await expect(page.locator('#home-closing-parks-row')).toBeInViewport();
  });

  test('mobile hamburger menu opens and its links navigate', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-menu-only interaction');
    await suppressWelcomeModal(page);
    await gotoSettled(page, '/');
    await page.locator('#nav-hamburger-toggle').click();
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toBeVisible();

    // The menu's five plain-language entries are home-page anchors now, so on
    // home they scroll to their band and close the menu behind them.
    await mobileMenu.getByRole('link', { name: 'Who Does It' }).click();
    await expect(page).toHaveURL(/\/#home-team-section$/);
    await expect(mobileMenu).toBeHidden();

    // "Login" is the one entry pointing at a separate route, so it is what
    // proves the menu still navigates rather than toggling DOM on the spot.
    await page.locator('#nav-hamburger-toggle').click();
    await mobileMenu.getByRole('link', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('every "book" CTA reaches /book', async ({ page, isMobile }) => {
    // The nav-links row is behind the hamburger on mobile, so the nav CTA is
    // reached through the menu there. Same control, same handler either way.
    async function clickNavBookCta() {
      if (!isMobile) {
        await page.locator('#nav-book-cta').click();
        return;
      }
      await page.locator('#nav-hamburger-toggle').click();
      await page.locator('#mobile-menu-book-cta').click();
    }

    await suppressWelcomeModal(page);
    await gotoSettled(page, '/');
    await page.getByRole('link', { name: /Contact Luis, to Get Started/ }).first().click();
    await expect(page).toHaveURL(/\/book$/);

    // The nav "Book a Walk" is the one booking control that deliberately does
    // not navigate on home: SiteNav.handleBookClick pops the welcome-walk
    // modal there instead, and the URL stays on the home page.
    await gotoSettled(page, '/');
    await clickNavBookCta();
    await expect(page.locator('#welcome-walk-modal')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    // Off home — the only page that renders the modal — the same control is a
    // plain link to /book, which is also home's pre-hydration behaviour.
    await page.goto('/about');
    await clickNavBookCta();
    await expect(page).toHaveURL(/\/book$/);

    await page.goto('/neighborhoods/williamsburg');
    await page.getByRole('link', { name: /Book a Walk in Williamsburg/ }).click();
    await expect(page).toHaveURL(/\/book$/);
  });

  test('no alert() fires while browsing the former fake-form pages', async ({ page }) => {
    await page.goto(SERVICES_ANCHOR);
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
    // On home the nav CTA opens the welcome-walk modal rather than leaving the
    // page, so keyboard operability is proved on both of its outcomes: the
    // modal here, and the /book navigation the same control does off home.
    await gotoSettled(page, '/');
    const homeBookCta = page.locator('#main-nav .nav-cta');
    await homeBookCta.focus();
    await expect(homeBookCta).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#welcome-walk-modal')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/about');
    const bookCta = page.locator('#main-nav .nav-cta');
    await bookCta.focus();
    await expect(bookCta).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/book$/);
  });

  test('mobile hamburger toggle opens the menu on Enter, not just click', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-menu-only interaction');
    await gotoSettled(page, '/');
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
