/**
 * Baseline reproduction of review finding R01/R04 before the intake contract is
 * fixed. Firebase and Resend are mocked, so nothing leaves the process.
 *
 * When P1A lands, these expectations change from "documents the bug" to
 * "documents the fix" — see tests/unit/lead-intake.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fsSetDoc = vi.fn(async () => {});
const sendEmail = vi.fn(async () => ({ data: { id: 'mock-email-id' }, error: null }));

vi.mock('@/lib/server/firestoreRest', () => ({
  fsSetDoc,
  fsGetDoc: vi.fn(async () => ({ exists: false })),
  fsDeleteDoc: vi.fn(async () => {}),
  fsQueryCollection: vi.fn(async () => []),
}));

vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getFromAddress: () => 'Test <test@resend.dev>',
  getFounderEmail: () => 'founder@example.test',
}));

/** Exactly what components/MeetGreetForm.tsx posts today. */
function currentFormPayload() {
  return {
    ownerName: 'Test Owner',
    phone: '(347) 555-0100',
    email: 'owner@example.test',
    neighborhood: 'North Williamsburg',
    dogName: 'Biscuit',
    breedAge: 'Golden, 3 years',
    serviceInterest: 'Daily Group Walks',
    vaccinations: 'Yes — fully vaccinated',
    walkFrequency: 'Daily (Mon–Fri)',
    notes: 'Pulls on the leash.',
    source: 'book-page',
    reactivity: 'Scooters',
    allergies: 'Chicken',
    phoneConsult: true,
  };
}

function postJson(body: unknown) {
  return new Request('http://localhost/api/leads/meetgreet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function post(body: unknown) {
  const { POST } = await import('@/app/api/leads/meetgreet/route');
  return POST(postJson(body));
}

describe('R01 — the live form payload does not satisfy the API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects the current form payload for three fields the form no longer collects', async () => {
    const res = await post(currentFormPayload());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing: spayNeuter, dogSocial, strangerSocial');
    expect(fsSetDoc).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('R04 — malformed public input is not handled predictably', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws on a JSON null body instead of returning 400', async () => {
    await expect(post(null)).rejects.toThrow();
  });

  it('throws on a non-string notes field instead of returning 400', async () => {
    const payload = {
      ...currentFormPayload(),
      spayNeuter: 'Yes',
      dogSocial: 'Yes',
      strangerSocial: 'Yes',
      notes: 42,
    };
    await expect(post(payload)).rejects.toThrow();
  });
});
