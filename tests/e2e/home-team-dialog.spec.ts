import { test, expect } from '@playwright/test';
import { suppressWelcomeModal } from './helpers/welcomeModal';
import { waitForHomeEffectsAndHeroDecision } from './helpers/hydration';

// The homepage team chips open TeamMemberDialog on a tap or click — never on
// hover — with that walker's bio (the /about copy).

test.describe('home team dialog', () => {
  test.beforeEach(async ({ page }) => {
    await suppressWelcomeModal(page);
    await page.goto('/', { waitUntil: 'load' });
    await waitForHomeEffectsAndHeroDecision(page);
    await page.locator('#home-team-scroller').scrollIntoViewIfNeeded();
  });

  test('hover alone does not open a walker', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no hover on touch');
    await page.locator('#home-team-chip-photo-luis').hover();
    await expect(page.locator('#home-team-preview')).toHaveCount(0);
  });

  test('the photo opens the walker from the keyboard; Escape closes and returns focus', async ({ page }) => {
    // Keyboard, not a tap: WebKit does not focus a tapped button, and focus
    // return is for keyboard users.
    const trigger = page.locator('#home-team-chip-photo-luis').locator('xpath=ancestor::button[1]');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: /Luis · Founder/ });
    await expect(dialog).toBeVisible();
    await expect(page.locator('#home-team-preview-close-btn')).toBeFocused();
    // One paragraph: Luis's bio has no paragraph breaks.
    await expect(dialog.locator('.home-team-preview-bio')).toHaveCount(1);
    await expect(dialog).toContainText('SiriusXM');
    await page.keyboard.press('Escape');
    await expect(page.locator('#home-team-preview')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('the name with its › opens Beth Ann with her bio; the close button and backdrop close it', async ({ page }) => {
    const open = page.locator('#home-team-chip-open-beth-ann');
    await expect(open).toContainText('›');
    await open.click();
    const dialog = page.getByRole('dialog', { name: /Beth Ann · Walker/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.home-team-preview-bio')).toHaveCount(2);
    await expect(dialog).toContainText('Sunday Sounds');
    await page.locator('#home-team-preview-close-btn').click();
    await expect(page.locator('#home-team-preview')).toHaveCount(0);

    await open.click();
    await expect(dialog).toBeVisible();
    // A tap on the dimmed backdrop, clear of the frame, closes it.
    await page.locator('#home-team-preview').click({ position: { x: 6, y: 6 } });
    await expect(page.locator('#home-team-preview')).toHaveCount(0);
  });

  test('the band links to the Join Our Team application', async ({ page }) => {
    await page.locator('#home-team-join-cta').click();
    await expect(page).toHaveURL(/\/walk-with-us$/);
  });
});
