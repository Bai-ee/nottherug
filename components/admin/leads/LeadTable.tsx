'use client';

import type { ReactNode } from 'react';
import { LEAD_DISPLAY_FIELDS, formatLeadFieldValue, type LeadDisplayField } from '@/lib/leads/contract';
import { telHref, mailtoHref, googleCalendarHref } from '@/lib/leads/contactLinks';
import { isOutstandingCapture, isLeadComplete, leadQualityLabel, type AdminLeadRecord } from './adminLeadRecord';

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

/**
 * What to do about this lead, as the operating system's own actions: mailto:
 * opens whatever mail client the machine uses, tel: opens the dialer on a
 * phone and FaceTime or Skype on a desktop, and Google Calendar's composer
 * opens prefilled with the client already invited.
 *
 * Calendly is linked only when NEXT_PUBLIC_CALENDLY_URL is configured — the
 * lead record itself carries no booking reference, so this is the scheduling
 * page, not this client's appointment.
 */
function LeadActions({ lead }: { lead: AdminLeadRecord }) {
  const mail = mailtoHref(lead);
  const tel = telHref(lead.phone);
  const calendar = googleCalendarHref(lead);
  const calendly = process.env.NEXT_PUBLIC_CALENDLY_URL || '';

  return (
    <div className="admin-lead-actions" onClick={(e) => e.stopPropagation()}>
      {mail ? (
        <a className="btn btn-primary booking-forward-btn btn-sm btn-accent" href={mail}>
          Email {lead.ownerName?.split(' ')[0] || 'client'}
        </a>
      ) : null}
      {tel ? (
        <a className="btn btn-primary booking-forward-btn btn-sm btn-accent" href={tel}>
          Call {lead.phone}
        </a>
      ) : null}
      <a
        className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary"
        href={calendar}
        target="_blank"
        rel="noopener noreferrer"
      >
        Add to Google Calendar
      </a>
      {calendly ? (
        <a
          className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary"
          href={calendly}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Calendly
        </a>
      ) : null}
    </div>
  );
}

function FieldRow({ lead, field }: { lead: AdminLeadRecord; field: LeadDisplayField }) {
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
    <div className="rc-row" id={`admin-lead-field-${field.key}`} style={isNotes ? { alignItems: 'flex-start', flexDirection: 'column', gap: 8 } : { gap: 16 }}>
      <span className="rc-label" style={{ minWidth: isNotes ? undefined : 150 }}>{field.label}</span>
      {valueNode}
    </div>
  );
}

/** The seriousness signal every row shows, in words: "Booked · 7 of 11
 *  answered" or plainly "3 of 11 answered" — never a 0-100 score.
 *  `bookedSelfReported` is the visitor's own browser reporting a Calendly
 *  completion, a hint and not proof, so the tooltip says so wherever the
 *  word "Booked" can appear. */
function LeadQualityBadge({ lead }: { lead: AdminLeadRecord }) {
  const complete = isLeadComplete(lead);
  return (
    <span
      className={`badge ${complete ? 'badge-sage' : 'badge-gold'}`}
      title={lead.bookedSelfReported ? "Self-reported by the visitor's browser — not a confirmed booking." : undefined}
    >
      {leadQualityLabel(lead)}
    </span>
  );
}

/** What a capture row's face shows instead of six blank questionnaire
 *  fields: the one thing it has (an email) and a plain statement of where
 *  the person is in the funnel, so it reads as "waiting on answers" rather
 *  than a broken lead. */
function CaptureFaceNote({ lead }: { lead: AdminLeadRecord }) {
  return (
    <>
      <div className="rc-row" style={{ gap: 16 }}>
        <span className="rc-label" style={{ minWidth: 150 }}>Email</span>
        <a href={`mailto:${lead.email}`} className="rc-value" onClick={(e) => e.stopPropagation()}>
          {lead.email}
        </a>
      </div>
      <p className="form-note" style={{ margin: 0 }}>
        Gave an email and went to book on Calendly — hasn&rsquo;t answered the questionnaire yet.
      </p>
    </>
  );
}

/** The line-item view's columns, in order. Narrow enough as a set that the
 *  grid fits a laptop without sideways scrolling; below that the list scrolls
 *  rather than dropping a column the owner might be looking for. */
const ROW_COLUMN_KEYS = ['ownerName', 'submittedAt', 'source', 'email', 'phone', 'neighborhood', 'dogName'] as const;

const ROW_COLUMNS: LeadDisplayField[] = ROW_COLUMN_KEYS.map(
  (key) => LEAD_DISPLAY_FIELDS.find((f) => f.key === key)!,
);

