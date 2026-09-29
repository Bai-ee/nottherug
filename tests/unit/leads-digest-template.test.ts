import { describe, it, expect } from 'vitest';
import { dailyLeadsDigestEmail } from '@/lib/email/digest-template';
import type { LeadStats } from '@/lib/leads/stats';

function stats(leads: LeadStats['yesterday']['leads']): LeadStats {
  return {
    rangeDays: 30,
    timezone: 'America/New_York',
    today: { dateLabel: '2026-01-15', count: 0, leads: [] },
    yesterday: { dateLabel: '2026-01-14', count: leads.length, leads },
    totals: { recentCount: leads.length, recentCountCap: 1000, last7Days: leads.length, last30Days: leads.length },
    emailsCaptured: { yesterday: 2, last7Days: 3, last30Days: 4 },
    byDay: [{ date: '2026-01-14', count: leads.length }],
    bySource: {},
  };
}

describe('dailyLeadsDigestEmail', () => {
  it('never prints "undefined" for a lead with missing fields', () => {
    const { text, html } = dailyLeadsDigestEmail(
      stats([{ id: 'x', type: 'meetgreet', submittedAt: '2026-01-14T15:00:00.000Z', email: 'a@example.test' }]),
    );
    expect(text).not.toContain('undefined');
    expect(html).not.toContain('undefined');
    expect(text).toContain('a@example.test');
  });

  it('reports emails captured as its own count', () => {
    const { text, html } = dailyLeadsDigestEmail(stats([]));
    expect(text).toContain('Emails captured');
    expect(text).toContain('yesterday: 2');
    expect(html).toContain('last 30 days: 4');
  });
});
