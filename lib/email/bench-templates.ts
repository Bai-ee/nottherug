import type { BenchPerson } from '@/lib/bench/contract';

/**
 * Applicant-facing email for the backup walker bench (plans/011). Offer copy
 * stays neutral on W-2 vs 1099 (plan §4.4) and never names pay (§12 #2).
 */

type Mail = { subject: string; html: string; text: string };

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrap(paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px 0;">${p}</p>`).join('\n    ');
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#fff;color:#1c1c1a;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    ${body}
    <p style="margin-top:32px;color:#888;font-size:12px;">Not The Rug · Brooklyn dog walking &amp; care</p>
  </div>
</body></html>`;
}

function mail(subject: string, paragraphs: string[]): Mail {
  return {
    subject,
    html: wrap(paragraphs.map(escape)),
    text: [...paragraphs, '', '— Not The Rug'].join('\n\n'),
  };
}

type Who = Pick<BenchPerson, 'firstName'>;

export function applicationReceivedEmail(person: Who): Mail {
  return mail('We got your on-call application — Not The Rug', [
    `Thanks, ${person.firstName}!`,
    'We got your application for our part-time, on-call dog walking team. We’ll review your experience and availability and contact you if there’s a potential fit.',
    'If anything in your application changes, just reply to this email.',
  ]);
}

export function applicationClosedEmail(person: Who): Mail {
  return mail('Your application to Not The Rug', [
    `Hi ${person.firstName},`,
    'Thank you for applying to our on-call team. Based on the answers in your application, we can’t move forward right now: this role needs people who want part-time, on-call work, can reliably reach Williamsburg, will complete our training, and can share some weekly availability.',
    'If any of that changes, you’re welcome to apply again.',
  ]);
}

export function applicationDeclinedEmail(person: Who): Mail {
  return mail('Your application to Not The Rug', [
    `Hi ${person.firstName},`,
    'Thank you for your interest in our on-call team and for the time you put into your application.',
    'We aren’t moving forward right now. We keep a small on-call team and it’s full for the times you listed. We’d be glad to hear from you again in the future.',
  ]);
}

export function shadowInviteEmail(person: Who, bookingUrl: string): Mail {
  const booking = bookingUrl
    ? `Pick a time that works for you here: ${bookingUrl}`
    : 'Luis will reach out shortly to find a time that works for you.';
  return mail('Come on a shadow walk with us — Not The Rug', [
    `Hi ${person.firstName},`,
    'Thanks for applying to our on-call team. We’d like to invite you on a shadow walk alongside one of our walkers, so you can meet the dogs and see how we do things.',
    booking,
    'Wear comfortable shoes. We’ll take care of the rest.',
  ]);
}

export function conditionalOfferEmail(person: Who): Mail {
  return mail('An offer to join our on-call team — Not The Rug', [
    `Hi ${person.firstName},`,
    'Thanks for coming on the shadow walk. We’d like to offer you a spot on our on-call walker team.',
    'This offer is conditional on a background check, which we run only now, after the offer. Luis will send you the coverage rate, expectations and next steps before you accept any work.',
    'Reply to this email with any questions.',
  ]);
}
