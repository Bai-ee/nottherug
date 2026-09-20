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
const SRC_DOGS = path.join(ROOT, 'assets-src/dogs');
const SRC_LOGOS = path.join(ROOT, 'assets-src/logos');
const SRC_TEAM = path.join(ROOT, 'assets-src/team');
const PUB_IMG = path.join(ROOT, 'public/img');
const PUB_LOGOS = path.join(ROOT, 'public/logos');
const PUB_DOGS = path.join(ROOT, 'public/dogs');
const PUB_TEAM = path.join(ROOT, 'public/img/team');

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

// ------------------------------------------------------------------------
// Breakpoint-specific mobile derivatives for the CSS full-bleed backgrounds
// above. Desktop/tablet/large all collapse onto the JOBS output above
// (unchanged): every master here tops out at 1446-1672px wide, which is
// already below a sharp 2x cover at 1024px CSS width (2048px) — see
// docs/asset-manifest.json replacementMasterBacklog. There is no honest
// "tablet" tier a real derivative can add over the desktop file; the only
// real win available from these sources is a smaller, more aggressively
// compressed candidate for phones (<=768px CSS width), which is what
// MOBILE_BG_JOBS produces. `sizeFloor` masters (already <= the 1536px
// mobile-2x floor) are skipped — resizing "down" to a number bigger than
// the source would just re-encode the same pixels under a second name.
const MOBILE_BG_TARGET_WIDTH = 1536; // ceil(768 CSS px * 2 DPR), per plans/010 mobile tier
const MOBILE_BG_JOBS = [
  { master: 'public/img/bg5.png', out: 'public/img/bg5-mobile.', alpha: true, webpQ: 70, avifQ: 44 },
  { master: 'public/img/bg_section_1.png', out: 'public/img/bg-section-1-mobile.', alpha: true, webpQ: 70, avifQ: 44 },
  { master: 'public/img/bg_section_2.png', out: 'public/img/bg-section-2-mobile.', alpha: true, webpQ: 70, avifQ: 44 },
  { master: 'public/img/bg_section_graphic_1.png', out: 'public/img/bg-section-graphic-1-mobile.', alpha: true, webpQ: 72, avifQ: 46 },
  { master: 'public/img/homepage_image.png', out: 'public/img/hero-walker-strip-mobile.', alpha: false, webpQ: 70, avifQ: 44 },
  // NOT included (source already at/under the mobile floor, no derivative
  // benefit — see replacementMasterBacklog):
  //   public/img/bg_section_graphic_2.png (1446px wide)
  //   public/img/product_background.png (1513px wide)
];

// ------------------------------------------------------------------------
// Page-hero photos (About/Neighborhoods/Reviews/Safety). These are portrait
// masters used as an ultra-wide `center 20% / cover` strip, so — unlike the
// CSS backgrounds above — the desktop box already discards most of the
// source height and mobile discards a different amount (see the measured
// rects in the worker-b report). Each gets a real crop-aware mobile
// derivative sized to 2x the measured mobile box, generated with
// `fit: 'cover'` (same focal logic as the CSS `center 20%`) and
// `withoutEnlargement: true` so a too-small master (safety) is never
// upscaled — it silently yields its own native resolution instead.
// Desktop/tablet/large keep the existing full master-resolution WebP; this
// job only adds its AVIF sibling (previously missing) plus the new mobile
// pair.
const PAGE_HERO_JOBS = [
  {
    master: 'public/dogs/IMAGE 00003.webp', // About
    mobileOut: 'public/dogs/about-hero-mobile.',
    fullOut: 'public/dogs/about-hero-full.',
    mobileW: 1536, mobileH: 924, focal: 'top', // center 20% ~= slight top bias
  },
  {
    master: 'public/dogs/IMAGE 00005.webp', // Neighborhoods
    mobileOut: 'public/dogs/neighborhoods-hero-mobile.',
    fullOut: 'public/dogs/neighborhoods-hero-full.',
    mobileW: 1536, mobileH: 924, focal: 'top',
  },
  {
    master: 'public/dogs/IMAGE 00006.webp', // Reviews
    mobileOut: 'public/dogs/reviews-hero-mobile.',
    fullOut: 'public/dogs/reviews-hero-full.',
    mobileW: 1536, mobileH: 1070, focal: 'top',
  },
  {
    master: 'public/dogs/IMAGE 00004.webp', // Safety
    mobileOut: 'public/dogs/safety-hero-mobile.',
    fullOut: 'public/dogs/safety-hero-full.',
    mobileW: 1536, mobileH: 924, focal: 'top',
  },
];

