import { leadsToCsv } from '@/lib/leads/csv';
import type { LeadRecord } from '@/lib/leads/contract';

/** Triggers a browser download of the given leads as spreadsheet-safe CSV. */
export function exportLeadsCsv(leads: LeadRecord[]): void {
  const csv = leadsToCsv(leads);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
