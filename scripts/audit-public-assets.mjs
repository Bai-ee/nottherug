#!/usr/bin/env node
/**
 * Runtime asset inventory for plans/010-asset-optimization-spec.md.
 *
 * Crawls the running production build (see README below) at the required
 * viewport matrix, and for each route/viewport/state records every <img>,
 * <video>/<source>, CSS background-image (including pseudo-elements), and
 * loaded font actually rendered on the page, plus every image/media/font
 * network request and its transfer size.
 *
 * Usage:
 *   npm run build && npx next start -p 3102 &
 *   node scripts/audit-public-assets.mjs
 *   kill %1
 *
 * Env:
 *   AUDIT_BASE_URL   default http://localhost:3102
 *   AUDIT_OUT_DIR    default evidence/assets
 *
 * Output: one JSON file per route/viewport/state under AUDIT_OUT_DIR, plus
 * summary.json (per-asset-URL max rendered box across every capture) and
 * classification.json (every public/ file marked referenced/unreferenced).
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3102';
const OUT_DIR = path.resolve(ROOT, process.env.AUDIT_OUT_DIR || 'evidence/assets');

const ROUTES = [
  '/',
  '/about',
  '/book',
  '/contact',
  '/neighborhoods/williamsburg',
  '/reviews',
  '/safety',
  '/admin',
];

// { width, height, label }
const VIEWPORTS = [
  { width: 375, height: 812, label: '375' },
  { width: 400, height: 860, label: '400' },
  { width: 768, height: 1024, label: '768' },
  { width: 1024, height: 900, label: '1024' },
  { width: 1440, height: 900, label: '1440' },
  { width: 1440, height: 760, label: '1440x760' },
  { width: 1920, height: 1080, label: '1920' },
  { width: 2560, height: 1440, label: '2560' },
];

const MOBILE_NAV_MAX_WIDTH = 1100; // matches .nav-hamburger breakpoint in globals.css

/** Extracted in-page: every visible asset consumer. */
/* eslint-disable no-undef */
function collectPageAssets() {
  const results = { images: [], videos: [], backgrounds: [], fonts: [] };

  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  };

  const selectorFor = (el) => {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string' && el.className.trim()) {
      return `${el.tagName.toLowerCase()}.${el.className.trim().split(/\s+/).join('.')}`;
    }
    return el.tagName.toLowerCase();
  };

  document.querySelectorAll('img').forEach((img) => {
    const cs = getComputedStyle(img);
    results.images.push({
      selector: selectorFor(img),
      src: img.currentSrc || img.src,
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      rect: rectOf(img),
      loading: img.loading,
      decoding: img.decoding,
      fetchPriority: img.getAttribute('fetchpriority'),
      objectFit: cs.objectFit,
      objectPosition: cs.objectPosition,
      visible: cs.display !== 'none' && cs.visibility !== 'hidden' && img.getBoundingClientRect().width > 0,
    });
  });

  document.querySelectorAll('video').forEach((video) => {
    const sources = Array.from(video.querySelectorAll('source')).map((s) => ({
      src: s.src,
      type: s.type,
      media: s.getAttribute('media'),
    }));
    const cs = getComputedStyle(video);
    results.videos.push({
      selector: selectorFor(video),
      currentSrc: video.currentSrc,
      sources,
      poster: video.poster,
      preload: video.preload,
      autoplay: video.autoplay,
      muted: video.muted,
      loop: video.loop,
      paused: video.paused,
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      rect: rectOf(video),
      objectFit: cs.objectFit,
    });
  });

  const bgUrlRe = /url\(["']?([^"')]+)["']?\)/g;
  const pushBg = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo || undefined);
    const bgImage = cs.backgroundImage;
    if (!bgImage || bgImage === 'none') return;
    const urls = [...bgImage.matchAll(bgUrlRe)].map((m) => m[1]);
    if (!urls.length) return;
    results.backgrounds.push({
      selector: selectorFor(el) + (pseudo ? `::${pseudo.replace(':', '')}` : ''),
      urls,
      backgroundSize: cs.backgroundSize,
      backgroundPosition: cs.backgroundPosition,
      backgroundRepeat: cs.backgroundRepeat,
      maskImage: cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : undefined,
      rect: rectOf(el),
    });
  };
  document.querySelectorAll('body *').forEach((el) => {
    pushBg(el, null);
    pushBg(el, '::before');
    pushBg(el, '::after');
  });

  if (document.fonts) {
    document.fonts.forEach((f) => {
      if (f.status === 'loaded') {
        results.fonts.push({ family: f.family, style: f.style, weight: f.weight, stretch: f.stretch });
      }
    });
  }

  return results;
}
/* eslint-enable no-undef */

