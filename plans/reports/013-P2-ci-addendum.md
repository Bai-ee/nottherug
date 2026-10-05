# Plan 013 — P2 CI addendum (candidate 35bb336)

Docs-only addendum to [013-P2-report.md](013-P2-report.md) §3. No code changed. Kept out of the candidate commit so the reviewed SHA stays `35bb336da749e496357f1c459bc560e2ded83aee`.

## Push and Vercel

- Operator pushed `codex/client-handoff-hardening`; `git ls-remote` shows `35bb336da749e496357f1c459bc560e2ded83aee`.
- CI triggers only on pushes to `main` and on pull requests, so a draft PR was opened at the operator's request: https://github.com/Bai-ee/nottherug/pull/1 (draft, base `main`, not to be merged).
- **Vercel: no deployment was created.** `list_deployments` filtered to branch `codex/client-handoff-hardening` returned 0, and no deployment of any kind exists for the project since the push (newest remains production `dpl_3VkTLf7F6PenqisfW3ayW1AcXRR1` at `905206d`). The `vercel.json` `git.deploymentEnabled` rule therefore held for a slash-named branch and its PR.

## GitHub Actions

Run [37328742633](https://github.com/Bai-ee/nottherug/actions/runs/37328742633), event `pull_request`, head `35bb336da749e496357f1c459bc560e2ded83aee`, conclusion **success**, 2026-10-05T14:56:08Z → 15:01:50Z.

| Job | Conclusion | Result from job log |
| --- | --- | --- |
| `check` | success | lint, pipeline lint, build, typecheck; `npm test` 612 passed, 100 skipped (emulator suites, not the gate) |
| `emulators` | success | 76 files, **712 passed (0 skipped)**; guard: "Required emulator run OK: 101 emulator-backed tests passed across 11 suites; 712 total passed, 0 skipped." |
| `e2e` | success | 156 passed, 20 skipped (6 analytics → `e2e-analytics`; 14 deliberate device exclusions), 4.0 min |
| `e2e-analytics` | success | **6 passed** |

The runner results match the local reproduction on `69a2beb` exactly. This closes the runner-side unknowns listed in the report (YAML accepted, `setup-java`, firebase-tools 15.15.0 via `npx`, emulator start, Playwright install, Linux/WebKit). No job log shows an npm audit. Not yet proven: the negative path on a runner (CI with emulators unavailable failing) — demonstrated locally only — and artifact upload, which runs only on failure.

## Still open (owner)

`main` branch protection is not configured, so these four checks are not yet *required* (report, Operations step 3).
