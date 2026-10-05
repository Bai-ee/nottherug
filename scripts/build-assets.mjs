#!/usr/bin/env node
/**
 * Reproducible derivative generation for plans/010-asset-optimization-spec.md.
 *
 * Reads full-resolution master images from assets-src/img/ (copies of the
 * best available originals — none of these have a higher-resolution source,
 * see docs/asset-manifest.json "replacementBacklog") and writes deliberately
 * named, format-converted, metadata-stripped WebP + AVIF derivatives into
 * public/img/ and public/logos/ at the SAME pixel dimensions (no upscaling —
 * this pass is a codec/metadata win for CSS `background-image` consumers
 * next/image cannot touch, not a resize pass). Re-run any time the masters
 * change:
 *
 *   node scripts/build-assets.mjs
 *
 * Every output file's exact sharp() pipeline is listed in JOBS below so the
 * command is reproducible without re-reading this file's prose.
 */
import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_IMG = path.join(ROOT, 'assets-src/img');
const PUB_IMG = path.join(ROOT, 'public/img');
const PUB_LOGOS = path.join(ROOT, 'public/logos');

// Each job: copy the current public/ original into assets-src/img as the
// preserved master (first run only — copyFile is idempotent), then emit
// WebP + AVIF derivatives with a new, cache-safe filename at the SAME
// dimensions (no upscale). `alpha: true` keeps a slower/larger lossless-ish
// path for art that must not band; everything else uses a quality tuned to
// visually match the PNG at 100% zoom on a photographic dark/paper ground.
const JOBS = [
  { master: 'public/img/bg5.png', out: 'public/img/bg5-cover.', alpha: true, webpQ: 84, avifQ: 55 },
  { master: 'public/img/bg_section_1.png', out: 'public/img/bg-section-1-cover.', alpha: true, webpQ: 84, avifQ: 55 },
  { master: 'public/img/bg_section_2.png', out: 'public/img/bg-section-2-cover.', alpha: true, webpQ: 84, avifQ: 55 },
  { master: 'public/img/bg_section_graphic_1.png', out: 'public/img/bg-section-graphic-1.', alpha: true, webpQ: 86, avifQ: 58 },
  { master: 'public/img/bg_section_graphic_2.png', out: 'public/img/bg-section-graphic-2.', alpha: true, webpQ: 86, avifQ: 58 },
  { master: 'public/img/homepage_image.png', out: 'public/img/hero-walker-strip.', alpha: false, webpQ: 84, avifQ: 55 },
  { master: 'public/img/product_background.png', out: 'public/img/product-background.', alpha: true, webpQ: 86, avifQ: 58 },
  { master: 'public/img/card_bg.png', out: 'public/img/card-bg.', alpha: true, webpQ: 86, avifQ: 58 },
];

// NOTE: public/logos/ntr_offwhite_horiz.png (1536x1024, 2.1MB, oversized
// canvas) is NOT in this list on purpose — grep confirms it has zero
// consumers in app/ or components/ (the live nav logo is the much smaller
// /img/horiz_logo_off_white.png). It is only referenced from style-guide/
// docs, which Next.js does not serve. See docs/asset-manifest.json
// "publicFileClassification" and the final report for the removal
// recommendation — it's flagged rather than deleted here because a
// worker-b instruction restricts removal to files "proven unreferenced AND
// recoverable," and this one still has a live (non-deployed) doc reference.

