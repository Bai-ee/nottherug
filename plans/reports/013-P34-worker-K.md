# Plan 013 P4 item 1 (F09) — Worker K report

Branch `013/p34-k`, base e5e28c8. Scope: base-URL normalization, sitemap/robots/metadata/email URL construction, sitemap route set. No host change, no push/deploy.

## Change
- `lib/content/site.ts`: one normalizer. `normalizePublicBaseUrl(raw)` trims, requires http(s), reduces to `URL.origin` (drops trailing slash, path, query, credentials), throws a clear `PUBLIC_BASE_URL ...` error otherwise. `resolvePublicBaseUrl(raw, fallback)` is the safe wrapper: unset/blank -> fallback silently (current behavior); set-but-invalid -> fallback plus one `console.warn`. `SITE_URL` = resolved origin (default still `https://nottherug.com`). `absoluteUrl(path, base)` = `new URL(path, base + '/').href`.
- Used by: `app/sitemap.ts`, `app/robots.ts`, `buildPageMetadata` (openGraph.url), `app/layout.tsx` (metadataBase / og url now import `SITE_URL`; the duplicate local constant is gone), and the three founder-brief email routes (`app/api/cron/founder-brief`, `app/admin/preview/founder-brief`, `app/admin/founder-brief/run-and-send`), which previously concatenated `${base}/admin/...`. Their fallback is still the request origin when the env var is unset (now also when it is invalid).
- OG/Twitter image paths stay relative and resolve against `metadataBase`.

## Before / after (PUBLIC_BASE_URL=`https://nottherug-ten.vercel.app/`, as on the live deploy)
Before (audit evidence + old code): `Sitemap: https://nottherug-ten.vercel.app//sitemap.xml`; every `<loc>` like `https://nottherug-ten.vercel.app//about`; 9 entries including `/services`, `/how-it-works`.

After (real `next start` output, port 3650):
```
Sitemap: https://nottherug-ten.vercel.app/sitemap.xml
```
7 `<loc>`: `/`, `/about`, `/safety`, `/neighborhoods/williamsburg`, `/reviews`, `/book`, `/signup`, all `https://nottherug-ten.vercel.app<path>`. Home page head: canonical and og:url `https://nottherug-ten.vercel.app`, og:image `https://nottherug-ten.vercel.app/img/og_meta_mainpage.png`.

## Sitemap route decisions
| Route | Real behavior | Decision |
|---|---|---|
| `/` | 200, indexable | keep |
| `/services` | 307 -> `/#home-personalized-care-section` (next.config redirects) | removed |
| `/how-it-works` | 307 -> `/#home-how-it-works-block` | removed |
| `/about`, `/safety`, `/neighborhoods/williamsburg`, `/reviews`, `/book`, `/signup` | 200, indexable | keep |
| `/contact` | 200, `noIndex: true` | stays excluded (rationale kept) |
| `/walk-with-us` | 200, nav-linked, not noindexed, not disallowed in robots, not in sitemap | current behavior unchanged; stale comment fixed |

Note: `LAUNCH_MODE=true` (proxy.ts) 307s everything except /contact, /book etc. to /contact; when set, sitemap entries other than `/book` would redirect. Out of scope (proxy.ts not owned); off in normal operation.

## Parked owner decision: index /walk-with-us or not
Current: crawlable and indexable via nav links, but unlisted in the sitemap.
- Option A, list it: add `'/walk-with-us'` to `PUBLIC_ROUTES` in `lib/content/site.ts`.
- Option B, keep out of search: add `noIndex: true` to its `buildPageMetadata({...})` call in `app/(marketing)/walk-with-us/page.tsx` (leave it out of the sitemap).
- Option C, status quo (what ships now).
Comments in `site.ts` and the page now describe the current state (old text said "not the site nav", which is false: nav and TeamGrid link it).

## Tests / results
- New `tests/unit/seo-urls.test.ts`: 25 tests. Normalizer fixtures (slash, multiple slashes, whitespace, path/query/hash, uppercase, localhost port; 7 invalid inputs), fallback/warn, `absoluteUrl`, and for four env cases (no slash, slash, whitespace+path, unset) sitemap (no `//`, host), robots (single correct sitemap URL), metadata (openGraph url, metadataBase, relative OG/Twitter image resolution). Sitemap entries map to existing route files, none in `next.config` redirects, `/contact` absent, no `noIndex`. Email: founder-brief template with a trailing-slash base renders clean `href`s.
- New `tests/support/check-seo-endpoints.mjs <base>`: request-level check on a running server; run against `next start` on 3650: robots has exactly one Sitemap, no `//`, 7 sitemap paths all 200 (no redirects). Output: `OK: 7 sitemap URLs return 200`.
- Emulator unit suite: 77 files, 741 tests passed.
- E2E (`CI=1 E2E_PORT=3650`): 156 passed, 20 skipped (existing skips), 0 failed.
- Typecheck clean. Lint: 0 errors, 1 pre-existing warning (`SchedulingDialog.tsx` img, assigned to another P4 item).
- Caveat: `/robots.txt` and `/sitemap.xml` are static, so `PUBLIC_BASE_URL` is read at build time; after changing it in Vercel a redeploy is needed.
