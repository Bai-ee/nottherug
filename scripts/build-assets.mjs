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
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
