# Plan 013 P4 item 2 — Worker L (F10): analytics dependency availability

Branch `013/p34-l`, base e5e28c8.

## Response shape
Before: `meta.degraded: ('leads'|'events')[]`. Failed live query became `live` = 0 visits / 0 page views; failed first-event query became `trackingStartDate: null` (footer showed nothing; empty range could yield `no_data_yet`); status stayed `ok`/`zero_activity`/`no_data_yet`.

After (additive): `meta.unavailable: ('live'|'trackingStart')[]`. `live` keeps its zero-filled shape on failure but the UI must not show it when `unavailable` includes `'live'`. `trackingStartDate` is null with `'trackingStart'` listed means lookup failed, not no history. Any `degraded` or `unavailable` entry gives `status: 'partial_failure'` (previously leads/events only). The both-leads-and-events-fail throw is unchanged. Bounded queries unchanged; truncation flag unchanged.

## UI (presentation only)
- `LiveTile` (new prop `unavailable`): Visits / Page Views render "Unavailable". New ids `admin-analytics-live-visits-value`, `admin-analytics-live-pageviews-value`.
- `AdminFooter`/`AdminShell` (new prop `trackingStartUnavailable`): "Tracking started · Unavailable" (reuses existing `admin-chrome-footer-tracking-started`). True no-history still shows nothing.
- `ReportMetaBanner` partial-failure callout names "last 60 minutes" / "tracking start date".
- `dashboard/page.tsx` passes the flags; `emptyReport.ts` adds `unavailable: []`.

## Tests
- `tests/unit/analytics-report.test.ts`: +10 (each of leads/events/live/earliest failing independently, empty-range + earliest failure is partial_failure not no_data_yet, true zero traffic is not unavailable, test mode, truncation, recovery, healthy).
- `tests/unit/admin-analytics-unavailable.test.ts`: +4 render tests (live tile, footer, banner).
- `admin-analytics-route.test.ts`: fixture type updated.
- Results: emulator unit suite 77 files / 730 tests pass; E2E 156 passed, 20 skipped; typecheck clean; lint 0 errors (1 pre-existing SchedulingDialog `<img>` warning, owned by another worker); build ok.

## Parked
- No E2E with a mocked failing analytics API (no existing pattern for dashboard API mocking); covered by component render tests.
- `docs/analytics-operations.md` not edited (outside ownership); it may deserve a line on `meta.unavailable`.
