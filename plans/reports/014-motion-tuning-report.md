# 014 motion + UI tuning report (branch `ui/motion-tuning`)

Verdict: gate green. No regressions in LCP, TBT or CLS; 0 E2E failures; fold of the override stylesheet into `globals.css` is output-identical. Not merged, not deployed. Open items are under "Known issues".

Base: `origin/award/s2` @ 59901dc (main is still 096a66e). Date 2026-10-12.

## Commits (base → head)
| SHA | Subject |
|---|---|
| a66de09 | feat(paw-walk): straight centre route from under the hero video to the contact sheet |
| 6cfbf29 | style(motion): UI + motion tuning pass in app/motion-tuning.css |
| 2af7781 | fix(dialog): parse "$100–$110" ranges so Boarding's price renders large |
| 6b8d444 | feat(group-walk-card): scroll-scrubbed walker and skyline drift replace hover |
| c8b2df6 | feat(marquee): hover doubles the reviews marquee speed |
| 40300d8 | style(motion): tuning pass 2 — marquee speed, dialog price, walker, hero |
| 1af065b | refactor(css): fold motion tuning into globals.css |
| (this report) | docs(reports): add 014 motion tuning report |

Every tweak was iterated live with Bryan on localhost:3009. None was rejected, so none was reverted. One was never explicitly re-confirmed after its last value change (walker `bottom: 9%` at 768–1279px); see Known issues.

## Every tweak (file, old → new)
Final locations after the fold. `app/motion-tuning.css` no longer exists.

