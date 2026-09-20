import { csvCell } from '@/lib/leads/csv';
import { LEAD_DISPLAY_FIELDS, formatLeadFieldValue } from '@/lib/leads/contract';
import { leadQualityLabel, type AdminLeadRecord } from './adminLeadRecord';

const COMPLETENESS_LABEL = 'Completeness';

/**
 * The base columns are the shared meetgreet field list (lib/leads/contract.ts),
 * unchanged, so a meetgreet lead's row looks exactly as it did. One column is
 * appended — the same words-only seriousness signal the table shows — so a
 * partial capture's row reads as "waiting on answers" data rather than a lead
 * with every column blank. `formatLeadFieldValue` already renders a field a
 * capture never had as "—", so this never crashes on a missing field.
 */
export function buildLeadsCsv(leads: AdminLeadRecord[]): string {
  const header = [...LEAD_DISPLAY_FIELDS.map((f) => f.label), COMPLETENESS_LABEL].map(csvCell).join(',');
  const rows = leads.map((lead) =>
    [...LEAD_DISPLAY_FIELDS.map((f) => csvCell(formatLeadFieldValue(lead, f))), csvCell(leadQualityLabel(lead))].join(
      ',',
    ),
  );
  return [header, ...rows].join('\r\n');
}

/** Triggers a browser download of the given leads as spreadsheet-safe CSV. */
export function exportLeadsCsv(leads: AdminLeadRecord[]): void {
  const csv = buildLeadsCsv(leads);
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
