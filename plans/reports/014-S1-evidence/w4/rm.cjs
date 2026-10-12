const { chromium } = require('/Users/bballi/Documents/Repos/NotTheRug-014-s1-w4/node_modules/playwright');
(async () => { const b = await chromium.launch(); const out = {};
 for (const [n, u] of [['base', 'http://localhost:3464/'], ['branch', 'http://localhost:3465/']]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await p.goto(u, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  out[n] = await p.evaluate(() => ({ state: document.querySelector('#home-paw-walk-layer').dataset.pawWalkState, paws: [...document.querySelectorAll('.home-paw-step')].map((e) => [e.style.display, e.style.left, e.style.top, e.dataset.pawRotation, e.dataset.pawTone || '', getComputedStyle(e).opacity].join('|')) })); await ctx.close(); }
 console.log(out.base.state, out.branch.state, out.base.paws.length, 'identical:', JSON.stringify(out.base) === JSON.stringify(out.branch), 'shown', out.base.paws.filter(x => !x.startsWith('none')).length); await b.close(); })();
