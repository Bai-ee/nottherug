# Plan 013 P2 — Worker E (H01 admin identity, H02 private caching)

Branch `013/p2-e`, base 0068493.

## H01 — `lib/server/verifyAdmin.ts`
Outcomes (all distinct, none collapsed):
| Condition | Result |
|---|---|
| Missing/malformed header | 401 |
| `auth/argument-error`, `auth/invalid-id-token`, `auth/id-token-expired`, `auth/id-token-revoked`, `auth/user-disabled`, `auth/user-not-found` | 401 |
| Token has no email claim | 401 |
| `email_verified !== true` | **403** |
| Verified, not in `admins/{email}` | 403 |
| Any other `verifyIdToken` failure (`auth/internal-error`, network/credential errors, public-key fetch failure, non-Firebase errors) | 500 ServiceError |
| Whitelist lookup failure or timeout | 500 ServiceError |

- `verifyIdToken(token, true)`: revocation check, which also rejects disabled users. The SDK already runs the check in emulator mode.
- Revoked/disabled vs backend failure is decided by an allowlist of client-fault Firebase error codes. Unknown codes fail closed to 500, never to 401, so an outage can't look like a bad credential.
- Unverified is 403, not 401: `components/admin/adminFetch.ts` turns 401 into "route back to sign-in", and re-signing in cannot fix an unverified email (loop). 403 is the "valid session, not permitted" path.
- Whitelist `fsGetDoc(..., { timeoutMs: 5000 })`; timeout maps to ServiceError.
- Email keying: unchanged and used exactly as issued. Evidence: `app/admin/page.tsx` reads `admins/{user.email}` raw, the rules compare `token.email == email` unchanged, docs say `admins/{email}`. Lowercasing server-side would make server and rules disagree for mixed-case docs.

## Rules mirror (`firestore.rules`)
```
-      allow read: if isSignedIn() && request.auth.token.email == email;
+      allow read: if isSignedIn()
+        && request.auth.token.email_verified == true
+        && request.auth.token.email == email;
```
`allow write: if false` and default deny untouched. Side effect to know: the login page's client `getDoc` now fails with permission-denied for an unverified account, shown via the existing error path (message text only; page not modified, outside my ownership).

## H02 — one boundary: `next.config.ts` `headers()`
`PRIVATE_ROUTE_SOURCES` = `/api/admin/:path*`, `/admin/leads`, `/admin/founder-brief/:path*`, `/admin/preview/:path*`, `/admin/not-the-rug/:path*` -> `Cache-Control: private, no-store`. The last four are the non-`/api` route handlers that also call `verifyAdmin` (leads CSV/JSON, brief HTML/JSON, founder-brief). `transpilePackages` workaround untouched; the new constants are exported only so the test can read them.

Verification (`next build && next start -p 3377`, CI throwaway env, `FIRESTORE_EMULATOR_HOST=127.0.0.1:1`, server stopped after, next-env.d.ts restored):
- 401 on `/api/admin/photos/list`, `/api/admin/bench/people`, `/api/admin/bench/people/x/resume`, `/api/admin/analytics`, `/admin/leads`, `/admin/not-the-rug/latest-brief/html`, `/admin/not-the-rug/history`, `/admin/preview/founder-brief`: all `Cache-Control: private, no-store`. Also 405s on the admin routes.
- Precedence: a temporary `/api/admin/zz-tmp` route returning 200 with its own `Cache-Control: no-store` (GET) and with none (POST) both came back `private, no-store`, so config headers override handler-set values (relevant to `briefHtmlHeaders` = `no-store` and the resume download = `private, no-store`). Temp route deleted, not committed.
- Public routes (`/api/leads/capture` 405) unaffected.
- Handler-level vitest tests cannot see this: they call the exported handler directly, bypassing Next's router where config headers are applied. So `tests/unit/admin-cache-headers.test.ts` tests the `headers()` output and statically requires every `app/**/route.ts` that references `verifyAdmin` (or lives under `/api/admin`) to match a configured source; a new admin route outside the list fails CI.
- Authenticated success responses were not fetched live (no real credentials); the override behaviour above covers them mechanically.

## Tests
- `tests/unit/auth-verifyAdmin.test.ts`: rewritten (SDK mocked); covers missing header, malformed header, invalid/malformed/expired/revoked/disabled/deleted token (401, whitelist untouched), `checkRevoked=true` asserted, backend failure x4 (500), unverified false/missing (403), no email claim, verified non-whitelisted (403), whitelist failure (500), whitelist timeout (500 and `timeoutMs: 5000`), success, no leakage of internal detail. 
- `tests/unit/rules-firestore.test.ts`: added unverified (false and missing claim) denied, anonymous denied; existing verified own-doc allowed, other-email denied, no self-enrollment (existing cases now carry `email_verified: true`).
- `tests/unit/admin-cache-headers.test.ts`: new, 3 tests.

Commands (private emulator ports):
`PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH firebase emulators:exec --config firebase.worker.json --only firestore,storage --project demo-not-the-rug "npx vitest run"` -> 76 files, 710 tests passed, 0 skipped. `npm run lint`: 0 errors, 1 pre-existing warning (SchedulingDialog `<img>`). `npm run typecheck`: clean after a fresh build.

## Not provable without a real sign-in (required on an isolated preview before P2 approval)
1. A real Google sign-in for the whitelisted owner account: the ID token carries `email_verified: true`, the login page's `admins/{email}` read passes under the new rule, and the dashboard loads all panels (every admin call now does a revocation check against Auth).
2. A non-whitelisted verified Google account gets 403 and the not-authorized panel.
3. Production has email/password enabled (P0 report s5): an unverified email/password account using the owner's address should get permission-denied at the rules read and 403 from the API (needs a throwaway test account on the preview project, not production).
4. Disabling a user or `revokeRefreshTokens` makes the next admin request 401 (a revoked token with the preview's real Auth backend), and the service account in Vercel has permission for `getAccountInfo` (revocation check needs the Auth backend call; if the credential lacks it, every admin call would return 500, which this check would reveal).
5. Response headers on a real authenticated 200 from the Vercel edge (private, no-store, no public s-maxage added by the platform).
6. Mixed-case email: confirm the owner's `admins/` doc id matches the token's email casing exactly.

## Open risks
- Added Auth backend round trip per admin request (latency, and an Auth outage now means 500 for all admin routes by design).
- Allowlist of client-fault codes could classify a rare new SDK code as 500 (fail closed, visible, not a security gap).
