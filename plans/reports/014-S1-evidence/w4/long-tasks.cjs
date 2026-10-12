const L = require('./trace-lib.cjs');
(async () => {
  const browser = await L.chromium.launch();
  const out = [];
  for (let run = 1; run <= 3; run++) {
    const { ctx, page, cdp } = await L.newPage(browser);
    const tr = await L.startTrace(cdp);
    await page.goto(L.URL, { waitUntil: 'load' });
    await L.sleep(6000);
    const scrollStart = await page.evaluate(() => performance.now());
    const h = await L.scrollThrough(page);
    await L.sleep(500);
    const ev = await tr.stop();
    const P = L.parse(ev);
    // main-thread: tasks on the thread with most events; take tasks with profile attribution
    const tasks = P.tasks.sort((a, b) => b.dur - a.dur);
    const rows = tasks.map((t) => ({ dur: +t.dur.toFixed(0), start: +t.start.toFixed(0), phase: t.start < scrollStart ? 'load/idle' : 'scroll', top: L.topSelf(P, t.ts, t.ts + t.dur * 1000, 3) }));
    const tbt = (f) => tasks.filter(f).reduce((s, t) => s + (t.dur - 50), 0);
    out.push({ run, pageHeight: h, scrollStart: Math.round(scrollStart), count: tasks.length, tbtAll: tbt(() => true), tbtLoad: tbt((t) => t.start < scrollStart), tbtScroll: tbt((t) => t.start >= scrollStart), rows });
    await ctx.close();
  }
  L.fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.map((o) => ({ run: o.run, count: o.count, tbtAll: Math.round(o.tbtAll), tbtLoad: Math.round(o.tbtLoad), tbtScroll: Math.round(o.tbtScroll) }))));
  await browser.close();
})();
