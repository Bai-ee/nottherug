# 013 P5 review: Worker N E2E fix + domain docs (diff 2b401af..HEAD)

Code-read only. Nothing built or run.

## Verdict
APPROVE WITH FIXES. The frame-probe design is sound and stronger than the old time bound. No HIGH findings. Two MEDIUM items: two lost product ceilings, and a hydration-ready race that can make "no video request" assertions pass vacuously. One MEDIUM docs omission (Firebase authorized domains / email DNS).

## 1. home-entrance design (no HIGH)
- Can it false-pass if the CTA depended on the video? Not realistically.
  - `inoperableFrames === 0` is asserted over the whole load, plus `inoperableFramesSinceBlocked === 0` over >= 30 frames after the block.
  - Any gate (canplay, loadeddata, timeout fallback) would produce at least one withheld frame.
  - Video never finished, no media events, and readyState 0 prove the block held.
  - Held mode cannot gate `load` because sources attach after load; the assertion is about frames, so that does not matter.
- Can it false-fail on a slow runner? Unlikely. Frames are counted, not milliseconds. The remaining unrelated-failure sources are covers (the intro overlay, a stray dialog) and a CTA below the fold: `elementFromPoint` returns null off-viewport, so it counts as inoperable. Both are properties the old test also asserted.
- LOW tests/e2e/home-entrance.spec.ts (probe `operable`, `n.id !== 'page-home'`): skipping `#page-home` opacity is justified. The `.page` fade is a pure CSS 0.4s animation (globals.css:72), independent of assets, so it is not a video gate. But a stuck `#page-home` opacity of 0 would now go unnoticed (hit-testing still passes). Fix: add `await expect(page.locator('#page-home')).toHaveCSS('opacity','1')` once, in the first test.
- LOW The probe's `await page.evaluate` inside the route handler can throw if the context is mid-navigation, leaving the request unresolved. The effect is a hang to the guard, not a silent pass. Wrap it in try/catch and use `page.addInitScript`-side state, or accept it.
- LOW `expect(failed).toEqual([])` in held mode and "requestfailed seen" in aborted mode are browser-dependent (WebKit media). The report says they were stable 50x locally. Not verified on the GitHub runner.

## 2. Loosened timeouts (MEDIUM, real weakening)
- MEDIUM home-entrance.spec.ts, overflow test (`data-home-intro` done, 4000 -> 15000) and GSAP-blocked test (`homeIntro` not "loading", 4000 -> 15000).
  - The product ceiling is real: `INTRO_CEILING_MS = 2500` (homeIntroTiming.ts:21) and the inline failsafe `setTimeout(...,2500)` (HomeIntroOverlay.tsx:25). The old 4 s bound enforced "the intro / failsafe cannot hold the state beyond about the ceiling".
  - At 15 s, a regression that stretches the intro or failsafe to 10 s passes.
  - Minimal fix: keep a bounded in-page measure rather than a runner-polled one. Record `performance.now()` when `data-home-intro` leaves "loading" (a MutationObserver in the probe), and assert it is below about 2500 + generous slack (6-8 s). Or simply use 8000 for these two checks only.
- INFO "within 1.5s of DOMContentLoaded" is gone. Replaced by "never withheld from the first frame". That covers the entrance-gating property better, but not "CTA appears quickly". Since the CTA is SSR, this is acceptable. Confirm that a perf budget (Lighthouse/LCP) lives elsewhere.
- OK keyboard (5 s), video-after-load (8 s), image-delivery visibility/load polls, `toBeAttached`: all were only generic flake bounds, with the real property still asserted (requests or no requests, painted). No loss.
- OK Removing `waitForTimeout(2500)` before the "no video request" assertions is a strict improvement, subject to finding 3b.

## 3. waitForHydration (tests/e2e/helpers/hydration.ts:13-18)
- a) LOW fragility. `__reactProps$` is stable since React 16 (installed 19.3.0). If it is renamed, the helper fails closed with a clear message after 15 s, not silently. Acceptable. Note the dependency in a comment.
- b) MEDIUM false readiness (the stamp is set in the render phase, before commit and passive effects). It is reliable for "this element was hydrated and root listeners exist". It is not proof that effects have run.
  - `waitForHeroVideoDecision` (home-entrance.spec.ts) and the portrait wait (home-image-delivery.spec.ts) assume the "queued now fires after the hero's own callbacks" ordering.
  - If the hero effect runs after the helper's rAF/idle chain was queued, the helper's idle callback (timeout 2500) can fire first. HomeHero queues its own at timeout 2000 (HomeHero.tsx:79-82). The assertions "zero `<source>` / no video request / no portraits" would then pass vacuously. This is a false-pass risk, not a flake.
  - Fix, test-only: after the stamp, await one extra `requestAnimationFrame` pair (commit + passive-effect flush) inside `waitForHydration` before returning, and for the video tests additionally assert something positive (e.g. in the normal-motion test the sources do arrive). The existing "video is requested only after load" test already does that for the positive case.
- c) Non-React elements: the stamp is absent, so it polls to the timeout with a clear message. Fine.
- d) Sturdier signal, only if a product change is acceptable: a data attribute set in a mount effect (e.g. `data-hydrated` on `<html>` from a root layout effect). Not clearly justified; the extra-rAF fix above is enough.

## 4. booking.spec.ts (no findings)
- Step assertions at Step 2 and Step 5 give good failure locality: a dropped click now fails at the step that dropped it, not as a 30 s `check` timeout.
- No test became less strict. Added assertions only. The `/^Step N of/` text pattern was already used by the existing dot-skip test.
- INFO `fillThroughWrapUpStep` still does not assert Steps 3 and 4; they are not required.

## 5. Docs (no HIGH)
- Order is correct: PUBLIC_BASE_URL stays on vercel.app until the domain serves the app (runbook step 1 then 4); www -> apex; rollback present; checklist, decisions-needed, `.env.example`, and the `site.ts` comment are mutually consistent. No secrets. No claim that an action was done (only the dated observation of DNS/Sucuri state).
- MEDIUM docs/operations-runbook.md (cutover, step 3): missing safeguards. Do not delete MX/TXT/SPF/DKIM records at GoDaddy (email may live there). Verify the Resend sending domain/`RESEND_FROM_EMAIL` still matches. Add `nottherug.com` to Firebase Auth authorized domains (and Calendly/any allow-listed origins), or admin sign-in breaks on the new host. Add as a step before step 4.
- LOW Rollback says to record the GoDaddy records "before step 3". Move that to the top of the list (before step 2) so it is not missed.
- LOW (INFO on accuracy) plans/README.md 012 status: `git cherry main fix/tracking-integrity` confirms 4 commits unmerged (dd5cab3 c57766d 20e88ff b710fb3), which matches. "Partly landed" is not substantiated by that evidence (nothing was shown as landed), and "lead-merge superseded by 013 P1" covers only dd5cab3. The dashboard-split and cron commits are not covered. Suggest "NOT LANDED (4 commits unmerged); lead-merge part superseded by 013 P1; dashboard/cron/digest commits undecided".
- INFO "currently serves a different site behind a Sucuri firewall" is a point-in-time observation stated as fact; keep the date (it already has one).

## Recommended next step
Apply fixes: (a) 2 MEDIUM test tweaks (intro-ceiling bound; extra rAF in `waitForHydration`), (b) add the Firebase/MX/Resend line to the cutover, (c) reword the 012 status. Then proceed.
