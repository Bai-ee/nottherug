'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HONEYPOT_FIELD_NAME, LEAD_FIELD_LIMITS } from '@/lib/leads/contract';
import { isValidEmail } from '@/lib/leads/validation';
import { BOOKING_STEPS, StepAboutYou, StepCare, StepQuirks, StepWrapUp, StepYourDog } from './BookingSteps';
import SchedulingDialog from './SchedulingDialog';
import type { BookingFieldErrors, BookingFormValues, BookingSubmittedSummary, RegisterField } from './types';

type Props = {
  paneId: string;
  source: string;
  hidden?: boolean;
};

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

export default function BookingForm({ paneId, source, hidden = false }: Props) {
  const [form, setForm] = useState<BookingFormValues>(initial);
  const [reactivity, setReactivity] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyOther, setAllergyOther] = useState('');
  const [phoneConsult, setPhoneConsult] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showCalendly, setShowCalendly] = useState(false);
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [submittedSummary, setSubmittedSummary] = useState<BookingSubmittedSummary | null>(null);
  const lastStep = step === BOOKING_STEPS.length - 1;
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const [trackH, setTrackH] = useState<number | undefined>(undefined);

  const alertId = `${paneId}-step-alert`;
  const stepAlertMessage = Object.values(fieldErrors).find((m): m is string => Boolean(m)) ?? '';

  const registerField: RegisterField = (name) => (el) => {
    fieldRefs.current[name] = el;
  };

  // Carousel row height follows the ACTIVE panel (not the tallest one) so
  // short steps don't leave a block of dead whitespace below the fields.
  useEffect(() => {
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
  }, [step]);

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || '';

  const update = <K extends keyof BookingFormValues>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function toggleReactivity(option: string) {
    setReactivity((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  function toggleAllergy(option: string) {
    setAllergies((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
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

  function focusFirstError(errors: BookingFieldErrors) {
    const firstKey = Object.keys(errors).find((k) => errors[k]);
    if (firstKey) fieldRefs.current[firstKey]?.focus();
  }

  function goToStep(index: number) {
    setStep(index);
    setFieldErrors({});
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
    setFieldErrors({});
  }

  async function handleSubmit() {
    setStatus('submitting');
    setErrorMsg('');
    const wantsPhoneConsult = phoneConsult;
    const submittedDogName = form.dogName;
    try {
      const allergyList = allergies.includes('Other') && allergyOther
        ? [...allergies.filter((a) => a !== 'Other'), `Other: ${allergyOther}`]
        : allergies;

      const res = await fetch('/api/leads/meetgreet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          source,
          reactivity: reactivity.join(', ') || 'None noted',
          allergies: allergyList.join(', ') || 'None',
          phoneConsult,
          [HONEYPOT_FIELD_NAME]: honeypot,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        return;
      }
      // Snapshot what was actually sent before the draft resets (R15): the
      // success UI and the scheduling branch below read this, never `form`/`phoneConsult`.
      setSubmittedSummary({ dogName: submittedDogName, phoneConsult: wantsPhoneConsult });
      setStatus('success');
      setForm(initial);
      setReactivity([]);
      setAllergies([]);
      setAllergyOther('');
      setPhoneConsult(false);
      setHoneypot('');
      setStep(0);
      setFieldErrors({});
      if (calendlyUrl && !wantsPhoneConsult) setShowCalendly(true);
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    const errors = validateStep(step);
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

  return (
    <div id={paneId} data-section={`meetgreet-${source}`} style={hidden ? { display: 'none' } : undefined}>
      <style>{`
        @keyframes mgStepTitleIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
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

        {/* Row 1 — conversational progress header */}
        <div id={`${paneId}-progress-row`} data-section="meetgreet-progress-row" style={{ marginBottom: '24px' }}>
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
          <h3 key={BOOKING_STEPS[step].key} style={{ fontFamily: 'var(--font-display)', margin: 0, animation: 'mgStepTitleIn 0.35s ease both' }}>
            {BOOKING_STEPS[step].title}
          </h3>
          {step === 0 && (
            <p style={{ color: 'var(--mid-gray)', fontSize: '14px', margin: '6px 0 0' }}>
              A few quick questions — about a minute. We&apos;ll reach out within 2 hours on weekdays to schedule your free visit.
            </p>
          )}
        </div>

        {/* Row 2 — sliding step panels */}
        <div id={`${paneId}-carousel-row`} data-section="meetgreet-carousel-row" style={{ overflow: 'hidden', margin: '0 -4px', height: trackH, transition: 'height 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div
            id={`${paneId}-carousel-track`}
            data-section="meetgreet-carousel-track"
            style={{ display: 'flex', alignItems: 'flex-start', transform: `translateX(-${step * 100}%)`, transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            <div ref={(el) => { panelRefs.current[0] = el; }} inert={step !== 0} aria-hidden={step !== 0} style={{ flex: '0 0 100%', minWidth: 0, padding: '4px' }}>
              <StepAboutYou {...stepProps} />
            </div>

            <div ref={(el) => { panelRefs.current[1] = el; }} inert={step !== 1} aria-hidden={step !== 1} style={{ flex: '0 0 100%', minWidth: 0, padding: '4px' }}>
              <StepYourDog {...stepProps} />
            </div>

            <div ref={(el) => { panelRefs.current[2] = el; }} inert={step !== 2} aria-hidden={step !== 2} style={{ flex: '0 0 100%', minWidth: 0, padding: '4px' }}>
              <StepCare {...stepProps} />
            </div>

            <div ref={(el) => { panelRefs.current[3] = el; }} inert={step !== 3} aria-hidden={step !== 3} style={{ flex: '0 0 100%', minWidth: 0, padding: '4px' }}>
              <StepQuirks
                paneId={paneId}
                reactivity={reactivity}
                toggleReactivity={toggleReactivity}
                allergies={allergies}
                toggleAllergy={toggleAllergy}
                allergyOther={allergyOther}
                setAllergyOther={setAllergyOther}
                errors={fieldErrors}
                alertId={alertId}
                registerField={registerField}
              />
            </div>

            <div ref={(el) => { panelRefs.current[4] = el; }} inert={step !== 4} aria-hidden={step !== 4} style={{ flex: '0 0 100%', minWidth: 0, padding: '4px' }}>
              <StepWrapUp
                paneId={paneId}
                notes={form.notes}
                onNotesChange={(v) => update('notes', v)}
                phoneConsult={phoneConsult}
                onPhoneConsultChange={setPhoneConsult}
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

        {/* Nav row — back / next / submit */}
        <div id={`${paneId}-carousel-nav-row`} data-section="meetgreet-carousel-nav-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '16px', borderTop: '1px dashed var(--light-gray)', paddingTop: '20px' }}>
          {step > 0 ? (
            <button
              type="button"
              className="btn"
              style={{ padding: '13px 20px', background: 'transparent', border: 'none', color: 'var(--mid-gray)' }}
              onClick={handleBack}
            >
              ← Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          {!lastStep ? (
            <button type="submit" className="btn btn-primary" style={{ padding: '15px 34px' }}>
              Next →
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '15px 28px' }}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Sending…' : phoneConsult ? 'Request Phone Consultation' : 'Request My Free Meet & Greet'}
            </button>
          )}
        </div>
      </form>

      {status === 'success' && submittedSummary && (
        <p className="form-note" style={{ color: 'var(--sage-light, #6b8e6b)' }}>
          ✅ {submittedSummary.phoneConsult
            ? "Thanks! We'll give you a call within 2 hours on weekdays."
            : "Thanks! We'll be in touch within 2 hours on weekdays."}
        </p>
      )}
      {status === 'error' && (
        <p className="form-note" style={{ color: '#c0392b' }}>⚠️ {errorMsg}</p>
      )}
      {status !== 'success' && status !== 'error' && (
        <p className="form-note">We respond within 2 hours Mon–Fri · No spam, ever · Your info stays private</p>
      )}

      {status === 'success' && submittedSummary && calendlyUrl && !showCalendly && !submittedSummary.phoneConsult && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '12px' }}
          onClick={() => setShowCalendly(true)}
        >
          Schedule your Meet &amp; Greet →
        </button>
      )}

      <SchedulingDialog open={showCalendly} onClose={() => setShowCalendly(false)} calendlyUrl={calendlyUrl} />
    </div>
  );
}
