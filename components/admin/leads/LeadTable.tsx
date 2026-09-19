'use client';

import type { ReactNode } from 'react';
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

// The card's visible face shows a fixed subset of LEAD_DISPLAY_FIELDS
// (source and submittedAt move into the card header, ownerName becomes the
// card title); the expandable detail section shows the rest. Both stay
// driven by the one shared field list instead of a second hand-maintained
// column set.
const FACE_FIELD_KEYS = new Set<LeadDisplayField['key']>([
  'email', 'phone', 'neighborhood', 'dogName', 'breedAge', 'serviceInterest', 'walkFrequency',
]);

const FACE_FIELDS = LEAD_DISPLAY_FIELDS.filter((f) => FACE_FIELD_KEYS.has(f.key));
const DETAIL_FIELDS = LEAD_DISPLAY_FIELDS.filter(
  (f) => !FACE_FIELD_KEYS.has(f.key) && f.key !== 'ownerName' && f.key !== 'submittedAt' && f.key !== 'source'
);

function FieldRow({ lead, field }: { lead: LeadRecord; field: LeadDisplayField }) {
  const isNotes = field.key === 'notes';

  let valueNode: ReactNode;
  if (field.key === 'email' && lead.email) {
    valueNode = (
      <a href={`mailto:${lead.email}`} className="rc-value" onClick={(e) => e.stopPropagation()}>
        {lead.email}
      </a>
    );
  } else if (field.key === 'phone' && lead.phone) {
    valueNode = (
      <a href={`tel:${lead.phone}`} className="rc-value" onClick={(e) => e.stopPropagation()}>
        {lead.phone}
      </a>
    );
  } else if (field.key === 'phoneConsult' && lead.phoneConsult) {
    valueNode = <span className="badge badge-terra">Requested</span>;
  } else {
    valueNode = (
      <span className="rc-value" style={isNotes ? { whiteSpace: 'pre-wrap', fontWeight: 400 } : undefined}>
        {formatLeadFieldValue(lead, field)}
      </span>
    );
  }

  return (
    <div className="rc-row" id={`admin-lead-field-${field.key}`} style={isNotes ? { alignItems: 'flex-start', flexDirection: 'column', gap: 4 } : undefined}>
      <span className="rc-label" style={{ minWidth: isNotes ? undefined : 150 }}>{field.label}</span>
      {valueNode}
    </div>
  );
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
    return (
      <div id="admin-leads-empty-state" className="card card-pad" style={{ textAlign: 'center' }}>
        <p className="form-note" style={{ margin: 0 }}>No leads match the current filters.</p>
      </div>
    );
  }

  return (
    <div id="admin-leads-card-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {leads.map((lead) => {
        const rowKey = lead.id ?? `${lead.email}-${lead.submittedAt}`;
        const isOpen = expandedId === rowKey;
        const visibleDetailFields = DETAIL_FIELDS.filter((f) => !f.legacy || lead[f.key] !== undefined);

        return (
          <div
            key={rowKey}
            id={`admin-lead-card-${rowKey}`}
            className="card card-pad card-hover"
            style={{ cursor: 'pointer' }}
            onClick={() => onToggleExpand(rowKey)}
          >
            <div
              id={`admin-lead-card-header-${rowKey}`}
              style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}
            >
              <div>
                <div className="rc-title">{lead.ownerName || '—'}</div>
                <div className="rc-subtitle">{fmtDate(lead.submittedAt)}</div>
              </div>
              <span className="badge badge-sage">{lead.source || '—'}</span>
            </div>

            <div className="divider" style={{ margin: '0 0 12px' }} />

            <div id={`admin-lead-card-face-${rowKey}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FACE_FIELDS.map((f) => (
                <FieldRow key={f.key} lead={lead} field={f} />
              ))}
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              id={`admin-lead-card-toggle-${rowKey}`}
              style={{ marginTop: 12, padding: '10px 0' }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(rowKey);
              }}
            >
              {isOpen ? 'Hide details' : 'More details'}
            </button>

            {isOpen ? (
              <div
                id={`admin-lead-card-detail-${rowKey}`}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                {visibleDetailFields.map((f) => (
                  <FieldRow key={f.key} lead={lead} field={f} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
