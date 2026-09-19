# Asset optimization specification

Companion to [010 — Production final-mile optimization](010-production-final-mile-optimization.md).

Prepared September 19, 2026 from a read-only audit of the integrated
booking-first/analytics worktree.

## Outcome

Every asset shipped by a public route must be sized and encoded for the largest
box in which it can actually render, including high-density screens. Small
screens must not download the large-screen file. Large screens must not receive
a visibly soft file merely because the original happened to be small.

This is not a blanket "compress everything" pass. It is a per-use audit of:

- inline and responsive images;
- CSS backgrounds and masks;
- logos, icons, tape, grain, and transparent artwork;
- hero video and poster frames;
- fonts;
- admin-only remote/generated previews;
- source files accidentally living in `public/`.

## Current snapshot

The deployed public directory currently includes approximately:

| Type | Count |
| --- | ---: |
| PNG | 48 |
| WebP | 15 |
| JPG | 15 |
| SVG | 13 |
| Video | 2 |
| Miscellaneous public files | 3, including a Python file, HTML file, and `.DS_Store` that require a deployment-need decision |

The site container is `--max-w: 1240px`, with 32 px desktop gutters, but
multiple backgrounds and decorative bands are full bleed. Therefore one global
image width is not correct.

Current large files that require measured treatment include:

| Asset | Intrinsic dimensions | Approximate bytes | Initial concern |
| --- | ---: | ---: | --- |
| `public/logos/Not_The_Rug_2023_clipped_web.mp4` | inspect with `ffprobe` | 12.1 MB | Hero video, eager preload, no poster |
| `public/logos/Not_The_Rug_2023_clipped_web.webm` | inspect with `ffprobe` | 9.6 MB | Hero video, eager preload, no poster |
| `public/img/bg4.png` | 1733×907 | 3.15 MB | Full-bleed photographic/background use |
| `public/img/bg3.png` | 1656×950 | 2.95 MB | Full-bleed photographic/background use |
| `public/img/bg5.png` | 1672×941 | 2.83 MB | Full-bleed background |
| `public/img/footer_image.png` | 1656×950 | 2.73 MB | Footer art/background |
| `public/img/bg_section_1.png` | 1672×941 | 2.55 MB | Repeated across several bands |
| `public/img/bg_section_2.png` | 1672×941 | 2.47 MB | Repeated across several bands |
| `public/img/bg_section_graphic_1.png` | 1620×971 | 2.34 MB | Cover background with crop |
| `public/img/card_bg.png` | 1596×898 | 2.31 MB | Card/background use |
| `public/img/homepage_image.png` | 1620×971 | 2.20 MB | Responsive hero composition |
| `public/logos/ntr_offwhite_horiz.png` | 1536×1024 | 2.11 MB | Logo source has excess canvas/aspect for its rendered lockup |
| `public/img/visits_card.png` | 1408×1117 | 2.09 MB | Card art |
| `public/img/1dog.png` | 1448×1086 | 2.02 MB | Layered artwork |
| `public/img/3dog.png` | 1448×1086 | 1.99 MB | Layered artwork |
| `public/img/multi_dog_walk.png` | 1311×943 | 1.81 MB | Content/feature art |

These dimensions are not yet an optimization verdict. The runtime inventory
below determines the correct crop and candidate sizes.

## Supported rendering standard

Measure the actual interface at these viewport widths: 375, 400, 768, 1024,
1440, 1920, and 2560 CSS pixels. Include short-laptop height at 1440×760 and
normal/tall mobile heights because `cover` crops change with aspect ratio.

Use this delivery target:

- fixed/container content: sharp through 2 device pixels per CSS pixel at its
  largest computed rendered box;
- full-bleed photography/backgrounds: support 1920 CSS px at 2× and 2560 CSS px
  at 1× when a source master contains that detail;
- transparent logos/art: support 2× the maximum rendered box, preserving alpha;
- tiny repeated textures: size for the repeated CSS tile, not the viewport;
- video: encode for its actual maximum on-screen box and crop, not the source
  camera dimensions; do not use still-image DPR rules blindly for motion.

For every raster use, calculate:

```text
required pixel width  = ceil(max rendered CSS width  × target DPR)
required pixel height = ceil(max rendered CSS height × target DPR)
```

For `object-fit: cover` and `background-size: cover`, also account for the
source and destination aspect ratios. Generate a crop-aware derivative that
fully covers the destination at the target DPR; checking width alone is not
enough.

