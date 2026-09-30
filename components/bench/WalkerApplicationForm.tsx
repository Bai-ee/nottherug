'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AI_NOTICE_TEXT,
  BENCH_FIELD_LIMITS,
  CONFIRMATION_TEXT,
  HONEYPOT_FIELD_NAME,
  MULTI_DOG_OPTIONS,
  NOTICE_OPTIONS,
  NOTIFY_OPTIONS,
  PHYSICAL_OPTIONS,
  RESPONSE_SPEED_OPTIONS,
  RESUME_MAX_BYTES,
  SCHEDULE_OPTIONS,
  SMS_CONSENT_TEXT,
  SUCCESS_MESSAGE,
  WEEKDAYS,
  WORK_TYPE_OPTIONS,
  YES_NO,
  YES_NO_EXPLAIN,
  YES_SOMETIMES_NO,
  type ApplicantUtm,
  type TimeBlock,
} from '@/lib/bench/contract';
import ContactUsTrigger from '@/components/marketing/ContactUsTrigger';
import { APPLICATION_STEP_FIELDS, parseApplication, type FieldError } from '@/lib/bench/validation';

/**
 * Public on-call walker application (plans/011 §7.1), carrying the owner's
 * on-call questionnaire. Built on the same stepped pattern and class
 * vocabulary as components/booking/BookingForm.tsx so it reads as the same
 * site, without sharing (or touching) the booking form.
 */

const STEPS = [
  { key: 'role', label: 'You & the role', title: 'About you and the role' },
  { key: 'availability', label: 'On-call availability', title: 'When can you cover?' },
  { key: 'experience', label: 'Dog experience', title: 'Your experience with dogs' },
  { key: 'handling', label: 'On the job', title: 'How you’d handle it' },
  { key: 'wrap', label: 'Wrap up', title: 'Last step' },
] as const;

/** Mon-first, the way a work week is read. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0].map((v) => WEEKDAYS.find((d) => d.value === v)!);

type Option = { readonly value: string; readonly label: string };

const TEXT_FIELDS = [
  'fullName', 'email', 'phone', 'homeNeighborhood', 'travelToWilliamsburg', 'travelExplain',
  'weeklyHoursWanted', 'scheduleType', 'regularStartDate',
  'cover24h', 'noticeNeeded', 'sameDayEmergency', 'responseSpeed', 'responseSpeedOther', 'notifyBy',
  'travelTime', 'weeklyCapacity', 'recurringCommitments', 'trainingStartDate',
  'experience', 'specialDogExperience', 'multiDogComfort', 'physicalDuties',
  'willingTraining', 'phoneProtocol', 'phoneProtocolExplain',
  'scenarioRefusesToLeave', 'scenarioLooseHarness', 'scenarioCantMakeShift',
  'whyOnCall', 'experienceSummary', 'anythingElse', 'questionsForUs',
] as const;

type TextField = (typeof TEXT_FIELDS)[number];
type Values = Record<TextField, string>;

const EMPTY = Object.fromEntries(TEXT_FIELDS.map((f) => [f, ''])) as Values;

/**
 * Partial answers are kept in localStorage so a refresh or a closed tab does
 * not wipe the form. The resume file, the SMS opt-in and the confirmation
 * checkbox are deliberately not saved: a file cannot be stored, and consent
 * should be given fresh in the session that submits.
 */
const draftKey = (paneId: string) => `walker-application-draft:${paneId}`;

