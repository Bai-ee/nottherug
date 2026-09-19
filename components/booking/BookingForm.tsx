'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HONEYPOT_FIELD_NAME, LEAD_FIELD_LIMITS } from '@/lib/leads/contract';
import { isValidEmail } from '@/lib/leads/validation';
import { track } from '@/lib/analytics/track';
import type { BookingStep } from '@/lib/analytics/events';
import { clearOnboardingHandoff, getOnboardingHandoffStorage } from '@/lib/booking/onboarding-handoff';
import { BOOKING_STEPS, StepAboutYou, StepCare, StepQuirks, StepWrapUp, StepYourDog } from './BookingSteps';
import SchedulingDialog from './SchedulingDialog';
import type { BookingFieldErrors, BookingFormValues, BookingSubmittedSummary, RegisterField } from './types';

type Props = {
  paneId: string;
  source: string;
  hidden?: boolean;
  /**
   * Answers carried in from the welcome modal (see lib/leads/prefill.ts).
   * Already validated against the shared option lists, so they can only ever
   * seed values the API would also accept.
   */
  initialValues?: Partial<BookingFormValues>;
  /** Pre-checks "I'd rather talk first" when the visitor arrived via Book a call. */
  initialPhoneConsult?: boolean;
  /**
   * Collecting details AFTER the welcome modal already observed a verified
   * Calendly booking in this browser. Defaults to false, which preserves
   * today's behavior at every existing call site. In this mode the
   * phone-consult alternative is hidden (there is nothing left to schedule),
   * the scheduler is never reopened, and the copy stops promising outreach
   * the visitor no longer needs.
   */
  bookedDetailsMode?: boolean;
  /**
   * 'steps' (default) is the sliding five-panel carousel every existing call
   * site renders. 'full' lists all five groups stacked on one sheet, so the
   * visitor can read the whole questionnaire before answering any of it —
   * the home page's closing intake, where there is room for it and no popup
   * to keep short. The fields, validation and payload are identical in both.
   */
  layout?: 'steps' | 'full';
};

type SubmitLeadResult =
  | { ok: true; data: { id?: string; duplicate?: boolean; notifications?: unknown } }
  | { ok: false; error: string };

/**
 * track() is documented as best-effort/never-throwing, but a booking must not
 * be able to fail because that contract was violated. Every track() call in
 * this file goes through this wrapper instead of calling track() directly.
 * Exported for tests/unit/booking-analytics-failure-isolation.test.ts.
 */
export function safeTrack(name: Parameters<typeof track>[0], payload?: Parameters<typeof track>[1]) {
  try {
    track(name, payload);
  } catch (err) {
    console.warn('[booking] analytics call failed', err);
  }
}

/**
 * Posts a meet & greet submission and, only once the API confirms a genuine
 * save, records lead_saved — never on a rejected or network-errored attempt.
 * The track call sits outside the network try/catch on purpose: a throwing
 * tracker must never be reported back to the visitor as a failed submission.
 * Exported, free of component state/DOM, so this decision can be unit-tested
 * without a rendering harness; see tests/unit/booking-form-analytics.test.ts.
 */
export async function submitMeetGreetLead(body: Record<string, unknown>, source: string): Promise<SubmitLeadResult> {
  let data: { ok?: boolean; error?: string; id?: string; duplicate?: boolean; notifications?: unknown };
  try {
    const res = await fetch('/api/leads/meetgreet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Something went wrong. Please try again.' };
    }
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
  // A dedupe-suppressed resubmission answers { ok: true, duplicate: true }
  // without writing anything (app/api/leads/meetgreet/route.ts): the original
  // save already counted, so recording it again would inflate the inquiry
  // numerator. The visitor's submission still succeeded, so the caller is
  // told so either way.
  if (!data.duplicate) safeTrack('lead_saved', { source });
  return { ok: true, data };
}

