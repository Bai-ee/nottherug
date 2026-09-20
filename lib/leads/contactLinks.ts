import type { LeadRecord } from './contract';

/**
 * The links behind the action buttons on an opened lead. Pure string builders
 * so they can be tested without a browser, and so the escaping is in one
 * place rather than inline in JSX.
 *
 * mailto: and tel: are handled by the operating system on every platform —
 * desktop mail clients and webmail handlers, and the dialer or FaceTime on a
 * phone — which is why they are plain links rather than anything scripted.
 */

/** tel: wants digits, an optional leading +, and nothing else. */
export function telHref(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\+/g, '');
  if (digits.length < 7) return null; // not a dialable number
  return `tel:${cleaned.startsWith('+') ? '+' : ''}${digits}`;
}

/** A reply that already knows which dog it is about. */
export function mailtoHref(lead: Pick<LeadRecord, 'email' | 'ownerName' | 'dogName'>): string | null {
  if (!lead.email) return null;
  const subject = lead.dogName ? `Not The Rug — walks for ${lead.dogName}` : 'Not The Rug — your walk request';
  return `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}`;
}

/**
 * Google Calendar's event composer, prefilled and with the client invited.
 * No times are set: the founder picks the slot, which is the whole point of
 * opening the composer rather than writing an event from here.
 */
export function googleCalendarHref(
  lead: Pick<LeadRecord, 'email' | 'ownerName' | 'dogName' | 'neighborhood' | 'phone' | 'serviceInterest'>,
): string {
  const who = lead.ownerName || lead.email || 'client';
  const title = lead.dogName ? `Meet & Greet — ${who} and ${lead.dogName}` : `Meet & Greet — ${who}`;

  const details = [
    lead.ownerName ? `Owner: ${lead.ownerName}` : null,
    lead.dogName ? `Dog: ${lead.dogName}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.serviceInterest ? `Interested in: ${lead.serviceInterest}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({ action: 'TEMPLATE', text: title });
  if (details) params.set('details', details);
  if (lead.neighborhood) params.set('location', `${lead.neighborhood}, Brooklyn`);
  if (lead.email) params.set('add', lead.email);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
