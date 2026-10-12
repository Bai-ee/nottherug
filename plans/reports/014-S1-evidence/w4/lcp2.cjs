const L = require('./trace-lib.cjs');
(async () => { const b = await L.chromium.launch(); const r = [];
  for (let i = 0; i < 3; i++) { const { ctx, page } = await L.newPage(b); const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => { window.__l = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__l.push([Math.round(e.startTime), e.element && e.element.tagName + '.' + String(e.element.className).slice(0, 30)]))).observe({ type: 'largest-contentful-paint', buffered: true }); });
    await page.goto(L.URL, { waitUntil: 'load' }); await L.sleep(5000); r.push(await page.evaluate(() => window.__l)); await ctx.close(); }
  console.log(JSON.stringify(r)); await b.close(); })();
