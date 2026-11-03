'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type Ref } from 'react';
import { HONEYPOT_FIELD_NAME } from '@/lib/leads/contract';
import { isValidEmail } from '@/lib/leads/validation';
import { track } from '@/lib/analytics/track';
import { toTrackedRoute, type AltRequestFailureReason } from '@/lib/analytics/events';
import { getSubmissionLinkage } from '@/lib/analytics/identity';
import NewsletterOptIn from '@/components/marketing/NewsletterOptIn';
import { peekSession, newOpaqueId } from '@/lib/analytics/session';
import {
  ALT_CONTACT_PREFERENCES,
  ALT_TIME_DAYS,
  ALT_TIME_LIMITS,
  ALT_TIME_WINDOWS,
  BUSINESS_TIME_ZONE,
  isValidPhone,
  isValidTimeZone,
  type AltContactPreference,
  type AltTimeDayId,
  type AltTimeSource,
  type AltTimeWindowId,
} from '@/lib/booking/alternateTime';

/** Copy fixed by the brief — kept here so every surface says exactly this. */
export const ALT_TIME_TRIGGER_LABEL = 'No suitable time? Request another time';
const ALT_TIME_EXPLAINER =
  "Tell us what works for you. We’ll follow up to arrange a time. This request does not confirm an appointment.";
const ALT_TIME_SUCCESS = "Request received. We’ll contact you to arrange a time.";

/**
 * The form's values. `undefined` for name/email means "not typed yet", so the
 * host's prefill (an email entered before the scheduler opened, a name from
 * the questionnaire) shows through until the visitor edits the field — and a
 * late prefill can never overwrite something they typed.
 */
export type AltTimeDraft = {
  name?: string;
  email?: string;
  phone?: string;
  contactPreference?: AltContactPreference;
  newsletterOptIn?: boolean;
  days: AltTimeDayId[];
  windows: AltTimeWindowId[];
  timeZone?: string;
  note: string;
  /** One key per attempt: a retry or double click reuses it (server-side
   *  idempotency); a confirmed save replaces it, so a later request is new. */
  idempotencyKey: string;
  submitted: boolean;
};

export function newAltTimeDraft(): AltTimeDraft {
  return { days: [], windows: [], note: '', idempotencyKey: newOpaqueId(), submitted: false };
}

/** Hosts keep the draft in their own state so switching between Calendly and
 *  this form (or closing and reopening the dialog) never loses it. */
export function useAltTimeDraft(): [AltTimeDraft, (next: AltTimeDraft | ((d: AltTimeDraft) => AltTimeDraft)) => void] {
  return useState<AltTimeDraft>(newAltTimeDraft);
}

function detectTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(tz) ? tz : BUSINESS_TIME_ZONE;
  } catch {
    return BUSINESS_TIME_ZONE;
  }
}

function listTimeZones(current: string): string[] {
  let zones: string[] = [];
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (typeof supported === 'function') zones = supported('timeZone');
  } catch {
    zones = [];
  }
  if (zones.length === 0) {
    zones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'UTC'];
  }
  // The detected zone may be an alias the list omits (e.g. "Asia/Calcutta").
  if (current && !zones.includes(current)) zones = [current, ...zones];
  return zones;
}

/**
 * Contact details typed into this form earlier in the same visit, so opening
 * it again (another page, another dialog) never asks twice. sessionStorage:
 * this tab only, gone when it closes, never sent anywhere. Only the three
 * contact fields — never the note.
 */
const CONTACT_STORAGE_KEY = 'ntr:alt-time-contact:v1';
type StoredContact = { name?: string; email?: string; phone?: string };

function readStoredContact(): StoredContact {
  try {
    const raw = window.sessionStorage.getItem(CONTACT_STORAGE_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as Record<string, unknown>;
    const pick = (k: string, max: number) => (typeof v[k] === 'string' && (v[k] as string).length <= max ? (v[k] as string) : undefined);
    return { name: pick('name', ALT_TIME_LIMITS.name), email: pick('email', ALT_TIME_LIMITS.email), phone: pick('phone', ALT_TIME_LIMITS.phone) };
  } catch {
    return {};
  }
}

function writeStoredContact(contact: StoredContact) {
  try {
    window.sessionStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contact));
  } catch {
    // Convenience only.
  }
}

function safeTrack(name: Parameters<typeof track>[0], payload?: Parameters<typeof track>[1]) {
  try {
    track(name, payload);
  } catch (err) {
    console.warn('[alt-time] analytics call failed', err);
  }
}

