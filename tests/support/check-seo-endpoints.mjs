// Request-level SEO check against a running `next start`.
// Usage: node tests/support/check-seo-endpoints.mjs http://localhost:3650
// Fetches /robots.txt and /sitemap.xml, validates their shape (single sitemap
// URL, no `//` after the host), then requests every sitemap URL path on the
// local server (host rewritten) and requires a 200 with no redirect.
const local = (process.argv[2] || 'http://localhost:3650').replace(/\/+$/, '');
const fail = (m) => { console.error('FAIL', m); process.exitCode = 1; };

const robots = await (await fetch(`${local}/robots.txt`)).text();
console.log(robots);
const sitemapLines = robots.split('\n').filter((l) => /^sitemap:/i.test(l));
if (sitemapLines.length !== 1) fail(`robots.txt must advertise exactly one Sitemap, got ${sitemapLines.length}`);
const advertised = sitemapLines[0]?.replace(/^sitemap:\s*/i, '').trim() ?? '';
if (/^https?:\/\/[^/]+\/\//.test(advertised)) fail(`robots sitemap has // after host: ${advertised}`);
if (!advertised.endsWith('/sitemap.xml')) fail(`robots sitemap is not /sitemap.xml: ${advertised}`);

const xml = await (await fetch(`${local}/sitemap.xml`)).text();
console.log(xml);
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!locs.length) fail('sitemap has no <loc>');
const host = new URL(advertised).origin;
for (const loc of locs) {
  if (!loc.startsWith(`${host}/`) || /^https?:\/\/[^/]+\/\//.test(loc)) fail(`bad loc ${loc}`);
  const res = await fetch(`${local}${new URL(loc).pathname}`, { redirect: 'manual' });
  console.log(res.status, new URL(loc).pathname);
  if (res.status !== 200) fail(`${loc} -> ${res.status}`);
}
if (!process.exitCode) console.log(`OK: ${locs.length} sitemap URLs return 200`);
