# S0 build + chunk evidence (LOCAL production build, branch award/s0; not the deployed site)
Build: `npm run build` (Next 16.3.8 Turbopack) FAILED without env: `MissingEnvError FIREBASE_ADMIN_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` (lib/server/env.ts:31 via lib/firebase-admin.ts, collected for /admin/not-the-rug/run-brief). Dummy values with a generated throwaway RSA key (shell env only) -> exit 0, 49 static pages. Log: build-raw.log. Route "/" is static (prerendered).

Sizes: raw bytes / `gzip -9`. Chunk list = `<script>` tags in prerendered / HTML (home-scripts.txt, sizes.txt) + runtime-loaded chunks (js-requests.json).
| Chunk | Raw | gzip | Contents (grep evidence) |
|---|---|---|---|
| 35lzrzzuthkpm | 234172 | 73078 | react-dom |
| 34bug6qw18-k6 | 155684 | 42664 | Next app-router/client runtime |
| 0cz1d0mv5g_q7 | 112594 | 39390 | polyfills (nomodule, not fetched by Chromium) |
| 0xux2w4v3w-is | 77384 | 24705 | home page client code: HomeIntro, PawWalk (layoutPawWalk, getTotalLength), OtherServicesTeaser |
| 43cfa62ahjp3z | 43512 | 12130 | welcome modal/teaser (welcomeTeaserRise/Fade, hasSeenWelcomeModal) |
| 0zomc4jn3nd04 | 36758 | 12718 | loadGsap consumer (home section code, opensWelcomeModal) |
| 2i51e627rllld | 31346 | 8346 | react/next shared |
| 0nwbn_6ylajwz | 30607 | 9896 | welcome-related client code |
| 0t0snxux6z4mg | 28782 | 11957 | loadGsap consumer (paw/ScrollTrigger refs) |
| 0y2ote-nku1rf | 23933 | 8557 | loadGsap consumer (opensWelcomeModal) |
| 3f-ko6t3eo_en | 18073 | 6352 | welcome-seen helpers |
| 3fntmmi971322 | 14377 | 3678 | small shared |
| turbopack-2_v4q6it0cbgn | 10946 | 4335 | Turbopack runtime |
| 3832zsef-e_ji | 8208 | 2178 | next shared |
| 3ylt1vf7-742s | 2052 | 1017 | small |
| **Eager total (excl. polyfills)** | **715,834** | **221,611** | 14 chunks |
| 1elfxn6vo43kj (lazy) | 71081 | 27441 | GSAP core (dynamic import via hooks/gsapLoader.ts) |
| 2p2jd75im6m_h (lazy) | 43373 | 17435 | ScrollTrigger (module 83495) |
| 17xw3zu25x-v8 (lazy) | 24199 | 8783 | another lazy gsap consumer (unidentified) |
| 0rbgb--dsg-d8 (lazy) | 760 | 385 | tiny |

GSAP+ScrollTrigger are NOT in the eager bundle; loaded after load, ~114 KB raw / ~45 KB gz. Firebase is NOT in "/" chunks (only in 05tftk/0a2ky/2ku_xsbrtns3p non-home chunks). Module attribution is by minified-string grep (no source maps); eager-chunk labels are best-effort.
