import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * Analytics-enabled E2E. The three analytics specs need a build made with
 *   NEXT_PUBLIC_ANALYTICS_ENABLED=true NEXT_PUBLIC_ANALYTICS_TEST_MODE=true
 * (build-time, inlined by Next.js) and E2E_ANALYTICS_ENABLED=1. Test mode tags
 * every event mode:'test', so this traffic never mixes with production
 * numbers. The CI job builds with those flags and runs this config under the
 * Firestore emulator, so /api/track writes land in the emulator.
 *
 * Run: see the `e2e-analytics` job in .github/workflows/ci.yml.
 */
if (process.env.E2E_ANALYTICS_ENABLED !== '1') {
  // Without it every analytics spec skips, and a skip is not a pass.
  throw new Error('playwright.analytics.config.ts requires E2E_ANALYTICS_ENABLED=1 (and an analytics-enabled build).');
}

export default defineConfig({
  ...base,
  testMatch: /analytics-.*\.spec\.ts/,
  webServer: process.env.E2E_BASE_URL ? undefined : base.webServer,
});
