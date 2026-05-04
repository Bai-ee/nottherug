import type { LeadStats, LeadDoc } from '@/lib/leads/stats';

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function leadRow(l: LeadDoc): string {
  const time = new Date(l.submittedAt).toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
  return `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #ece8df;">${escape(time)}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #ece8df;">${escape(l.ownerName || '—')}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #ece8df;">${escape(l.dogName || '—')}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #ece8df;">${escape(l.neighborhood || '—')}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #ece8df;"><a href="mailto:${escape(l.email)}">${escape(l.email || '—')}</a></td>
    <td style="padding:8px 12px;border-bottom:1px solid #ece8df;">${escape(l.source || '—')}</td>
  </tr>`;
}

function dayRow(d: { date: string; count: number }): string {
  return `<tr><td style="padding:6px 12px;border-bottom:1px solid #ece8df;">${escape(d.date)}</td><td style="padding:6px 12px;border-bottom:1px solid #ece8df;text-align:right;font-variant-numeric:tabular-nums;">${d.count}</td></tr>`;
}

export function dailyLeadsDigestEmail(stats: LeadStats): { subject: string; html: string; text: string } {
  const subject = `Daily leads digest — ${stats.yesterday.count} yesterday (${stats.yesterday.dateLabel})`;

  const sourceRows = Object.entries(stats.bySource)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #ece8df;">${escape(k)}</td><td style="padding:6px 12px;border-bottom:1px solid #ece8df;text-align:right;font-variant-numeric:tabular-nums;">${v}</td></tr>`)
    .join('');

  const last14 = stats.byDay.slice(0, 14);

  const html = `
<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#fff;color:#1c1c1a;margin:0;padding:24px;">
  <div style="max-width:680px;margin:0 auto;">
    <h2 style="margin:0 0 4px 0;">Daily leads digest</h2>
    <p style="color:#666;margin:0 0 24px 0;font-size:13px;">Window: ${escape(stats.yesterday.dateLabel)} (${escape(stats.timezone)})</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;background:#f7f5f1;border-radius:6px;width:33%;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${stats.yesterday.count}</div>
          <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Yesterday</div>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#f7f5f1;border-radius:6px;width:33%;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${stats.totals.last7Days}</div>
          <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Last 7 days</div>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#f7f5f1;border-radius:6px;width:33%;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${stats.totals.last30Days}</div>
          <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Last 30 days</div>
        </td>
      </tr>
    </table>

    ${stats.yesterday.leads.length ? `
    <h3 style="margin:24px 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">Yesterday's leads</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f7f5f1;">
        <th style="padding:8px 12px;text-align:left;">Time</th>
        <th style="padding:8px 12px;text-align:left;">Owner</th>
        <th style="padding:8px 12px;text-align:left;">Dog</th>
        <th style="padding:8px 12px;text-align:left;">Neighborhood</th>
        <th style="padding:8px 12px;text-align:left;">Email</th>
        <th style="padding:8px 12px;text-align:left;">Source</th>
      </tr></thead>
      <tbody>${stats.yesterday.leads.map(leadRow).join('')}</tbody>
    </table>` : '<p style="color:#888;">No leads captured yesterday.</p>'}

    <h3 style="margin:32px 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">Last 14 days</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f7f5f1;"><th style="padding:6px 12px;text-align:left;">Date</th><th style="padding:6px 12px;text-align:right;">Leads</th></tr></thead>
      <tbody>${last14.map(dayRow).join('')}</tbody>
    </table>

    ${sourceRows ? `
    <h3 style="margin:32px 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">All-time by source</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f7f5f1;"><th style="padding:6px 12px;text-align:left;">Source</th><th style="padding:6px 12px;text-align:right;">Count</th></tr></thead>
      <tbody>${sourceRows}</tbody>
    </table>` : ''}
  </div>
</body></html>`;

  const text = [
    `Daily leads digest — ${stats.yesterday.dateLabel} (${stats.timezone})`,
    ``,
    `Yesterday: ${stats.yesterday.count}`,
    `Last 7 days: ${stats.totals.last7Days}`,
    `Last 30 days: ${stats.totals.last30Days}`,
    ``,
    stats.yesterday.leads.length ? `— Yesterday's leads —` : `No leads captured yesterday.`,
    ...stats.yesterday.leads.map(l => `· ${l.ownerName} (${l.dogName}) · ${l.neighborhood} · ${l.email} · ${l.source}`),
    ``,
    `— Last 14 days —`,
    ...stats.byDay.slice(0, 14).map(d => `${d.date}  ${d.count}`),
  ].join('\n');

  return { subject, html, text };
}