function readDraft(paneId: string): { values: Values; availability: string[]; workTypes: string[] } | null {
  try {
    const raw = window.localStorage.getItem(draftKey(paneId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as { values?: Record<string, unknown>; availability?: unknown; workTypes?: unknown };
    const restored = { ...EMPTY };
    for (const f of TEXT_FIELDS) {
      const v = saved.values?.[f];
      if (typeof v === 'string') restored[f] = v;
    }
    const slots = Array.isArray(saved.availability)
      ? saved.availability.filter((k): k is string => typeof k === 'string')
      : [];
    const allowedTypes = WORK_TYPE_OPTIONS.map((o) => o.value) as readonly string[];
    const types = Array.isArray(saved.workTypes)
      ? saved.workTypes.filter((k): k is string => typeof k === 'string' && allowedTypes.includes(k))
      : [];
    return { values: restored, availability: slots, workTypes: types };
  } catch {
    return null;
  }
}

function slotKey(weekday: number, block: string) {
  return `${weekday}:${block}`;
}

function resumeProblem(file: File | null): string | null {
  if (!file) return null;
  if (!/\.(pdf|docx)$/i.test(file.name)) return 'Resume must be a PDF or Word (.docx) file.';
  if (file.size > RESUME_MAX_BYTES) return 'Resume must be 4MB or smaller.';
  return null;
}

const chipStyle = (on: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  color: 'var(--charcoal)',
  fontWeight: 400,
  padding: '8px 12px',
  minHeight: '44px',
  border: `1px solid ${on ? 'var(--sage-dark)' : 'var(--light-gray)'}`,
  borderRadius: 'var(--radius)',
  background: on ? 'var(--sage-light, #edf3db)' : 'white',
  transition: 'background-color 0.15s, border-color 0.15s',
});

export default function WalkerApplicationForm({
  paneId,
  timeBlocks,
  source,
  utm,
  layout = 'steps',
}: {
  paneId: string;
  timeBlocks: TimeBlock[];
  /** Allowlisted `?src=` value, if any; the server re-checks it. */
  source?: string;
  utm: ApplicantUtm;
  layout?: 'steps' | 'full';
}) {
  const fullLayout = layout === 'full';
  const [values, setValues] = useState<Values>(EMPTY);
  const [availability, setAvailability] = useState<string[]>([]);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [smsConsent, setSmsConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [resumeNote, setResumeNote] = useState('');
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [trackH, setTrackH] = useState<number | undefined>(undefined);
  const lastStep = fullLayout || step === STEPS.length - 1;
  const alertId = `${paneId}-step-alert`;
  // Saving waits until the stored draft has been read, or the empty first
  // render would overwrite it.
  const [draftLoaded, setDraftLoaded] = useState(false);

  // One-time restore from localStorage after mount. It cannot seed useState
  // directly: the server render has no storage, so that would mismatch on hydration.
  useEffect(() => {
    const draft = readDraft(paneId);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (draft) {
      setValues(draft.values);
      setAvailability(draft.availability);
      setWorkTypes(draft.workTypes);
    }
    setDraftLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [paneId]);

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (status === 'done') window.localStorage.removeItem(draftKey(paneId));
      else window.localStorage.setItem(draftKey(paneId), JSON.stringify({ values, availability, workTypes }));
    } catch {
      // Storage blocked (private mode, quota): the form still works, it just will not survive a refresh.
    }
  }, [draftLoaded, paneId, values, availability, workTypes, status]);

  useEffect(() => {
    if (fullLayout) return;
    const panel = panelRefs.current[step];
    if (!panel) return;
    const measure = () => setTrackH(panel.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [step, fullLayout]);

  const set = (field: TextField, value: string) => setValues((prev) => ({ ...prev, [field]: value }));
  const toggleSlot = (key: string) =>
    setAvailability((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleWorkType = (value: string) =>
    setWorkTypes((prev) => (prev.includes(value) ? prev.filter((k) => k !== value) : [...prev, value]));
  const wantsRegular = workTypes.includes('part_time') || workTypes.includes('full_time');

  function payload(hasResume: boolean, honeypotValue: string) {
    return {
      ...values,
      workTypes,
      availability: availability.map((key) => {
        const [weekday, block] = key.split(':');
        return { weekday: Number(weekday), block };
      }),
      smsConsent: smsConsent && values.notifyBy === 'text',
      confirmed,
      source,
      utm,
      hasResume,
      [HONEYPOT_FIELD_NAME]: honeypotValue,
    };
  }

  const errorFor = (field: string) => errors.find((e) => e.field === field)?.message;
  const aria = (field: string) =>
    errorFor(field) ? { 'aria-invalid': true, 'aria-describedby': alertId } : { 'aria-invalid': false };

  /** Runs the shared server validation, keeping only the fields on the given steps. */
  function validate(stepIndexes: number[]): FieldError[] {
    const fields = new Set(stepIndexes.flatMap((i) => APPLICATION_STEP_FIELDS[i]));
    const result = parseApplication(payload(false, ''), { timeBlocks });
    const found = result.ok ? [] : result.errors.filter((e) => fields.has(e.field));
    if (fields.has('experienceSummary')) {
      const problem = resumeProblem(resume);
      if (problem) found.push({ field: 'resume', message: problem });
    }
    return found;
  }

  function focusFirst(found: FieldError[]) {
    const first = found[0];
    if (first) document.getElementById(`${paneId}-field-${first.field}`)?.focus();
  }

  async function submit() {
    setStatus('submitting');
    setServerError('');
    try {
      const res = await fetch('/api/bench/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(Boolean(resume), honeypot)),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; id?: string; resumeToken?: string };
      if (!res.ok || !data.ok) {
        setStatus('error');
        setServerError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      if (resume && data.id && data.resumeToken) {
        const form = new FormData();
        form.append('personId', data.id);
        form.append('token', data.resumeToken);
        form.append('file', resume);
        const upload = await fetch('/api/bench/apply/resume', { method: 'POST', body: form }).catch(() => null);
        if (!upload?.ok) {
          setResumeNote('Your application is in, but your resume did not upload. You can reply to our confirmation email with it attached.');
        }
      }
      setStatus('done');
    } catch {
      setStatus('error');
      setServerError('Network error. Please try again.');
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    const found = validate(fullLayout ? STEPS.map((_, i) => i) : [step]);
    setErrors(found);
    if (found.length) {
      focusFirst(found);
      return;
    }
    if (!lastStep) setStep((s) => s + 1);
    else void submit();
  }

  function goToStep(target: number) {
    if (target <= step) {
      setErrors([]);
      setStep(target);
      return;
    }
    // Forward jumps pass through validation of every step in between.
    for (let i = step; i < target; i++) {
      const found = validate([i]);
      if (found.length) {
        setStep(i);
        setErrors(found);
        return;
      }
    }
    setErrors([]);
    setStep(target);
  }

  const groupProps = (index: number) => ({
    inert: fullLayout ? undefined : step !== index,
    'aria-hidden': fullLayout ? undefined : step !== index,
    style: fullLayout ? { minWidth: 0, padding: '4px' } : { flex: '0 0 100%', minWidth: 0, padding: '4px' },
  });

  const header = (index: number) =>
    fullLayout ? (
      <div id={`${paneId}-group-${STEPS[index].key}-header`} data-section="walker-application-group-header">
        <span className="stamp-label walker-application-group-stamp">
          {`${String(index + 1).padStart(2, '0')} · ${STEPS[index].label}`}
        </span>
        <h3>{STEPS[index].title}</h3>
      </div>
    ) : null;

  // Plain render helpers, called as functions rather than mounted as
  // components: a component declared inside this render would remount on every
  // keystroke and drop focus from the field being typed in.

  /** One labelled question: a short input, a date, or a paragraph. */
  function question(
    field: TextField,
    label: string,
    { kind = 'text', hint, placeholder, autoComplete, optional = false }: {
      kind?: 'text' | 'email' | 'tel' | 'date' | 'paragraph';
      hint?: string;
      placeholder?: string;
      autoComplete?: string;
      optional?: boolean;
    } = {},
  ) {
    const id = `${paneId}-field-${field}`;
    const max = kind === 'paragraph' ? BENCH_FIELD_LIMITS.paragraph : BENCH_FIELD_LIMITS.shortText;
    return (
      <div className="form-group" data-question={field}>
        <label htmlFor={id}>
          {label}
          {optional ? <span className="walker-optional"> (optional)</span> : null}
        </label>
        {hint ? <p className="walker-hint">{hint}</p> : null}
        {kind === 'paragraph' ? (
          <textarea id={id} className="form-control" rows={3} maxLength={max} placeholder={placeholder} value={values[field]} onChange={(e) => set(field, e.target.value)} {...aria(field)} />
        ) : (
          <input id={id} type={kind} className="form-control" maxLength={max} placeholder={placeholder} autoComplete={autoComplete} value={values[field]} onChange={(e) => set(field, e.target.value)} {...aria(field)} />
        )}
      </div>
    );
  }

  /** A single-choice question as tappable chips over native radios. */
  function choice(field: TextField, label: string, options: readonly Option[], followUp?: ReactNode) {
    const labelId = `${paneId}-${field}-label`;
    return (
      <div className="form-group" data-question={field}>
        <span id={labelId} className="booking-field-caption walker-question-caption">{label}</span>
        <div
          id={`${paneId}-field-${field}`}
          role="radiogroup"
          aria-labelledby={labelId}
          tabIndex={-1}
          className="walker-choice-row"
          {...(errorFor(field) ? { 'aria-describedby': alertId } : {})}
        >
          {options.map((o) => {
            const id = `${paneId}-${field}-${o.value}`;
            const on = values[field] === o.value;
            return (
              <label key={o.value} htmlFor={id} style={chipStyle(on)}>
                <input id={id} type="radio" name={`${paneId}-${field}`} value={o.value} checked={on} onChange={() => set(field, o.value)} style={{ accentColor: 'var(--sage-dark)', width: '15px', height: '15px', flexShrink: 0 }} />
                {o.label}
              </label>
            );
          })}
        </div>
        {followUp ? <div className="walker-follow-up">{followUp}</div> : null}
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div id={`${paneId}-done-panel`} role="status">
        <span className="stamp-label">Application received</span>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '12px 0 8px' }}>You&apos;re on our list.</h3>
        <p style={{ color: 'var(--mid-gray)', margin: 0 }}>{SUCCESS_MESSAGE}</p>
        {resumeNote ? <p className="form-note form-alert">{resumeNote}</p> : null}
      </div>
    );
  }

  const stepAlert = errors[0]?.message ?? '';

  return (
    <div id={paneId} data-section="walker-application">
      <style>{`
        [data-section="walker-application-group-header"] { margin: 0 0 18px; }
        .walker-application-group-stamp {
          display: inline-block;
          margin-bottom: 10px;
          background: var(--olive);
          color: var(--paper);
          border-color: var(--olive);
          box-shadow: 2px 2px 0 rgba(36, 35, 33, 0.18);
        }
        [data-section="walker-application-group-header"] h3 {
          font-family: var(--font-display);
          font-size: clamp(22px, 2.5vw, 31px);
          line-height: 1.1;
          margin: 0;
        }
        [data-section="walker-application-track"][data-layout="full"] > div + div {
          margin-top: clamp(28px, 3.4vw, 44px);
          border-top: 1px solid var(--zine-rule, rgba(36, 35, 33, 0.22));
        }
        #${paneId} .form-group { margin-bottom: 22px; }
        #${paneId} .walker-question-caption { display: block; font-weight: 500; }
        #${paneId} .walker-hint { font-size: 12px; color: var(--mid-gray); margin: 2px 0 8px; }
        #${paneId} .walker-optional { text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--mid-gray); }
        #${paneId} .walker-choice-row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
          margin-top: 8px;
        }
        #${paneId} .walker-follow-up { margin-top: 10px; }
        /* The consent line is a sentence, not a stamped caption: undo the
           uppercase label treatment globals.css gives every .form-group label. */
        #${paneId} #${paneId}-sms-consent-row {
          text-transform: none;
          letter-spacing: normal;
          font-family: var(--font-body);
          line-height: 1.45;
        }
        #${paneId}-availability-grid {
          display: grid;
          grid-template-columns: 44px repeat(${timeBlocks.length}, minmax(0, 1fr));
          gap: 6px;
          align-items: center;
          max-width: 560px;
          margin-top: 8px;
        }
        #${paneId}-availability-grid .walker-availability-head {
          font-family: var(--font-type);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mid-gray);
          text-align: center;
          line-height: 1.2;
        }
        #${paneId}-availability-grid .walker-availability-day { font-size: 13px; font-weight: 600; color: var(--charcoal); }
        #${paneId}-availability-grid button[aria-pressed] { width: 100%; padding: 6px; font-size: 13px; }
        #${paneId}-confirm-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          padding: 16px;
          border: 1px solid var(--light-gray);
          border-radius: var(--radius);
          background: white;
          margin-bottom: 16px;
        }
        #${paneId}-confirm-row.is-on { border-color: var(--sage-dark); background: var(--sage-light, #edf3db); }
        @media (prefers-reduced-motion: reduce) {
          [data-section="walker-application-track"], [data-section="walker-application-row"] { transition: none !important; }
        }
      `}</style>

      <form id={`${paneId}-form`} onSubmit={handleSubmit} noValidate>
        <div id={`${paneId}-honeypot-field`} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
          <label htmlFor={`${paneId}-website`}>Website</label>
          <input id={`${paneId}-website`} name={HONEYPOT_FIELD_NAME} type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        <div id={`${paneId}-progress-row`} style={{ marginBottom: '24px' }}>
          {!fullLayout && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--font-type)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-gray)' }}>
                Step {step + 1} of {STEPS.length} · {STEPS[step].label}
              </span>
              <div style={{ display: 'flex', gap: '6px' }} aria-label="Form steps">
                {STEPS.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    aria-label={`Go to step ${i + 1}: ${s.label}`}
                    aria-current={i === step ? 'step' : undefined}
                    onClick={() => goToStep(i)}
                    style={{ width: i === step ? '22px' : '8px', height: '8px', borderRadius: '99px', border: 'none', padding: 0, cursor: 'pointer', background: i === step ? 'var(--sage-dark)' : i < step ? 'var(--sage-light, #edf3db)' : 'var(--light-gray)', transition: 'all 0.3s' }}
                  />
                ))}
              </div>
            </div>
          )}
          {!fullLayout && (
            <h3 key={STEPS[step].key} style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
              {STEPS[step].title}
            </h3>
          )}
          {(fullLayout || step === 0) && (
            <p style={{ color: 'var(--mid-gray)', fontSize: '14px', margin: '6px 0 0' }}>
              {fullLayout
                ? 'Answer in your own words; there are no trick questions. Your answers are saved on this device as you go.'
                : 'Five short steps. Answer in your own words; there are no trick questions.'}
            </p>
          )}
        </div>

        <div
          id={`${paneId}-carousel-row`}
          data-section="walker-application-row"
          style={fullLayout ? { margin: '0 -4px' } : { overflow: 'hidden', margin: '0 -4px', height: trackH, transition: 'height 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          <div
            id={`${paneId}-carousel-track`}
            data-section="walker-application-track"
            data-layout={layout}
            style={fullLayout ? { display: 'flex', flexDirection: 'column' } : { display: 'flex', alignItems: 'flex-start', transform: `translateX(-${step * 100}%)`, transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            {/* Step 1 — about you and the role */}
            <div id={`${paneId}-step-role`} ref={(el) => { panelRefs.current[0] = el; }} {...groupProps(0)}>
              {header(0)}
              {question('fullName', 'Full name', { autoComplete: 'name' })}
              <div className="form-row">
                {question('email', 'Email address', { kind: 'email', placeholder: 'you@email.com', autoComplete: 'email' })}
                {question('phone', 'Phone number', { kind: 'tel', placeholder: '(347) 000-0000', autoComplete: 'tel' })}
              </div>
              {question('homeNeighborhood', 'What neighborhood do you live in?')}
              {choice(
                'travelToWilliamsburg',
                'Can you reliably travel to Williamsburg, Brooklyn?',
                YES_NO_EXPLAIN,
                values.travelToWilliamsburg === 'explain' ? question('travelExplain', 'Tell us more', { kind: 'paragraph' }) : null,
              )}
            </div>

            {/* Step 2 — on-call availability */}
            <div id={`${paneId}-step-availability`} ref={(el) => { panelRefs.current[1] = el; }} {...groupProps(1)}>
              {header(1)}
              <div className="form-group" data-question="workTypes">
                <span id={`${paneId}-workTypes-label`} className="booking-field-caption walker-question-caption">
                  What kind of work are you interested in?
                </span>
                <p className="walker-hint">Choose all that apply. On-call substitute work is where we need people most.</p>
                <div
                  id={`${paneId}-field-workTypes`}
                  role="group"
                  aria-labelledby={`${paneId}-workTypes-label`}
                  tabIndex={-1}
                  className="walker-choice-row"
                  {...(errorFor('workTypes') ? { 'aria-describedby': alertId } : {})}
                >
                  {WORK_TYPE_OPTIONS.map((o) => {
                    const on = workTypes.includes(o.value);
                    const id = `${paneId}-workType-${o.value}`;
                    return (
                      <label key={o.value} htmlFor={id} style={chipStyle(on)}>
                        <input id={id} type="checkbox" checked={on} onChange={() => toggleWorkType(o.value)} style={{ accentColor: 'var(--sage-dark)', width: '15px', height: '15px', flexShrink: 0 }} />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                {wantsRegular ? (
                  <div id={`${paneId}-regular-schedule-panel`} className="walker-follow-up">
                    {question('weeklyHoursWanted', 'How many hours per week would you like for part-time or full-time work?', { placeholder: 'e.g. 20 hours' })}
                    {choice('scheduleType', 'Which schedule do you prefer for regular shifts?', SCHEDULE_OPTIONS)}
                    {question('regularStartDate', 'When could you start a regular schedule?', { kind: 'date' })}
                  </div>
                ) : null}
              </div>

              {choice('cover24h', 'Can you be available to cover walks within 24 hours of notification during your stated availability?', YES_SOMETIMES_NO)}

              <div className="form-group" data-question="availability">
                <span id={`${paneId}-availability-label`} className="booking-field-caption walker-question-caption">
                  Which days and hours can you typically accept backup shifts?
                </span>
                <p className="walker-hint">Tap every time you could usually cover.</p>
                <div id={`${paneId}-availability-grid`} role="group" aria-labelledby={`${paneId}-availability-label`}>
                  <span aria-hidden="true" />
                  {timeBlocks.map((b) => (
                    <span key={b.key} className="walker-availability-head">
                      {b.label}
                      <br />
                      <span style={{ fontWeight: 400, letterSpacing: 0 }}>{`${Number(b.start.slice(0, 2)) % 12 || 12}–${Number(b.end.slice(0, 2)) % 12 || 12}`}</span>
                    </span>
                  ))}
                  {WEEK_ORDER.map((day) => (
                    <div key={day.value} style={{ display: 'contents' }}>
                      <span className="walker-availability-day">{day.short}</span>
                      {timeBlocks.map((b) => {
                        const key = slotKey(day.value, b.key);
                        const on = availability.includes(key);
                        return (
                          <button
                            key={key}
                            id={day.value === 1 && b.key === timeBlocks[0].key ? `${paneId}-field-availability` : undefined}
                            type="button"
                            aria-pressed={on}
                            aria-label={`${day.label} ${b.label}`}
                            onClick={() => toggleSlot(key)}
                            style={chipStyle(on)}
                          >
                            {on ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {choice('noticeNeeded', 'How much notice do you usually need?', NOTICE_OPTIONS)}
              {choice('sameDayEmergency', 'Can you occasionally cover a same-day emergency?', YES_SOMETIMES_NO)}
              {choice(
                'responseSpeed',
                'How quickly can you usually respond to a coverage request during your available hours?',
                RESPONSE_SPEED_OPTIONS,
                values.responseSpeed === 'other' ? question('responseSpeedOther', 'How quickly?') : null,
              )}
              {choice(
                'notifyBy',
                'What is the best way to notify you about available shifts?',
                NOTIFY_OPTIONS,
                values.notifyBy === 'text' ? (
                  <label id={`${paneId}-sms-consent-row`} htmlFor={`${paneId}-field-smsConsent`} style={{ ...chipStyle(smsConsent), justifyContent: 'flex-start', alignItems: 'flex-start', padding: '14px' }}>
                    <input id={`${paneId}-field-smsConsent`} type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} style={{ accentColor: 'var(--sage-dark)', width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--mid-gray)' }}>{SMS_CONSENT_TEXT}</span>
                  </label>
                ) : null,
              )}
              <div className="form-row">
                {question('travelTime', 'How long would it typically take you to reach Williamsburg?', { placeholder: 'e.g. 20 minutes by bike' })}
                {question('weeklyCapacity', 'How many walks or hours per week would you ideally accept when coverage is needed?', { placeholder: 'e.g. 5 walks' })}
              </div>
              {question('recurringCommitments', 'Do you have recurring commitments that affect your availability? Please list the unavailable times.', { kind: 'paragraph', optional: true })}
              {question('trainingStartDate', 'When could you begin training?', { kind: 'date' })}
            </div>

            {/* Step 3 — dog experience */}
            <div id={`${paneId}-step-experience`} ref={(el) => { panelRefs.current[2] = el; }} {...groupProps(2)}>
              {header(2)}
              {question('experience', 'Describe your experience walking or caring for dogs. Include professional, volunteer, or personal experience.', { kind: 'paragraph' })}
              {question('specialDogExperience', 'What experience do you have with puppies, senior dogs, large dogs, or reactive dogs?', { kind: 'paragraph' })}
              {choice('multiDogComfort', 'How comfortable are you handling up to three dogs at a time after training?', MULTI_DOG_OPTIONS)}
              {choice('physicalDuties', 'This role involves extended walking, stairs, and outdoor work in varying weather. Can you perform these duties, with or without reasonable accommodation?', PHYSICAL_OPTIONS)}
            </div>

            {/* Step 4 — on the job */}
            <div id={`${paneId}-step-handling`} ref={(el) => { panelRefs.current[3] = el; }} {...groupProps(3)}>
              {header(3)}
              {choice('willingTraining', 'Are you willing to complete training and follow each dog’s care instructions before covering walks independently?', YES_NO)}
              {choice(
                'phoneProtocol',
                'Can you follow our handling protocols and keep your phone put away while walking, except for necessary work use when safely stopped?',
                YES_NO_EXPLAIN,
                values.phoneProtocol === 'explain' ? question('phoneProtocolExplain', 'Tell us more', { kind: 'paragraph' }) : null,
              )}
              {question('scenarioRefusesToLeave', 'You’re covering for another walker and a dog refuses to leave home. What would you do?', { kind: 'paragraph' })}
              {question('scenarioLooseHarness', 'You notice a harness is loose before leaving a client’s home. What would you do?', { kind: 'paragraph' })}
              {question('scenarioCantMakeShift', 'You accepted a coverage shift but now cannot make it. What would you do?', { kind: 'paragraph' })}
            </div>

            {/* Step 5 — wrap up */}
            <div id={`${paneId}-step-wrap`} ref={(el) => { panelRefs.current[4] = el; }} {...groupProps(4)}>
              {header(4)}
              {question('whyOnCall', 'Why does this schedule fit you?', { kind: 'paragraph' })}
              <div className="form-group" data-question="resume">
                <label htmlFor={`${paneId}-field-resume`}>
                  Resume or relevant experience summary<span className="walker-optional"> (optional)</span>
                </label>
                <p className="walker-hint">Upload a PDF or Word file (4MB max), write a short summary, or both.</p>
                <input id={`${paneId}-field-resume`} type="file" className="form-control" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setResume(e.target.files?.[0] ?? null)} {...aria('resume')} />
                <textarea id={`${paneId}-field-experienceSummary`} aria-label="Relevant experience summary" className="form-control walker-follow-up" rows={3} maxLength={BENCH_FIELD_LIMITS.paragraph} placeholder="Or summarize your relevant experience here" value={values.experienceSummary} onChange={(e) => set('experienceSummary', e.target.value)} {...aria('experienceSummary')} />
              </div>
              {question('anythingElse', 'Anything else you’d like us to know?', { kind: 'paragraph', optional: true })}
              {question('questionsForUs', 'Do you have any questions for us?', { kind: 'paragraph', optional: true, hint: 'About the role, the dogs, pay, training, anything.' })}

              <label id={`${paneId}-confirm-row`} htmlFor={`${paneId}-field-confirmed`} className={confirmed ? 'is-on' : undefined}>
                <input id={`${paneId}-field-confirmed`} type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ accentColor: 'var(--sage-dark)', width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} {...aria('confirmed')} />
                <span style={{ fontSize: '13px', color: 'var(--charcoal)' }}>
                  <strong>Confirmation:</strong> {CONFIRMATION_TEXT}
                </span>
              </label>
              <p id={`${paneId}-ai-notice`} className="form-note" style={{ margin: 0 }}>{AI_NOTICE_TEXT}</p>
            </div>
          </div>
        </div>

        <p id={alertId} role="alert" className="form-note form-alert form-alert-slot">{stepAlert}</p>

        <div id={`${paneId}-nav-row`} style={fullLayout ? { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '16px', borderTop: '1px dashed var(--light-gray)', paddingTop: '20px' } : { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginTop: '16px', borderTop: '1px dashed var(--light-gray)', paddingTop: '20px' }}>
          {fullLayout ? null : step > 0 ? (
            <button type="button" className="btn" style={{ padding: '13px 20px', background: 'transparent', border: 'none', color: 'var(--mid-gray)', justifySelf: 'start' }} onClick={() => { setErrors([]); setStep((s) => s - 1); }}>
              ← Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          {!lastStep ? (
            <button type="submit" className="btn btn-primary booking-forward-btn" id={`${paneId}-next-button`} style={{ padding: '15px 34px' }}>
              Next →
            </button>
          ) : (
            <button type="submit" className="btn btn-primary btn-accent booking-forward-btn" id={`${paneId}-submit-button`} style={{ padding: '15px 28px' }} disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending…' : 'Apply to Not The Rug'}
            </button>
          )}
          {fullLayout ? (
            // Opens the Contact Us modal in place, so a question never takes
            // the applicant off a half-filled form. No cta: recruiting contacts
            // are deliberately kept out of the customer CTA counts.
            <ContactUsTrigger id={`${paneId}-contact-us-trigger`} className="btn btn-outline">
              Contact Us
            </ContactUsTrigger>
          ) : null}
        </div>

        {status === 'error' ? <p className="form-note form-alert" role="alert">{serverError}</p> : null}
      </form>
    </div>
  );
}
