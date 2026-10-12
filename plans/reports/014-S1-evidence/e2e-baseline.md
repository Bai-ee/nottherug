# 014 S1 baseline (branch award/s1 @ f057102)

| Check | Result |
|---|---|
| `npm run lint` | exit 0, no output |
| `npx tsc --noEmit` | exit 0 (then `git checkout next-env.d.ts`) |
| `npm test` (vitest) | 83 files passed; 700 passed, 102 skipped (802) |
| Playwright full public suite | 208 passed, 22 skipped, 0 failed, 0 flaky (45s) |

## Re-run unchanged (from worktree root)
```
source plans/reports/014-S1-evidence/e2e-env.sh   # dummy Firebase env + E2E_PORT=3018, unsets CI/E2E_BASE_URL
lsof -i :3018                                      # must print nothing (else reuseExistingServer would reuse it)
npm run build
npm run test:e2e
```
Config: playwright.config.ts, projects desktop (1440x900) + mobile (iPhone 13), same command as CI job `e2e`. Server: `npm run start -- --port 3018`, started/stopped by Playwright.
Excluded: `playwright.analytics.config.ts` (needs analytics-enabled build + Firestore emulator; analytics-*.spec skip in the normal run). admin-auth.spec ran (needs no creds).
Skips (22, by design): analytics-* (6), desktop-only/mobile-only guards in contact-modal, error-boundaries, home-entrance, home-team-dialog, public-routes, section-nav.
Noise: "[bench] settings read failed ... invalid_grant" from dummy creds; harmless.
