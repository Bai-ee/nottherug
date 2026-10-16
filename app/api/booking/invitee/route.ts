import { NextResponse } from 'next/server';
import { readBoundedBody } from '@/lib/server/readBoundedBody';
import { isValidEmail } from '@/lib/leads/validation';

/**
 * Looks up the name a visitor just gave Calendly, so the welcome modal's
 * questionnaire does not ask for it again.
 *
 * The browser only ever learns the invitee's API URL (from Calendly's
 * verified event_scheduled message). This route fetches that invitee with
 * the server-side CALENDLY_API_TOKEN and returns the name only — and only
 * when the invitee's email matches the one the visitor typed, so a stray
 * URL cannot be used to read someone else's booking. Without the token it
 * answers `{ name: null }` and the form simply stays empty.
 */
export const runtime = 'nodejs';
export const maxDuration = 10;

const MAX_BODY_BYTES = 1_000;
const CALENDLY_CALL_MS = 4_000;
const INVITEE_URI = /^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]+\/invitees\/[A-Za-z0-9-]+$/;

function noName() {
  return NextResponse.json({ name: null });
}

export async function POST(req: Request) {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return noName();

  const body = await readBoundedBody(req, MAX_BODY_BYTES);
  if (!body.ok) return NextResponse.json({ name: null }, { status: 400 });

  let uri: unknown;
  let email: unknown;
  try {
    ({ uri, email } = JSON.parse(body.text) as { uri?: unknown; email?: unknown });
  } catch {
    return NextResponse.json({ name: null }, { status: 400 });
  }
  if (typeof uri !== 'string' || !INVITEE_URI.test(uri)) return NextResponse.json({ name: null }, { status: 400 });
  if (typeof email !== 'string' || !isValidEmail(email)) return NextResponse.json({ name: null }, { status: 400 });

  try {
    const res = await fetch(uri, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(CALENDLY_CALL_MS),
      cache: 'no-store',
    });
    if (!res.ok) return noName();
    const data = (await res.json()) as { resource?: { name?: unknown; email?: unknown } };
    const invitee = data.resource;
    if (typeof invitee?.email !== 'string' || invitee.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return noName();
    }
    const name = typeof invitee.name === 'string' ? invitee.name.trim().slice(0, 120) : '';
    return NextResponse.json({ name: name || null });
  } catch {
    return noName();
  }
}
