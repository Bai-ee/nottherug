/**
 * Emulator-backed round trip for Join Our Team: a submission posted through
 * the real public route (app/api/bench/apply) must come back, with every
 * answer, from the real admin route the Team Applications page reads
 * (app/api/admin/bench/people). No mocked Firestore; only admin auth and email
 * are stubbed. Same skip-with-reason pattern as analytics-emulator-roundtrip:
 * `npm run emulators`, then rerun. A skip here is not a pass.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { applicationPayload } from './bench-fixtures';
import { APPLICATION_FIELDS, buildApplicationsCsv } from '@/lib/bench/applicationFields';
import { DEFAULT_BENCH_SETTINGS } from '@/lib/bench/contract';
import { FIRESTORE_EMULATOR_HOST as EMULATOR, firestoreEmulatorReachable } from '../support/emulatorGate';

const PROJECT = 'demo-bench-roundtrip';

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR;
process.env.FIREBASE_ADMIN_PROJECT_ID = PROJECT;

vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin: vi.fn(async () => 'luis@nottherug.test') }));
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: vi.fn(async () => ({ data: { id: 'mock' }, error: null })) } }),
  getFromAddress: () => 'hello@nottherug.test',
  getFounderEmail: () => 'luis@nottherug.test',
}));

const SKIP_REASON =
  `Firestore emulator not reachable at ${EMULATOR}. Start it with \`npm run emulators\` ` +
  `(needs a Java runtime on PATH). This suite is unverified until it runs — a skip is not a pass.`;

let reachable = false;

beforeAll(async () => {
  reachable = await firestoreEmulatorReachable();
});

beforeEach(async () => {
  if (!reachable) return;
  await fetch(`http://${EMULATOR}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
});

async function apply(body: unknown, ip: string) {
  const { POST } = await import('@/app/api/bench/apply/route');
  return POST(
    new Request('http://localhost/api/bench/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }),
  );
}

async function listForAdmin() {
  const { GET } = await import('@/app/api/admin/bench/people/route');
  const res = await GET(new NextRequest('http://localhost/api/admin/bench/people', { headers: { Authorization: 'Bearer t' } }));
  return (await res.json()) as { people: Array<Record<string, unknown>> };
}

describe('Join Our Team → Team Applications (emulator)', () => {
  it('shows a new submission, with every answer, to the admin page', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    const res = await apply(applicationPayload(), '198.51.100.1');
    expect(res.status).toBe(200);
    const { id } = (await res.json()) as { id: string };

    const { people } = await listForAdmin();
    const person = people.find((p) => p.id === id);
    expect(person).toBeDefined();
    expect(person).toMatchObject({
      fullName: 'Sam Rivera',
      email: 'sam@example.test',
      phoneE164: '+13475550101',
      stage: 'review',
      source: 'indeed',
      availability: [
        { weekday: 1, block: 'morning' },
        { weekday: 3, block: 'evening' },
      ],
    });
    expect(person).not.toHaveProperty('resumeUploadTokenHash');
    const answers = person!.answers as Record<string, unknown>;
    expect(answers.scenarioLooseHarness).toBe('Refit it before we leave the apartment.');
    expect(answers.whyOnCall).toBe('I freelance and my weekdays are flexible.');

    // The CSV the page exports carries the same answers.
    const csv = buildApplicationsCsv([person as never], DEFAULT_BENCH_SETTINGS.timeBlocks);
    const [header, row] = csv.split('\r\n');
    expect(header.startsWith('Submitted,Stage,')).toBe(true);
    expect(header).toContain(APPLICATION_FIELDS.at(-1)!.label);
    expect(row).toContain('Refit it before we leave the apartment.');
    expect(row).toContain('Mon Morning, Wed Evening');
  });

  it('lists the newest submission first, one row per person', async (ctx) => {
    if (!reachable) return ctx.skip(SKIP_REASON);

    await apply(applicationPayload({ email: 'first@example.test', fullName: 'First Applicant' }), '198.51.100.2');
    await new Promise((r) => setTimeout(r, 10));
    await apply(applicationPayload({ email: 'second@example.test', fullName: 'Second Applicant' }), '198.51.100.3');
    await apply(applicationPayload({ email: 'SECOND@example.test', fullName: 'Second Again' }), '198.51.100.4');

    const { people } = await listForAdmin();
    expect(people.map((p) => p.fullName)).toEqual(['Second Applicant', 'First Applicant']);
  });
});
