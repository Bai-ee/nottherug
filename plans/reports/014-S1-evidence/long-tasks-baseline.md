# S1 long-task baseline (LOCAL production build of f057102, `next start` :3457, one machine)
Not the deployed site. Playwright Chromium headless, 412x823 mobile, CDP CPU 4x, no network throttle. Load, idle 6 s, scroll to bottom (13335 px) in 400 px steps / 150 ms. Tracing + V8 CPU profile (owner = top self-time functions inside each RunTask). 3 runs. Scripts: long-tasks.cjs, trace-lib.cjs; raw: long-tasks-raw.json.

## Total blocking time (sum of dur-50 over tasks >50 ms)
| Run | tasks >50 ms | TBT ms | load/idle | scroll |
|---|---|---|---|---|
| 1 | 6 | 1724 | 1724 | 0 |
| 2 | 6 | 1698 | 1698 | 0 |
| 3 | 6 | 1687 | 1687 | 0 |
**Median TBT = 1698 ms.** Zero long tasks during the scroll phase in all 3 runs.

## Top tasks (run 2, the median run; runs 1 and 3 within +-4 ms per task)
| # | Dur ms | Start ms | Owner |
|---|---|---|---|
| 1 | 1525 | 663 | `d` chunks/2wdjtc41fusq8.js:130:1406 = `layoutPawWalk` (useHomePawWalk.ts:66; 1401-sample `getPointAtLength` loop, GAIT.samples=1400, line 31/88): 1382 ms self; plus `c` (same chunk :3339, ~100 ms, second paw-walk measuring fn using 101 samples, likely the estimate path ~useHomePawWalk.ts:225) |
| 2 | 113 | 520 | `c` same chunk, 102 ms self (paw-walk estimate) |
| 3 | 112 | 406 | `c` same chunk, 102 ms self |
| 4 | 105 | 59 | (program), no JS owner: initial parse/style/paint, 104 ms |
| 5 | 87 | 175 | (program), no JS owner, 86 ms |
| 6 | 56 | 265 | `H` turbopack-2_v4q6it0cbgn.js:1:7148 (module/chunk evaluation), 30 ms self |
Only 6 tasks exceed 50 ms (fewer than 10 exist). Runs 1/3 durations: 1523/1519, 117/114, 116/111, 97/98, 55/55.

## Findings
- One task = 90% of TBT: the paw-walk layout (same culprit as S0; unchanged by main 4bd4292). Plus three ~100 ms `c` tasks (paw-walk estimate, run repeatedly at 406/520/650 ms); c tasks add ~315 ms of the 1698 total; (program) ~190 ms; H ~55 ms.
- The cityscape parallax does not appear as a long task owner (see parallax-cost.md).
- Caveats: local build, one machine, headless, 3 runs, the screen-scroll loop uses window.scrollTo (not touch input). Server killed after the run.
