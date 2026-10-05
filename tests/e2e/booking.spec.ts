import { test, expect, type Page } from '@playwright/test';
import { requireServer } from './helpers/serverGate';
import { waitForHydration } from './helpers/hydration';

const PANE_ID = 'book-tab-meetgreet';

/** Opens /book and waits until the form is interactive (React hydrated). */
async function openBookingForm(page: Page) {
  await page.goto('/book');
  await waitForHydration(page, `#${PANE_ID}-owner-name`);
}

async function fillThroughWrapUpStep(page: Page) {
  await openBookingForm(page);

  await page.fill(`#${PANE_ID}-owner-name`, 'E2E Test Owner');
  await page.fill(`#${PANE_ID}-phone`, '(347) 555-0100');
  await page.fill(`#${PANE_ID}-email`, 'e2e@example.test');
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByText(/^Step 2 of/)).toBeVisible();

  await page.fill(`#${PANE_ID}-dog-name`, 'Biscuit');
  await page.fill(`#${PANE_ID}-breed-age`, 'Golden, 3 years');
  await page.getByRole('button', { name: 'Next →' }).click();

  await page.getByRole('button', { name: 'Next →' }).click(); // care step — defaults are valid
  await page.getByRole('button', { name: 'Next →' }).click(); // quirks step — nothing required
  await expect(page.getByText(/^Step 5 of/)).toBeVisible();
}

test.describe('booking form', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    const url = baseURL ?? 'http://127.0.0.1:3000';
    await requireServer(page, url, 'booking E2E');

    // The route the API contract owns; intercepted so no real lead is ever written.
    await page.route('**/api/leads/meetgreet', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 'e2e-fake-lead', notifications: { founder: 'sent', customer: 'skipped' } }),
      });
    });
  });

  test('phone consultation checked: success message promises a call, Calendly never opens', async ({ page }) => {
    await fillThroughWrapUpStep(page);

    await page.check(`#${PANE_ID}-phone-consult`);
    await page.getByRole('button', { name: 'Request Phone Consultation' }).click();

    await expect(page.getByText(/give you a call/i)).toBeVisible();
    await expect(page.locator('#calendly-modal')).toHaveCount(0);
  });

  test('a progress dot cannot skip ahead of a step that has not validated', async ({ page }) => {
    await openBookingForm(page);

    // Jump straight from step 1 to step 5 without filling anything required.
    await page.getByRole('button', { name: /Go to step 5/ }).click();

    // Blocked: still on step 1, with the required-field error visible.
    await expect(page.getByText(/^Step 1 of/)).toBeVisible();
    await expect(page.getByText(/Please enter your name/i)).toBeVisible();

    // Filling step 1 and stepping forward normally still works.
    await page.fill(`#${PANE_ID}-owner-name`, 'E2E Test Owner');
    await page.fill(`#${PANE_ID}-phone`, '(347) 555-0100');
    await page.fill(`#${PANE_ID}-email`, 'e2e@example.test');

    // Now a dot click can only reach step 2 (the next unvalidated step), not step 5.
    await page.getByRole('button', { name: /Go to step 5/ }).click();
    await expect(page.getByText(/^Step 2 of/)).toBeVisible();
  });

  test('phone consultation unchecked: success thanks the visitor and opens the scheduler', async ({ page }) => {
    await fillThroughWrapUpStep(page);

    await page.getByRole('button', { name: 'Book a Meet & Greet' }).click();

    // One quiet thanks line, and no second "Schedule" call to action: the
    // scheduler opens by itself when Calendly is configured, and a verified
    // booking hands off to the welcome modal's thank-you view.
    await expect(page.getByText(/Thanks for signing up/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Schedule your Meet & Greet/ })).toHaveCount(0);
    if (process.env.NEXT_PUBLIC_CALENDLY_URL) {
      await expect(page.locator('#calendly-modal')).toBeVisible();
    }
  });
});