Never upscale and label it optimized. If the best available source is below
the required dimensions, retain the best non-upscaled derivative temporarily
and add it to the replacement-master list with its required dimensions. A
larger export from the original design/photo is the only real fix.

## Required runtime inventory

Create `scripts/audit-public-assets.mjs` and a machine-readable report under an
ignored evidence directory. The script must crawl every production public route
at the viewport matrix above and collect all of the following:

| Field | Purpose |
| --- | --- |
| Route and selector | Finds the exact consumer; filenames alone are insufficient. |
| Asset URL and type | Includes `<img>`, Next images, computed CSS backgrounds/masks, `<video>`, `<source>`, and loaded fonts. |
| Visibility/state | Records initial, modal-open, menu-open, hover/focus, and below-fold states where an asset appears. |
| Rendered CSS box | Maximum width and height at each breakpoint. |
| Fit/crop/position | Captures `object-fit`, `background-size`, aspect ratio, and focal position. |
| Intrinsic dimensions | Proves whether the source can satisfy the box at 1× and 2×. |
| Encoded bytes/format | Establishes transfer cost and legacy-format debt. |
| Loading behavior | Eager/lazy, preload, fetch priority, decoding, and whether it was actually requested. |
| Reuse | Shows one source used in materially different boxes/crops that needs separate derivatives. |
| LCP/above fold | Prevents lazy-loading the LCP image or preloading decorative assets. |

The crawler must exercise at least:

- home at initial load and after the intro;
- welcome modal open at every step;
- mobile and desktop navigation open;
- booking and contact forms;
- every public marketing route;
- hover/focus art that swaps or reveals an image;
- signed-out admin surfaces, and signed-in admin surfaces when a safe local
  session is available.

Static source search supplements this crawl so disabled, pseudo-element,
animation-loaded, and route-gated assets are not missed. The final inventory
must classify every file under `public/` as referenced, source-only, dev-only,
or removable.

## Optimization rules by asset class

### Inline public images

- Prefer `next/image` for public photographic/content images.
- Use static imports where practical so intrinsic dimensions and blur data can
  be generated safely.
- Supply an accurate `sizes` expression from the measured breakpoint boxes.
  Never use `100vw` for an image capped inside the 1240 px container.
- Use `fill` only with a stable positioned parent and a known aspect/height.
- Mark only the actual LCP candidate high priority. Everything below the fold
  remains lazy.
- Preserve explicit aspect ratios so images cannot create layout shift.
- Verify `srcset` selection in browser network traces at every breakpoint.

### CSS backgrounds and pseudo-elements

CSS backgrounds do not pass through `next/image` automatically.

- Generate breakpoint-appropriate AVIF and WebP derivatives with an original-
  format fallback only when needed.
- Use media queries plus `image-set()`/`-webkit-image-set()` for density-aware
  selection where browser support and the cascade are verified.
- Generate separate crops when mobile and desktop focal areas differ; do not
  send a wide desktop composition merely to crop most of it away on mobile.
- Keep the existing focal point and overlay appearance. Compare screenshots at
  every relevant height as well as width.
- Repeated paper grain is a tile. Optimize its tile dimensions and compression;
  do not create viewport-sized grain images.

### Logos, icons, tape, masks, and transparent art

- Prefer SVG for true vector artwork, retaining the `viewBox`, accessibility,
  and intentional irregular edges.
- Run SVG optimization conservatively; compare paths/masks visually and do not
  remove IDs referenced by CSS or animation.
- For raster collage/tape/paint textures, preserve alpha and use lossless or
  visually lossless WebP/AVIF when it is smaller.
- Crop transparent padding before export unless the padding is the positioning
  mechanism. Update layout rather than preserving megabytes of empty canvas.
- Supply 1× and 2× variants for raster logos based on their maximum rendered
  lockup dimensions.

### Hero video

- Inspect dimensions, duration, frame rate, codec, bitrate, audio tracks, and
  color profile with `ffprobe`.
- Remove audio if the muted decorative hero does not use it.
- Produce desktop and mobile encodes only when the measured boxes/crops justify
  both. Use `<source media>` or another deterministic browser selection method;
  do not download both variants.
