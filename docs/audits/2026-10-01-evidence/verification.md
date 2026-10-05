# Audit evidence

Baseline: `905206d6c5e046eee6c42b44b42efd05ad0f1cf8`. Audit started September 30 (America/Chicago) and completed October 1, 2026. Read observations at their recorded timestamps; production settings can subsequently change.

## Results

| Command/check | Outcome |
| --- | --- |
| `npm run lint` | Exit 0; 0 errors, 1 scheduling-image warning |
| `npm run lint:pipeline` | Exit 0; 0 errors, 1 unused-import warning |
| `npm run build` | Exit 0 with permitted Google Fonts access; [build output](build-results.txt) |
| `npm run typecheck` | Exit 0, after successful build |
| `npm test` | Exit 0; 66 files, 538 passed, 61 skipped; unavailable emulator suites |
| `npm run verify:assets` | Exit 0 |
| `E2E_BASE_URL=http://127.0.0.1:3194 npx playwright test --workers=4` | Exit 0; 156 passed, 20 skipped, 58.1 seconds |
| Four targeted defect reproductions | Exit 0; [results](reproduction-results.txt) |
| Live browser/resource/HTTP probe | [Raw public-only JSON](live-probe.json) |
| `npm audit --json` | Incomplete: sandbox network failure, followed by escalation rejected for dependency metadata export. Approval asked; no affirmative authorization received during audit. |

Local E2E server command: `FIRESTORE_EMULATOR_HOST=127.0.0.1:1 ANALYTICS_TRACKING_DISABLED=true npx next start --hostname 127.0.0.1 --port 3194`. The intentionally unavailable loopback database prevents access to the production Firestore. Application APIs in submission tests use the existing mocks. The server was stopped after testing. A build-generated `next-env.d.ts` change was restored, leaving application source unchanged.

The live probe used Chromium at 375x900 and 1440x900 in separate cold browser contexts, no CPU/network throttling, no clicks or submissions, and intercepted `/api/track` with a synthetic 202 response. It waited for the intro to finish and the hero CTA to reach visible/opacity 1 before sampling. `ctaReadyAt` is elapsed navigation time at that observation, not an INP measurement. LCP is the last observed candidate, not a field percentile; on mobile the loading overlay itself was the candidate. CLS was zero in both samples. Resource totals are completed entries only and do not include all video bytes. These samples establish an optimization target, not a universal performance score.

Build/deployment observations: Vercel CLI resolved the production alias to `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1`; its build log showed repository `Bai-ee/nottherug`, branch `main`, commit `905206d`, Node 24. Live headers included HSTS, nosniff, SAMEORIGIN, strict-origin-when-cross-origin, and restricted camera/microphone/geolocation/payment/USB permissions.

## Re-running the isolated defect reproductions

The source files are stored as `.txt` so they do not join the production suite or accidentally lock in broken behavior. They contain synthetic data and mocked providers only. From an isolated baseline checkout, copy each to a new temporary filename under `tests/unit/`, run those two files explicitly with Vitest, then remove only those copies. Do not overwrite existing files. They expect the baseline defects and should stop passing once the corresponding behavior is fixed.

- [Intake reproductions](intake-repro.test.ts.txt): five captures consume the final submission budget; concurrent conversion is overwritten by capture; over-4,000-byte Unicode body is accepted.
- [Resume reproduction](resume-repro.test.ts.txt): two simultaneous uploads reuse one valid token and overwrite a concurrent administrative note.

During implementation, convert these into assertions of correct behavior and add real emulator conflict tests. Mocked ordering tests establish the source-level defect but do not validate a future Firestore concurrency primitive.

## Explicitly unverified

Fresh dependency installation; current advisory inventory; production Firebase rules/provider/TTL settings; positive admin Google login; production email delivery; Calendly's end-to-end booking; production backup/restore; repository branch-protection settings; real-user performance; comprehensive accessibility; full Git-history secret scanning. A scoped credential-pattern search found only expected variable/config references and no tracked local environment file; that is not a comprehensive secret-scan certificate.
