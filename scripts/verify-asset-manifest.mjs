#!/usr/bin/env node
/**
 * Enforcement checks from plans/010-asset-optimization-spec.md
 * "Asset manifest and enforcement". Run with:
 *
 *   node scripts/verify-asset-manifest.mjs
 *
 * Exits non-zero (and prints every failure, not just the first) if any rule
 * is violated. Suggested package.json script name: "verify:assets"
 * (worker-b may not edit package.json; the coordinator adds it).
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const MANIFEST_PATH = path.join(ROOT, 'docs/asset-manifest.json');

const HERO_VIDEO_BUDGET_BYTES = 5 * 1024 * 1024; // 5MB per spec
const LARGE_PNG_BYTES = 500 * 1024; // photos this big as PNG need a documented reason
const TOOLING_EXTENSIONS = new Set(['.py', '.html', '.ds_store', '.sh', '.md']);
// Above-fold assets allowed to be eager/preloaded without a manifest exception.
const APPROVED_EAGER_PATTERNS = [
  /^\/video\/hero-mccarren/,
  /^\/img\/(bg5-cover|bg-section-1-cover|bg-section-2-cover|bg-section-graphic-1|bg-section-graphic-2|hero-walker-strip|product-background|card-bg)\.webp$/,
  /^\/textures\//,
];

const failures = [];
const fail = (msg) => failures.push(msg);

async function walk(dir, base = dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full));
  }
  return out;
}

async function main() {
  const manifestRaw = await readFile(MANIFEST_PATH, 'utf8').catch(() => null);
  if (!manifestRaw) {
    fail(`Manifest not found at ${path.relative(ROOT, MANIFEST_PATH)}`);
    report();
    return;
  }
  const manifest = JSON.parse(manifestRaw);
  const assets = manifest.assets || [];

  // ---- 1. Every referenced local raster has known dimensions ----
  for (const a of assets) {
    if (!a.intrinsic || !a.intrinsic.width || !a.intrinsic.height) {
      fail(`${a.source}: manifest entry is missing intrinsic dimensions.`);
    }
  }

  // ---- 2. Manifest budget: on-disk bytes must not exceed manifest bytes
  //         by more than 10% without the manifest itself being updated ----
  for (const a of assets) {
    const diskPath = path.join(PUBLIC_DIR, a.source.replace(/^\//, ''));
    const st = await stat(diskPath).catch(() => null);
    if (!st) {
      // Some manifest entries (patched-but-not-yet-applied CSS/component
      // swaps) intentionally point at a file that already exists (the new
      // derivative) even though the live app hasn't been repointed to it
      // yet (see pendingPatch). A missing *derivative* file is still a
      // real failure.
      fail(`${a.source}: listed in manifest but not found on disk at ${path.relative(ROOT, diskPath)}.`);
      continue;
    }
    if (st.size > a.bytes * 1.1) {
      fail(`${a.source}: on-disk bytes (${st.size}) exceed manifest budget (${a.bytes}) by more than 10%. Update docs/asset-manifest.json if this is an approved change.`);
    }
  }

  // ---- 3. 1x/2x sizing sanity: intrinsic must cover maxCssBox*targetDpr,
  //         and must not be more than 2x the required pixels, unless the
  //         manifest documents why (undersized-source exception, reusable
  //         asset, tile, etc. — anything with a non-null `exception`). ----
  for (const a of assets) {
    if (!a.maxCssBox || !a.intrinsic) continue;
    const reqW = Math.ceil(a.maxCssBox.width * a.targetDpr);
    const reqH = Math.ceil(a.maxCssBox.height * a.targetDpr);
    const { width: iw, height: ih } = a.intrinsic;
    const under = iw < reqW * 0.9 || ih < reqH * 0.9; // 10% slack for cover-crop rounding
    const over = iw > reqW * 2 || ih > reqH * 2;
    if (under && !a.exception) {
      fail(`${a.source}: intrinsic ${iw}x${ih} is smaller than its required ${reqW}x${reqH} box with no documented exception.`);
    }
    if (over && !a.exception) {
      fail(`${a.source}: intrinsic ${iw}x${ih} is more than 2x its required ${reqW}x${reqH} box with no documented exception.`);
    }
  }

  // ---- 4. No large PNG photo without a documented alpha/quality reason ----
  const allPublicFiles = await walk(PUBLIC_DIR);
  for (const rel of allPublicFiles) {
    if (!rel.toLowerCase().endsWith('.png')) continue;
    const full = path.join(PUBLIC_DIR, rel);
    const st = await stat(full);
    if (st.size <= LARGE_PNG_BYTES) continue;
    const urlPath = '/' + rel.split(path.sep).join('/');
    const manifestEntry = assets.find((a) => a.source === urlPath || (a.pendingPatch && a.pendingPatch.includes(urlPath)));
    const meta = await sharp(full).metadata().catch(() => null);
    const hasAlpha = meta?.hasAlpha;
    if (!manifestEntry && !hasAlpha) {
      fail(`${urlPath}: PNG over ${LARGE_PNG_BYTES} bytes (${st.size}) with no alpha channel and no manifest entry/exception. Convert to WebP/AVIF or document why it must stay PNG.`);
    }
  }

  // ---- 5. No source/tooling file shipped in public/ ----
  for (const rel of allPublicFiles) {
    const ext = path.extname(rel).toLowerCase();
    const base = path.basename(rel).toLowerCase();
    if (TOOLING_EXTENSIONS.has(ext) || base === '.ds_store') {
      fail(`public/${rel}: tooling/source file type (${ext || base}) should not ship in public/.`);
    }
  }

  // ---- 6. Hero video transfer budget ----
  for (const a of assets) {
    if (a.source.startsWith('/video/hero-') && (a.format === 'mp4' || a.format === 'webm')) {
      if (a.bytes > HERO_VIDEO_BUDGET_BYTES) {
        fail(`${a.source}: ${a.bytes} bytes exceeds the ${HERO_VIDEO_BUDGET_BYTES}-byte hero video budget.`);
      }
    }
  }

  // ---- 7. next/image with fill must have sizes (static source scan) ----
  const srcDirs = ['app', 'components'];
  for (const dir of srcDirs) {
    const files = await walk(path.join(ROOT, dir)).catch(() => []);
    for (const rel of files) {
      if (!/\.(tsx|jsx)$/.test(rel)) continue;
      const full = path.join(ROOT, dir, rel);
      const text = await readFile(full, 'utf8');
      // Find <Image ... fill ... /> blocks (naive but effective for JSX attrs).
      const imageTagRe = /<Image\b[^>]*?\/?>(?![\s\S]*?<\/Image>)|<Image\b[\s\S]*?(?:\/>|>)/g;
      let m;
      while ((m = imageTagRe.exec(text))) {
        const tag = m[0];
        if (/\bfill\b/.test(tag) && !/\bsizes\s*=/.test(tag)) {
          const line = text.slice(0, m.index).split('\n').length;
          fail(`${dir}/${rel}:${line}: <Image fill> without a "sizes" prop.`);
        }
      }
    }
  }

  // ---- 8. Eager/preloaded assets must be on the approved above-fold list ----
  for (const a of assets) {
    const isEager = /eager|preload=(?!none)/i.test(a.loading || '');
    if (!isEager) continue;
    const approved = APPROVED_EAGER_PATTERNS.some((re) => re.test(a.source));
    if (!approved) {
      fail(`${a.source}: marked eager/preloaded ("${a.loading}") but is not on the approved above-fold pattern list in this script.`);
    }
  }

  report();
}

function report() {
  if (failures.length) {
    console.error(`asset-manifest verification FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'}):\n`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('asset-manifest verification passed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