- Provide WebM and MP4 only where the compatibility fallback is still required.
- Generate a correctly cropped poster at the displayed aspect ratio.
- Replace `preload="auto"` with `metadata` or `none` unless the measured LCP/
  experience proves eager video bytes are justified.
- Pause when sufficiently offscreen, respect reduced motion, and provide a
  stable poster/static state when autoplay is inappropriate.
- Record total bytes actually transferred, start time, and visual quality at
  the real rendered size. File size alone is not acceptance evidence.

### Fonts

- Scope admin-only `Space Mono` to the admin layout.
- Inventory actual family, style, weight, and glyph usage by route.
- Keep only required Latin subsets/weights/styles and let `next/font` self-host.
- Compare fallback and final font metrics for layout shift.
- Do not convert display text to images.

### Admin/generated/remote images

- Do not weaken remote host allowlists to silence `next/image` errors.
- Treat signed/token-bearing Firebase URLs as private data and avoid recording
  them in reports, screenshots, or logs.
- Native `<img>` is acceptable for object URLs or unpredictable editor canvases
  when documented locally with explicit dimensions and loading behavior.
- Optimize generated output at creation time for its actual publishing target;
  retain an original only if it has an operational use.

## Encoding and quality acceptance

- Keep source masters outside the deployed `public/` directory.
- Normalize orientation and color to the intended sRGB presentation.
- Strip EXIF/GPS and unused metadata from delivered assets.
- Do not use one universal quality number. Tune by asset class and inspect the
  result at 100% plus its actual rendered size.
- Compare edges, fur, text/logos, transparency, grain, gradients, and dark
  overlays. These expose different compression failures.
- Use automated perceptual comparison as a warning, not the sole approval.
- Retain a lossless original and reproducible generation command for every
  delivered derivative.
- Hash or rename outputs deliberately so CDN caches cannot retain a replaced
  asset under an unchanged URL.

## Asset manifest and enforcement

Check in a compact manifest such as `docs/asset-manifest.json` with one record
per shipped source:

```json
{
  "source": "/img/example.webp",
  "consumers": ["/#example-card"],
  "maxCssBox": { "width": 620, "height": 420 },
  "targetDpr": 2,
  "intrinsic": { "width": 1240, "height": 840 },
  "format": "webp",
  "bytes": 148000,
  "loading": "lazy",
  "exception": null
}
```

Add a verification command that fails when:

- a referenced local raster lacks known dimensions;
- a new asset exceeds its manifest budget without an approved update;
- an asset is smaller than its required 1× box or larger than 2× its maximum
  required dimensions without a documented reusable/source reason;
- a public photo is added as a large PNG without an alpha/quality reason;
- a source/tooling file is added to `public/`;
- the hero video exceeds its approved transfer budget;
- a public `next/image` with `fill` omits `sizes`;
- an eager/preloaded asset is not on the approved above-fold list.

Do not fail solely because a source master is large when it lives outside the
deployed surface and generates correctly sized derivatives.

## Execution checklist

1. Capture the route/state/viewport inventory.
2. Produce the referenced/unreferenced public-file classification.
3. Record each asset's maximum CSS box and crop.
4. Locate the highest-quality original for every undersized asset.
5. Generate responsive derivatives outside `public/`, then copy only delivery
   files into their final paths.
6. Update inline images, CSS backgrounds, masks, video sources, and font scope.
7. Run the manifest verifier and production build.
8. Compare network traces for every viewport: chosen candidate dimensions must
   match the display demand without mobile over-download.
9. Compare full-page screenshots and focused 100% crops.
10. Run Playwright, reduced-motion, keyboard, and layout-shift checks.
11. Remove only files proven unreferenced and recoverable from source control/
    source storage.
12. Record before/after deployed bytes and the replacement-master backlog.

## Definition of done

Asset optimization is complete only when:

- every public asset has a known consumer or an explicit non-production class;
- every visible raster has a measured maximum rendered box and density target;
- large-breakpoint images are sharp at the supported target without upscaling;
- mobile/tablet clients receive smaller candidates rather than desktop files;
- cover backgrounds use crop-aware variants and retain their focal point;
- hero video transfer and loading behavior are materially improved;
- font families/weights are scoped to actual consumers;
- source masters and tooling no longer inflate the deployed public directory;
- the manifest check passes;
- screenshots, animation, accessibility, tests, and production build pass;
- any asset whose original lacks sufficient detail is clearly listed with the
  exact replacement dimensions needed.