async function captureState(page, route, viewport, stateLabel, requests) {
  const pageAssets = await page.evaluate(collectPageAssets);
  const record = {
    route,
    state: stateLabel,
    viewport,
    capturedAt: new Date().toISOString(),
    ...pageAssets,
    network: requests.filter((r) => r.route === route).map(({ route: _r, ...rest }) => rest),
  };
  const safeRoute = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_');
  const filename = `${safeRoute}__${viewport.label}__${stateLabel}.json`;
  await writeFile(path.join(OUT_DIR, filename), JSON.stringify(record, null, 2));
  return record;
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const allRecords = [];

  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();

      const requests = [];
      page.on('response', async (response) => {
        try {
          const req = response.request();
          const type = req.resourceType();
          if (!['image', 'media', 'font'].includes(type)) return;
          const headers = response.headers();
          let bytes = Number(headers['content-length'] || 0);
          if (!bytes) {
            try {
              const body = await response.body();
              bytes = body.length;
            } catch {
              bytes = 0;
            }
          }
          requests.push({
            route,
            url: req.url(),
            resourceType: type,
            status: response.status(),
            bytes,
            contentType: headers['content-type'] || '',
            fromServiceWorker: response.fromServiceWorker?.() || false,
          });
        } catch {
          // response may be gone by the time we read it; skip
        }
      });

      let navError = null;
      try {
        await page.goto(BASE_URL + route, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (err) {
        navError = String(err);
      }
      await page.waitForTimeout(900); // let intro/entrance animations settle

      if (navError) {
        allRecords.push({ route, state: 'initial', viewport, error: navError });
        await context.close();
        continue;
      }

      allRecords.push(await captureState(page, route, viewport, 'initial', requests));

      // Home-only extra states: welcome modal open, mobile nav open.
      if (route === '/') {
        try {
          const secondaryCta = page.locator('#hero-cta-secondary');
          if (await secondaryCta.count()) {
            await secondaryCta.click({ timeout: 3000 });
            await page.waitForSelector('#welcome-walk-modal-shell', { timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(400);
            allRecords.push(await captureState(page, route, viewport, 'welcome-modal-open', requests));
            await page.keyboard.press('Escape').catch(() => {});
            await page.waitForTimeout(200);
          }
        } catch (err) {
          allRecords.push({ route, state: 'welcome-modal-open', viewport, error: String(err) });
        }

        if (viewport.width <= MOBILE_NAV_MAX_WIDTH) {
          try {
            const hamburger = page.locator('#nav-hamburger-toggle');
            if (await hamburger.count()) {
              await hamburger.click({ timeout: 3000 });
              await page.waitForTimeout(300);
              allRecords.push(await captureState(page, route, viewport, 'mobile-nav-open', requests));
              await hamburger.click({ timeout: 3000 }).catch(() => {});
            }
          } catch (err) {
            allRecords.push({ route, state: 'mobile-nav-open', viewport, error: String(err) });
          }
        }
      }

      await context.close();
    }
  }

  await browser.close();

  // ---- Summary: per-asset-URL max rendered box + best-known format info ----
  const summary = {};
  for (const rec of allRecords) {
    if (rec.error) continue;
    const note = (url, extra) => {
      if (!url || url.startsWith('data:')) return;
      const key = url.replace(BASE_URL, '');
      if (!summary[key]) {
        summary[key] = { url: key, consumers: new Set(), maxRect: { width: 0, height: 0 }, states: new Set() };
      }
      const s = summary[key];
      s.consumers.add(`${rec.route}${extra.selector ? ' ' + extra.selector : ''}`);
      s.states.add(rec.state);
      if (extra.rect) {
        s.maxRect.width = Math.max(s.maxRect.width, extra.rect.width);
        s.maxRect.height = Math.max(s.maxRect.height, extra.rect.height);
      }
    };
    for (const img of rec.images || []) note(img.src, img);
    for (const vid of rec.videos || []) {
      for (const src of vid.sources || []) note(src.src, vid);
      if (vid.poster) note(vid.poster, vid);
    }
    for (const bg of rec.backgrounds || []) {
      for (const url of bg.urls) note(url, bg);
    }
  }
  const summaryOut = Object.values(summary).map((s) => ({
    url: s.url,
    consumers: [...s.consumers],
    maxRect: s.maxRect,
    states: [...s.states],
  }));
  await writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summaryOut, null, 2));

  // ---- Network transfer summary per route/viewport (media+font bytes) ----
  const transferSummary = {};
  for (const rec of allRecords) {
    if (rec.error || !rec.network) continue;
    const key = `${rec.route}__${rec.viewport.label}`;
    if (!transferSummary[key]) transferSummary[key] = { route: rec.route, viewport: rec.viewport.label, bytes: 0, requests: 0 };
    for (const n of rec.network) {
      transferSummary[key].bytes += n.bytes;
      transferSummary[key].requests += 1;
    }
  }
  await writeFile(path.join(OUT_DIR, 'transfer-summary.json'), JSON.stringify(Object.values(transferSummary), null, 2));

  // ---- Classification of every public/ file ----
  const referencedUrls = new Set(Object.keys(summary));
  const publicFiles = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else publicFiles.push(full);
    }
  }
  const publicDir = path.join(ROOT, 'public');
  await walk(publicDir);

  const classification = publicFiles.map((f) => {
    const urlPath = '/' + path.relative(publicDir, f).split(path.sep).join('/');
    const referenced = referencedUrls.has(urlPath);
    return { path: urlPath, referenced };
  });
  await writeFile(path.join(OUT_DIR, 'public-file-classification.json'), JSON.stringify(classification, null, 2));

  const unreferenced = classification.filter((c) => !c.referenced);
  console.log(`Captured ${allRecords.filter((r) => !r.error).length} route/viewport/state records.`);
  console.log(`Distinct assets seen at runtime: ${summaryOut.length}`);
  console.log(`Public files with no runtime reference (crawl-only signal — cross-check statically): ${unreferenced.length}`);
  const errored = allRecords.filter((r) => r.error);
  if (errored.length) {
    console.log(`Navigation errors: ${errored.length}`);
    for (const e of errored) console.log(`  ${e.route} @ ${e.viewport?.label} [${e.state}]: ${e.error}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
