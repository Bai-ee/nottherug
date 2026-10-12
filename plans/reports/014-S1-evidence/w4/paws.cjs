// dumps every paw's final left/top/rotation/display + opacity at 10 scroll points, per width
const { chromium } = require('/Users/bballi/Documents/Repos/NotTheRug-014-s1-w4/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const w of [390, 768, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage();
    await page.goto(process.env.URL_UNDER_TEST, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#home-paw-walk-layer [style*="opacity"], .home-paw-step[data-paw-rotation]'), null, { timeout: 30000 });
    await page.waitForTimeout(3000);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round((h - 900) * i / 10)); await page.waitForTimeout(1800);
      pts.push(await page.evaluate(() => [...document.querySelectorAll('.home-paw-step')].map((e) => { const r = e.getBoundingClientRect(); return [e.style.display === 'none' ? 0 : 1, +r.left.toFixed(2), +r.top.toFixed(2), e.dataset.pawRotation ? +(+e.dataset.pawRotation).toFixed(2) : null, +(+getComputedStyle(e).opacity).toFixed(3), e.dataset.pawTone || '']; })));
    }
    out[w] = { h, pts }; await ctx.close();
  }
  require('fs').writeFileSync(process.env.OUT, JSON.stringify(out)); await b.close();
})();
