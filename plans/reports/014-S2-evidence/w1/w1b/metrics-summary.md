# W1b measurements (local prod builds, 90 ms RTT / 40 Mbps proxy, Lighthouse 12.8.2, interleaved)

Mobile LCP ms (3 runs each): base 096a66e 4388/4086/4705 (med 4388); W1 2a1f2a9 3189/3279/3187 (med 3189); W1b 3038/3038/2925 (med 3038). Perf 82-86 / 92 / 93-94.
Desktop LCP ms: base 1320/1654/1320; W1 1372/1374/1400; W1b 1360/1375/1359 (perf 93-96, CLS 0).
Requests finished before observed LCP (transfer bytes, run 1): base 19 req 572,269 B; W1 13 req 352,999 B; W1b 13 req 309,241 B.
Font preload experiment (NOT shipped; Oswald/Bebas/Courier preload:false), 4 interleaved runs: W1b 2924/3037/3036/2887 vs no-preload 2735/2736/2737/2886; CLS 0.000 -> 0.025 in 3 of 4 runs.
Logo webp vs png (element screenshots, 390/1440 at DPR 1 and 2): max channel diff 5-10/255, mean 0.45-0.56.
Mobile video: Chromium and system Chrome at 540/390 play hero-mccarren-540-v2.mp4 (currentTime advancing); no request for the old 540 files; 1440 plays 1080 webm; reduced motion requests poster only; 0 console errors.
