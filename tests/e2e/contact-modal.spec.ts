import { test, expect, type Page } from '@playwright/test';

// Coverage for the contact modal (components/marketing/ContactDialog.tsx) and
// the two entries allowed to open it: Contact Us in the site nav and in the
// footer. Everything else that mentions contact still navigates — the /contact
// route in particular — and that separation is asserted here, because it is
// the one thing a later "make every contact link a modal" change would break.

const openers = [
  { name: 'site nav', trigger: '#nav-contact-us-trigger' },
  { name: 'footer', trigger: '#footer-company-contact-link' },
];

async function isWide(page: Page) {
  return (page.viewportSize()?.width ?? 0) >= 1200;
}

for (const opener of openers) {
  test(`${opener.name} Contact Us opens the modal without navigating`, async ({ page }) => {
    test.skip(!(await isWide(page)), 'both triggers are visible together only on the desktop bar');
    await page.goto('/');
    const url = page.url();

    const trigger = page.locator(opener.trigger);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const dialog = page.locator('#contact-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#contact-modal-phone-link')).toHaveAttribute('href', /^tel:/);
    await expect(page.locator('#contact-modal-email-link')).toHaveAttribute('href', /^mailto:/);
    expect(page.url()).toBe(url); // a button, not a link — the page never moved

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test('the modal traps focus and hands the page back its scroll on close', async ({ page }) => {
  test.skip(!(await isWide(page)), 'exercised once, on the desktop bar');
  await page.goto('/');
  await page.locator('#nav-contact-us-trigger').click();

  // Focus starts on Close and stays inside the sheet as Tab cycles.
  await expect(page.locator('#contact-modal-close-btn')).toBeFocused();
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab');
  await expect(page.locator('#contact-modal-sheet :focus')).toHaveCount(1);
  await expect(page.evaluate(() => document.body.style.overflow)).resolves.toBe('hidden');

  await page.locator('#contact-modal-close-btn').click();
  await expect(page.locator('#contact-modal')).toHaveCount(0);
  await expect(page.evaluate(() => document.body.style.overflow)).resolves.toBe('');
});

test('mobile menu Contact Us opens the modal and closes the menu behind it', async ({ page }) => {
  test.skip(await isWide(page), 'mobile menu only');
  await page.goto('/');

  await page.locator('#nav-hamburger-toggle').tap();
  await page.locator('#mobile-menu-contact-trigger').tap();

  await expect(page.locator('#contact-modal')).toBeVisible();
  await expect(page.locator('#mobile-menu')).toHaveAttribute('data-open', 'false');
});

test('/contact is still a route, not a modal', async ({ page }) => {
  const response = await page.goto('/contact');
  expect(response?.status()).toBe(200);
  await expect(page.locator('#contact-modal')).toHaveCount(0);
  await expect(page.locator('#contact-info-card-shell')).toBeVisible();
});
