/**
 * Coverage for components/admin/leads/exportLeadsCsv.ts's buildLeadsCsv —
 * the leads-page-owned CSV builder that adds a "Completeness" column on top
 * of the shared meetgreet field list (lib/leads/csv.ts / contract.ts stay
 * untouched) so a partial capture row exports cleanly.
 */
import { describe, it, expect } from 'vitest';
import { buildLeadsCsv } from '@/components/admin/leads/exportLeadsCsv';
import { LEAD_DISPLAY_FIELDS } from '@/lib/leads/contract';
import type { AdminLeadRecord } from '@/components/admin/leads/adminLeadRecord';

describe('buildLeadsCsv', () => {
  it('appends one Completeness column after the shared meetgreet field list', () => {
    const csv = buildLeadsCsv([]);
    const header = csv.split('\r\n')[0];
    expect(header).toBe([...LEAD_DISPLAY_FIELDS.map((f) => f.label), 'Completeness'].join(','));
  });

  it('renders a partial capture row without crashing, with words rather than a score', () => {
    const capture: AdminLeadRecord = {
      id: 'capture_abc',
      type: 'capture',
      status: 'partial',
      email: 'waiting@example.test',
      submittedAt: '2026-01-05T12:00:00.000Z',
      source: 'welcome-modal',
      lastSeenAt: '2026-01-06T12:00:00.000Z',
      bookedSelfReported: true,
    };

    const csv = buildLeadsCsv([capture]);
    const [, row] = csv.split('\r\n');

    expect(row).toContain('waiting@example.test');
    expect(row).toContain('Booked');
    expect(row).toContain('answered');
    expect(row).not.toMatch(/,\s*\d{1,3}\s*,/); // never a bare 0-100 score
    expect(row).toContain('—'); // fields the capture never had (name, dog, phone…)
  });

  it('does not crash on a lead missing every optional field', () => {
    const sparse: AdminLeadRecord = {
      id: 'capture_bare',
      type: 'capture',
      status: 'partial',
      email: 'a@b.com',
      submittedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(() => buildLeadsCsv([sparse])).not.toThrow();
    expect(buildLeadsCsv([sparse])).toContain('0 of');
  });
});
