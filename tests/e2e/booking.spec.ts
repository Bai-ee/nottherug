import { test, expect, type Page } from '@playwright/test';

const PANE_ID = 'book-tab-meetgreet';

async function fillThroughWrapUpStep(page: Page) {
  await page.goto('/book');

  await page.fill(`#${PANE_ID}-owner-name`, 'E2E Test Owner');
  await page.fill(`#${PANE_ID}-phone`, '(347) 555-0100');
  await page.fill(`#${PANE_ID}-email`, 'e2e@example.test');
  await page.getByRole('button', { name: 'Next →' }).click();

  await page.fill(`#${PANE_ID}-dog-name`, 'Biscuit');
  await page.fill(`#${PANE_ID}-breed-age`, 'Golden, 3 years');
  await page.getByRole('button', { name: 'Next →' }).click();

  await page.getByRole('button', { name: 'Next →' }).click(); // care step — defaults are valid
  await page.getByRole('button', { name: 'Next →' }).click(); // quirks step — nothing required
}

test.describe('booking form', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    const url = baseURL ?? 'http://127.0.0.1:3000';
    try {
      const res = await page.request.get(url, { timeout: 5000 });
      if (!res.ok()) test.skip(true, `Server at ${url} responded ${res.status()} — skipping booking E2E`);
    } catch {
      test.skip(true, `No server reachable at ${url} — skipping booking E2E (run "npm run build && npm run start" first)`);
    }

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
    await page.goto('/book');

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

  test('phone consultation unchecked: success offers scheduling, not a completed appointment', async ({ page }) => {
    await fillThroughWrapUpStep(page);

    await page.getByRole('button', { name: 'Request My Free Meet & Greet' }).click();

    await expect(page.getByText(/be in touch/i)).toBeVisible();

    // Whether NEXT_PUBLIC_CALENDLY_URL is configured for this build or not,
    // the visitor is offered a scheduling step — either the dialog opens
    // automatically, or a button to open it is shown. Opening it is not
    // itself treated as a completed booking (no separate "confirmed" state).
    const modal = page.locator('#calendly-modal');
    const scheduleButton = page.getByRole('button', { name: /Schedule your Meet & Greet/ });
    await expect(modal.or(scheduleButton)).toBeVisible();
  });
});