function LeadRows({
  leads,
  expandedId,
  onToggleExpand,
}: {
  leads: AdminLeadRecord[];
  expandedId: string | null;
  onToggleExpand: (rowKey: string) => void;
}) {
  return (
    <div id="admin-leads-row-scroll">
      <div id="admin-leads-row-list" role="table" aria-label="Leads">
        <div className="admin-lead-row admin-lead-row-head" role="row">
          {ROW_COLUMNS.map((f) => (
            <span key={f.key} className="rc-label admin-lead-cell" role="columnheader">
              {f.label}
            </span>
          ))}
          <span className="rc-label admin-lead-cell" role="columnheader">
            Completeness
          </span>
        </div>

        {leads.map((lead) => {
          const rowKey = lead.id ?? `${lead.email}-${lead.submittedAt}`;
          const isOpen = expandedId === rowKey;
          const visibleDetailFields = DETAIL_FIELDS.filter((f) => !f.legacy || lead[f.key] !== undefined);

          return (
            <div key={rowKey} id={`admin-lead-row-${rowKey}`}>
              <div
                className="admin-lead-row admin-lead-row-body"
                role="row"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => onToggleExpand(rowKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleExpand(rowKey);
                  }
                }}
              >
                {ROW_COLUMNS.map((f) => (
                  <span key={f.key} className="admin-lead-cell" role="cell" title={formatLeadFieldValue(lead, f)}>
                    {f.key === 'source' ? (
                      <span className="badge badge-sage">{lead.source || '—'}</span>
                    ) : f.key === 'submittedAt' ? (
                      fmtDate(lead.submittedAt)
                    ) : f.key === 'ownerName' && isOutstandingCapture(lead) ? (
                      <span className="badge badge-gold">Waiting on answers</span>
                    ) : (
                      formatLeadFieldValue(lead, f)
                    )}
                  </span>
                ))}
                <span className="admin-lead-cell" role="cell">
                  <LeadQualityBadge lead={lead} />
                </span>
              </div>

              {isOpen ? (
                <div
                  id={`admin-lead-row-detail-${rowKey}`}
                  className="admin-lead-row-detail"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LeadActions lead={lead} />
                  {isOutstandingCapture(lead) ? (
                    <p className="form-note" style={{ margin: 0 }}>
                      No questionnaire answers yet — this row is only the email capture from Calendly checkout.
                    </p>
                  ) : (
                    visibleDetailFields.map((f) => <FieldRow key={f.key} lead={lead} field={f} />)
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeadTable({
  leads,
  expandedId,
  onToggleExpand,
  view = 'cards',
}: {
  leads: AdminLeadRecord[];
  expandedId: string | null;
  onToggleExpand: (rowKey: string) => void;
  /** 'rows' is the compact line-item view; 'cards' is one paper card each. */
  view?: 'cards' | 'rows';
}) {
  if (leads.length === 0) {
    return (
      <div id="admin-leads-empty-state" className="card card-pad" style={{ textAlign: 'center' }}>
        <p className="form-note" style={{ margin: 0 }}>No leads match the current filters.</p>
      </div>
    );
  }

  if (view === 'rows') {
    return <LeadRows leads={leads} expandedId={expandedId} onToggleExpand={onToggleExpand} />;
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
              className="admin-lead-card-header-row"
            >
              <div>
                <div className="rc-title">
                  {isOutstandingCapture(lead) ? 'Waiting on answers' : lead.ownerName || '—'}
                </div>
                <div className="rc-subtitle">
                  {isOutstandingCapture(lead) ? `${lead.email} · ${fmtDate(lead.submittedAt)}` : fmtDate(lead.submittedAt)}
                </div>
              </div>
              <span className="badge badge-sage">{lead.source || '—'}</span>
            </div>

            <div className="divider" style={{ margin: '0 0 12px' }} />

            <div id={`admin-lead-card-face-${rowKey}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="rc-row" style={{ gap: 16 }}>
                <span className="rc-label" style={{ minWidth: 150 }}>
                  Completeness
                </span>
                <span className="rc-value">
                  <LeadQualityBadge lead={lead} />
                </span>
              </div>
              {isOutstandingCapture(lead) ? (
                <CaptureFaceNote lead={lead} />
              ) : (
                FACE_FIELDS.map((f) => <FieldRow key={f.key} lead={lead} field={f} />)
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary"
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
                <LeadActions lead={lead} />
                {isOutstandingCapture(lead) ? (
                  <p className="form-note" style={{ margin: 0 }}>
                    No questionnaire answers yet — this card is only the email capture from Calendly checkout.
                  </p>
                ) : (
                  visibleDetailFields.map((f) => <FieldRow key={f.key} lead={lead} field={f} />)
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
