#!/usr/bin/env node
// Deterministic cold-load measurement of the homepage (Plan 013 P3).
// Usage: node scripts/perf/measure-home.mjs --base http://127.0.0.1:3610 \
//          --runs 5 --label before --out DIR [--screens DIR] [--path /]
// Only point this at a LOCAL production build, never the live site.
/* global window, document, getComputedStyle, innerWidth, innerHeight, requestAnimationFrame, scrollTo -- page-side code passed to Playwright */
//
// Fixed measurement window: every run is observed until CUTOFF_MS after
// navigation start (not network idle), so before/after runs are comparable.
// Bytes are CDP encodedDataLength: completed requests use the loadingFinished
// value (headers + body on the wire); requests still open at the cutoff
// (typically the hero video) use body bytes received so far and are reported
// as "inflight". Video (type Media) is always reported separately.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const CUTOFF_MS = 15000;
export const PROFILES = {
  mobile: {
    viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    cpuRate: 4,
    // "Slow 4G"-like: values in CDP units (latency ms, bytes/s)
    net: { latency: 150, downloadThroughput: (1.6 * 1000 * 1000) / 8, uploadThroughput: (750 * 1000) / 8 },
  },
  desktop: {
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
    cpuRate: 1,
    net: { latency: 40, downloadThroughput: (10 * 1000 * 1000) / 8, uploadThroughput: (10 * 1000 * 1000) / 8 },
  },
};
const SCREEN_WIDTHS = [[375, 812], [768, 1024], [1440, 900]];

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > -1 ? process.argv[i + 1] : d; };
const base = (arg("base") || "").replace(/\/$/, "");
const runs = Number(arg("runs", 3));
const label = arg("label", "run");
const outDir = arg("out", ".");
const screensDir = arg("screens");
const pagePath = arg("path", "/");
if (!base) { console.error("--base required"); process.exit(1); }

