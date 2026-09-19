/**
 * Emulator-backed round-trip tests for the analytics write/read contract
 * (plan A6, plans/003-admin-dashboard-and-tracking.md). Posts real events
 * through app/api/track/route.ts's real POST handler — no mocked Firestore —
 * and reads them back through lib/analytics/report.ts's real
 * getAnalyticsReport, against a running Firestore emulator.
 *
 * This is the one place the writer/reader field-name contract (receivedAt /
 * clientTs, never `ts`) is proven against an actual datastore rather than
 * asserted in fixture-based unit tests that each half of the system wrote
 * for itself. See tests/unit/analytics-track-route.test.ts (writer, Firestore
 * mocked) and tests/unit/analytics-report.test.ts (reader, Firestore mocked)
 * for those — this file exists because neither proves the seam between them.
 *
 * Mirrors the established pattern in tests/unit/lead-firestore-integration.test.ts:
 * skips (with a reason, not silently) when the emulator is unreachable.
 * `npm run emulators`, then rerun. A skip here is not a pass.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const PROJECT = 'demo-analytics-roundtrip';

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR;
process.env.FIREBASE_ADMIN_PROJECT_ID = PROJECT;

const SKIP_REASON =
  `Firestore emulator not reachable at ${EMULATOR}. Start it with \`npm run emulators\` ` +
  `(needs a Java runtime on PATH). This suite is unverified until it runs — a skip is not a pass.`;

let reachable = false;

async function emulatorUp() {
  try {
    await fetch(`http://${EMULATOR}/`, { signal: AbortSignal.timeout(750) });
    return true;
  } catch {
    return false;
  }
}

async function clearFirestore() {
  await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  origin: 'http://localhost',
  host: 'localhost',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Test',
};

function headersFor(ip: string): Record<string, string> {
  return { ...DEFAULT_HEADERS, 'x-forwarded-for': ip };
}

let idCounter = 0;
function nextId(prefix = 'evt') {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

async function post(events: unknown[], headers: Record<string, string> = DEFAULT_HEADERS) {
  const { POST } = await import('@/app/api/track/route');
  return POST(new Request('http://localhost/api/track', { method: 'POST', headers, body: JSON.stringify(events) }));
}

async function getRawDoc(id: string) {
  const { fsGetDoc } = await import('@/lib/server/firestoreRest');
  return fsGetDoc(`analytics_events/${id}`);
}

async function report(range: 'today' | '7d' | '30d', opts: { includeTest?: boolean; now?: Date } = {}) {
  const { getAnalyticsReport } = await import('@/lib/analytics/report');
  return getAnalyticsReport(range, opts);
}

beforeAll(async () => {
  reachable = await emulatorUp();
});

beforeEach(async () => {
  if (reachable) await clearFirestore();
  idCounter = 0;
  delete process.env.ANALYTICS_TRACKING_DISABLED;
});

describe('write/read contract against a real emulator', () => {
  it('a full session (pageview, cta_click, booking steps, appointment, engagement) round-trips into exact reported numbers', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const sid = 'sess-roundtrip-1';
    const ts = Date.now();
    const events = [
      { event: 'page_view', id: nextId(), sid, ts, route: '/', src: 'campaign', camp: 'flyer' },
      { event: 'engagement', id: nextId(), sid, ts: ts + 1000 },
      { event: 'cta_click', id: nextId(), sid, ts: ts + 2000, cta: 'hero_book' },
      { event: 'booking_form_start', id: nextId(), sid, ts: ts + 3000 },
      { event: 'booking_step', id: nextId(), sid, ts: ts + 4000, step: 'details' },
      { event: 'booking_step', id: nextId(), sid, ts: ts + 5000, step: 'schedule' },
      { event: 'lead_saved', id: nextId(), sid, ts: ts + 6000 },
      { event: 'scheduling_dialog_opened', id: nextId(), sid, ts: ts + 7000 },
      { event: 'appointment_completed', id: nextId(), sid, ts: ts + 8000 },
    ];

    for (const e of events) {
      const res = await post([e]);
      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.stored).toBe(1);
    }

    const rep = await report('today');
    expect(rep.meta.status).toBe('ok');
    expect(rep.pageviews).toBe(1);
    expect(rep.sessions).toBe(1);
    expect(rep.engagedVisitPct).toBe(100);
    expect(rep.appointmentsScheduled).toBe(1);
    expect(rep.ctaClicks.find((c) => c.cta === 'hero_book')?.clicks).toBe(1);
    expect(rep.funnel.formStarts).toBe(1);
    expect(rep.funnel.steps.find((s) => s.step === 'details')?.sessions).toBe(1);
    expect(rep.funnel.steps.find((s) => s.step === 'schedule')?.sessions).toBe(1);
    expect(rep.funnel.dialogOpened).toBe(1);
    expect(rep.funnel.calendlyScheduled).toBe(1);
    expect(rep.funnel.phoneConsultPath).toBe(0); // lead_saved happened but the dialog WAS opened
    expect(rep.sources.find((s) => s.source === 'campaign:flyer')?.sessions).toBe(1);

    // The actual near-miss contract check: the writer must store receivedAt +
    // clientTs and never persist `ts` — see app/api/track/route.ts's
    // storeOneEvent and lib/analytics/report.ts's StoredAnalyticsEvent comment.
    const stored = await getRawDoc(events[0].id);
    expect(stored.exists).toBe(true);
    expect(typeof stored.data!.receivedAt).toBe('string');
    expect(stored.data!.clientTs).toBe(ts);
    expect(stored.data!.ts).toBeUndefined();
  });

  it('a lead_saved without ever opening the scheduling dialog is the phone-consult path, not abandonment', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const sid = 'sess-phone-consult';
    const ts = Date.now();
    await post([{ event: 'page_view', id: nextId(), sid, ts, route: '/book' }]);
    await post([{ event: 'lead_saved', id: nextId(), sid, ts: ts + 1000 }]);

    const rep = await report('today');
    expect(rep.funnel.dialogOpened).toBe(0);
    expect(rep.funnel.phoneConsultPath).toBe(1);
  });
});

describe('deduplication', () => {
  it('storing the same event id twice yields exactly one document and does not inflate pageviews', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('dupe');
    const event = { event: 'page_view', id, sid: 'sess-dupe', ts: Date.now(), route: '/' };

    const first = await post([event]);
    const second = await post([event]); // simulated beacon/fetch retry of the same event

    expect((await first.json()).stored).toBe(1);
    expect((await second.json()).duplicate).toBe(1);

    const rep = await report('today');
    expect(rep.pageviews).toBe(1);
  });

  it('two concurrent posts of the same id race to exactly one stored document', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('race');
    const event = { event: 'page_view', id, sid: 'sess-race', ts: Date.now(), route: '/' };
    const [a, b] = await Promise.all([post([event]), post([event])]);
    const outcomes = [(await a.json()).stored, (await b.json()).stored];
    expect(outcomes.filter((n) => n === 1)).toHaveLength(1);

    const rep = await report('today');
    expect(rep.pageviews).toBe(1);
  });
});

describe('durable per-IP rate limiting against real Firestore transforms', () => {
  it(
    'allows traffic up to the threshold then returns 429 from the same IP inside one window',
    async (ctx) => {
      if (!reachable) return ctx.skip(SKIP_REASON);
      const ip = '198.51.100.77';
      const statuses: number[] = [];
      // RATE_LIMIT_MAX_PER_WINDOW in app/api/track/route.ts is 60 — mirrored
      // here as a literal since the route does not export it.
      for (let i = 0; i < 65; i++) {
        const res = await post(
          [{ event: 'page_view', id: nextId('burst'), sid: `sess-burst-${i}`, ts: Date.now(), route: '/' }],
          headersFor(ip)
        );
        statuses.push(res.status);
      }
      expect(statuses.filter((s) => s === 202)).toHaveLength(60);
      expect(statuses.slice(60)).toEqual(Array(5).fill(429));
    },
    30000
  );

  it(
    "a different IP is unaffected by another IP's exhausted budget",
    async (ctx) => {
      if (!reachable) return ctx.skip(SKIP_REASON);
      const ipA = '198.51.100.10';
      for (let i = 0; i < 61; i++) {
        await post([{ event: 'page_view', id: nextId('a'), sid: `sess-a-${i}`, ts: Date.now(), route: '/' }], headersFor(ipA));
      }
      const res = await post(
        [{ event: 'page_view', id: nextId('b'), sid: 'sess-b', ts: Date.now(), route: '/' }],
        headersFor('198.51.100.11')
      );
      expect(res.status).toBe(202);
      expect((await res.json()).stored).toBe(1);
    },
    30000
  );
});

describe('test-mode isolation', () => {
  it('excludes mode:test events from the real report and includes them only when includeTest is requested', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    await post([{ event: 'page_view', id: nextId(), sid: 'sess-real', ts: Date.now(), route: '/' }]);
    await post([{ event: 'page_view', id: nextId(), sid: 'sess-test', ts: Date.now(), route: '/', mode: 'test' }]);

    const real = await report('today', { includeTest: false });
    expect(real.pageviews).toBe(1);
    expect(real.sessions).toBe(1);
    expect(real.meta.testMode).toBe(false);

    const test = await report('today', { includeTest: true });
    expect(test.pageviews).toBe(1);
    expect(test.sessions).toBe(1);
    expect(test.meta.testMode).toBe(true);
  });
});

describe('bot filtering', () => {
  it('a request with a bot-identifying User-Agent is accepted-but-discarded, writing nothing', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('bot');
    const res = await post([{ event: 'page_view', id, sid: 'sess-bot', ts: Date.now(), route: '/' }], {
      ...DEFAULT_HEADERS,
      'user-agent': 'curl/8.4.0',
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.stored).toBeUndefined(); // acceptedNoop() short-circuits before storage, same as the kill switch

    const stored = await getRawDoc(id);
    expect(stored.exists).toBe(false);
  });

  it('a request with no User-Agent at all is also treated as a bot and discarded', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('nouas');
    const headers = { ...DEFAULT_HEADERS };
    delete headers['user-agent'];
    const res = await post([{ event: 'page_view', id, sid: 'sess-nouas', ts: Date.now(), route: '/' }], headers);
    expect(res.status).toBe(202);

    const stored = await getRawDoc(id);
    expect(stored.exists).toBe(false);
  });
});

describe('kill switch', () => {
  it('ANALYTICS_TRACKING_DISABLED=true accepts and discards, writing nothing to Firestore', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    process.env.ANALYTICS_TRACKING_DISABLED = 'true';
    const id = nextId('killed');
    const res = await post([{ event: 'page_view', id, sid: 'sess-killed', ts: Date.now(), route: '/' }]);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // acceptedNoop() short-circuits before validation/storage, so the
    // stored/duplicate/rejected breakdown never appears at all.
    expect(body.stored).toBeUndefined();

    const stored = await getRawDoc(id);
    expect(stored.exists).toBe(false);

    const rep = await report('today');
    expect(rep.pageviews).toBe(0);
  });
});

describe('privacy: hostile payloads never reach storage', () => {
  it('drops unknown PII-shaped extra fields even on an otherwise-valid event', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('hostile-extra');
    const hostile = {
      event: 'page_view',
      id,
      sid: 'sess-hostile-1',
      ts: Date.now(),
      route: '/contact',
      email: 'attacker@example.com',
      phone: '347-610-9676',
      dogName: 'Biscuit',
      notes: 'Free text about the customer that must never be stored',
      customerName: 'Jane Doe',
    };
    const res = await post([hostile]);
    expect(res.status).toBe(202);
    expect((await res.json()).stored).toBe(1);

    const stored = await getRawDoc(id);
    expect(stored.exists).toBe(true);
    const raw = JSON.stringify(stored.data);
    expect(raw).not.toContain('attacker@example.com');
    expect(raw).not.toContain('6109676');
    expect(stored.data).not.toHaveProperty('email');
    expect(stored.data).not.toHaveProperty('phone');
    expect(stored.data).not.toHaveProperty('dogName');
    expect(stored.data).not.toHaveProperty('notes');
    expect(stored.data).not.toHaveProperty('customerName');
    expect(Object.keys(stored.data!).sort()).toEqual(['clientTs', 'event', 'id', 'receivedAt', 'route', 'sid'].sort());
  });

  it('strips a full referrer URL with a query string down to nothing (never stores host+path+query)', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('hostile-ref');
    const hostile = {
      event: 'page_view',
      id,
      sid: 'sess-hostile-ref',
      ts: Date.now(),
      route: '/',
      src: 'referral',
      ref: 'https://evil-tracker.example.com/path?utm_source=secret&token=abc123',
    };
    const res = await post([hostile]);
    expect((await res.json()).stored).toBe(1);

    const stored = await getRawDoc(id);
    expect(stored.data!.ref).toBeUndefined();
    const raw = JSON.stringify(stored.data);
    expect(raw).not.toContain('utm_source');
    expect(raw).not.toContain('evil-tracker');
    expect(raw).not.toContain('token=abc123');
  });

  it('rejects an un-allowlisted route down to null rather than storing the raw path', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('hostile-route');
    const hostile = { event: 'page_view', id, sid: 'sess-hostile-route', ts: Date.now(), route: '/admin/dashboard?secret=1' };
    const res = await post([hostile]);
    expect((await res.json()).stored).toBe(1); // the event itself is still valid; only route becomes null

    const stored = await getRawDoc(id);
    expect(stored.data!.route).toBeNull();
    expect(JSON.stringify(stored.data)).not.toContain('/admin/dashboard');
  });

  it('rejects an event carrying a non-allowlisted cta id outright (no partial storage)', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('hostile-cta');
    const hostile = { event: 'cta_click', id, sid: 'sess-hostile-cta', ts: Date.now(), route: '/', cta: 'attacker@example.com' };
    const res = await post([hostile]);
    const body = await res.json();
    expect(body.stored).toBe(0);
    expect(body.rejected).toBe(1);

    const stored = await getRawDoc(id);
    expect(stored.exists).toBe(false);
  });

  it('drops an un-allowlisted free-text campaign slug rather than storing it verbatim', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const id = nextId('hostile-camp');
    const hostile = {
      event: 'page_view',
      id,
      sid: 'sess-hostile-camp',
      ts: Date.now(),
      route: '/',
      src: 'campaign',
      camp: 'free-text-tracking-id-12345',
    };
    const res = await post([hostile]);
    expect((await res.json()).stored).toBe(1);

    const stored = await getRawDoc(id);
    expect(stored.data!.camp).toBeUndefined();
    expect(JSON.stringify(stored.data)).not.toContain('free-text-tracking-id-12345');
  });
});

describe('New York day-boundary correctness against real Firestore range queries', () => {
  it('an event exactly at NY midnight lands in the new day; the instant before lands in the previous day', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc } = await import('@/lib/server/firestoreRest');

    // NY midnight for 2026-01-15 (EST, UTC-5) is 2026-01-15T05:00:00.000Z —
    // verified independently via Intl.DateTimeFormat before writing this test.
    const beforeMidnight = { event: 'page_view', id: 'nyb-1', sid: 'sess-nyb-1', route: '/', receivedAt: '2026-01-15T04:59:59.999Z', clientTs: 1 };
    const atMidnight = { event: 'page_view', id: 'nyb-2', sid: 'sess-nyb-2', route: '/', receivedAt: '2026-01-15T05:00:00.000Z', clientTs: 2 };
    await fsSetDoc(`analytics_events/${beforeMidnight.id}`, beforeMidnight);
    await fsSetDoc(`analytics_events/${atMidnight.id}`, atMidnight);

    const rep = await report('7d', { now: new Date('2026-01-16T12:00:00.000Z') });
    expect(rep.dailyTrend.find((d) => d.date === '2026-01-14')?.pageviews).toBe(1);
    expect(rep.dailyTrend.find((d) => d.date === '2026-01-15')?.pageviews).toBe(1);
  });

  it('the spring-forward DST transition does not shift or merge the day bucket', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc } = await import('@/lib/server/firestoreRest');
    // 2026-03-08 is the US spring-forward transition day (2am EST -> 3am
    // EDT). NY midnight for 2026-03-09 (post-transition, EDT/UTC-4) is
    // 2026-03-09T04:00:00.000Z — verified via Intl.DateTimeFormat.
    const lastOfMar8 = { event: 'page_view', id: 'dst-1', sid: 'sess-dst-1', route: '/', receivedAt: '2026-03-09T03:59:59.999Z', clientTs: 1 };
    const firstOfMar9 = { event: 'page_view', id: 'dst-2', sid: 'sess-dst-2', route: '/', receivedAt: '2026-03-09T04:00:00.000Z', clientTs: 2 };
    await fsSetDoc(`analytics_events/${lastOfMar8.id}`, lastOfMar8);
    await fsSetDoc(`analytics_events/${firstOfMar9.id}`, firstOfMar9);

    const rep = await report('7d', { now: new Date('2026-03-10T12:00:00.000Z') });
    expect(rep.dailyTrend.find((d) => d.date === '2026-03-08')?.pageviews).toBe(1);
    expect(rep.dailyTrend.find((d) => d.date === '2026-03-09')?.pageviews).toBe(1);
  });

  it('the fall-back DST transition does not shift or merge the day bucket', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);
    const { fsSetDoc } = await import('@/lib/server/firestoreRest');
    // 2026-11-01 is the US fall-back transition day (2am EDT -> 1am EST). NY
    // midnight for 2026-11-02 (post-transition, EST/UTC-5) is
    // 2026-11-02T05:00:00.000Z — verified via Intl.DateTimeFormat.
    const lastOfNov1 = { event: 'page_view', id: 'dstf-1', sid: 'sess-dstf-1', route: '/', receivedAt: '2026-11-02T04:59:59.999Z', clientTs: 1 };
    const firstOfNov2 = { event: 'page_view', id: 'dstf-2', sid: 'sess-dstf-2', route: '/', receivedAt: '2026-11-02T05:00:00.000Z', clientTs: 2 };
    await fsSetDoc(`analytics_events/${lastOfNov1.id}`, lastOfNov1);
    await fsSetDoc(`analytics_events/${firstOfNov2.id}`, firstOfNov2);

    const rep = await report('7d', { now: new Date('2026-11-03T12:00:00.000Z') });
    expect(rep.dailyTrend.find((d) => d.date === '2026-11-01')?.pageviews).toBe(1);
    expect(rep.dailyTrend.find((d) => d.date === '2026-11-02')?.pageviews).toBe(1);
  });
});
