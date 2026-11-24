import { describe, it, expect } from 'vitest';
import { buildEveningReport } from '@/lib/leads/eveningReport';
import { eveningReportEmail } from '@/lib/email/evening-report-template';
import { emptyTestContext } from '@/lib/testing/classification';
import type { AdminLeadRecord } from '@/components/admin/leads/adminLeadRecord';

const NOW = new Date('2026-11-24T23:58:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
const lead = (p: Partial<AdminLeadRecord>) => ({ id: Math.random().toString(36), type: 'meetgreet', email: 'a@x.com', submittedAt: hoursAgo(1), ...p }) as AdminLeadRecord;

describe('buildEveningReport', () => {
  it('lists the last 24 hours of every kind and the open email-only signups, without tests or converted captures', () => {
    const ctx = emptyTestContext();
    ctx.deviceIds.add('dev1');
    const report = buildEveningReport(
      [
        lead({ email: 'q@x.com', ownerName: 'Q' }),
        lead({ type: 'capture', status: 'partial', email: 'new@x.com', submittedAt: hoursAgo(2) }),
        lead({ type: 'capture', status: 'partial', email: 'old@x.com', submittedAt: hoursAgo(24 * 10) }),
        lead({ type: 'capture', status: 'converted', email: 'q@x.com' }),
        lead({ type: 'capture', status: 'partial', email: 'test@x.com', testDeviceId: 'dev1' }),
        lead({ email: 'stale@x.com', submittedAt: hoursAgo(30) }),
      ],
      [lead({ type: 'time-request', email: 't@x.com', submittedAt: hoursAgo(3) })],
      ctx,
      NOW,
      { testsHidden: true, truncated: false },
    );
    expect(report.recent.map((l) => [l.kind, l.email])).toEqual([
      ['Questionnaire', 'q@x.com'],
      ['Email only', 'new@x.com'],
      ['Time request', 't@x.com'],
    ]);
    expect(report.emailOnly.map((l) => l.email)).toEqual(['new@x.com', 'old@x.com']);
  });
});

describe('eveningReportEmail', () => {
  it('escapes lead content and marks a test send', () => {
    const report = buildEveningReport(
      [lead({ type: 'capture', status: 'partial', email: '<b>@x.com' })],
      [],
      emptyTestContext(),
      NOW,
      { testsHidden: true, truncated: false },
    );
    const mail = eveningReportEmail(report, { test: true });
    expect(mail.subject).toBe('[TEST] NTR leads: 1 in the last 24 hours, 1 email-only on file');
    expect(mail.html).not.toContain('<b>@x.com');
    expect(mail.html).toContain('&lt;b&gt;@x.com');
    expect(mail.text).not.toContain('undefined');
  });

  it('says when nothing came in', () => {
    const mail = eveningReportEmail(buildEveningReport([], [], emptyTestContext(), NOW, { testsHidden: true, truncated: false }));
    expect(mail.text).toContain('No new leads in the last 24 hours.');
    expect(mail.text).toContain('No email-only signups waiting.');
  });
});