/**
 * Maps a BookingSteps.tsx UI step index (0-4: you/dog/care/quirks/wrap) to the
 * coarser named funnel step it represents (BOOKING_STEPS in
 * lib/analytics/events.ts), or null when that UI step is not part of the
 * tracked funnel. "care" and "quirks" are deliberately not funneled
 * individually. "details" (step 0) is fired from markFormStarted() instead of
 * here: merely rendering step 0 is not a meaningful signal without a real
 * interaction. Exported for tests/unit/booking-step-funnel.test.ts.
 */
export function funnelStepForFormIndex(index: number): BookingStep | null {
  if (index === 1) return 'dog';
  if (index === BOOKING_STEPS.length - 1) return 'review';
  return null;
}

/**
 * Builds a booking_step recorder that fires each named funnel step at most
 * once per attempt, so moving back and forward through the form (or reopening
 * the scheduler) never inflates the funnel. The step is marked reached BEFORE
 * tracking, so even a throwing tracker still dedupes. Exported, free of
 * component state, for tests/unit/booking-step-funnel.test.ts.
 */
export function createStepFunnelTracker(source: string) {
  const reached = new Set<BookingStep>();
  function reach(step: BookingStep) {
    if (reached.has(step)) return;
    reached.add(step);
    safeTrack('booking_step', { step, source });
  }
  /** Starts a fresh attempt: every named step may be reported once more. */
  reach.reset = function reset() {
    reached.clear();
  };
  return reach;
}

/**
 * The full layout has no steps to move through — every group is on the sheet
 * at once — so it records no booking_step events at all. The stored event
 * carries no source (see lib/analytics/events.ts), so the dashboard's funnel
 * aggregates every layout together: letting a layout that can only ever
 * report "details" into it would show a cliff between details and dog that no
 * visitor actually fell off. Full-layout progress is read from
 * booking_form_start -> lead_saved instead.
 */
const NO_STEP_TRACKING: (step: BookingStep) => void = () => {};

/**
 * Whether a successful save should open the Calendly scheduler. A
 * bookedDetailsMode visitor already has an appointment, so reopening it here
 * would offer them a second booking. Governs both the auto-open after save
 * and the manual reopen button, so the two can never disagree.
 */
export function shouldOpenSchedulerAfterSave(params: {
  calendlyUrl: string;
  phoneConsult: boolean;
  bookedDetailsMode: boolean;
}): boolean {
  return Boolean(params.calendlyUrl) && !params.phoneConsult && !params.bookedDetailsMode;
}

const initial: BookingFormValues = {
  ownerName: '',
  phone: '',
  email: '',
  neighborhood: 'North Williamsburg',
  dogName: '',
  breedAge: '',
  serviceInterest: 'Daily Group Walks',
  vaccinations: 'Yes — fully vaccinated',
  walkFrequency: 'Daily (Mon–Fri)',
  notes: '',
};

