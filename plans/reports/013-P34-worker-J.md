# Plan 013 P3 item 3 (F08): legacy query redirects moved to proxy

Branch `013/p34-j`, base e5e28c8.

## Old vs new
- Old: `app/(marketing)/page.tsx` awaited `searchParams`, called `resolveLegacyMarketingPath`, and `redirect()`ed. Reading searchParams made `/` dynamic.
- New: `proxy.ts` handles `/` + `?page=`/`?hood=` via `lib/routing/legacyRedirects.ts` (tables still in `lib/content/legacy-routes.ts`, untouched). The page reads no request data and renders statically.
- `next.config.ts` `redirects()` was not used or edited (it could express `has: query` rules, but proxy keeps hood-over-page precedence, first-duplicate and launch-gate ordering in one tested place).

## Legacy table (all 307, query string dropped, hash kept)
| param | target |
|---|---|
| hood=williamsburg (wins over page) | /neighborhoods/williamsburg |
| page=home | no redirect (serves `/`, avoids loop) |
| page=services | /#home-personalized-care-section |
| page=how-it-works | /#home-how-it-works-block |
| page=about / safety / reviews / book / contact | /about /safety /reviews /book /contact |
| page=neighborhoods | /neighborhoods/williamsburg |

Duplicates: first value wins (`?page=a&page=about` -> no redirect; `?page=about&page=a` -> /about), same as before. Status 307 = what `redirect()` returned in the page (verified on baseline). Unknown values, `?welcome=1`, UTM-only URLs: no redirect, params untouched. Redirects drop other params (as before, e.g. `?utm_source=x&page=about` -> `/about`).

Order in proxy: LAUNCH_MODE gate first (today `/` is gated to a 307 `/contact` regardless of query; unchanged), then legacy redirect; noindex (non-production) is applied to every response incl. redirects.

One deliberate deviation: lookups use `Object.hasOwn`. Baseline had a bug: `/?hood=constructor` returned 307 with `location: function Object() { [native code] }`. Now it serves the homepage (200).

## Build output for `/`
- Before: `┌ ƒ /`
- After: `┌ ○ /` (Proxy still `ƒ`)

## Headers (local `next start`, VERCEL_ENV unset so noindex present)
| URL | before | after |
|---|---|---|
| `/` | 200, `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` | 200, `Cache-Control: s-maxage=31536000`, `x-nextjs-cache: HIT`, `x-nextjs-prerender: 1` |
| `/?welcome=1`, `/?utm_source=x` | (dynamic, no-store) | same as `/` (static; CDN keys on full URL incl. query) |
| `/?page=services` | 307, no-store, location `/#home-personalized-care-section` | 307, same location, no Cache-Control header, noindex present |
Real edge-cache behavior (x-vercel-cache HIT) can only be confirmed on a Vercel preview. Note: each distinct query string is its own CDN cache key on Vercel, so campaign URLs each take one miss.

## Tests
- Unit `tests/unit/legacy-redirects-proxy.test.ts`: 28 tests (table, hood precedence, duplicates, unknown/inherited keys, UTM passthrough, other paths, LAUNCH_MODE on/off, noindex on redirects, production no noindex).
- E2E `tests/e2e/public-routes.spec.ts`: +10 request-level tests (no redirect following: status, target, `?welcome=1`, UTM, `?page=home`).
- Full E2E: 176 passed, 20 skipped (same skips as before), 0 failed. Emulator unit suite: 77 files / 744 tests passed. Typecheck clean; lint 0 errors (1 pre-existing img warning).

## Risks / parked
- `proxy.ts` matcher unchanged (broad, as before; LAUNCH_MODE gating needs it). The legacy check returns immediately unless pathname is `/` with a query string, so no added work for assets.
- `resolveLegacyMarketingPath` in `lib/content/legacy-routes.ts` is now unused (orphan, outside my ownership); suggest deleting in a follow-up.
- Redirect responses previously carried no-store; proxy redirects carry no Cache-Control (browsers may heuristically cache a 307 only if explicitly allowed; 307 is not cached by default).