const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Runs in the page from document start. Polls each frame for readiness.
const INIT = () => {
  const w = window; w.__m = { lcp: null, cls: 0, cta: null, ctaOffscreen: false, headline: null };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) {
    w.__m.lcp = { t: e.startTime, size: e.size, url: e.url || null,
      el: e.element ? (e.element.id ? "#" + e.element.id : e.element.tagName.toLowerCase() + (e.element.className && typeof e.element.className === "string" ? "." + e.element.className.trim().split(/\s+/).join(".") : "")) : null }; } })
    .observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) w.__m.cls += e.value; })
    .observe({ type: "layout-shift", buffered: true });
  const effOpacity = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n); if (cs.visibility === "hidden" || cs.display === "none") return 0; o *= parseFloat(cs.opacity); } return o; };
  const ready = (el) => {
    if (!el) return false; const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (effOpacity(el) < 0.99) return false;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { w.__m.ctaOffscreen = true; return false; }
    const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit));
  };
  const tick = () => {
    const m = w.__m;
    if (m.cta == null && ready(document.getElementById("hero-cta-primary"))) m.cta = performance.now();
    if (m.headline == null && ready(document.getElementById("hero-headline"))) m.headline = performance.now();
    if (m.cta == null || m.headline == null) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const typeOf = (rt) => {
  if (rt === "Image") return "image"; if (rt === "Font") return "font"; if (rt === "Script") return "script";
  if (rt === "Stylesheet") return "css"; if (rt === "Media") return "video";
  if (rt === "Document") return "document"; return "other";
};

async function oneRun(browser, name, p) {
  const ctx = await browser.newContext({ viewport: p.viewport, deviceScaleFactor: p.deviceScaleFactor, isMobile: p.isMobile, hasTouch: p.hasTouch });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e.message).slice(0, 300)));
  await page.addInitScript(INIT);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, ...p.net });
  if (p.cpuRate > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpuRate });
  const reqs = new Map();
  cdp.on("Network.requestWillBeSent", (e) => { if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, type: typeOf(e.type), bytes: 0, done: false, status: null }); });
  cdp.on("Network.responseReceived", (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.type = typeOf(e.type); } });
  cdp.on("Network.dataReceived", (e) => { const r = reqs.get(e.requestId); if (r && !r.done) r.partial = (r.partial || 0) + e.encodedDataLength; });
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.done = true; } });
  cdp.on("Network.loadingFailed", (e) => { const r = reqs.get(e.requestId); if (r) { r.failed = e.errorText; r.done = true; r.bytes = r.partial || 0; } });

  const t0 = Date.now();
  page.goto(base + pagePath, { waitUntil: "commit", timeout: 30000 }).catch((e) => errors.push("goto: " + e.message));
  await new Promise((r) => setTimeout(r, CUTOFF_MS));
  const t = await page.evaluate(() => ({
    m: window.__m, now: performance.now(),
    nav: (() => { const n = performance.getEntriesByType("navigation")[0]; return n ? { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, ttfb: n.responseStart } : null; })(),
    fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`),
  })).catch((e) => { errors.push("evaluate: " + e.message); return { m: {}, fonts: [] }; });

  const sums = { image: 0, font: 0, script: 0, css: 0, document: 0, other: 0 };
  let video = 0, videoInflight = 0, requestsN = 0;
  const fontFiles = [], scripts = [], images = [];
  for (const r of reqs.values()) {
    if (r.url.startsWith("data:")) continue; requestsN++;
    const b = r.done ? r.bytes : (r.partial || 0);
    if (r.type === "video") { video += b; if (!r.done) videoInflight += b; continue; }
    sums[r.type] = (sums[r.type] || 0) + b;
    const short = r.url.replace(base, "");
    if (r.type === "font") fontFiles.push({ url: short, bytes: b });
    if (r.type === "script") scripts.push({ url: short, bytes: b });
    if (r.type === "image") images.push({ url: short, bytes: b, inflight: !r.done });
  }
  const nonVideo = Object.values(sums).reduce((a, b) => a + b, 0);
  const res = {
    profile: name, cutoffMs: CUTOFF_MS,
    bytes: { ...sums, video, videoInflight, nonVideoTotal: nonVideo, total: nonVideo + video, requests: requestsN },
    lcp: t.m?.lcp || null, cls: t.m?.cls ?? null,
    ctaReadyMs: t.m?.cta ?? null, ctaOffscreen: !!t.m?.ctaOffscreen, headlineVisibleMs: t.m?.headline ?? null,
    nav: t.nav || null, errors, fontFiles, fontsLoaded: t.fonts, scripts, images,
  };
  await ctx.close();
  void t0;
  return res;
}

async function screens(browser, dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [w, h] of SCREEN_WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
    const page = await ctx.newPage();
    await page.goto(base + pagePath, { waitUntil: "load" });
    await page.waitForTimeout(7000);
    // trigger lazy content so below-fold images are included
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(dir, `home-${w}.jpg`), type: "jpeg", quality: 70, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(`screen ${w}: horizontal overflow px = ${overflow}`);
    await ctx.close();
  }
}

const kb = (n) => (n == null ? "n/a" : (n / 1024).toFixed(0));
const sec = (n) => (n == null ? "n/a" : (n / 1000).toFixed(2));
function summarize(all) {
  const out = {};
  for (const name of Object.keys(PROFILES)) {
    const rs = all.filter((r) => r.profile === name); if (!rs.length) continue;
    const f = (g) => median(rs.map(g));
    out[name] = {
      runs: rs.length,
      medianKB: { image: f((r) => r.bytes.image) / 1024, font: f((r) => r.bytes.font) / 1024, script: f((r) => r.bytes.script) / 1024, css: f((r) => r.bytes.css) / 1024,
        other: f((r) => r.bytes.other + r.bytes.document) / 1024, nonVideoTotal: f((r) => r.bytes.nonVideoTotal) / 1024, video: f((r) => r.bytes.video) / 1024 },
      medianCtaReadyMs: f((r) => r.ctaReadyMs), medianHeadlineMs: f((r) => r.headlineVisibleMs),
      medianLcpMs: f((r) => r.lcp?.t ?? null), medianCls: f((r) => r.cls),
      lcpElements: [...new Set(rs.map((r) => r.lcp ? `${r.lcp.el || "?"}${r.lcp.url ? " (" + r.lcp.url.replace(base, "") + ")" : ""}` : "none"))],
      spread: { ctaReadyMs: [Math.min(...rs.map((r) => r.ctaReadyMs ?? Infinity)), Math.max(...rs.map((r) => r.ctaReadyMs ?? -Infinity))],
        lcpMs: [Math.min(...rs.map((r) => r.lcp?.t ?? Infinity)), Math.max(...rs.map((r) => r.lcp?.t ?? -Infinity))],
        nonVideoKB: [Math.min(...rs.map((r) => r.bytes.nonVideoTotal)) / 1024, Math.max(...rs.map((r) => r.bytes.nonVideoTotal)) / 1024] },
      consoleErrors: rs.reduce((n, r) => n + r.errors.length, 0),
    };
  }
  return out;
}
function markdown(sum) {
  let md = `| profile | runs | CTA ready s | headline s | LCP s | LCP element | CLS | image KB | font KB | JS KB | CSS KB | other KB | non-video KB | video KB (partial at cutoff) | errors |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const [n, s] of Object.entries(sum)) {
    const k = s.medianKB;
    md += `| ${n} | ${s.runs} | ${sec(s.medianCtaReadyMs)} | ${sec(s.medianHeadlineMs)} | ${sec(s.medianLcpMs)} | ${s.lcpElements.join("; ")} | ${s.medianCls?.toFixed(3)} | ${kb(k.image * 1024)} | ${kb(k.font * 1024)} | ${kb(k.script * 1024)} | ${kb(k.css * 1024)} | ${kb(k.other * 1024)} | ${kb(k.nonVideoTotal * 1024)} | ${kb(k.video * 1024)} | ${s.consoleErrors} |\n`;
  }
  return md;
}

const browser = await chromium.launch();
const all = [];
for (const name of Object.keys(PROFILES)) {
  for (let i = 0; i < runs; i++) {
    const r = await oneRun(browser, name, PROFILES[name]); r.run = i + 1; all.push(r);
    console.log(`${name} #${i + 1}: cta=${sec(r.ctaReadyMs)}s lcp=${sec(r.lcp?.t)}s nonVideo=${kb(r.bytes.nonVideoTotal)}KB video=${kb(r.bytes.video)}KB errs=${r.errors.length}`);
  }
}
if (screensDir) await screens(browser, screensDir);
await browser.close();
const summary = summarize(all);
fs.mkdirSync(outDir, { recursive: true });
const meta = { label, base, path: pagePath, cutoffMs: CUTOFF_MS, profiles: PROFILES, date: new Date().toISOString() };
fs.writeFileSync(path.join(outDir, `perf-${label}.json`), JSON.stringify({ meta, summary, runs: all }, null, 1));
const md = markdown(summary);
fs.writeFileSync(path.join(outDir, `perf-${label}.md`), `# Homepage perf: ${label}\n\n${md}\nCutoff ${CUTOFF_MS} ms after navigation commit; cache disabled; fresh context per run.\n`);
console.log(md);
