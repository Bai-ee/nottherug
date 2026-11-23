/**
 * Real-time "NTR - New Lead" ping to HITLOOP, which forwards it to the Telegram
 * chat linked to the Not The Rug client. Sends only the lead type, never the
 * person's details. Best effort: unset secret = off, and a failure or timeout
 * is logged and swallowed so it can never affect a lead or its emails.
 */
export type HitloopLeadType = 'meet-greet' | 'time-request' | 'email-only';

const DEFAULT_URL = 'https://hitloop.agency/api/client-events/lead';
const TIMEOUT_MS = 4_000;

export async function notifyHitloopLead(leadType: HitloopLeadType): Promise<'sent' | 'skipped' | 'failed'> {
  const secret = process.env.HITLOOP_LEAD_ALERT_SECRET?.trim();
  if (!secret) return 'skipped';
  const url = process.env.HITLOOP_LEAD_ALERT_URL?.trim() || DEFAULT_URL;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ leadType }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[lead:hitloop] alert rejected', res.status);
      return 'failed';
    }
    return 'sent';
  } catch {
    console.error('[lead:hitloop] alert error');
    return 'failed';
  }
}
