# Not The Rug Brief Integration

## Module location

- Portable pipeline bundle: `not-the-rug-brief/`
- Server wrapper: `lib/not-the-rug-brief/server.ts`
- Admin page: `app/admin/dashboard/brief/page.tsx`

## Manual run

- Admin dashboard page: `/admin/dashboard/brief`
- Manual trigger route: `POST /admin/not-the-rug/run-brief`
- Send the Firebase ID token in `Authorization: Bearer <token>`
- Optional JSON body:

```json
{ "fresh": true }
```

## Latest brief data

- JSON summary: `GET /admin/not-the-rug/latest-brief`
- Founder HTML brief: `GET /admin/not-the-rug/latest-brief/html`
- Firestore history: `GET /admin/not-the-rug/history`

Both routes require the same admin bearer token as the manual trigger route.

## Scheduled run

- Cron route: `GET /api/cron/not-the-rug-brief`
- `vercel.json` schedules it daily at `0 12 * * *`
- Set `CRON_SECRET` in the environment so the cron route can verify:

```text
Authorization: Bearer <CRON_SECRET>
```

## Artifact storage

Artifacts write to:

- `data/not-the-rug-brief/briefs/not-the-rug/latest.json`
- `data/not-the-rug-brief/content/not-the-rug/latest-content.json`
- `data/not-the-rug-brief/briefs/not-the-rug/latest-brief.md`
- `data/not-the-rug-brief/briefs/not-the-rug/latest-brief.html`

Dated archive files are written alongside the latest files in the same folders.

Override the base directory with:

- `NOT_THE_RUG_BRIEF_DATA_DIR`

## Firebase persistence

Each manual or scheduled run is also mirrored into Firestore under:

- `notTheRugBriefRuns`

Each record stores:

- run timestamp
- pipeline status / error stage
- ready-to-publish state
- quality score
- scout priority action
- weather impact
- review insights
- reddit signals
- content angle
- generated content fields
- guardian verdict

The dedicated brief dashboard uses that collection to let admins inspect previous days of saved content.

## Required env

- `ANTHROPIC_API_KEY`
- `NWS_USER_AGENT` or `WEATHER_USER_AGENT`
- `INSTAGRAM_ACCESS_TOKEN`
- `NOT_THE_RUG_INSTAGRAM_USER_ID`
- `CRON_SECRET` for scheduled execution

The Firebase admin env already used by this repo remains required for protected routes.
