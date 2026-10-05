# Plan 013 P2 — Worker F (F05: CI actually runs the security/integration suites)

Branch `013/p2-f`, base 0068493. Verified locally; GitHub Actions cannot be run from here.

## CI design (`.github/workflows/ci.yml`)
All installs: `npm ci --no-audit`, plus workflow-level `npm_config_audit: 'false'`. Node 24.

| Job (name to require) | What it gates |
|---|---|
| `check` | lint, lint:pipeline, build, typecheck, `npm test`. Emulator suites skip here with a reason (97 skips, unchanged). Kept as-is rather than excluding the files: excluding them exposes a latent coupling (see Risks). It is no longer the only unit gate. |
| `emulators` (new) | Temurin 21, `npx --yes firebase-tools@15.15.0 emulators:exec --only firestore,storage --project demo-not-the-rug "npm run test:emulators"`. Jars cached at `~/.cache/firebase/emulators`. |
| `e2e` | Unchanged build/run (production-like, no analytics flags); now also writes `playwright-report/`. |
| `e2e-analytics` (new) | Separate build with `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, `NEXT_PUBLIC_ANALYTICS_TEST_MODE=true`; `E2E_ANALYTICS_ENABLED=1`; runs `npm run test:e2e:analytics` (`playwright.analytics.config.ts`, analytics specs only) under `emulators:exec --only firestore` so the server's `/api/track` writes land in the emulator (the specs assert the real browser POST, so interception is not needed; nothing can reach a real project). Events are `mode:'test'`. Separate job (not flags on `e2e`) so the default job stays production-like. The config throws if `E2E_ANALYTICS_ENABLED` is not 1. |

Required-emulator mode: `tests/support/emulatorGate.ts`. With `REQUIRE_EMULATORS=1`, an unreachable Firestore/Storage emulator, or a host not supplied via `FIRESTORE_EMULATOR_HOST` / `FIREBASE_STORAGE_EMULATOR_HOST`, throws in `beforeAll`. Without it, skip-with-reason as before (8080/9199 defaults only here). Hosts are captured at import, so non-default ports work. 8 files use it directly; the 3 rules suites via `rules-emulator.ts`. Only gating code changed.
Zero-executed guard: `npm run test:emulators` writes the vitest JSON report and `tests/support/check-required-emulator-run.mjs` fails unless each of the 11 suites in `tests/support/emulatorSuites.json` passed >=1 test and the whole run has 0 skipped/todo/failed.
Route outages: `tests/e2e/helpers/serverGate.ts` — booking/walk-with-us throw when `CI` is set, skip locally.
Artifacts on failure: `playwright-report/` + `test-results/` (traces) for both E2E jobs; vitest JSON for `emulators`. Reporter in CI is now `github`, `list`, `html` (outputFolder `playwright-report`), so the directory exists. `E2E_PORT` env added to the config (default 3000) for local runs.

## Local proof
| Check | Command (essence) | Result |
|---|---|---|
| (a) required emulators | `firebase emulators:exec --config firebase.worker.json (ports 8680/9699) ... "npm run test:emulators"` | exit 0; 692 passed, 0 skipped; 98 emulator-backed tests across 11 suites ("Required emulator run OK") |
| (b) emulators absent | `FIRESTORE_EMULATOR_HOST=127.0.0.1:1 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:2 REQUIRE_EMULATORS=1 npx vitest run` | exit 1; 11 files fail with "REQUIRE_EMULATORS=1 but the Firestore emulator is unreachable at 127.0.0.1:1 ..."; host-unset variant fails with "FIRESTORE_EMULATOR_HOST is not set" |
| plain skip mode | same hosts, no REQUIRE | exit 0; 595 passed, 97 skipped |
| (c) analytics E2E | analytics build, `npm run test:e2e:analytics` under emulator | exit 0; 6 passed (was 6 skipped) |
| (c) full E2E w/ flags | same build, whole suite under emulator | exit 0; 162 passed, 14 skipped (device exclusions only), 0 flaky |
| (d) default E2E | default build, `CI=1` | exit 0; 156 passed, 20 skipped (14 device + 6 analytics) — unchanged from P1 |
| analytics config on default build | | fails (no page_view), so a forgotten flag cannot pass |
| (e) `CI=1`, no server | booking + walk-with-us, `E2E_BASE_URL=http://127.0.0.1:3399` | 16 failed, 0 skipped, message "Failing instead of skipping because CI is set"; without CI: 16 skipped |
| lint / typecheck | | 0 errors; 1 pre-existing `no-img-element` warning in SchedulingDialog; typecheck clean |

Workflow YAML parsed with ruby `YAML.load_file` (4 jobs, steps as intended).

## Skip inventory
Before: unit 97 skipped (emulator); E2E 20 skipped (6 analytics-flag + 14 device).
After (CI): unit emulator skips 0 and enforced; E2E analytics 0; remaining 14 are deliberate device exclusions (desktop-only vs mobile-only specs in contact-modal, section-nav, public-routes, error-boundaries; section-nav also chromium-only), one per spec/project pairing. The `check` job still prints the 97 emulator skips by design.

## Stale spec fixed
`analytics-journey.spec.ts` had never run since the footer CTA started opening the welcome dialog in place (`opensWelcomeModal`); it waited for navigation to `/book`. Replaced the `waitForURL` with a direct `page.goto('/book')` after asserting the `footer_book` event. Assertions otherwise unchanged.

## Only a real GitHub run can prove
Actions syntax acceptance, `setup-java`/jar cache behavior, `npx firebase-tools@15.15.0` download on a runner, Playwright browser install, Linux/WebKit timing, artifact upload paths, and that branch protection requires the jobs.

## Branch protection (owner to mark required)
`check`, `e2e`, `emulators`, `e2e-analytics` (the job ids; verify displayed names under Settings > Branches).

## Risks / notes
- `tests/unit/upstream-deadlines.test.ts` (not mine) assigns `FIRESTORE_EMULATOR_HOST` after its hoisted imports; run alone with the variable unset it fails 6 tests (also at baseline). It passes in full runs only when another file leaves the variable set. Fix: `vi.hoisted` env assignment. This is why `check` was not changed to exclude emulator files.
- Port 8080 here is an unrelated process answering HTTP; plain `npm test` locally with default hosts fails emulator suites (baseline behavior). Use the explicit-host commands above.
- Analytics E2E asserts the client request, not persistence; persistence is covered by the emulator round-trip unit suite.
