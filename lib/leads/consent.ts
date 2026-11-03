/**
 * Marketing consent, recorded only when the person said yes. There is no
 * newsletter tool connected yet: these fields are the record of who agreed,
 * when and where, ready to sync to one later.
 *
 *   newsletterOptIn   ticked "Send me occasional Not The Rug news…", or
 *                     confirmed it from the acknowledgement email.
 *   contactOptIn      confirmed "Yes, Luis can contact me" from that email.
 *
 * A yes is never turned back into a no by a later form without the box ticked:
 * only an unsubscribe (not built yet) may clear it.
 */

export const NEWSLETTER_LABEL = 'Send me occasional Not The Rug news and updates. Unsubscribe anytime.';

export type ConsentKind = 'newsletter' | 'contact';

/** The fields a "yes" writes. `via` says where it was given (a form source, or 'email-link'). */
export function consentFields(kind: ConsentKind, via: string, nowIso: string): Record<string, unknown> {
  return kind === 'newsletter'
    ? { newsletterOptIn: true, newsletterOptInAt: nowIso, newsletterOptInVia: via.slice(0, 40) }
    : { contactOptIn: true, contactOptInAt: nowIso, contactOptInVia: via.slice(0, 40) };
}

/** True only for an explicit boolean true in a request body. */
export function readOptIn(v: unknown): boolean {
  return v === true;
}
