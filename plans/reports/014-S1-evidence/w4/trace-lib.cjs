// Shared helpers. Run with: node <script>.cjs (resolves playwright from the trace worktree).
const WT = '/Users/bballi/Documents/Repos/NotTheRug-014-s1-w4';
const { chromium } = require(WT + '/node_modules/playwright');
const fs = require('fs');
const URL = process.env.URL_UNDER_TEST;
const CATS = '-*,devtools.timeline,disabled-by-default-devtools.timeline,v8,disabled-by-default-v8.cpu_profiler,loading,blink.user_timing,latencyInfo';
async function newPage(browser, { patchParallax = false, screenshots = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (patchParallax) {
    await page.route('**/_next/static/chunks/*.js', async (route) => {
      const resp = await route.fetch();
      let body = await resp.text();
      if (body.includes('[data-city-parallax]')) body = body.replace('[data-city-parallax]', '[data-city-parallax-off]');
      await route.fulfill({ response: resp, body });
    });
  }
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return { ctx, page, cdp };
}
async function startTrace(cdp, screenshots) {
  const events = [];
  cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: CATS + (screenshots ? ',disabled-by-default-devtools.screenshot' : ''), transferMode: 'ReportEvents' });
  return { events, stop: async () => { await cdp.send('Tracing.end'); await done; return events; } };
}
function parse(events) {
  const nav = events.filter((e) => e.name === 'navigationStart' && e.args?.data?.documentLoaderURL?.includes(process.env.PORT_UNDER_TEST)).sort((a, b) => a.ts - b.ts)[0];
  const navTs = nav ? nav.ts : null;
  const tasks = events.filter((e) => e.name === 'RunTask' && e.ph === 'X' && e.dur >= 50000).map((e) => ({ ts: e.ts, dur: e.dur / 1000, start: navTs ? (e.ts - navTs) / 1000 : null, tid: e.tid }));
  // build cpu profile
  const profs = {};
  for (const e of events) {
    if (e.name === 'Profile') profs[e.id] = { start: e.args.data.startTime, nodes: [], samples: [], deltas: [] };
  }
  for (const e of events) {
    if (e.name === 'ProfileChunk') {
      const p = profs[e.id]; if (!p) continue;
      const c = e.args.data.cpuProfile; if (c.nodes) p.nodes.push(...c.nodes);
      if (c.samples) p.samples.push(...c.samples);
      if (e.args.data.timeDeltas) p.deltas.push(...e.args.data.timeDeltas);
    }
  }
  // choose biggest profile (main thread)
  const prof = Object.values(profs).sort((a, b) => b.samples.length - a.samples.length)[0];
  let sampleTs = [];
  const byId = new Map();
  if (prof) {
    let t = prof.start; for (const d of prof.deltas) { t += d; sampleTs.push(t); }
    prof.nodes.forEach((n) => byId.set(n.id, n));
    const parent = new Map(); prof.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
    prof.parent = parent;
  }
  return { navTs, tasks, prof, sampleTs, byId };
}
const fn = (n) => { const c = n.callFrame; return `${c.functionName || '(anon)'} ${(c.url||"").split('/').pop() || ''}:${c.lineNumber + 1}:${c.columnNumber + 1}`; };
function topSelf(P, t0, t1, k = 3) {
  const acc = new Map();
  for (let i = 0; i < P.sampleTs.length; i++) {
    const ts = P.sampleTs[i]; if (ts < t0 || ts > t1) continue;
    const dt = (P.sampleTs[i + 1] ?? ts) - ts;
    const n = P.byId.get(P.prof.samples[i]); if (!n) continue;
    const key = fn(n); acc.set(key, (acc.get(key) || 0) + dt);
  }
  return [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([f, us]) => `${f} ${(us / 1000).toFixed(0)}ms`);
}
// inclusive ms of every node matching predicate, counted once per sample
function inclusive(P, pred) {
  let us = 0;
  for (let i = 0; i < P.sampleTs.length; i++) {
    const dt = (P.sampleTs[i + 1] ?? P.sampleTs[i]) - P.sampleTs[i];
    let id = P.prof.samples[i];
    while (id != null) { const n = P.byId.get(id); if (n && pred(n)) { us += dt; break; } id = P.prof.parent.get(id); }
  }
  return us / 1000;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= h; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await sleep(150); }
  return h;
}
module.exports = { chromium, newPage, startTrace, parse, topSelf, inclusive, fn, median, sleep, scrollThrough, URL, fs };
