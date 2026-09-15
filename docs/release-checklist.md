# Release checklist and rollback

Prepared during the production cleanup. **No production deployment is authorized by
this document.** P5B runs only after an explicit go-live instruction.

Status of every gate lives in [the tracker](../plans/002-production-tracker.md).

## Before requesting authorization

Run all of these on **one** candidate commit, from a clean checkout:

```bash
rm -rf node_modules .next
npm ci                 # not `npm install` — see the note on optional bindings below
npm run lint           # application
npm run lint:pipeline  # CommonJS brief pipeline + copy scripts
npm run build          # generates fresh Next route types
npm run typecheck
npm test               # vitest, all dependencies mocked
npm run test:e2e       # playwright; starts its own production server
```

`npm uninstall` silently drops optional native bindings (npm's optional-dependency
bug) and breaks vitest's rolldown binary. To change a dependency, edit `package.json`
and reinstall.

### Configuration to confirm in Vercel

| Item | Required value | Checked |
| --- | --- | --- |
| Node version in the build log | 24.x (driven by `engines.node`, which overrides the project setting) | ☐ |
| `PUBLIC_BASE_URL` | The host that actually serves the site. Today it defaults to `https://nottherug.com`, which is **not** attached to this project — see the tracker's open domain decision | ☐ |
| `NEXT_PUBLIC_CALENDLY_URL` | The live scheduling link, or deliberately empty | ☐ |
| `RESEND_FROM_EMAIL` | A verified sending domain. A `@resend.dev` sender only delivers to the account's own verified address and skips the customer confirmation | ☐ |
| `FOUNDER_EMAIL` | The address that should receive new-inquiry notifications | ☐ |
| `CRON_SECRET` | Set, or every `/api/cron/*` route rejects all requests | ☐ |
| `LAUNCH_MODE` | `true` only while the launch gate should be up | ☐ |
| Firebase Admin credentials | Present and matching the intended project | ☐ |
| Cron schedule in `vercel.json` | Matches the one intended job. Do not enable both email handlers by default | ☐ |

### Firebase

- [ ] Deployed `firestore.rules` and `storage.rules` match the versioned files in this
      repository. Diff them before deploying; record the diff.
- [ ] Public cannot read `leads`, `photoUploads`, `photoRenders`, or brief collections.
- [ ] No client can write `admins/**`.
- [ ] Private brief artifacts are not reachable by an unauthenticated URL.

### Preview acceptance

On the preview deployment, with test credentials and an approved test recipient:

- [ ] Submit one booking inquiry. Record only a synthetic identifier — never a real
      customer's details.
- [ ] The lead appears in the admin leads view with every field, including the
      reactivity, allergy, and phone-consultation answers.
- [ ] CSV export opens in a spreadsheet with no formula executing and readable phone
      numbers.
- [ ] Founder notification arrives; its recorded status matches what was delivered.
- [ ] The phone-consultation branch does not open scheduling; the other branch does.
- [ ] Sign in as a non-whitelisted account: admin data is refused, and the message
      distinguishes "not signed in" from "not permitted".
- [ ] Photo upload, render, and delete each report truthfully, including a forced
      failure.
- [ ] A private brief report is not readable without authorization.
- [ ] Every public route loads directly; refresh and back/forward work; no request
      404s; no `alert()` fires.
- [ ] 375px, 768px and 1440px layouts, keyboard navigation, and reduced motion.
- [ ] Preview responses carry `X-Robots-Tag: noindex`.

Do not run bulk test submissions, send to real customers, or trigger repeated paid
brief generation as part of this.

## Deploying

1. Record the currently deployed production deployment ID and URL — this is the
   rollback target. Do this **before** deploying anything.
2. Deploy the reviewed candidate commit. No other commit.
3. Confirm the build log reports Node 24 and the build succeeded.
4. Smoke test on production: home, `/book`, `/contact`, one deep route, `/robots.txt`,
   `/sitemap.xml`, and `/admin` sign-in.
5. Submit one inquiry using an agreed test identity. Confirm it persists and the
   founder notification arrives.
6. Confirm HTTPS, the canonical host, redirects, and that public routes are indexable
   while `/admin` and any playground route are not.
7. Watch errors and failed notifications for 24–48 hours through the agreed
   operational system. This period is not complete until it has actually elapsed.

## Rollback

Roll back immediately if any of these is true:

- An inquiry cannot be saved.
- Protected data is readable without authorization.
- A critical route fails.
- Image processing crashes the function.

Procedure:

```bash
# Promote the previously deployed production deployment recorded in step 1.
vercel rollback <previous-deployment-url> --scope <team>
```

Then:

- Pause any failing scheduled job independently of the rollback, by removing its entry
  from `vercel.json` and redeploying, or by disabling it in project settings.
- **Preserve lead records written after the deploy.** Every schema change in this
  cleanup is additive, so an older build still reads new records. Do not delete or
  rewrite lead documents to "clean up" after a rollback.
- Firebase rules do not roll back with a deployment. If rules were changed in the same
  release, re-deploy the previous rules files explicitly.

## Operational ownership

| Duty | Owner |
| --- | --- |
| Failed leads and email retries | ☐ name required |
| Weekly dependency and advisory check | ☐ name required |
| Firestore backup verification | ☐ name required |
| 24–48 hour post-deploy observation | ☐ name required |