// ------------------------------------------------------------------------
// Flagged leftovers from plans/010-asset-optimization-spec.md: alpha PNGs
// and JPGs sized far beyond their rendered box. Resized to the measured
// max lockup x2 (never upscaled) and re-encoded.
const LOGO_BADGE_JOB = {
  // Footer circle badge (#footer-logo-badge): clamp(168px, 14vw, 224px) —
  // 224px max lockup. sharp `fit: 'inside'` preserves the full transparent
  // circle (no crop — the padding IS the badge's circular silhouette).
  master: 'public/logos/notRugYellow.png',
  sizes: [
    { suffix: '224', width: 224, height: 224 },
    { suffix: '448', width: 448, height: 448 },
  ],
  webpQ: 92, avifQ: 68,
};
const PAW_JOBS = [
  // Paw-walk trail prints (#home-paw-walk-layer): clamp(34px, 4vw, 52px) —
  // 52px max lockup. Tiny alpha art; near-lossless quality costs nothing at
  // this size.
  { master: 'public/img/pawl.png', out: 'public/img/pawl-104.', width: 104, height: 111 },
  { master: 'public/img/pawr.png', out: 'public/img/pawr-104.', width: 104, height: 111 },
];
const TEAM_JOBS = [
  // /about team grid + homepage team scroller (.team-photo, height:280px,
  // percentage `background-size` zoom — see lib/content/team.ts). Every
  // master is already BELOW its effective zoomed requirement (up to 290%```
  // of a ~373-736px box), so this is a format-only win (JPG -> WebP at the
  // same pixel dimensions), not a resize. See replacement-master backlog.
  { file: 'christian.jpg' }, { file: 'lincoln.jpg' }, { file: 'luis.jpg' },
  { file: 'luis-action.jpg' }, { file: 'marcus.jpg' }, { file: 'shawn.jpg' },
  { file: 'yenny.jpg' }, { file: 'yenny-action.jpg' },
];

