# S0 long tasks (LOCAL production build `next start` :3457, NOT the deployed site)
Method: Playwright Chromium (headless), viewport 412x823 mobile, CDP CPU throttle 4x, no network throttle, load + 6s idle + scroll to 6000px. Trace: trace-home-4x.json (open in DevTools Performance). Times are ms since navigationStart; main-thread RunTask > 50 ms (only 5 exist).
| # | Dur ms | Start ms | Owner |
|---|---|---|---|
| 1 | 1534 | 804 | EvaluateScript chunks/2p2jd75im6m_h.js (ScrollTrigger) -> RunMicrotasks; CPU profile: 1398 ms self in `layoutPawWalk` (chunk 0xux2w4v3w-is.js, source components/marketing/hooks/useHomePawWalk.ts; 1401-sample `getPointAtLength` loop, GAIT.samples=1400), +100 ms in next fn. Runs as soon as gsap/ScrollTrigger resolve. |
| 2 | 180 | 156 | Layout 138 ms / Paint / style (initial render, no script owner) |
| 3 | 116 | 654 | FunctionCall chunks/35lzrzzuthkpm.js (react-dom work) |
| 4 | 113 | 536 | FunctionCall chunks/35lzrzzuthkpm.js (react-dom work) |
| 5 | 61 | 376 | EvaluateScript chunks/3832zsef-e_ji.js (microtasks) |
Caveats: single run, no variance data; headless/4x emulation on a dev Mac. Task 1 dominates (also the only task >200 ms) and is the paw-walk path sampling, not GSAP itself. Server killed after run.