// Plan 013 P3 (F07): RESIZED derivatives for consumers that were shipping a
// full-size PNG/JPEG into a tiny box. Unlike JOBS above these DO resize, to
// the measured maximum rendered size x2 DPR (capped at the source — no
// upscale). Masters are copied to assets-src/ exactly like JOBS; the original
// public/ files stay in place (previous URLs are retained through the release
// for rollback, and /about + the team preview still use the JPEGs).
//   paw-walk-{left,right}: HomePawWalk prints render at clamp(34px,4vw,52px)
//     => 52 CSS px max => 104px wide at 2x. WebP only (alpha, near-lossless),
//     the same convention as SectionRail's paw-rail-*.webp.
//   team/<name>-w<px>: home team chips (TeamScroller) as <picture>
//     avif + webp. -w<small> serves a 1x desktop chip (~150px box x photoSize),
//     -w<full> is the source width (2x/mobile needs exceed the source).
const PAW_JOBS = [
  { master: 'public/img/pawl.png', out: 'public/img/paw-walk-left.webp', width: 104 },
  { master: 'public/img/pawr.png', out: 'public/img/paw-walk-right.webp', width: 104 },
];
// [name, source width, photoSize % from lib/content/team.ts]
const TEAM_PORTRAITS = [
  ['luis', 675, 150], ['lincoln', 506, 275], ['marcus', 675, 275],
  ['christian', 506, 170], ['shawn', 675, 290], ['yenny', 750, 265],
];
const TEAM_DESKTOP_BOX = 150; // CSS px of a 1x desktop chip window (148 at 1440)

async function ensureMaster(job) {
  const rel = job.master.replace(/^public\//, '');
  const srcMasterPath = path.join(ROOT, 'assets-src', rel);
  await mkdir(path.dirname(srcMasterPath), { recursive: true });
  await copyFile(path.join(ROOT, job.master), srcMasterPath).catch(() => {});
  return srcMasterPath;
}

async function run() {
  await mkdir(SRC_IMG, { recursive: true });
  await mkdir(PUB_IMG, { recursive: true });
  await mkdir(PUB_LOGOS, { recursive: true });

  for (const job of JOBS) {
    const masterPath = await ensureMaster(job);
    let pipeline = sharp(masterPath).rotate(); // normalize EXIF orientation, then strip metadata (default)
    if (job.trim) {
      // ntr_offwhite_horiz.png carries transparent canvas padding around the
      // lockup; the logo is always placed by its own CSS box (not by this
      // canvas), so trimming is safe here (unlike hero/decorative art where
      // padding IS the positioning mechanism).
      pipeline = pipeline.trim();
    }
    const meta = await sharp(masterPath).metadata();
    const webpOut = job.out + 'webp';
    const avifOut = job.out + 'avif';

    await pipeline
      .clone()
      .webp({ quality: job.webpQ, effort: 6, alphaQuality: job.alpha ? 90 : undefined })
      .toFile(path.join(ROOT, webpOut));

    await pipeline
      .clone()
      .avif({ quality: job.avifQ, effort: 6 })
      .toFile(path.join(ROOT, avifOut));

    console.log(`${job.master} (${meta.width}x${meta.height}) -> ${webpOut}, ${avifOut}`);
  }

  for (const job of PAW_JOBS) {
    const masterPath = await ensureMaster(job);
    await sharp(masterPath)
      .rotate()
      .resize({ width: job.width })
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(path.join(ROOT, job.out));
    console.log(`${job.master} -> ${job.out} (${job.width}px wide)`);
  }

  for (const [name, srcWidth, sizePct] of TEAM_PORTRAITS) {
    const job = { master: `public/img/team/${name}.jpg` };
    const masterPath = await ensureMaster(job);
    const small = Math.min(srcWidth, Math.round((sizePct / 100) * TEAM_DESKTOP_BOX));
    for (const width of [small, srcWidth]) {
      const base = path.join(ROOT, `public/img/team/${name}-w${width}.`);
      const pipeline = sharp(masterPath).rotate().resize({ width, withoutEnlargement: true });
      await pipeline.clone().webp({ quality: 84, effort: 6 }).toFile(base + 'webp');
      await pipeline.clone().avif({ quality: 62, effort: 6 }).toFile(base + 'avif');
      console.log(`${job.master} -> team/${name}-w${width}.{webp,avif}`);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
