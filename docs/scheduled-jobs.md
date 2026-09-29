# Scheduled jobs: what runs, what does not, and why

Three cron-style handlers exist. **Only `leads-digest` is scheduled** (plan 012, P4a).

## Scheduled

| Path | Schedule (UTC) | Meaning |
| --- | --- | --- |
| `/api/cron/leads-digest` | `0 12 * * *` | Daily lead summary to the founder. 08:00 America/New_York during daylight time, 07:00 in winter — Vercel cron is UTC-only and does not follow DST. |

This is the only job that reports new leads and modal bookings to the founder, so it is
the one that closes the "nobody is notified" gap. It claims a per-day, per-recipient slot
before sending, so a duplicate trigger cannot double-send.

## Not scheduled, deliberately

| Path | Why it is off |
| --- | --- |
| `/api/cron/not-the-rug-brief` | Generates the brief; sends no email. Held off until the 60-second limit is measured (see the open gate below). |
| `/api/cron/founder-brief` | Emails the latest brief to the founder. It would be a second daily email to the same person alongside the leads digest, and is pointless until generation runs. Off until the owner confirms both. |

All three refuse any request without the `CRON_SECRET` bearer token.

If generation is enabled later, run it before the brief email, not after, or the email
carries yesterday's brief.

## Open gate: the 60-second limit is unverified

`/api/cron/not-the-rug-brief` declares `maxDuration = 60`. A real run makes at least
five sequential model calls, several using web search, which commonly take tens of
seconds each.

**This has not been measured.** Measuring it means invoking a paid model, which was not
authorized, so nobody guessed a number instead. The run record now persists `durationMs`,
so the first authorized real run measures itself.

Until that number exists:

- Do not treat scheduled generation as verified.
- Run one authorized generation manually, read `durationMs` off the run record, and
  compare it against the limit with margin.
- If it does not fit, the honest options are a longer configured duration where the
  hosting plan allows one, or leaving scheduled generation off with a visible state in
  the admin dashboard saying so. Hiding a job that cannot finish is not fixing it.

## Changing any of this

`vercel.json` is coordinator-owned. Adding a schedule is a business decision about who
gets emailed and when, not a code change — settle it in
[the facts review](launch-facts-review.md) first.
