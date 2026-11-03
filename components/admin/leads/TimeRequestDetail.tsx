'use client';

import {
  ALT_TIME_STATUSES,
  ALT_TIME_STATUS_LABELS,
  BUSINESS_TIME_ZONE,
  contactPreferenceLabel,
  describeWindowIn,
  isValidTimeZone,
  summarizeAvailability,
  type AltTimeDayId,
  type AltTimeStatus,
  type AltTimeWindowId,
} from '@/lib/booking/alternateTime';
import type { ReactNode } from 'react';
import type { RecordReview } from '@/lib/testing/leadReview';
import type { AdminLeadRecord } from './adminLeadRecord';

const TZ = BUSINESS_TIME_ZONE;

function fmt(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function requestStatusOf(lead: Pick<AdminLeadRecord, 'requestStatus'>): AltTimeStatus {
  return (ALT_TIME_STATUSES as readonly string[]).includes(lead.requestStatus ?? '') ? (lead.requestStatus as AltTimeStatus) : 'new';
}

/** The list badge for a request: what it is and where it stands. */
export function TimeRequestBadge({ lead }: { lead: AdminLeadRecord }) {
  return (
    <span className="badge badge-terra" title="Couldn't find a suitable time on Calendly. A request, not a booking.">
      Time request · {ALT_TIME_STATUS_LABELS[requestStatusOf(lead)]}
    </span>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rc-row" style={{ gap: 16, alignItems: 'flex-start' }}>
      <span className="rc-label" style={{ minWidth: 150 }}>{label}</span>
      <span className="rc-value" style={{ fontWeight: 400 }}>{children}</span>
    </div>
  );
}

function newYorkLines(lead: AdminLeadRecord): string[] {
  const tz = lead.timeZone && isValidTimeZone(lead.timeZone) ? lead.timeZone : null;
  if (!tz || tz === TZ) return [];
  const now = new Date();
  const lines: string[] = [];
  for (const d of lead.days ?? []) for (const w of lead.windows ?? []) {
    try {
      lines.push(describeWindowIn(d as AltTimeDayId, w as AltTimeWindowId, tz, TZ, now));
    } catch {
      // A value from an option list this build does not know: skip, never guess.
    }
  }
  return lines;
}

/** Card face for a request: the contact details and what they asked for. */
export function TimeRequestFace({ lead }: { lead: AdminLeadRecord }) {
  return (
    <>
      <Row label="Email">{lead.email ? <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()}>{lead.email}</a> : '—'}</Row>
      <Row label="Phone">{lead.phone ? <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()}>{lead.phone}</a> : '—'}</Row>
      <Row label="Reach them by">{contactPreferenceLabel(lead.contactPreference)}</Row>
      <Row label="Preferred">{summarizeAvailability(lead.days ?? [], lead.windows ?? []) || '—'}</Row>
    </>
  );
}

/** 'skipped' covers a test device, the @resend.dev sandbox sender, or email not configured. */
export function emailState(v?: string) {
  return v === 'sent' ? 'emailed' : v === 'failed' ? 'failed' : v === 'skipped' ? 'not sent' : 'pending';
}

function attributionText(a?: AdminLeadRecord['attribution']) {
  if (!a?.src) return 'not recorded';
  if (a.src === 'campaign') return `campaign ${a.camp ?? '—'}`;
  if (a.src === 'referral') return `referral ${a.ref ?? '—'}`;
  return 'direct';
}

/** Everything else about a request, plus its status control. */
export function TimeRequestDetail({
  lead,
  busy,
  onStatusChange,
}: {
  lead: AdminLeadRecord;
  busy: boolean;
  onStatusChange?: (status: AltTimeStatus) => void;
}) {
  const ny = newYorkLines(lead);
  const status = requestStatusOf(lead);
  return (
    <div id={`admin-time-request-detail-${lead.id}`} className="admin-time-request-detail">
      <div className="rc-row" style={{ gap: 16 }}>
        <label className="rc-label" style={{ minWidth: 150 }} htmlFor={`admin-request-status-${lead.id}`}>Status</label>
        <select
          id={`admin-request-status-${lead.id}`}
          className="form-control form-select admin-request-status-select"
          value={status}
          disabled={busy || !onStatusChange}
          onChange={(e) => onStatusChange?.(e.target.value as AltTimeStatus)}
        >
          {ALT_TIME_STATUSES.map((s) => <option key={s} value={s}>{ALT_TIME_STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      <TimeRequestFace lead={lead} />
      <Row label="Their time zone">{lead.timeZone?.replace(/_/g, ' ') || '—'}</Row>
      {ny.length ? <Row label="In New York time">{ny.slice(0, 10).join(' · ')}{ny.length > 10 ? ' …' : ''}</Row> : null}
      {lead.notes ? <Row label="Note"><span style={{ whiteSpace: 'pre-wrap' }}>{lead.notes}</span></Row> : null}
      <p className="form-note" style={{ margin: 0, textAlign: 'left' }}>
        Requested {fmt(lead.submittedAt)} from {lead.source || '—'}{lead.sourcePage ? ` on ${lead.sourcePage}` : ''} · source {attributionText(lead.attribution)} ·
        founder notice {emailState(lead.notification)} · their confirmation {emailState(lead.customerNotification)}
        {lead.statusUpdatedAt && status !== 'new' ? ` · status updated ${fmt(lead.statusUpdatedAt)}` : ''}
        . A request, not a booking: “Scheduled” is the only link to an appointment.
      </p>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  meetgreet: 'Questionnaire',
  capture: 'Booking email',
  'time-request': 'Time request',
};

/** The same person's other records (matched by email), each one click away. */
export function RelatedRecords({
  review,
  onOpen,
}: {
  review?: RecordReview;
  onOpen?: (id: string) => void;
}) {
  const related = review?.related ?? [];
  if (related.length === 0) return null;
  return (
    <div className="admin-related-records" onClick={(e) => e.stopPropagation()}>
      <span className="rc-label">Same person</span>
      <span className="admin-record-flags">
        {related.map((r) => (
          <button
            key={r.id}
            type="button"
            className="admin-related-record-btn"
            onClick={() => onOpen?.(r.id)}
            title="Show this record"
          >
            {KIND_LABEL[r.type] ?? r.type} · {fmt(r.submittedAt)}
          </button>
        ))}
      </span>
    </div>
  );
}