### Section nav (the paws on the left / the phone jump menu)
| Where | Old → new |
|---|---|
| `app/section-rail.css` `#section-rail-shell` (≥1280px) | background `rgba(243,236,217,.55)` → `var(--sage-dark)`; border and border-bottom `rgba(79,90,61,.14)` → `rgba(243,236,217,.22)` |
| `.section-rail-marker-paw` | olive ink → cream: `background-color: var(--paper)`, `object-fit: none`, `object-position: -999px 0`, per-foot `mask-image` (paw-rail-left/right.webp) |
| `.section-rail-marker:focus-visible` | outline olive → gold (olive is invisible on green) |
| `app/section-jump.css` `#section-jump-trigger` | background `var(--paper)` → `var(--sage-dark)`; color olive → paper; border `rgba(79,90,61,.35)` → `rgba(243,236,217,.3)`; paw glyph (`#section-jump-trigger-icon-pin`) olive → cream via the same mask technique. Open state (ink disc + ✕) unchanged |
| trigger / menu / list below 1280px | trigger `left: 14px` → `calc(50% - 27px)`; menu `left: 8px` → `left:0; right:0; width:max-content; margin-inline:auto`; list `align-items: flex-start` → `center` |
| selected pill | `.section-jump-item[aria-current='true']:focus-visible` outline 2px gold → `none` (the focus ring stacked on the pill's own border: the "double border") |

### Dog Walking card (`components/marketing/GroupWalkFeatureCard.tsx`, `hooks/useGroupWalkCardHover.ts`)
| What | Old → new |
|---|---|
| Static paw-trail layer `#home-group-walk-feature-paw-trail` | shown → `display: none` (layer and hook refs stay in the markup) |
| Walker figure on hover | tween on card hover (xPercent −12.6 → −10.1, scale 1.086 → 1.069, 0.75s) → none. Hover no longer moves the walker |
| Walker on scroll (new) | none → scrubbed `x` from −25% to +25% of the art panel's width (`WALKER_SCROLL.travel 0.5`), `scrub 0.8`, `ease none`, transform only |
| Skyline | 10s hover drift (`xPercent −5.65`) → scroll-scrubbed `x` +10% → −10% of panel width (opposite direction, `BACKDROP_SCROLL.travel 0.2`, `scrub 1.2`); stays inside its 12.5% overscan |
| Trigger | n/a → the art panel (`start: top bottom`, `end: bottom top`), so a phone's short art strip gets the full travel; runs at every layout including ≤767px |
| Walker height in panel, 768–1279px | `bottom: -4%` → `9%` (feet were on/under the panel edge) |

### Colour, hero, footer
| File | Old → new |
|---|---|
| `globals.css` `--terracotta` | `#A9503A` (4.57:1 under cream text) → `#964228` (5.73:1). Retunes every CTA, ribbon, tag and stamp reading the token. Olive hover unchanged |
| `useHomeHeroMotion.ts` hero video entrance | `clip-path: inset(0 100% 0 0)` → `inset(0)`, 0.8s `power4.inOut`, then `clipPath: none` → `autoAlpha 0 / scale 1.05 / y −12` → `1 / 1 / 0`, 0.9s `power3.out`, `clearProps` on complete. The clip cropped the polaroid's drop shadow for the whole wipe, then popped it |
| `globals.css` hero on phones (≤768px) | background: paper-grain + veil `rgba(…,.80)` → paper-grain + veil `.86` + walker `3Top-flipped.png` (`right -14vw top calc(var(--nav-h) + 450px)`, `clamp(300px,104vw,520px)`) |
| `HomeHero.tsx` + `globals.css` | intro paragraph: second sentence wrapped in `<span id="hero-intro-copy-detail">`, `display:none` at ≤768px. Copy source unchanged, desktop unchanged |
| `globals.css` | `#hero-cityscape-frame` (bridge strip behind the hero): shown → `display:none` at ≤768px |
| `globals.css` `.hero-actions` (>768px) | `flex-wrap: wrap; gap: 20px` → `nowrap; gap: 14px clamp(12px,1.6vw,20px)`; CTAs `white-space: nowrap`. View Services now sits beside Book a Meet & Greet. Phones stay stacked |
| `globals.css` `#footer-art-image` | no filter → `saturate(.6) hue-rotate(4deg) brightness(1.02)` (the collage was peach, not cream) |

### Reviews marquee, service dialog
| File | Old → new |
|---|---|
| `globals.css` `.proof-track` | `animation: scrollTrack 25s` (~133px/s) → `128.5s` (26px/s, same as the black trust bar's 982px/38s). Track widths are fixed at every viewport, so a fixed duration holds |
| `MarqueeHoverBoost.tsx` (new) + `ProofMarquee.tsx` | none → hover eases the running animation's `playbackRate` to 2× (`updatePlaybackRate`, so no jump or restart); hover-capable pointers only; no-op under reduced motion |
| `ServiceDetailDialog.tsx` `RATE_PATTERN` | `/^(\$[\d.,]+(?:[–-]\d+)?)\s+(.+)$/` → `/^(\$[\d.,]+(?:[–-]\$?[\d.,]+)?)\s+(.+)$/`. Boarding's "$100–$110 per day" fell through to the small plain-note style. Only that line failed; all others parse as before |
| `globals.css` service-modal range | single-price rule outranked the range rule, so the range wrapped. New rule at matching specificity: `font-size: clamp(40px, 18cqi, 120px); white-space: nowrap` |

## DOM ids added
- `#hero-intro-copy-detail` (the hidden-on-phones span in `HomeHero.tsx`).
- Every other container edited already carried a stable id (`#section-rail-shell`, `#section-jump-trigger`, `#home-group-walk-feature-art-figure`, `#hero-actions-row`, `#hero-cityscape-frame`, `#proof-track`, `#footer-art-image`, `#home-hero-section`, …). `MarqueeHoverBoost` renders nothing.

## Paw walk: route change and why
Files: `lib/marketing/paw-walk-path.ts`, `paw-walk-tuning.ts`, `hooks/useHomePawWalk.ts`, layering in `globals.css`.
- **Route**: a hand-dragged 60-point wander (`M500,4.2 C500,9.7 …`, ending at ~(319,994)) → a straight line down the page centre `M500,4 C500,330 500,670 500,995`. It wandered unpredictably around the team band, left prints in some sections and over text in others. Prints alternate ±24px about the line. The route is still editable with `?pawpath`.
- **Visibility window**: two stretches (rates gate → group-walk card; proof marquee → concepts marquee) that hid the trail on the green bands → one window from 220px above the hero video's bottom edge (`from #hero-polaroid-frame, fromEdge 'bottom', fromOffset -220`) to `#home-contact-sheet-section`. The window type gained `fromEdge` and `fromOffset`; `PAW_WALK_GATE_SELECTOR` and `PAW_WALK_END_SELECTOR` were removed (unused).
- **Stride start**: the stride now begins where the route first enters the window (cursor starts at that sample, +0.01), so the first print sits at the window edge instead of wherever the phase from the top of the page landed.
- **Dark-band lookup bug**: `DARK_SECTION_SELECTOR` was matched against `#page-home`'s direct children, but the sections live inside `<main>`, so it matched nothing and prints on green were never retoned. It now searches the subtree.
- **Layering** (`globals.css`): the paw layer is `z-index: 4` but the hero, rates, team, closing-trust, process and contact sections were `isolation: isolate` contexts at z auto/0, which ranked below it, so their cards, images and fields painted under the prints. Raising the sections hid the prints behind opaque green backgrounds and cut them at section edges, so instead: isolation removed from those home sections, their photo-wash frames moved `z-index -1 → 0`, the closing-trust fade `-1 → 0` (closing-trust `z-index: 0 → auto`), hero video shell and copy raised to `z-index: 5`. Prints now run over every background and under every piece of text, image and field. The contact sheet keeps isolation outside `#home-main` (the signup page shares that section and has no paw walk).
- **Dark-band tone**: `filter: invert(1)` (bright lavender-grey, too heavy) → `grayscale(1) invert(1) sepia(.22) opacity(.6)`.
- **Tuning defaults**: `size 33 → 102`, `strideRatio 3.7 → 2.3`, `stepDuration 0.008 → 0.004`, `opacity 0.28 → 0.14` (`scrub 1`, `lead 0.7`, `trackHalfWidth 24` unchanged). Dev localStorage keys versioned to `:v2` (path and tuning) so saved v1 drags and values stop overriding the shipped defaults.

## Fold of `app/motion-tuning.css` into the CSS it tunes
Done in `1af065b`. Each rule was merged into its block (edit of the original declaration where it was a straight override). Notes:
- The nav tweaks live in `section-rail.css` / `section-jump.css`, not `globals.css`: those are the blocks they tune and a rule in `globals.css` would have had to win by specificity. The brief said `globals.css`; flagging the deviation.
- The walker/paw-trail edits live in the `<style>` inside `GroupWalkFeatureCard.tsx` for the same reason.
- Only the contact-section isolation rule keeps a `#home-main` scope (shared with `/signup`). All other overrides were home-only components, so the prefix was dropped.
- A dead earlier phone `.hero` background rule (fully overridden later in the file) was removed.

**Equivalence proof** (before = HEAD before the fold, after = fold; dev server, Chromium, `reducedMotion: reduce`, marquees and nav transition frozen identically on both sides):
- Full-page screenshot plus a computed-style dump of every element (every property) at 390 and 1440 for `/`, `/signup`, `/about`, `/walk-with-us`, `/contact`, `/reviews`, `/safety`, `/book`, and `/` with the Boarding dialog open.
- 18 page/width pairs: 0 differing pixels and 0 style differences, except `nav#main-nav` `box-shadow` on `/` (a scroll-position timing value: 0.0096% of pixels at 1440, none above the 24-luma threshold).
- A first pass caught one real regression: the phone jump-menu list's `align-items: center` lost to its base rule because the media block sat before it. Fixed by moving the block after the base rule (in the same fold commit); the pass above is after the fix.
- Noise floor with no changes: 0.04–0.06% of pixels (marquee and nav), which the frozen run removes.

## Gate (base 59901dc vs `ui/motion-tuning` head, local production builds)
| Check | Result |
|---|---|
| `npm run lint` | exit 0, 0 warnings |
| `npx tsc --noEmit` | 0 errors |
| `npx vitest run` | 83 files; 700 passed, 102 skipped, 0 failed |
| `npm run build` | pass (branch and base) |
| Public E2E, `E2E_PORT=3019` | **208 passed, 22 skipped, 0 failed** (36.6s). Identical to the S1 baseline and the S2 gate (208/22/0) |

The first E2E attempt crashed mid-run with failures that were not real: the machine's disk was at 100% (ENOSPC), which killed the server and even the tool output file. After clearing my own caches the rerun was clean. See Known issues.

### Lighthouse 12.8.2, `/`, 3 interleaved cold runs, medians (per-run values in evidence)
Same method as the S2 gate: base built from `git archive 59901dc`, both served with `next start`, behind a 90 ms RTT / 40 Mbps proxy (`slowproxy.cjs`), Lighthouse default throttling (`--preset=desktop` for desktop).

| Metric | Mobile base → branch | Desktop base → branch |
|---|---|---|
| Perf | 93 → 94 | 96 → 96 |
| LCP ms | 3035 → 3035 (base 7967/3035/2921, branch 3185/2917/3035) | 1319 → 1329 (+10, noise) |
| FCP ms | 1236 → 1235 | 465 → 465 |
| TBT ms | 0 → 0 | 0 → 0 |
| CLS | 0 → 0 | 0 → 0 |
| SI ms | 3681 → 3315 | 1152 → 1222 |
| A11y / BP / SEO | 100/100/69 → 100/100/69 | 100/100/69 → 100/100/69 |
| Transfer KB | 2979 → 3071 (+92) | 5105 → 5104 |

- LCP element is unchanged in both builds: `figure#hero-polaroid-frame` on mobile, `div#hero-cityscape-art` on desktop. The hero stacking and video settle did not move it.
- Run 1 of each mobile series is a cold-server outlier in both builds (base LCP 7967 / TBT 109; branch TBT 274). Medians exclude it.
- SEO 69 is the localhost `noindex` artifact (deployed is 100).
- The +92 KB mobile transfer is `3Top-flipped.png` (95 KB PNG) now loaded for the faint hero walker on phones (the base removed that layer on phones). Candidate for a webp, but image masters are off-limits.

### Paw walk long tasks (4× CPU throttle, CDP trace, load + full scroll, 3 runs each)
| | Mobile 412px | Desktop 1440px |
|---|---|---|
| Branch | 2 tasks ≥50 ms per run, both at load: boot "program" work 160–180 ms and the Turbopack chunk loader 53–60 ms. **0 during scroll** | 2 per run, same two (161–180 ms and 52–60 ms). **0 during scroll** |
| Base | 2–3 per run, same two sources | 2 per run, 186–199 ms and 58–60 ms |

No long task is attributed to the paw walk (zero mentions of `useHomePawWalk` in the attributions). The S1 fix (cached/reduced path sampling, idle/visibility deferral) still holds with the straight route; the new code adds one `findIndex` over 1,401 samples at layout.

### Reduced motion and console
- `prefers-reduced-motion` on `/` at 390 and 1440: no intro (`data-home-intro` absent at first paint), paw walk in its static state, hero video not requested (poster only), no parallax transforms, 0 console messages.
- Console / pageerror / hydration on `/`, `/book`, `/contact` at 390 and 1440: 0 errors, 0 warnings, 0 hydration messages (6 of 6).

## Known issues and decisions for the reviewer
1. **Small-desktop hero walker (769–1280px) unresolved.** The walker's body sits behind the video; only the dogs and head show. I proposed nudging it left/up or scaling it; Bryan has not chosen. Untouched.
2. **Walker `bottom: 9%` at 768–1279px** was set after Bryan said "still low" and never re-confirmed. Dial: the `bottom` in the two media rules in `GroupWalkFeatureCard.tsx`.
3. **Intro sentence hidden by CSS on phones only**, not removed from the copy source, because copy changes are Track F (needs Luis's approval). A real edit or removal is a Track F item.
4. **Marquee loop is about two minutes** at 26px/s (matching the black bar). If the quotes or trust items change, recompute (track half-width ÷ 26).
5. **Dead code left in `useGroupWalkCardHover.ts`**: the paw-trail refs, `PAW_TRAIL`, `PAWS` and `setPawsStatic` still exist because the layer stays in the markup (hidden). Cleanup candidate if the layer is removed for good.
6. **Scroll-drift end poses on phones** were verified by measured transforms only (−84 → +80 walker, +34 → −32 skyline at 390px), not by a clear screenshot at the extremes.
7. **Nav edits are in `section-rail.css` / `section-jump.css`**, not `globals.css` as the brief said (see Fold).
8. **Walker figure does not flip direction** while it drifts left/right.
9. **Environment**: the machine disk hit 100% during the gate. I removed only my own artifacts and regenerable `.next/cache` dirs (verification snapshots, caches). Recommend freeing space before a larger run; E2E and Lighthouse need headroom.
10. **Not run**: `npm run verify:assets`, axe-core sweep, base-vs-branch full-route visual diff, and a Lighthouse run on the deployed site. S2 ran those; nothing in this branch touches assets or markup structure beyond the one span.

## Merge note
Rebase onto main after S3 ships. There is no override stylesheet to fold any more; expect conflicts only in the blocks listed above. Files touched: `app/globals.css`, `app/section-jump.css`, `app/section-rail.css`, `components/marketing/{GroupWalkFeatureCard,HomeHero,MarqueeHoverBoost,ProofMarquee,ServiceDetailDialog}.tsx`, `components/marketing/hooks/{useGroupWalkCardHover,useHomeHeroMotion,useHomePawWalk}.ts`, `lib/marketing/{paw-walk-path,paw-walk-tuning}.ts`, `app/layout.tsx` (import removed again, net zero vs base). S3 is the other editor of `globals.css`: resolve those hunks by hand.

Evidence: `plans/reports/014-motion-tuning-evidence/` (Lighthouse summary and driver, lint/tsc/vitest logs, E2E summary, long-task traces, the fold snapshot/compare scripts, reduced-motion and console scripts).
