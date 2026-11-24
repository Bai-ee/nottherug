import type { EveningReport, ReportLead } from '@/lib/leads/eveningReport';

const TZ = 'America/New_York';

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function when(iso: string, withDate: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    timeZone: TZ,
    ...(withDate ? { month: 'short', day: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit',
  });
}

function notes(l: ReportLead): string {
  return [l.bookedSelfReported ? 'Said they booked on Calendly' : '', l.newsletterOptIn ? 'Newsletter opt-in' : '']
    .filter(Boolean)
    .join(' · ');
}

const CELL = 'padding:8px 10px;border-bottom:1px solid #ece8df;vertical-align:top;';
const HEAD = 'padding:8px 10px;border-bottom:2px solid #1a1a1a;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;';

function recentRow(l: ReportLead): string {
  return `<tr>
    <td style="${CELL}white-space:nowrap;">${escape(when(l.submittedAt, false))}</td>
    <td style="${CELL}">${escape(l.kind)}</td>
    <td style="${CELL}">${escape(l.name || '—')}</td>
    <td style="${CELL}"><a href="mailto:${escape(l.email)}">${escape(l.email || '—')}</a></td>
    <td style="${CELL}">${escape(l.phone || '—')}</td>
    <td style="${CELL}">${escape(l.dog || '—')}</td>
    <td style="${CELL}">${escape(notes(l) || '')}</td>
  </tr>`;
}

function emailOnlyRow(l: ReportLead): string {
  return `<tr>
    <td style="${CELL}white-space:nowrap;">${escape(when(l.submittedAt, true))}</td>
    <td style="${CELL}"><a href="mailto:${escape(l.email)}">${escape(l.email)}</a></td>
    <td style="${CELL}">${escape(l.source || '—')}</td>
    <td style="${CELL}">${escape(notes(l) || '')}</td>
  </tr>`;
}

function textLine(l: ReportLead, withDate: boolean): string {
  return ['-', when(l.submittedAt, withDate), l.kind, l.name, l.email, l.phone, l.dog, notes(l)].filter(Boolean).join(' | ');
}

export function eveningReportEmail(report: EveningReport, opts: { test?: boolean } = {}): { subject: string; html: string; text: string } {
  const n = report.recent.length;
  const m = report.emailOnly.length;
  const subject = `${opts.test ? '[TEST] ' : ''}NTR leads: ${n} in the last 24 hours, ${m} email-only on file`;
  const range = `${when(report.windowStart, true)} to ${when(report.windowEnd, true)} (New York time)`;

  const caveats = [
    report.testsHidden ? '' : 'Test markers could not be read, so test signups may be included.',
    report.truncated ? 'Only the most recent 1,000 records were read.' : '',
  ].filter(Boolean);

  const recentTable = n
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><th style="${HEAD}">Time</th><th style="${HEAD}">Type</th><th style="${HEAD}">Name</th><th style="${HEAD}">Email</th><th style="${HEAD}">Phone</th><th style="${HEAD}">Dog</th><th style="${HEAD}">Notes</th></tr>
        ${report.recent.map(recentRow).join('')}
      </table>`
    : `<p style="margin:0;color:#555;">No new leads in the last 24 hours.</p>`;

  const emailOnlyTable = m
    ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><th style="${HEAD}">Signed up</th><th style="${HEAD}">Email</th><th style="${HEAD}">Where</th><th style="${HEAD}">Notes</th></tr>
        ${report.emailOnly.map(emailOnlyRow).join('')}
      </table>`
    : `<p style="margin:0;color:#555;">No email-only signups waiting.</p>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf8f3;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #ece8df;padding:24px;">
    ${opts.test ? '<p style="margin:0 0 16px;padding:8px 12px;background:#fff4d6;font-size:13px;">Test send. The daily version goes out at 6:58 PM once approved.</p>' : ''}
    <h1 style="margin:0 0 4px;font-size:20px;">Not The Rug leads</h1>
    <p style="margin:0 0 24px;color:#555;font-size:13px;">${escape(range)}</p>

    <h2 style="margin:0 0 8px;font-size:16px;">Last 24 hours (${n})</h2>
    ${recentTable}

    <h2 style="margin:32px 0 4px;font-size:16px;">Email-only inquiries (${m})</h2>
    <p style="margin:0 0 8px;color:#555;font-size:13px;">Everyone who left only an email and has not finished the questionnaire, newest first. They drop off this list once they complete it.</p>
    ${emailOnlyTable}

    ${caveats.length ? `<p style="margin:24px 0 0;color:#8a5a00;font-size:12px;">${caveats.map(escape).join(' ')}</p>` : ''}
  </div>
</body></html>`;

  const text = [
    opts.test ? 'TEST SEND. The daily version goes out at 6:58 PM once approved.\n' : '',
    'Not The Rug leads',
    range,
    '',
    `LAST 24 HOURS (${n})`,
    ...(n ? report.recent.map((l) => textLine(l, false)) : ['No new leads in the last 24 hours.']),
    '',
    `EMAIL-ONLY INQUIRIES (${m}): left only an email, questionnaire not finished`,
    ...(m ? report.emailOnly.map((l) => textLine(l, true)) : ['No email-only signups waiting.']),
    ...(caveats.length ? ['', ...caveats] : []),
  ].join('\n');

  return { subject, html, text };
}
