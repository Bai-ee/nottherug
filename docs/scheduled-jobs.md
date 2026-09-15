# Scheduled jobs: what runs, what does not, and why

Three cron-style handlers exist. **One is scheduled.** This file is the record of that
decision, because the review found the repository implied otherwise.

## What is scheduled

`vercel.json` schedules exactly one job:

| Path | Schedule | What it does |
| --- | --- | --- |
| `/api/cron/not-the-rug-brief` | `0 12 * * *` | Generates the daily brief. **It does not send any email.** |

That distinction matters: a generation-only job is not a daily email system, and
nothing in this repository should describe it as one.

## What is not scheduled, deliberately

| Path | Why it is off |
| --- | --- |
| `/api/cron/founder-brief` | Emails the latest brief to the founder. Off until the owner confirms they want it, and at what time. |
| `/api/cron/leads-digest` | Emails a lead summary to the same founder. Off. Running it alongside the founder brief means two emails a day to one person about overlapping things. |

Both are reachable manually and both refuse any request without the `CRON_SECRET`
bearer token. Each now claims a per-day, per-recipient slot before sending, so a
duplicate trigger cannot double-send.

The plan's working default is **one founder digest after a successful generation**. If
the owner wants that, enable `/api/cron/founder-brief` on a schedule that runs after
generation completes — not before, or it emails yesterday's brief.

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
