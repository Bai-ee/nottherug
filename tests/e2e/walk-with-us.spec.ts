import { test, expect, type Page } from '@playwright/test';
import { requireServer } from './helpers/serverGate';

// The on-call walker application (plans/011 §7.1), at the desktop and mobile
// widths the config runs. The apply API is intercepted, so nothing is written
// and no email is sent.
const PANE = 'walk-with-us-application';

async function pick(page: Page, field: string, value: string) {
  await page.locator(`#${PANE}-${field}-${value}`).check();
}

test.describe('on-call walker application', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    const url = baseURL ?? 'http://127.0.0.1:3000';
    await requireServer(page, `${url}/walk-with-us`, 'walk-with-us E2E');
  });

  test('leads with the on-call terms', async ({ page }) => {
    await page.goto('/walk-with-us');
    await expect(page.locator('h1')).toHaveText(/Join Our Team/i);
    await expect(page.locator('#walk-with-us-term-notice')).toContainText('24');
    await expect(page.locator('#walk-with-us-term-notice')).toContainText('premium');
    await expect(page.locator('#walk-with-us-term-hours')).toContainText('not guaranteed');
  });

  test('keeps partial answers across a refresh', async ({ page }) => {
    await page.goto('/walk-with-us');
    await page.fill(`#${PANE}-field-fullName`, 'Sam Rivera');
    await pick(page, 'cover24h', 'sometimes');
    await page.getByRole('button', { name: 'Monday Morning' }).click();
    await page.reload();
    await expect(page.locator(`#${PANE}-field-fullName`)).toHaveValue('Sam Rivera');
    await expect(page.locator(`#${PANE}-cover24h-sometimes`)).toBeChecked();
    await expect(page.getByRole('button', { name: 'Monday Morning' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('lists every question, validates, and submits every answer', async ({ page }) => {
    let posted: Record<string, unknown> | null = null;
    await page.route('**/api/bench/apply', async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true, id: `bench_${'a'.repeat(32)}` } });
    });

    await page.goto('/walk-with-us?src=indeed&utm_source=indeed&utm_medium=job_post&utm_campaign=not-allowed');

    // Submitting with missing answers is blocked.
    await page.getByRole('button', { name: 'Apply to Not The Rug' }).click();
    await expect(page.locator(`#${PANE}-step-alert`)).not.toBeEmpty();

    await page.fill(`#${PANE}-field-fullName`, 'Sam Rivera');
    await page.fill(`#${PANE}-field-email`, 'sam@example.test');
    await page.fill(`#${PANE}-field-phone`, '(347) 555-0101');
    await page.fill(`#${PANE}-field-homeNeighborhood`, 'Greenpoint');
    await pick(page, 'travelToWilliamsburg', 'explain');
    await page.fill(`#${PANE}-field-travelExplain`, 'Only by bike, so rain slows me down.');
    await page.locator(`#${PANE}-workType-on_call`).check();
    await page.locator(`#${PANE}-workType-part_time`).check();
    await page.fill(`#${PANE}-field-weeklyHoursWanted`, '15 hours');
    await pick(page, 'scheduleType', 'weekdays');
    await page.fill(`#${PANE}-field-regularStartDate`, '2026-11-01');

    await pick(page, 'cover24h', 'sometimes');
    await page.getByRole('button', { name: 'Monday Morning' }).click();
    await page.getByRole('button', { name: 'Saturday Evening' }).click();
    await expect(page.getByRole('button', { name: 'Monday Morning' })).toHaveAttribute('aria-pressed', 'true');
    await pick(page, 'noticeNeeded', '4_12h');
    await pick(page, 'sameDayEmergency', 'yes');
    await pick(page, 'responseSpeed', '1hr');
    await pick(page, 'notifyBy', 'text');
    await expect(page.locator(`#${PANE}-field-smsConsent`)).not.toBeChecked();
    await page.fill(`#${PANE}-field-travelTime`, '15 minutes');
    await page.fill(`#${PANE}-field-weeklyCapacity`, '5 walks');
    await page.fill(`#${PANE}-field-trainingStartDate`, '2026-10-15');

    await page.fill(`#${PANE}-field-experience`, 'Two labs next door for a year.');
    await page.fill(`#${PANE}-field-specialDogExperience`, 'Fostered a senior beagle.');
    await pick(page, 'multiDogComfort', 'need_training');
    await pick(page, 'physicalDuties', 'yes');

    await pick(page, 'willingTraining', 'yes');
    await pick(page, 'phoneProtocol', 'yes');
    await page.fill(`#${PANE}-field-scenarioRefusesToLeave`, 'Stay calm, then text Luis.');
    await page.fill(`#${PANE}-field-scenarioLooseHarness`, 'Refit it before leaving.');
    await page.fill(`#${PANE}-field-scenarioCantMakeShift`, 'Tell Luis right away.');

    await page.fill(`#${PANE}-field-whyOnCall`, 'My weekdays are flexible.');
    await expect(page.locator(`#${PANE}-ai-notice`)).toBeVisible();

    // The confirmation is required.
    await page.getByRole('button', { name: 'Apply to Not The Rug' }).click();
    await expect(page.locator(`#${PANE}-step-alert`)).toContainText('confirm');

    await page.locator(`#${PANE}-field-confirmed`).check();
    await page.getByRole('button', { name: 'Apply to Not The Rug' }).click();

    await expect(page.locator(`#${PANE}-done-panel`)).toContainText('contact you if there’s a potential fit for our on-call team');
    expect(posted).toMatchObject({
      fullName: 'Sam Rivera',
      travelToWilliamsburg: 'explain',
      travelExplain: 'Only by bike, so rain slows me down.',
      workTypes: ['on_call', 'part_time'],
      weeklyHoursWanted: '15 hours',
      scheduleType: 'weekdays',
      availability: [
        { weekday: 1, block: 'morning' },
        { weekday: 6, block: 'evening' },
      ],
      notifyBy: 'text',
      smsConsent: false,
      confirmed: true,
      scenarioLooseHarness: 'Refit it before leaving.',
      source: 'indeed',
      utm: { source: 'indeed', medium: 'job_post' },
    });
  });

  test('Contact Us opens the contact modal', async ({ page }) => {
    await page.goto('/walk-with-us');
    await page.locator(`#${PANE}-contact-us-trigger`).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('has no horizontal scroll at this width', async ({ page }) => {
    await page.goto('/walk-with-us');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
