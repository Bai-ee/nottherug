/**
 * The dashboard's greeting is a reading of the report, so each branch is
 * pinned to the condition that should produce it — and every possible line is
 * held to the four-word limit the design depends on.
 */
import { describe, it, expect } from 'vitest';
import { buildDashboardGreeting } from '@/lib/analytics/greeting';
import { buildEmptyReport } from '@/components/admin/analytics/emptyReport';
import type { AnalyticsReport, DailyTrendPoint } from '@/lib/analytics/report';

function day(date: string, sessions: number): DailyTrendPoint {
  return { date, pageviews: sessions, sessions, engagedSessions: 0, leadSaved: 0 };
}

function report(overrides: Partial<AnalyticsReport>): AnalyticsReport {
  const base = buildEmptyReport('7d');
  return {
    ...base,
    ...overrides,
    meta: { ...base.meta, status: 'ok', ...(overrides.meta ?? {}) },
  };
}

describe('buildDashboardGreeting', () => {
  it('leads with a booked walk over everything else', () => {
    expect(buildDashboardGreeting(report({ appointmentsScheduled: 1, sessions: 40 }))).toBe('A walk got booked');
  });

  it('reports an inquiry when there is no appointment', () => {
    expect(buildDashboardGreeting(report({ inquiries: 2, sessions: 40 }))).toBe('Someone asked about walks');
  });

  it('says so plainly when nothing has been tracked', () => {
    expect(buildDashboardGreeting(report({ meta: { ...buildEmptyReport('7d').meta, status: 'no_data_yet' } }))).toBe(
      'Nothing tracked yet',
    );
  });

  it('does not claim activity when the range is empty', () => {
    expect(buildDashboardGreeting(report({ sessions: 0 }))).toBe('Quiet as a mouse');
  });

  it('calls a rising last day a climb', () => {
    const trend = [day('2026-09-18', 2), day('2026-09-19', 3), day('2026-09-20', 30)];
    expect(buildDashboardGreeting(report({ sessions: 35, dailyTrend: trend }))).toBe('Traffic is picking up');
  });

  it('does not call a falling last day a climb', () => {
    const trend = [day('2026-09-18', 30), day('2026-09-19', 30), day('2026-09-20', 1)];
    expect(buildDashboardGreeting(report({ sessions: 61, dailyTrend: trend }))).toBe('People are looking around');
  });

  it('never exceeds four words, whatever the report says', () => {
    const cases: Array<Partial<AnalyticsReport>> = [
      { appointmentsScheduled: 3 },
      { inquiries: 1 },
      { sessions: 0 },
      { sessions: 5 },
      { sessions: 80 },
      { sessions: 10, engagedVisitPct: 90 },
      { meta: { ...buildEmptyReport('7d').meta, status: 'partial_failure' } },
      { meta: { ...buildEmptyReport('7d').meta, status: 'no_data_yet' } },
    ];
    for (const override of cases) {
      const line = buildDashboardGreeting(report(override));
      expect(line.split(/\s+/).length).toBeLessThanOrEqual(4);
    }
  });
});
