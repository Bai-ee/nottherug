'use client';

import { Fragment } from 'react';
import { LEAD_DISPLAY_FIELDS, formatLeadFieldValue, type LeadRecord, type LeadDisplayField } from '@/lib/leads/contract';

const TZ = 'America/New_York';

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// The compact row shows a fixed subset of LEAD_DISPLAY_FIELDS; the expanded
// detail row shows the rest, so both stay driven by the one shared field
// list instead of a second hand-maintained column set.
const TABLE_FIELD_KEYS = new Set<LeadDisplayField['key']>([
  'submittedAt', 'source', 'ownerName', 'email', 'phone',
  'neighborhood', 'dogName', 'breedAge', 'serviceInterest', 'walkFrequency',
]);

const TABLE_FIELDS = LEAD_DISPLAY_FIELDS.filter((f) => TABLE_FIELD_KEYS.has(f.key));
const DETAIL_FIELDS = LEAD_DISPLAY_FIELDS.filter((f) => !TABLE_FIELD_KEYS.has(f.key));

function TableCell({ lead, field }: { lead: LeadRecord; field: LeadDisplayField }) {
  if (field.key === 'submittedAt') return <td>{fmtDate(lead.submittedAt)}</td>;
  if (field.key === 'source') return <td><span className="src-pill">{lead.source || '—'}</span></td>;
  if (field.key === 'email') {
    return <td>{lead.email ? <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()}>{lead.email}</a> : '—'}</td>;
  }
  if (field.key === 'phone') {
    return <td>{lead.phone ? <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}>{lead.phone}</a> : '—'}</td>;
  }
  return <td>{formatLeadFieldValue(lead, field)}</td>;
}

export function LeadTable({
  leads,
  expandedId,
  onToggleExpand,
}: {
  leads: LeadRecord[];
  expandedId: string | null;
  onToggleExpand: (rowKey: string) => void;
}) {
  if (leads.length === 0) {
    return <div className="leads-empty">No leads match the current filters.</div>;
  }

  return (
    <table className="leads-table" id="leads-results-table">
      <thead>
        <tr>
          {TABLE_FIELDS.map((f) => (
            <th key={f.key}>{f.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => {
          const rowKey = lead.id ?? `${lead.email}-${lead.submittedAt}`;
          const isOpen = expandedId === rowKey;
          const visibleDetailFields = DETAIL_FIELDS.filter((f) => !f.legacy || lead[f.key] !== undefined);
          return (
            <Fragment key={rowKey}>
              <tr onClick={() => onToggleExpand(rowKey)}>
                {TABLE_FIELDS.map((f) => (
                  <TableCell key={f.key} lead={lead} field={f} />
                ))}
              </tr>
              {isOpen ? (
                <tr className="leads-detail">
                  <td colSpan={TABLE_FIELDS.length}>
                    <div className="leads-detail-grid">
                      {visibleDetailFields.map((f) => (
                        <div
                          key={f.key}
                          className="leads-detail-cell"
                          style={f.key === 'notes' ? { gridColumn: '1 / -1' } : undefined}
                        >
                          <div className="lbl">{f.label}</div>
                          <div className="val" style={f.key === 'notes' ? { whiteSpace: 'pre-wrap' } : undefined}>
                            {formatLeadFieldValue(lead, f)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