type FieldErrors = Partial<Record<'name' | 'email' | 'phone' | 'contactPreference' | 'days' | 'windows' | 'timeZone' | 'note', string>>;

function validateClient(values: { name: string; email: string; phone: string; contactPreference?: string; days: string[]; windows: string[]; timeZone: string; note: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = 'Please enter your name.';
  if (!values.email.trim()) errors.email = 'Please enter your email.';
  else if (!isValidEmail(values.email.trim())) errors.email = 'Please enter a valid email address.';
  if (!values.phone.trim()) errors.phone = 'Please enter your phone number.';
  else if (!isValidPhone(values.phone)) errors.phone = 'Please enter a valid phone number.';
  if (!values.contactPreference) errors.contactPreference = 'Choose how you’d like us to reach you.';
  if (values.days.length === 0) errors.days = 'Choose at least one day.';
  if (values.windows.length === 0) errors.windows = 'Choose at least one time window.';
  if (!isValidTimeZone(values.timeZone)) errors.timeZone = 'Choose your time zone.';
  if (values.note.length > ALT_TIME_LIMITS.note) errors.note = `Please keep the note under ${ALT_TIME_LIMITS.note} characters.`;
  return errors;
}

const FIELD_ORDER: Array<keyof FieldErrors> = ['name', 'email', 'phone', 'contactPreference', 'days', 'windows', 'timeZone', 'note'];

/**
 * Posts one request. Success means the server answered ok — i.e. the request
 * is saved — and nothing else. Exported for tests.
 */
export async function submitAlternateTimeRequest(
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; reason: AltRequestFailureReason; message: string; fieldErrors?: FieldErrors }> {
  let res: Response;
  try {
    res = await fetch('/api/leads/alternate-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, reason: 'network', message: 'We couldn’t reach the server. Check your connection and try again.' };
  }
  let data: { ok?: boolean; error?: string; kind?: string; fieldErrors?: Array<{ field: string; message: string }> } = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (res.ok && data.ok === true) return { ok: true };
  const reason: AltRequestFailureReason =
    res.status === 429 ? 'rate_limited' : res.status >= 400 && res.status < 500 ? 'validation' : 'server';
  const fieldErrors: FieldErrors = {};
  for (const fe of data.fieldErrors ?? []) {
    if ((FIELD_ORDER as string[]).includes(fe.field) && !fieldErrors[fe.field as keyof FieldErrors]) {
      fieldErrors[fe.field as keyof FieldErrors] = fe.message;
    }
  }
  return {
    ok: false,
    reason,
    message: data.error || 'We couldn’t save your request. Please try again.',
    ...(Object.keys(fieldErrors).length ? { fieldErrors } : {}),
  };
}

/** The visible secondary action. Plain button: hosts decide what it opens. */
export function AlternateTimeTrigger({
  id,
  onClick,
  className,
  buttonRef,
}: {
  id: string;
  onClick: () => void;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button ref={buttonRef} type="button" id={id} className={`alt-time-trigger ${className ?? ''}`.trim()} onClick={onClick}>
      {ALT_TIME_TRIGGER_LABEL}
    </button>
  );
}

type FormProps = {
  /** Prefix for every DOM id inside, so two instances never collide. */
  idPrefix: string;
  source: AltTimeSource;
  draft: AltTimeDraft;
  setDraft: (next: AltTimeDraft | ((d: AltTimeDraft) => AltTimeDraft)) => void;
  /** Anything the visitor already gave in this visit (welcome-modal email, the
   *  questionnaire's name/phone/email, even unsubmitted). */
  prefill?: { name?: string; email?: string; phone?: string };
  /** Back to the calendar (or the host's previous view). */
  onBack?: () => void;
  backLabel?: string;
  /** Called once the request is SAVED. */
  onSubmitted?: () => void;
  onClose?: () => void;
};

/**
 * The lightweight "request another time" form. Never requires the dog
 * questionnaire. Validates locally for fast feedback, but the server is the
 * authority: its field errors are shown inline next to the same fields.
 */
export function AlternateTimeForm({ idPrefix, source, draft, setDraft, prefill, onBack, backLabel, onSubmitted, onClose }: FormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [honeypot, setHoneypot] = useState('');
  const submittingRef = useRef(false);
  const fieldRefs = useRef<Partial<Record<keyof FieldErrors, HTMLElement | null>>>({});
  const successRef = useRef<HTMLParagraphElement | null>(null);
  const headingId = `${idPrefix}-title`;

  // Detected once, on the client; shown and editable, never silently assumed.
  const [detectedZone] = useState(detectTimeZone);
  // Read once when the form is shown (client only: the form never server-renders).
  const [stored] = useState<StoredContact>(readStoredContact);
  // Precedence: what was typed here > what this page already knows > earlier this visit.
  const name = draft.name ?? (prefill?.name || stored.name || '');
  const email = draft.email ?? (prefill?.email || stored.email || '');
  const phone = draft.phone ?? (prefill?.phone || stored.phone || '');

  function setContact(field: 'name' | 'email' | 'phone', value: string) {
    clearFieldError(field);
    setDraft((d) => ({ ...d, [field]: value }));
    writeStoredContact({ name, email, phone, [field]: value });
  }
  const timeZone = draft.timeZone ?? detectedZone;
  const zones = useMemo(() => listTimeZones(timeZone), [timeZone]);

  // "Opened" once per mount of the form (each time it is shown).
  useEffect(() => {
    safeTrack('alt_time_request_opened');
  }, []);

  useEffect(() => {
    if (draft.submitted) successRef.current?.focus();
  }, [draft.submitted]);

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function clearFieldError(field: keyof FieldErrors) {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function focusFirst(errors: FieldErrors) {
    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first) fieldRefs.current[first]?.focus();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Synchronous guard: a double click lands before React re-renders the
    // disabled button. The server's idempotency key covers anything past this.
    if (submittingRef.current) return;

    const values = { name, email, phone, contactPreference: draft.contactPreference, days: draft.days, windows: draft.windows, timeZone, note: draft.note };
    const localErrors = validateClient(values);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setStatus('error');
      setErrorMsg('Please fix the highlighted fields.');
      focusFirst(localErrors);
      safeTrack('alt_time_request_failed', { reason: 'validation' });
      return;
    }

    submittingRef.current = true;
    setStatus('submitting');
    setErrorMsg('');
    setFieldErrors({});

    let attribution: unknown = undefined;
    try {
      attribution = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true' ? peekSession()?.attribution : undefined;
    } catch {
      attribution = undefined;
    }

    const result = await submitAlternateTimeRequest({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      contactPreference: draft.contactPreference,
      ...(draft.newsletterOptIn ? { newsletterOptIn: true } : {}),
      days: draft.days,
      windows: draft.windows,
      timeZone,
      note: draft.note.trim(),
      source,
      sourcePage: typeof window === 'undefined' ? null : toTrackedRoute(window.location.pathname),
      idempotencyKey: draft.idempotencyKey,
      linkage: getSubmissionLinkage(),
      ...(attribution ? { attribution } : {}),
      [HONEYPOT_FIELD_NAME]: honeypot,
    });
    submittingRef.current = false;

    if (!result.ok) {
      // Every entered value stays exactly as it was.
      setStatus('error');
      setErrorMsg(result.message);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        focusFirst(result.fieldErrors);
      }
      safeTrack('alt_time_request_failed', { reason: result.reason });
      return;
    }

    safeTrack('alt_time_request_submitted');
    setStatus('idle');
    // Keep name/email for convenience; the next request gets a fresh key.
    writeStoredContact({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    setDraft((d) => ({ ...newAltTimeDraft(), name, email, phone, contactPreference: d.contactPreference, timeZone: d.timeZone, submitted: true }));
    onSubmitted?.();
  }

  const errId = (f: keyof FieldErrors) => `${idPrefix}-${f}-error`;
  const aria = (f: keyof FieldErrors) =>
    fieldErrors[f] ? { 'aria-invalid': true as const, 'aria-describedby': errId(f) } : { 'aria-invalid': false as const };

  if (draft.submitted) {
    return (
      // Centered on its own: nothing is left to do but close.
      <div id={`${idPrefix}-success-panel`} className="alt-time-panel alt-time-success-panel">
        <p
          id={`${idPrefix}-success-message`}
          ref={successRef}
          tabIndex={-1}
          className="alt-time-success"
          role="status"
        >
          {ALT_TIME_SUCCESS}
        </p>
        <div id={`${idPrefix}-success-actions`} className="alt-time-actions alt-time-success-actions">
          {onClose ? (
            <button type="button" className="btn btn-primary booking-forward-btn btn-accent btn-sm" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form id={`${idPrefix}-form`} className="alt-time-panel" onSubmit={handleSubmit} noValidate aria-labelledby={headingId}>
      <div id={`${idPrefix}-header-row`} className="alt-time-header-row">
        <h2 id={headingId} className="alt-time-title">Request another time</h2>
        {onBack ? (
          <button type="button" id={`${idPrefix}-back-btn`} className="alt-time-link-btn" onClick={onBack}>
            {backLabel ?? '← Back to calendar'}
          </button>
        ) : null}
      </div>
      <p id={`${idPrefix}-explainer`} className="alt-time-explainer">{ALT_TIME_EXPLAINER}</p>

      {/* Honeypot: hidden from people and assistive tech, filled only by bots. */}
      <div aria-hidden="true" className="alt-time-honeypot">
        <label htmlFor={`${idPrefix}-${HONEYPOT_FIELD_NAME}`}>Website</label>
        <input
          id={`${idPrefix}-${HONEYPOT_FIELD_NAME}`}
          name={HONEYPOT_FIELD_NAME}
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div id={`${idPrefix}-contact-row`} className="alt-time-row">
        <div className="form-group">
          <label htmlFor={`${idPrefix}-name`}>Name</label>
          <input
            id={`${idPrefix}-name`}
            ref={(el) => { fieldRefs.current.name = el; }}
            className="form-control"
            autoComplete="name"
            maxLength={ALT_TIME_LIMITS.name}
            value={name}
            onChange={(e) => setContact('name', e.target.value)}
            {...aria('name')}
          />
          <p id={errId('name')} className="form-alert alt-time-field-error">{fieldErrors.name ?? ''}</p>
        </div>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-email`}>Email</label>
          <input
            id={`${idPrefix}-email`}
            ref={(el) => { fieldRefs.current.email = el; }}
            className="form-control"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={ALT_TIME_LIMITS.email}
            value={email}
            onChange={(e) => setContact('email', e.target.value)}
            {...aria('email')}
          />
          <p id={errId('email')} className="form-alert alt-time-field-error">{fieldErrors.email ?? ''}</p>
        </div>
        <div className="form-group" id={`${idPrefix}-phone-group`}>
          <label htmlFor={`${idPrefix}-phone`}>Phone</label>
          <input
            id={`${idPrefix}-phone`}
            ref={(el) => { fieldRefs.current.phone = el; }}
            className="form-control"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={ALT_TIME_LIMITS.phone}
            value={phone}
            onChange={(e) => setContact('phone', e.target.value)}
            {...aria('phone')}
          />
          <p id={errId('phone')} className="form-alert alt-time-field-error">{fieldErrors.phone ?? ''}</p>
        </div>
      </div>

      <fieldset
        id={`${idPrefix}-contact-pref-fieldset`}
        className="alt-time-fieldset"
        {...(fieldErrors.contactPreference ? { 'aria-describedby': errId('contactPreference') } : {})}
      >
        <legend>How should we reach you?</legend>
        <div className="alt-time-chip-row" role="radiogroup">
          {ALT_CONTACT_PREFERENCES.map((p, i) => {
            const checked = draft.contactPreference === p.id;
            return (
              <label key={p.id} className="alt-time-chip" data-checked={checked} htmlFor={`${idPrefix}-pref-${p.id}`}>
                <input
                  id={`${idPrefix}-pref-${p.id}`}
                  ref={i === 0 ? (el) => { fieldRefs.current.contactPreference = el; } : undefined}
                  type="radio"
                  name={`${idPrefix}-contact-pref`}
                  checked={checked}
                  onChange={() => { clearFieldError('contactPreference'); setDraft((d) => ({ ...d, contactPreference: p.id })); }}
                />
                <span>{p.label}</span>
              </label>
            );
          })}
        </div>
        {draft.contactPreference === 'text' || draft.contactPreference === 'either' ? (
          <p id={`${idPrefix}-text-note`} className="alt-time-hint">We’ll text the number above. Standard message rates may apply.</p>
        ) : null}
        <p id={errId('contactPreference')} className="form-alert alt-time-field-error">{fieldErrors.contactPreference ?? ''}</p>
      </fieldset>

      <fieldset id={`${idPrefix}-days-fieldset`} className="alt-time-fieldset" {...(fieldErrors.days ? { 'aria-describedby': errId('days') } : {})}>
        <legend>Preferred days</legend>
        <div className="alt-time-chip-row">
          {ALT_TIME_DAYS.map((d, i) => {
            const checked = draft.days.includes(d.id);
            return (
              <label key={d.id} className="alt-time-chip" data-checked={checked} htmlFor={`${idPrefix}-day-${d.id}`}>
                <input
                  id={`${idPrefix}-day-${d.id}`}
                  ref={i === 0 ? (el) => { fieldRefs.current.days = el; } : undefined}
                  type="checkbox"
                  checked={checked}
                  onChange={() => { clearFieldError('days'); setDraft((dr) => ({ ...dr, days: toggle(dr.days, d.id) })); }}
                />
                <span aria-hidden="true">{d.label}</span>
                <span className="sr-only">{d.long}</span>
              </label>
            );
          })}
        </div>
        <p id={errId('days')} className="form-alert alt-time-field-error">{fieldErrors.days ?? ''}</p>
      </fieldset>

      <fieldset id={`${idPrefix}-windows-fieldset`} className="alt-time-fieldset" {...(fieldErrors.windows ? { 'aria-describedby': errId('windows') } : {})}>
        <legend>Time windows</legend>
        <div className="alt-time-chip-row">
          {ALT_TIME_WINDOWS.map((w, i) => {
            const checked = draft.windows.includes(w.id);
            return (
              <label key={w.id} className="alt-time-chip alt-time-chip-wide" data-checked={checked} htmlFor={`${idPrefix}-window-${w.id}`}>
                <input
                  id={`${idPrefix}-window-${w.id}`}
                  ref={i === 0 ? (el) => { fieldRefs.current.windows = el; } : undefined}
                  type="checkbox"
                  checked={checked}
                  onChange={() => { clearFieldError('windows'); setDraft((dr) => ({ ...dr, windows: toggle(dr.windows, w.id) })); }}
                />
                <span>{w.label} <span className="alt-time-chip-range">{w.range}</span></span>
              </label>
            );
          })}
        </div>
        <p id={errId('windows')} className="form-alert alt-time-field-error">{fieldErrors.windows ?? ''}</p>
      </fieldset>

      <div className="form-group" id={`${idPrefix}-timezone-group`}>
        <label htmlFor={`${idPrefix}-timezone`}>Your time zone</label>
        <select
          id={`${idPrefix}-timezone`}
          ref={(el) => { fieldRefs.current.timeZone = el; }}
          className="form-control form-select"
          value={timeZone}
          onChange={(e) => { clearFieldError('timeZone'); setDraft((d) => ({ ...d, timeZone: e.target.value })); }}
          aria-describedby={`${idPrefix}-timezone-note${fieldErrors.timeZone ? ` ${errId('timeZone')}` : ''}`}
          aria-invalid={Boolean(fieldErrors.timeZone)}
        >
          {zones.map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <p id={`${idPrefix}-timezone-note`} className="alt-time-hint">
          The times above are in {timeZone.replace(/_/g, ' ')}
          {timeZone === detectedZone ? ' (detected from your device)' : ''}. We’re in New York.
        </p>
        <p id={errId('timeZone')} className="form-alert alt-time-field-error">{fieldErrors.timeZone ?? ''}</p>
      </div>

      <div className="form-group" id={`${idPrefix}-note-group`}>
        <label htmlFor={`${idPrefix}-note`}>Note <span className="alt-time-optional">(optional)</span></label>
        <textarea
          id={`${idPrefix}-note`}
          ref={(el) => { fieldRefs.current.note = el; }}
          className="form-control"
          rows={3}
          maxLength={ALT_TIME_LIMITS.note}
          value={draft.note}
          onChange={(e) => { clearFieldError('note'); setDraft((d) => ({ ...d, note: e.target.value })); }}
          {...aria('note')}
        />
        <p id={errId('note')} className="form-alert alt-time-field-error">{fieldErrors.note ?? ''}</p>
      </div>

      <NewsletterOptIn
        id={`${idPrefix}-newsletter`}
        checked={draft.newsletterOptIn === true}
        onChange={(next) => setDraft((d) => ({ ...d, newsletterOptIn: next }))}
      />

      <p id={`${idPrefix}-form-error`} className="form-alert form-alert-slot" role="alert">
        {status === 'error' ? errorMsg : ''}
      </p>

      <div id={`${idPrefix}-submit-row`} className="alt-time-actions">
        <button
          type="submit"
          id={`${idPrefix}-submit-btn`}
          className="btn btn-primary booking-forward-btn btn-accent"
          disabled={status === 'submitting'}
          aria-disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </form>
  );
}