async function ensureMasterAt(masterRelToPublic, srcRoot) {
  const rel = masterRelToPublic.replace(/^public\//, '');
  const srcMasterPath = path.join(srcRoot, path.basename(rel));
  await mkdir(srcRoot, { recursive: true });
  await copyFile(path.join(ROOT, masterRelToPublic), srcMasterPath).catch(() => {});
  return srcMasterPath;
}

async function ensureMaster(job) {
  const rel = job.master.replace(/^public\//, '');
  const srcMasterPath = path.join(ROOT, 'assets-src', rel);
  await mkdir(path.dirname(srcMasterPath), { recursive: true });
  await copyFile(path.join(ROOT, job.master), srcMasterPath).catch(() => {});
  return srcMasterPath;
}

async function runFullSizeJobs() {
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

async function runMobileBgJobs() {
  for (const job of MOBILE_BG_JOBS) {
    const masterPath = await ensureMaster(job); // reuses the same assets-src/img master as JOBS
    const meta = await sharp(masterPath).metadata();
    if (meta.width <= MOBILE_BG_TARGET_WIDTH) {
      console.log(`SKIP ${job.master}: ${meta.width}px already <= mobile floor (${MOBILE_BG_TARGET_WIDTH}px)`);
      continue;
    }
    const targetH = Math.round(meta.height * (MOBILE_BG_TARGET_WIDTH / meta.width));
    const pipeline = sharp(masterPath).rotate().resize({ width: MOBILE_BG_TARGET_WIDTH, height: targetH, fit: 'fill' });
    const webpOut = job.out + 'webp';
    const avifOut = job.out + 'avif';
    await pipeline.clone().webp({ quality: job.webpQ, effort: 6, alphaQuality: job.alpha ? 88 : undefined }).toFile(path.join(ROOT, webpOut));
    await pipeline.clone().avif({ quality: job.avifQ, effort: 6 }).toFile(path.join(ROOT, avifOut));
    console.log(`${job.master} -> ${webpOut}, ${avifOut} (${MOBILE_BG_TARGET_WIDTH}x${targetH}, mobile tier)`);
  }
}

async function runPageHeroJobs() {
  for (const job of PAGE_HERO_JOBS) {
    const masterPath = await ensureMasterAt(job.master, SRC_DOGS);
    const meta = await sharp(masterPath).metadata();

    // Full tier: same pixels as today's shipped WebP, plus its AVIF sibling.
    const fullWebp = job.fullOut + 'webp';
    const fullAvif = job.fullOut + 'avif';
    await sharp(masterPath).rotate().webp({ quality: 82, effort: 6 }).toFile(path.join(ROOT, fullWebp));
    await sharp(masterPath).rotate().avif({ quality: 52, effort: 6 }).toFile(path.join(ROOT, fullAvif));

    // Mobile tier: crop-aware cover-fit to 2x the measured mobile box,
    // never upscaled (sharp clamps to the largest non-enlarged cover crop
    // when the master is too small — safety's master is short by ~4%).
    const mobileWebp = job.mobileOut + 'webp';
    const mobileAvif = job.mobileOut + 'avif';
    const mobilePipeline = sharp(masterPath).rotate().resize({
      width: job.mobileW,
      height: job.mobileH,
      fit: 'cover',
      position: sharp.strategy.attention, // approximates the CSS `center 20%` focal bias
      withoutEnlargement: true,
    });
    await mobilePipeline.clone().webp({ quality: 76, effort: 6 }).toFile(path.join(ROOT, mobileWebp));
    await mobilePipeline.clone().avif({ quality: 48, effort: 6 }).toFile(path.join(ROOT, mobileAvif));

    console.log(`${job.master} (${meta.width}x${meta.height}) -> ${fullWebp}/${fullAvif} (full), ${mobileWebp}/${mobileAvif} (mobile ${job.mobileW}x${job.mobileH} target)`);
  }
}

async function runLeftoverJobs() {
  // Footer badge (alpha, contain-fit, two densities).
  {
    const masterPath = await ensureMasterAt(LOGO_BADGE_JOB.master, SRC_LOGOS);
    for (const size of LOGO_BADGE_JOB.sizes) {
      const pipeline = sharp(masterPath).rotate().resize({ width: size.width, height: size.height, fit: 'inside', withoutEnlargement: true });
      const webpOut = `public/logos/notRugYellow-${size.suffix}.webp`;
      const avifOut = `public/logos/notRugYellow-${size.suffix}.avif`;
      await pipeline.clone().webp({ quality: LOGO_BADGE_JOB.webpQ, effort: 6, alphaQuality: 95 }).toFile(path.join(ROOT, webpOut));
      await pipeline.clone().avif({ quality: LOGO_BADGE_JOB.avifQ, effort: 6 }).toFile(path.join(ROOT, avifOut));
      console.log(`${LOGO_BADGE_JOB.master} -> ${webpOut}, ${avifOut}`);
    }
  }

  // Paw prints (alpha, tiny, near-lossless).
  for (const job of PAW_JOBS) {
    const masterPath = await ensureMaster({ master: job.master });
    const pipeline = sharp(masterPath).rotate().resize({ width: job.width, height: job.height, fit: 'inside', withoutEnlargement: true });
    const webpOut = job.out + 'webp';
    const avifOut = job.out + 'avif';
    await pipeline.clone().webp({ quality: 92, effort: 6, alphaQuality: 100 }).toFile(path.join(ROOT, webpOut));
    await pipeline.clone().avif({ quality: 70, effort: 6 }).toFile(path.join(ROOT, avifOut));
    console.log(`${job.master} -> ${webpOut}, ${avifOut}`);
  }

  // Team photos (format-only: JPG -> WebP at native dimensions — every
  // master is already undersized for its zoomed display box, see backlog).
  await mkdir(SRC_TEAM, { recursive: true });
  for (const job of TEAM_JOBS) {
    const srcPublic = path.join(PUB_TEAM, job.file);
    const srcMaster = path.join(SRC_TEAM, job.file);
    await copyFile(srcPublic, srcMaster).catch(() => {});
    const base = job.file.replace(/\.jpe?g$/i, '');
    const webpOut = path.join(PUB_TEAM, `${base}.webp`);
    await sharp(srcMaster).rotate().webp({ quality: 82, effort: 6 }).toFile(webpOut);
    console.log(`public/img/team/${job.file} -> public/img/team/${base}.webp`);
  }
}

async function run() {
  await mkdir(SRC_IMG, { recursive: true });
  await mkdir(PUB_IMG, { recursive: true });
  await mkdir(PUB_LOGOS, { recursive: true });
  await mkdir(PUB_DOGS, { recursive: true });

  await runFullSizeJobs();
  await runMobileBgJobs();
  await runPageHeroJobs();
  await runLeftoverJobs();
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