export default function BookingForm({
  paneId,
  source,
  hidden = false,
  initialValues,
  initialPhoneConsult = false,
  bookedDetailsMode = false,
  layout = 'steps',
}: Props) {
  const [form, setForm] = useState<BookingFormValues>({ ...initial, ...initialValues });
  const [reactivity, setReactivity] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyOther, setAllergyOther] = useState('');
  const [phoneConsult, setPhoneConsult] = useState(initialPhoneConsult);
  // Guards the email seed below: applied at most once, and never once the
  // visitor has typed in the field themselves.
  const emailSeededRef = useRef(false);
  const emailTouchedRef = useRef(false);
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showCalendly, setShowCalendly] = useState(false);
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [submittedSummary, setSubmittedSummary] = useState<BookingSubmittedSummary | null>(null);
  const fullLayout = layout === 'full';
  // Every group is on screen at once, so there is no "next" — the forward
  // action is always the submit.
  const lastStep = fullLayout || step === BOOKING_STEPS.length - 1;
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const [trackH, setTrackH] = useState<number | undefined>(undefined);
  const hasTrackedFormStart = useRef(false);
  // Which attempt this mount is on. Also keys SchedulingDialog below, so a
  // second genuine booking from the same mount is not swallowed by the first
  // attempt's completion dedupe.
  const [attempt, setAttempt] = useState(1);
  // One tracker for the whole mount; reset() starts the next attempt's funnel.
  const [stepTracker] = useState(() => createStepFunnelTracker(source));
  const reachStep = fullLayout ? NO_STEP_TRACKING : stepTracker;
  // Set when a submission succeeds: the NEXT genuine interaction is attempt
  // two. Deliberately not reset at the end of handleSubmit — the finished
  // attempt's scheduler opens after that point, and its "schedule" step (and
  // the dialog's own completion dedupe) still belong to the attempt that
  // just submitted.
  const startsNewAttemptRef = useRef(false);

  const alertId = `${paneId}-step-alert`;
  const stepAlertMessage = Object.values(fieldErrors).find((m): m is string => Boolean(m)) ?? '';

  const registerField: RegisterField = (name) => (el) => {
    fieldRefs.current[name] = el;
  };

  // Carousel row height follows the ACTIVE panel (not the tallest one) so
  // short steps don't leave a block of dead whitespace below the fields.
  useEffect(() => {
    if (fullLayout) return; // nothing slides, so nothing to measure
    const panel = panelRefs.current[step];
    if (!panel) return;
    const measure = () => setTrackH(panel.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [step, fullLayout]);

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || '';

  /**
   * `initialValues` is only read by the initial useState above, which is
   * correct for the query-string prefill (known at first render) but not for
   * the welcome modal's sessionStorage handoff, which BookingOnboardingIntake
   * can only read post-mount. Seed that email here instead: once, and only
   * while the field is still untouched, so first paint never depends on it
   * and a visitor's own edit is never clobbered.
   */
  useEffect(() => {
    const seeded = initialValues?.email;
    if (!seeded) return;
    if (emailSeededRef.current || emailTouchedRef.current) return;
    emailSeededRef.current = true;
    setForm((prev) => (prev.email ? prev : { ...prev, email: seeded }));
  }, [initialValues?.email]);

  // Fires once per mount, on the first genuine field interaction — never on
  // mount and never on navigation, so a visitor who only looks at the form is
  // not counted as having started it. Only `source` (a category, never a
  // customer value) leaves the browser. Also marks the funnel's first named
  // step reached, on the same gate — see funnelStepForFormIndex.
  function markFormStarted() {
    // First interaction after a successful submission: begin attempt two, so
    // it reports its own booking_form_start and its own full funnel rather
    // than looking like a continuation of the attempt that already finished.
    if (startsNewAttemptRef.current) {
      startsNewAttemptRef.current = false;
      hasTrackedFormStart.current = false;
      stepTracker.reset();
      setAttempt((n) => n + 1);
    }
    if (hasTrackedFormStart.current) return;
    hasTrackedFormStart.current = true;
    safeTrack('booking_form_start', { source });
    reachStep('details');
  }

  // Funnel steps for the later UI steps, at most once each per attempt (see
  // createStepFunnelTracker). In the full layout `step` never advances, so
  // this effect is a no-op there by construction — see NO_STEP_TRACKING.
  useEffect(() => {
    const funnelStep = funnelStepForFormIndex(step);
    if (funnelStep) reachStep(funnelStep);
  }, [step, reachStep]);

  const update = <K extends keyof BookingFormValues>(key: K, value: string) => {
    markFormStarted();
    // A real edit to the email means the seeding effect below must never
    // overwrite it, even if a late handoff read arrives afterwards.
    if (key === 'email') emailTouchedRef.current = true;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function toggleReactivity(option: string) {
    markFormStarted();
    setReactivity((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  function toggleAllergy(option: string) {
    markFormStarted();
    setAllergies((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  function handleAllergyOtherChange(value: string) {
    markFormStarted();
    setAllergyOther(value);
  }

  function handlePhoneConsultChange(value: boolean) {
    markFormStarted();
    setPhoneConsult(value);
  }

  function validateStep(index: number): BookingFieldErrors {
    const errors: BookingFieldErrors = {};
    if (index === 0) {
      if (!form.ownerName.trim()) errors.ownerName = 'Please enter your name.';
      if (!form.phone.trim()) errors.phone = 'Please enter a phone number.';
      if (!form.email.trim()) errors.email = 'Please enter your email.';
      else if (!isValidEmail(form.email)) errors.email = 'Please enter a valid email address.';
    }
    if (index === 1) {
      if (!form.dogName.trim()) errors.dogName = "Please enter your dog's name.";
      if (!form.breedAge.trim()) errors.breedAge = 'Please share breed & age.';
    }
    if (index === 3 && allergies.includes('Other') && !allergyOther.trim()) {
      errors.allergyOther = 'Please specify the allergy.';
    }
    if (index === 4 && form.notes.length > LEAD_FIELD_LIMITS.notes) {
      errors.notes = `Notes must be ${LEAD_FIELD_LIMITS.notes} characters or fewer.`;
    }
    return errors;
  }

  /** Full layout submits the whole questionnaire, so it checks all of it. */
  function validateAllSteps(): BookingFieldErrors {
    return BOOKING_STEPS.reduce<BookingFieldErrors>(
      (all, _step, index) => ({ ...all, ...validateStep(index) }),
      {}
    );
  }

  function focusFirstError(errors: BookingFieldErrors) {
    const firstKey = Object.keys(errors).find((k) => errors[k]);
    if (firstKey) fieldRefs.current[firstKey]?.focus();
  }

  function goToStep(index: number) {
    if (index <= step) {
      // Going back to re-edit earlier input is always allowed.
      setStep(index);
      setFieldErrors({});
      return;
    }
    // Going forward: a dot click can otherwise jump straight past steps whose
    // required fields were never filled, something a plain "Next" could never
    // do. Validate every step between here and the target, stopping at the
    // first one that fails.
    for (let i = step; i < index; i++) {
      const errors = validateStep(i);
      if (Object.keys(errors).length > 0) {
        setStep(i);
        setFieldErrors(errors);
        focusFirstError(errors);
        return;
      }
    }
    setStep(index);
    setFieldErrors({});
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
    setFieldErrors({});
  }

  // The one way the scheduler opens, used by both the auto-open after a save
  // and the manual reopen button, so the two can never disagree about the
  // funnel. Reaching the scheduler is the "schedule" step, once per attempt.
  function openScheduling() {
    reachStep('schedule');
    setShowCalendly(true);
  }

  async function handleSubmit() {
    setStatus('submitting');
    setErrorMsg('');
    // Belt and suspenders: the control is not rendered in bookedDetailsMode,
    // so this can never be true there — but force it, since this is the value
    // that lands in the POST body.
    const wantsPhoneConsult = bookedDetailsMode ? false : phoneConsult;
    const submittedDogName = form.dogName;
    const allergyList = allergies.includes('Other') && allergyOther
      ? [...allergies.filter((a) => a !== 'Other'), `Other: ${allergyOther}`]
      : allergies;

    const result = await submitMeetGreetLead(
      {
        ...form,
        source,
        reactivity: reactivity.join(', ') || 'None noted',
        allergies: allergyList.join(', ') || 'None',
        phoneConsult: wantsPhoneConsult,
        [HONEYPOT_FIELD_NAME]: honeypot,
      },
      source,
    );

    if (!result.ok) {
      // Keep the entered answers so a rejected submit can be retried.
      setStatus('error');
      setErrorMsg(result.error);
      return;
    }

    // Snapshot what was actually sent before the draft resets (R15): the
    // success UI and the scheduling branch below read this, never `form`/`phoneConsult`.
    setSubmittedSummary({ dogName: submittedDogName, phoneConsult: wantsPhoneConsult });
    setStatus('success');
    setForm({ ...initial, ...initialValues });
    setReactivity([]);
    setAllergies([]);
    setAllergyOther('');
    setPhoneConsult(initialPhoneConsult);
    setHoneypot('');
    setStep(0);
    setFieldErrors({});
    // The form is blank again, so anything typed into it from here is a new
    // attempt — see markFormStarted.
    startsNewAttemptRef.current = true;
    // A successful booked-details save ends the handoff, so a later,
    // unrelated /book visit never adopts a stale draft.
    if (bookedDetailsMode) clearOnboardingHandoff(getOnboardingHandoffStorage());
    if (shouldOpenSchedulerAfterSave({ calendlyUrl, phoneConsult: wantsPhoneConsult, bookedDetailsMode })) {
      openScheduling();
    }
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    const errors = fullLayout ? validateAllSteps() : validateStep(step);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }
    setFieldErrors({});
    if (!lastStep) {
      setStep((s) => s + 1);
    } else {
      void handleSubmit();
    }
  }

  const stepProps = { paneId, values: form, update, errors: fieldErrors, alertId, registerField };

  /**
   * One group's wrapper. In the carousel each is a full-width slide and only
   * the active one is reachable; in the full layout they stack, all live, each
   * under its own printed header.
   */
  const groupProps = (index: number) => ({
    ref: (el: HTMLDivElement | null) => { panelRefs.current[index] = el; },
    inert: fullLayout ? undefined : step !== index,
    'aria-hidden': fullLayout ? undefined : step !== index,
    style: fullLayout
      ? { minWidth: 0, padding: '4px' }
      : { flex: '0 0 100%', minWidth: 0, padding: '4px' },
  });

  /** Printed header per group — the sheet's stamp over the group's question. */
  const GroupHeader = ({ index }: { index: number }) =>
    fullLayout ? (
      <div
        id={`${paneId}-group-${BOOKING_STEPS[index].key}-header`}
        data-section="meetgreet-group-header"
      >
        <span className="stamp-label">{BOOKING_STEPS[index].label}</span>
        <h3>{BOOKING_STEPS[index].title}</h3>
      </div>
    ) : null;

  return (
    <div id={paneId} data-section={`meetgreet-${source}`} style={hidden ? { display: 'none' } : undefined}>
      <style>{`
        @keyframes mgStepTitleIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        /* Full layout — the five groups printed down one sheet. Same field
           system as the welcome modal (.form-group / .form-control), so the
           only new chrome is the header per group and the hairline that
           separates one group from the next, in the sheet's own printed rule. */
        [data-section="meetgreet-group-header"] { margin: 0 0 14px; }
        [data-section="meetgreet-group-header"] .stamp-label { margin-bottom: 8px; }
        [data-section="meetgreet-group-header"] h3 {
          font-family: var(--font-display);
          font-size: clamp(19px, 2vw, 25px);
          line-height: 1.15;
          margin: 0;
        }
        [data-section="meetgreet-carousel-track"][data-layout="full"] > div + div {
          margin-top: clamp(28px, 3.4vw, 44px);
          border-top: 1px solid var(--zine-rule, rgba(36, 35, 33, 0.22));
        }
        /* Clearance below the rule belongs on the header, not the group: the
           group carries an inline padding of 4px (it is a carousel slide in the
           other layout) which an author-sheet padding-top cannot override, and
           the stamp is rotated, so its raised corner needs the room. */
        [data-section="meetgreet-carousel-track"][data-layout="full"] > div + div [data-section="meetgreet-group-header"] {
          margin-top: clamp(24px, 2.8vw, 34px);
        }
        @media (prefers-reduced-motion: reduce) {
          [data-section="meetgreet-carousel-track"] { transition: none !important; }
          [data-section="meetgreet-carousel-row"] { transition: none !important; }
          [data-section="meetgreet-progress-row"] h3 { animation: none !important; }
        }
      `}</style>

      <form id={`${paneId}-form`} onSubmit={handleFormSubmit} noValidate>
        {/* Honeypot — real visitors never see or fill this; a filled value marks the submission as spam. */}
        <div
          id={`${paneId}-honeypot-field`}
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
        >
          <label htmlFor={`${paneId}-website`}>Website</label>
          <input
            id={`${paneId}-website`}
            name={HONEYPOT_FIELD_NAME}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* Row 1 — conversational progress header. The step counter, the dots and
            the per-step title are carousel furniture: in the full layout every
            group is on the sheet with its own header, so the row narrows to the
            intro paragraph that used to ride on step 1. */}
        <div id={`${paneId}-progress-row`} data-section="meetgreet-progress-row" style={{ marginBottom: '24px' }}>
          {!fullLayout && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
            <span style={{ fontFamily: 'var(--font-type)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mid-gray)' }}>
              Step {step + 1} of {BOOKING_STEPS.length} · {BOOKING_STEPS[step].label}
            </span>
            <div style={{ display: 'flex', gap: '6px' }} aria-label="Form steps">
              {BOOKING_STEPS.map((s, i) => (
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
          <h3 key={BOOKING_STEPS[step].key} style={{ fontFamily: 'var(--font-display)', margin: 0, animation: 'mgStepTitleIn 0.35s ease both' }}>
            {BOOKING_STEPS[step].title}
          </h3>
          )}
          {(fullLayout || step === 0) && (
            <p style={{ color: 'var(--mid-gray)', fontSize: '14px', margin: '6px 0 0' }}>
              We&apos;re a personal service, not a platform. We meet you and your dog before any walk is booked.
              These questions take about a minute, tell us who you&apos;d be matched with, and get the onboarding
              done up front so your free meet &amp; greet is quick. We reply within 2 hours on weekdays.
            </p>
          )}
        </div>

        {/* Row 2 — sliding step panels */}
        <div
          id={`${paneId}-carousel-row`}
          data-section="meetgreet-carousel-row"
          style={fullLayout
            ? { margin: '0 -4px' }
            : { overflow: 'hidden', margin: '0 -4px', height: trackH, transition: 'height 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          <div
            id={`${paneId}-carousel-track`}
            data-section="meetgreet-carousel-track"
            data-layout={layout}
            style={fullLayout
              ? { display: 'flex', flexDirection: 'column' }
              : { display: 'flex', alignItems: 'flex-start', transform: `translateX(-${step * 100}%)`, transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            <div {...groupProps(0)}>
              <GroupHeader index={0} />
              <StepAboutYou {...stepProps} />
            </div>

            <div {...groupProps(1)}>
              <GroupHeader index={1} />
              <StepYourDog {...stepProps} />
            </div>

            <div {...groupProps(2)}>
              <GroupHeader index={2} />
              <StepCare {...stepProps} />
            </div>

            <div {...groupProps(3)}>
              <GroupHeader index={3} />
              <StepQuirks
                paneId={paneId}
                reactivity={reactivity}
                toggleReactivity={toggleReactivity}
                allergies={allergies}
                toggleAllergy={toggleAllergy}
                allergyOther={allergyOther}
                setAllergyOther={handleAllergyOtherChange}
                errors={fieldErrors}
                alertId={alertId}
                registerField={registerField}
              />
            </div>

            <div {...groupProps(4)}>
              <GroupHeader index={4} />
              <StepWrapUp
                paneId={paneId}
                notes={form.notes}
                onNotesChange={(v) => update('notes', v)}
                phoneConsult={phoneConsult}
                hidePhoneConsult={bookedDetailsMode}
                onPhoneConsultChange={handlePhoneConsultChange}
                errors={fieldErrors}
                alertId={alertId}
                registerField={registerField}
              />
            </div>
          </div>
        </div>

        {stepAlertMessage && (
          <p id={alertId} role="alert" className="form-note" style={{ color: '#c0392b', textAlign: 'left' }}>
            ⚠️ {stepAlertMessage}
          </p>
        )}

        {/* Full layout closes on two actions: the accented submit, and a quiet
            way out for someone who only has a question and does not want to
            fill in a questionnaire to ask it. The stepped layout keeps its own
            three-track row below. */}
        {fullLayout ? (
          <div id={`${paneId}-submit-row`} data-section="meetgreet-submit-row">
            <button
              type="submit"
              className="btn btn-primary btn-accent booking-forward-btn"
              id={`${paneId}-submit-button`}
              disabled={status === 'submitting'}
            >
              {status === 'submitting'
                ? 'Sending…'
                : bookedDetailsMode
                  ? "Send My Dog's Details"
                  : phoneConsult
                    ? 'Request Phone Consultation'
                    : 'Request My Free Meet & Greet'}
            </button>
            <Link
              href="/contact"
              className="btn btn-outline"
              id={`${paneId}-general-question-cta`}
            >
              Just Have a Question?
            </Link>
          </div>
        ) : (
        <>
        {/* Nav row — back / next / submit */}
        {/* Three tracks, not two: the centre column holds the forward action so
            it stays centred on the form whether or not Back is rendered. */}
        <div id={`${paneId}-carousel-nav-row`} data-section="meetgreet-carousel-nav-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginTop: '16px', borderTop: '1px dashed var(--light-gray)', paddingTop: '20px' }}>
          {step > 0 ? (
            <button
              type="button"
              className="btn"
              style={{ padding: '13px 20px', background: 'transparent', border: 'none', color: 'var(--mid-gray)', justifySelf: 'start' }}
              onClick={handleBack}
            >
              ← Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          {!lastStep ? (
            <button
              type="submit"
              className="btn btn-primary booking-forward-btn"
              id={`${paneId}-next-button`}
              style={{ padding: '15px 34px' }}
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary booking-forward-btn"
              id={`${paneId}-submit-button`}
              style={{ padding: '15px 28px' }}
              disabled={status === 'submitting'}
            >
              {status === 'submitting'
                ? 'Sending…'
                : bookedDetailsMode
                  ? "Send My Dog's Details"
                  : phoneConsult
                    ? 'Request Phone Consultation'
                    : 'Request My Free Meet & Greet'}
            </button>
          )}
        </div>
        </>
        )}

        {/* Plain-language version of what the analytics in this file do, shown
            where a visitor is actually typing (plan 009 P4). */}
        <p id="booking-tracking-disclosure" className="form-note">
          We count visits to our own site without cookies. We never store what you type
          in this form, and we never sell your information.
        </p>
      </form>

      {status === 'success' && submittedSummary && (
        <p className="form-note" style={{ color: 'var(--sage-light, #6b8e6b)' }}>
          ✅ {bookedDetailsMode
            ? "Got it, thanks! Your Meet & Greet is already booked, so check your Calendly confirmation email for the time and details."
            : submittedSummary.phoneConsult
            ? "Thanks! We'll give you a call within 2 hours on weekdays."
            : "Thanks! We'll be in touch within 2 hours on weekdays."}
        </p>
      )}
      {status === 'error' && (
        <p className="form-note" style={{ color: '#c0392b' }}>⚠️ {errorMsg}</p>
      )}
      {status === 'success' && submittedSummary && !showCalendly &&
        shouldOpenSchedulerAfterSave({ calendlyUrl, phoneConsult: submittedSummary.phoneConsult, bookedDetailsMode }) && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '12px' }}
          onClick={openScheduling}
        >
          Schedule your Meet &amp; Greet →
        </button>
      )}

      <SchedulingDialog
        open={showCalendly}
        onClose={() => setShowCalendly(false)}
        calendlyUrl={calendlyUrl}
        source={source}
        attemptId={`${paneId}-attempt-${attempt}`}
      />
    </div>
  );
}
