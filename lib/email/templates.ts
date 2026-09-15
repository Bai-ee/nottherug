import type { LeadRecord } from '@/lib/leads/contract';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string | undefined): string {
  return `<tr><td style="padding:8px 12px;background:#f7f5f1;border-bottom:1px solid #ece8df;font-weight:600;width:200px;">${escape(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #ece8df;">${escape(value || '—')}</td></tr>`;
}

export function founderMeetGreetEmail(lead: LeadRecord): { subject: string; html: string; text: string } {
  const subject = `New Meet & Greet — ${lead.ownerName ?? 'Unknown'} (${lead.dogName ?? 'Unknown'})`;
  const phoneConsultLabel = lead.phoneConsult ? 'Yes — call instead of Calendly' : 'No';

  const html = `
<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#fff;color:#1c1c1a;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;">
    <h2 style="margin:0 0 4px 0;">New Free Meet &amp; Greet request</h2>
    <p style="color:#666;margin:0 0 20px 0;font-size:13px;">Submitted ${escape(lead.submittedAt)} · source: ${escape(lead.source || 'unknown')} · id: ${escape(lead.id)}</p>

    <h3 style="margin:24px 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">Contact</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${row('Owner', lead.ownerName)}
      ${row('Phone', lead.phone)}
      ${row('Email', lead.email)}
      ${row('Neighborhood', lead.neighborhood)}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">Dog</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${row('Name', lead.dogName)}
      ${row('Breed & Age', lead.breedAge)}
      ${row('Service interest', lead.serviceInterest)}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">Survey answers</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${row('Vaccinations', lead.vaccinations)}
      ${row('Walk frequency', lead.walkFrequency)}
      ${row('Reactive around', lead.reactivity)}
      ${row('Allergies', lead.allergies)}
      ${row('Phone consultation requested', phoneConsultLabel)}
    </table>

    ${lead.notes ? `<h3 style="margin:24px 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">Notes</h3><p style="background:#f7f5f1;padding:12px;border-radius:6px;margin:0;white-space:pre-wrap;">${escape(lead.notes)}</p>` : ''}

    <p style="margin-top:32px;color:#888;font-size:12px;">Reply directly to ${escape(lead.email)} to schedule.</p>
  </div>
</body></html>`;

  const text = [
    `New Free Meet & Greet request`,
    `Submitted: ${lead.submittedAt}`,
    `Source: ${lead.source || 'unknown'}`,
    `ID: ${lead.id}`,
    ``,
    `— Contact —`,
    `Owner: ${lead.ownerName ?? '—'}`,
    `Phone: ${lead.phone ?? '—'}`,
    `Email: ${lead.email}`,
    `Neighborhood: ${lead.neighborhood ?? '—'}`,
    ``,
    `— Dog —`,
    `Name: ${lead.dogName ?? '—'}`,
    `Breed & Age: ${lead.breedAge ?? '—'}`,
    `Service interest: ${lead.serviceInterest ?? '—'}`,
    ``,
    `— Survey —`,
    `Vaccinations: ${lead.vaccinations ?? '—'}`,
    `Walk frequency: ${lead.walkFrequency ?? '—'}`,
    `Reactive around: ${lead.reactivity ?? '—'}`,
    `Allergies: ${lead.allergies ?? '—'}`,
    `Phone consultation requested: ${phoneConsultLabel}`,
    ``,
    lead.notes ? `— Notes —\n${lead.notes}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

export function customerMeetGreetEmail(lead: LeadRecord): { subject: string; html: string; text: string } {
  const subject = `We got your Meet & Greet request — Not The Rug`;
  const firstName = lead.ownerName?.split(' ')[0] || 'friend';

  const html = `
<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#fff;color:#1c1c1a;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    <h2 style="margin:0 0 16px 0;">Thanks, ${escape(firstName)}!</h2>
    <p>We got your Free Meet &amp; Greet request for <strong>${escape(lead.dogName || 'your dog')}</strong>. ${lead.phoneConsult ? "We'll call you within 2 hours on weekdays." : "We'll reach out within 2 hours on weekdays to schedule your free visit."}</p>

    <p style="margin-top:20px;">Here's what you sent us:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
      ${row('Neighborhood', lead.neighborhood)}
      ${row('Service interest', lead.serviceInterest)}
      ${row('Walk frequency', lead.walkFrequency)}
    </table>

    <p style="margin-top:24px;">If anything's off, just reply to this email.</p>
    <p style="margin-top:32px;color:#888;font-size:12px;">Not The Rug · Brooklyn dog walking &amp; care</p>
  </div>
</body></html>`;

  const text = [
    `Thanks, ${firstName}!`,
    ``,
    `We got your Free Meet & Greet request for ${lead.dogName || 'your dog'}.`,
    lead.phoneConsult
      ? `We'll call you within 2 hours on weekdays.`
      : `We'll reach out within 2 hours on weekdays to schedule your free visit.`,
    ``,
    `Neighborhood: ${lead.neighborhood ?? '—'}`,
    `Service interest: ${lead.serviceInterest ?? '—'}`,
    `Walk frequency: ${lead.walkFrequency ?? '—'}`,
    ``,
    `If anything's off, just reply to this email.`,
    ``,
    `— Not The Rug`,
  ].join('\n');

  return { subject, html, text };
}
