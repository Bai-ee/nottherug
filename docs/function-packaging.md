# What each deployed function actually contains

Measured from the `.nft.json` trace manifests of a clean `npm run build` at the
release candidate. Sizes are the sum of every traced file on disk, which is the
uncompressed input to Vercel's 250 MB function limit — not the transferred size.

| Route | Size | Files | sharp | logo assets | brief pipeline |
| --- | --- | --- | --- | --- | --- |
| `/admin/not-the-rug/latest-brief` | 3.7 MB | 516 | — | — | yes |
| `/api/admin/photos/upload` | 30.8 MB | 614 | yes | — | — |
| `/api/admin/generator/render` | 31.5 MB | 584 | yes | yes | — |
| `/api/admin/photos/render` | 31.5 MB | 584 | yes | yes | — |
| `/admin/not-the-rug/run-brief` | 31.8 MB | 621 | yes | yes | yes |
| `/admin/leads` | 54.5 MB | 6,473 | — | — | — |
| `/api/leads/meetgreet` | 54.6 MB | 6,475 | — | — | — |
| `/api/cron/founder-brief` | 54.9 MB | 6,512 | — | — | yes |
| `/api/cron/not-the-rug-brief` | 82.9 MB | 6,615 | yes | yes | yes |
| `/admin/founder-brief/run-and-send` | 83.0 MB | 6,617 | yes | yes | yes |

Everything is well inside the 250 MB limit.

## The read/generation split works

Routes that only read or email a brief no longer carry the image pipeline.
`/admin/not-the-rug/latest-brief` is 3.7 MB; `/api/cron/founder-brief` carries the
pipeline sources but no sharp. Every route that can render an image carries both
sharp and the `app-assets/generator-logos` fallback files it reads when Storage and
the public path both miss.

## Open question: the handwritten firebase-admin include list

`next.config.ts` carries a manually enumerated `FIREBASE_ADMIN_INCLUDES` list, added
to work around dependencies that tracing was missing. The traces now show what it
costs and what it contains.

`/admin/not-the-rug/run-brief` is the control case. It uses `verifyAdmin` and the
Firestore REST helpers exactly like its siblings, but carries no manual include list.
Next's own tracing gives it:

```
firebase-admin/lib/{app, auth, utils, esm}  +  google-auth-library, jsonwebtoken, jwks-rsa
```

That is precisely the surface this application uses: `initializeApp`, `getAuth`, and
`credential.getAccessToken()`.

The routes that do carry the list get the entire Admin SDK instead — `firestore`,
`database`, `messaging`, `machine-learning`, `remote-config`, `eventarc` and the rest
— plus `@google-cloud/firestore-api` (1,236 files), `google-gax` (1,171) and
`@grpc/grpc-js` (615). None of that is imported anywhere: Firestore and Storage are
reached over their REST APIs (see `lib/server/firestoreRest.ts`, and the comment at
the top of `lib/server/firebaseStorage.ts` explaining why the Admin SDK's storage
client is not used).

The list therefore adds roughly **51 MB and 5,900 files per function** of a gRPC
Firestore SDK the code never loads.

**This has not been removed.** Static tracing proving a file is unused is not the same
as proving a dynamic `require` will not reach for it at runtime, which is the failure
mode the list was added to fix. Settle it with evidence, not assumption:

1. Deploy a preview with `FIREBASE_ADMIN_INCLUDES` removed.
2. Exercise the routes that use it: `/api/leads/meetgreet`, `/admin/leads`,
   `/api/cron/founder-brief`, `/api/cron/not-the-rug-brief`,
   `/admin/founder-brief/run-and-send`.
3. If all five work, keep the removal. If any fails with a module-not-found, restore
   the list and record which module tracing missed — that is the real justification,
   and it belongs in a comment next to the list.

Until that preview runs, the list stays. `/admin/not-the-rug/run-brief` is
inconsistent with its two sibling generation routes either way: if the list is
necessary, that route is missing it.
