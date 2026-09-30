'use client';

import { useState } from 'react';
import {
  BENCH_STAGE_LABELS,
  KNOCKOUT_LABELS,
  MULTI_DOG_OPTIONS,
  NOTICE_OPTIONS,
  NOTIFY_OPTIONS,
  PHYSICAL_OPTIONS,
  RESPONSE_SPEED_OPTIONS,
  SCHEDULE_OPTIONS,
  WEEKDAYS,
  WORK_TYPE_OPTIONS,
  YES_NO,
  YES_NO_EXPLAIN,
  YES_SOMETIMES_NO,
  optionLabel,
  type BenchAction,
  type BenchSettings,
} from '@/lib/bench/contract';
import { ACTION_RULES, availableActions } from '@/lib/bench/stages';
import type { AdminBenchPerson } from '@/lib/server/bench';
import type { GetIdToken } from '@/components/admin/adminFetch';

export type BenchRow = AdminBenchPerson & { gapSlots: number };

const TZ = 'America/New_York';

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtPhone(e164: string): string {
  const d = e164.replace(/^\+1/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}

const SOURCE_LABELS: Record<string, string> = {
  indeed: 'Indeed',
  website: 'Website',
  referral: 'Referral',
  other: 'Other',
};

/** Arithmetic on the applicant's own answers (plan §7.3), never a judgement. */
export function CoverageFitChip({ gapSlots }: { gapSlots: number }) {
  return gapSlots > 0 ? (
    <span className="badge badge-sage" title="Slots where the bench is below target depth that this person says they can cover">
      Fills {gapSlots} open slot{gapSlots === 1 ? '' : 's'}
    </span>
  ) : (
    <span className="badge badge-gold" title="Every slot this person listed is already at target depth">No open slots</span>
  );
}

function Field({ label, children, block = false }: { label: string; children: React.ReactNode; block?: boolean }) {
  return (
    <div className="rc-row bench-person-field" style={block ? { flexDirection: 'column', alignItems: 'flex-start', gap: 6 } : { gap: 16 }}>
      <span className="rc-label" style={{ minWidth: block ? undefined : 150 }}>{label}</span>
      <span className="rc-value" style={block ? { whiteSpace: 'pre-wrap', fontWeight: 400 } : undefined}>{children}</span>
    </div>
  );
}

/** Read-only week grid of the person's availability, Mon-first. */
function AvailabilityGrid({ person, settings }: { person: BenchRow; settings: BenchSettings }) {
  const has = new Set(person.availability.map((s) => `${s.weekday}:${s.block}`));
  const days = [1, 2, 3, 4, 5, 6, 0].map((v) => WEEKDAYS.find((d) => d.value === v)!);
  return (
    <div className="bench-availability-grid" style={{ gridTemplateColumns: `40px repeat(${settings.timeBlocks.length}, minmax(0, 1fr))` }}>
      <span />
      {settings.timeBlocks.map((b) => (
        <span key={b.key} className="rc-label bench-availability-head">{b.label}</span>
      ))}
      {days.map((d) => (
        <div key={d.value} style={{ display: 'contents' }}>
          <span className="rc-label">{d.short}</span>
          {settings.timeBlocks.map((b) => {
            const on = has.has(`${d.value}:${b.key}`);
            return (
              <span key={b.key} className={`bench-availability-cell${on ? ' is-on' : ''}`} aria-label={`${d.label} ${b.label}: ${on ? 'available' : 'not available'}`}>
                {on ? '✓' : ''}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function PersonCard({
  person,
  settings,
  expanded,
  onToggle,
  getToken,
  onUpdated,
}: {
  person: BenchRow;
  settings: BenchSettings;
  expanded: boolean;
  onToggle: () => void;
  getToken: GetIdToken;
  onUpdated: (next: BenchRow) => void;
}) {
  const [busy, setBusy] = useState<BenchAction | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState(person.notes ?? '');
  const [rating, setRating] = useState('');
  const actions = availableActions(person.stage, person.onHold);
  const domId = `admin-bench-person-${person.id}`;

  async function run(action: BenchAction) {
    setBusy(action);
    setError('');
    setNotice('');
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/bench/people/${person.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action,
          ...(action === 'save_notes' ? { notes } : {}),
          ...(action === 'mark_shadow_done' && rating ? { rating: Number(rating) } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { person?: AdminBenchPerson; error?: string; notifications?: Record<string, string> };
      if (!res.ok || !data.person) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }
      onUpdated({ ...data.person, gapSlots: person.gapSlots });
      const outcomes = Object.values(data.notifications ?? {});
      if (outcomes.includes('failed')) setNotice('Saved, but the email to them did not send.');
      else if (outcomes.includes('skipped')) setNotice('Saved. Email is not configured here, so nothing was sent.');
      else if (outcomes.includes('sent')) setNotice('Saved and emailed.');
      else setNotice('Saved.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function openResume() {
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/bench/people/${person.id}/resume`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        setError('Could not open the resume.');
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError('Could not open the resume.');
    }
  }

  const a = person.answers;
  const withNote = (label: string, note: string) => (note ? `${label}: ${note}` : label);

  return (
    <article id={domId} className="card bench-person-card" data-section="bench-person-card">
      <button type="button" className="bench-person-card-header" onClick={onToggle} aria-expanded={expanded} aria-controls={`${domId}-detail`}>
        <span className="bench-person-card-title">
          <strong>{person.fullName}</strong>
          <span className="rc-label">{SOURCE_LABELS[person.source] ?? person.source} · {fmtDate(person.createdAt)}</span>
        </span>
        <span className="bench-person-card-badges">
          <span className="badge">{BENCH_STAGE_LABELS[person.stage]}</span>
          {person.onHold ? <span className="badge badge-gold">On hold</span> : null}
          {person.knockoutReason ? <span className="badge badge-terra">{KNOCKOUT_LABELS[person.knockoutReason]}</span> : null}
          {person.stage !== 'rejected' ? <CoverageFitChip gapSlots={person.gapSlots} /> : null}
          {person.tier ? <span className="badge">Tier {person.tier}</span> : null}
        </span>
      </button>

      {expanded ? (
        <div id={`${domId}-detail`} className="bench-person-card-detail">
          <div className="bench-person-card-columns">
            <section id={`${domId}-contact`} aria-label="Contact and travel">
              <Field label="Email"><a href={`mailto:${person.email}`}>{person.email}</a></Field>
              <Field label="Phone"><a href={`tel:${person.phoneE164}`}>{fmtPhone(person.phoneE164)}</a></Field>
              <Field label="Notify by">{optionLabel(NOTIFY_OPTIONS, a.notifyBy)}</Field>
              <Field label="Texts OK">{person.smsOptedOut ? 'Opted out' : person.smsConsentAt ? `Yes, since ${fmtDate(person.smsConsentAt)}` : 'No'}</Field>
              <Field label="Lives in">{a.homeNeighborhood || '—'}</Field>
              <Field label="Can reach Williamsburg">{withNote(optionLabel(YES_NO_EXPLAIN, a.travelToWilliamsburg), a.travelExplain)}</Field>
              <Field label="Travel time">{a.travelTime || '—'}</Field>
              {person.utm && Object.keys(person.utm).length ? (
                <Field label="Campaign">{Object.entries(person.utm).map(([k, v]) => `${k}: ${v}`).join(' · ')}</Field>
              ) : null}
            </section>
            <section id={`${domId}-on-call`} aria-label="On-call fit">
              <Field label="Work interested in">{a.workTypes.map((t) => optionLabel(WORK_TYPE_OPTIONS, t)).join(', ') || '—'}</Field>
              {a.weeklyHoursWanted ? <Field label="Regular hours wanted">{a.weeklyHoursWanted}</Field> : null}
              {a.scheduleType ? <Field label="Regular schedule">{optionLabel(SCHEDULE_OPTIONS, a.scheduleType)}</Field> : null}
              {a.regularStartDate ? <Field label="Can start regular work">{a.regularStartDate}</Field> : null}
              <Field label="Covers within 24 hrs">{optionLabel(YES_SOMETIMES_NO, a.cover24h)}</Field>
              <Field label="Notice needed">{optionLabel(NOTICE_OPTIONS, a.noticeNeeded)}</Field>
              <Field label="Same-day emergency">{optionLabel(YES_SOMETIMES_NO, a.sameDayEmergency)}</Field>
              <Field label="Responds">{a.responseSpeed === 'other' ? a.responseSpeedOther : optionLabel(RESPONSE_SPEED_OPTIONS, a.responseSpeed)}</Field>
              <Field label="Weekly capacity">{a.weeklyCapacity || '—'}</Field>
              <Field label="Can start training">{a.trainingStartDate || '—'}</Field>
              <Field label="Up to three dogs">{optionLabel(MULTI_DOG_OPTIONS, a.multiDogComfort)}</Field>
              <Field label="Physical duties">{optionLabel(PHYSICAL_OPTIONS, a.physicalDuties)}</Field>
              <Field label="Will complete training">{optionLabel(YES_NO, a.willingTraining)}</Field>
              <Field label="Phone & protocols">{withNote(optionLabel(YES_NO_EXPLAIN, a.phoneProtocol), a.phoneProtocolExplain)}</Field>
              {person.shadowRating ? <Field label="Shadow rating">{person.shadowRating} / 5</Field> : null}
            </section>
          </div>

          <div id={`${domId}-written-answers`} className="bench-written-answers">
            <Field label="Recurring commitments" block>{a.recurringCommitments || 'None listed'}</Field>
            <Field label="Experience with dogs" block>{a.experience || '—'}</Field>
            <Field label="Puppies, senior, large or reactive dogs" block>{a.specialDogExperience || '—'}</Field>
            <Field label="A dog refuses to leave home" block>{a.scenarioRefusesToLeave || '—'}</Field>
            <Field label="A harness is loose before leaving" block>{a.scenarioLooseHarness || '—'}</Field>
            <Field label="Accepted a shift but can't make it" block>{a.scenarioCantMakeShift || '—'}</Field>
            <Field label="Why this schedule fits them" block>{a.whyOnCall || '—'}</Field>
            {a.experienceSummary ? <Field label="Experience summary" block>{a.experienceSummary}</Field> : null}
            {a.anythingElse ? <Field label="Anything else" block>{a.anythingElse}</Field> : null}
            {a.questionsForUs ? <Field label="Their questions for us" block>{a.questionsForUs}</Field> : null}
          </div>

          <div id={`${domId}-availability`}>
            <span className="rc-label">Availability</span>
            <AvailabilityGrid person={person} settings={settings} />
          </div>

          {person.aiSummary ? (
            <div id={`${domId}-ai-summary`} className="bench-ai-summary">
              <span className="rc-label">AI summary: a reading aid only, not a recommendation</span>
              <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{person.aiSummary}</p>
            </div>
          ) : null}

          <div id={`${domId}-notes`} className="form-group">
            <label htmlFor={`${domId}-notes-input`} className="rc-label">Luis&apos;s notes (never sent to the applicant)</label>
            <textarea id={`${domId}-notes-input`} className="form-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {actions.includes('mark_shadow_done') ? (
            <div id={`${domId}-rating`} className="form-group" style={{ maxWidth: 220 }}>
              <label htmlFor={`${domId}-rating-input`} className="rc-label">Shadow walk rating (optional)</label>
              <select id={`${domId}-rating-input`} className="form-control form-select" value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="">No rating</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div id={`${domId}-actions`} className="admin-lead-actions bench-person-actions">
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                className={`btn btn-primary booking-forward-btn btn-sm ${action === 'reject' || action === 'mark_inactive' ? 'admin-btn-secondary' : 'btn-accent'}`}
                disabled={busy !== null}
                onClick={() => run(action)}
              >
                {busy === action ? 'Saving…' : ACTION_RULES[action].label}
              </button>
            ))}
            <button type="button" className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" disabled={busy !== null || notes === (person.notes ?? '')} onClick={() => run('save_notes')}>
              {busy === 'save_notes' ? 'Saving…' : 'Save notes'}
            </button>
            {person.resumePath ? (
              <button type="button" className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" onClick={openResume}>
                Open resume
              </button>
            ) : null}
          </div>
          {error ? <p className="form-note text-terra" role="alert">{error}</p> : null}
          {notice ? <p className="form-note" role="status">{notice}</p> : null}

          <details id={`${domId}-history`}>
            <summary className="rc-label">Stage history</summary>
            <ul className="bench-stage-history">
              {(person.stageHistory ?? []).map((h, i) => (
                <li key={`${h.stage}-${h.at}-${i}`}>
                  {BENCH_STAGE_LABELS[h.stage] ?? h.stage} · {fmtDate(h.at)} · {h.by}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </article>
  );
}
