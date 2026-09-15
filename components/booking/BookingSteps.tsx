'use client';

import {
  ALLERGY_OPTIONS,
  NEIGHBORHOOD_OPTIONS,
  REACTIVITY_OPTIONS,
  SERVICE_INTEREST_OPTIONS,
  VACCINATION_OPTIONS,
  WALK_FREQUENCY_OPTIONS,
} from '@/lib/leads/contract';
import type { BookingFieldErrors, BookingFormValues, BookingStepDef, RegisterField } from './types';

export const BOOKING_STEPS: BookingStepDef[] = [
  { key: 'you', label: 'You', title: 'First — a little about you' },
  { key: 'dog', label: 'Your dog', title: 'Now, tell us about your dog' },
  { key: 'care', label: 'The care', title: 'What kind of care are you looking for?' },
  { key: 'quirks', label: 'Quirks', title: 'Anything we should watch for?' },
  { key: 'wrap', label: 'Wrap up', title: 'Last step — anything else?' },
];

type FieldAria = {
  'aria-invalid': boolean;
  'aria-describedby'?: string;
};

function fieldAria(name: string, errors: BookingFieldErrors, alertId: string): FieldAria {
  return errors[name]
    ? { 'aria-invalid': true, 'aria-describedby': alertId }
    : { 'aria-invalid': false };
}

type StepProps = {
  paneId: string;
  values: BookingFormValues;
  update: <K extends keyof BookingFormValues>(key: K, value: string) => void;
  errors: BookingFieldErrors;
  alertId: string;
  registerField: RegisterField;
};

export function StepAboutYou({ paneId, values, update, errors, alertId, registerField }: StepProps) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${paneId}-owner-name`}>Your Name</label>
          <input
            id={`${paneId}-owner-name`}
            ref={registerField('ownerName')}
            type="text"
            className="form-control"
            placeholder="First & last name"
            autoComplete="name"
            value={values.ownerName}
            onChange={(e) => update('ownerName', e.target.value)}
            {...fieldAria('ownerName', errors, alertId)}
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${paneId}-phone`}>Phone Number</label>
          <input
            id={`${paneId}-phone`}
            ref={registerField('phone')}
            type="tel"
            className="form-control"
            placeholder="(347) 000-0000"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => update('phone', e.target.value)}
            {...fieldAria('phone', errors, alertId)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${paneId}-email`}>Email Address</label>
          <input
            id={`${paneId}-email`}
            ref={registerField('email')}
            type="email"
            className="form-control"
            placeholder="you@email.com"
            autoComplete="email"
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
            {...fieldAria('email', errors, alertId)}
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${paneId}-neighborhood`}>Neighborhood</label>
          <select
            id={`${paneId}-neighborhood`}
            className="form-control form-select"
            autoComplete="off"
            value={values.neighborhood}
            onChange={(e) => update('neighborhood', e.target.value)}
          >
            {NEIGHBORHOOD_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export function StepYourDog({ paneId, values, update, errors, alertId, registerField }: StepProps) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${paneId}-dog-name`}>Dog&apos;s Name</label>
          <input
            id={`${paneId}-dog-name`}
            ref={registerField('dogName')}
            type="text"
            className="form-control"
            placeholder="What's their name?"
            autoComplete="off"
            value={values.dogName}
            onChange={(e) => update('dogName', e.target.value)}
            {...fieldAria('dogName', errors, alertId)}
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${paneId}-breed-age`}>Breed &amp; Age</label>
          <input
            id={`${paneId}-breed-age`}
            ref={registerField('breedAge')}
            type="text"
            className="form-control"
            placeholder="e.g. Golden, 3 years"
            autoComplete="off"
            value={values.breedAge}
            onChange={(e) => update('breedAge', e.target.value)}
            {...fieldAria('breedAge', errors, alertId)}
          />
        </div>
      </div>

      <div data-survey="vaccinations" className="form-group" style={{ marginBottom: '20px' }}>
        <label htmlFor={`${paneId}-vaccinations`}>Is your dog up to date on vaccinations?</label>
        <select
          id={`${paneId}-vaccinations`}
          className="form-control form-select"
          autoComplete="off"
          value={values.vaccinations}
          onChange={(e) => update('vaccinations', e.target.value)}
        >
          {VACCINATION_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </>
  );
}

export function StepCare({ paneId, values, update }: StepProps) {
  return (
    <>
      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label htmlFor={`${paneId}-service-interest`}>Service Interested In</label>
        <select
          id={`${paneId}-service-interest`}
          className="form-control form-select"
          autoComplete="off"
          value={values.serviceInterest}
          onChange={(e) => update('serviceInterest', e.target.value)}
        >
          {SERVICE_INTEREST_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div data-survey="walk-frequency" className="form-group" style={{ marginBottom: '20px' }}>
        <label htmlFor={`${paneId}-walk-frequency`}>Preferred walk frequency</label>
        <select
          id={`${paneId}-walk-frequency`}
          className="form-control form-select"
          autoComplete="off"
          value={values.walkFrequency}
          onChange={(e) => update('walkFrequency', e.target.value)}
        >
          {WALK_FREQUENCY_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </>
  );
}

type QuirksProps = {
  paneId: string;
  reactivity: string[];
  toggleReactivity: (option: string) => void;
  allergies: string[];
  toggleAllergy: (option: string) => void;
  allergyOther: string;
  setAllergyOther: (value: string) => void;
  errors: BookingFieldErrors;
  alertId: string;
  registerField: RegisterField;
};

export function StepQuirks({
  paneId,
  reactivity,
  toggleReactivity,
  allergies,
  toggleAllergy,
  allergyOther,
  setAllergyOther,
  errors,
  alertId,
  registerField,
}: QuirksProps) {
  return (
    <>
      <div data-survey="reactivity" className="form-group" style={{ marginBottom: '20px' }}>
        <label id={`${paneId}-reactivity-label`}>Is your dog fearful or reactive around any of the following?</label>
        <p style={{ fontSize: '12px', color: 'var(--mid-gray)', marginBottom: '10px', marginTop: '2px' }}>
          Select all that apply
        </p>
        <div
          role="group"
          aria-labelledby={`${paneId}-reactivity-label`}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}
        >
          {REACTIVITY_OPTIONS.map((option) => (
            <label
              key={option}
              htmlFor={`${paneId}-reactivity-${option.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--charcoal)', fontWeight: 400, padding: '8px 12px', border: `1px solid ${reactivity.includes(option) ? 'var(--sage-dark)' : 'var(--light-gray)'}`, borderRadius: 'var(--radius)', background: reactivity.includes(option) ? 'var(--sage-light, #edf3db)' : 'white', transition: 'all 0.15s' }}
            >
              <input
                id={`${paneId}-reactivity-${option.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                type="checkbox"
                checked={reactivity.includes(option)}
                onChange={() => toggleReactivity(option)}
                style={{ accentColor: 'var(--sage-dark)', width: '15px', height: '15px', flexShrink: 0 }}
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      <div data-survey="allergies" className="form-group" style={{ marginBottom: '20px' }}>
        <label id={`${paneId}-allergies-label`}>Is your dog allergic to anything?</label>
        <p style={{ fontSize: '12px', color: 'var(--mid-gray)', marginBottom: '10px', marginTop: '2px' }}>
          Select all that apply
        </p>
        <div role="group" aria-labelledby={`${paneId}-allergies-label`} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ALLERGY_OPTIONS.map((option) => (
            <label
              key={option}
              htmlFor={`${paneId}-allergy-${option.toLowerCase()}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--charcoal)', fontWeight: 400, padding: '8px 14px', border: `1px solid ${allergies.includes(option) ? 'var(--sage-dark)' : 'var(--light-gray)'}`, borderRadius: 'var(--radius)', background: allergies.includes(option) ? 'var(--sage-light, #edf3db)' : 'white', transition: 'all 0.15s' }}
            >
              <input
                id={`${paneId}-allergy-${option.toLowerCase()}`}
                type="checkbox"
                checked={allergies.includes(option)}
                onChange={() => toggleAllergy(option)}
                style={{ accentColor: 'var(--sage-dark)', width: '15px', height: '15px', flexShrink: 0 }}
              />
              {option}
            </label>
          ))}
        </div>
        {allergies.includes('Other') && (
          <>
            <label htmlFor={`${paneId}-allergy-other`} style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              Please specify the allergy
            </label>
            <input
              id={`${paneId}-allergy-other`}
              ref={registerField('allergyOther')}
              type="text"
              className="form-control"
              placeholder="Please specify"
              autoComplete="off"
              value={allergyOther}
              onChange={(e) => setAllergyOther(e.target.value)}
              style={{ marginTop: '10px' }}
              {...fieldAria('allergyOther', errors, alertId)}
            />
          </>
        )}
      </div>
    </>
  );
}

type WrapUpProps = {
  paneId: string;
  notes: string;
  onNotesChange: (value: string) => void;
  phoneConsult: boolean;
  onPhoneConsultChange: (value: boolean) => void;
  errors: BookingFieldErrors;
  alertId: string;
  registerField: RegisterField;
};

export function StepWrapUp({
  paneId,
  notes,
  onNotesChange,
  phoneConsult,
  onPhoneConsultChange,
  errors,
  alertId,
  registerField,
}: WrapUpProps) {
  return (
    <>
      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label htmlFor={`${paneId}-notes`}>Anything we should know?</label>
        <textarea
          id={`${paneId}-notes`}
          ref={registerField('notes')}
          className="form-control"
          rows={3}
          placeholder="Quirks, anxieties, medication needs, building access info — anything helpful"
          autoComplete="off"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          {...fieldAria('notes', errors, alertId)}
        />
      </div>

      <label
        htmlFor={`${paneId}-phone-consult`}
        data-survey="phone-consult"
        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '16px', border: `1px solid ${phoneConsult ? 'var(--sage-dark)' : 'var(--light-gray)'}`, borderRadius: 'var(--radius)', background: phoneConsult ? 'var(--sage-light, #edf3db)' : 'white', marginBottom: '24px', transition: 'all 0.15s' }}
      >
        <input
          id={`${paneId}-phone-consult`}
          type="checkbox"
          checked={phoneConsult}
          onChange={(e) => onPhoneConsultChange(e.target.checked)}
          style={{ accentColor: 'var(--sage-dark)', width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }}
        />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '3px' }}>
            Request a phone consultation instead
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mid-gray)' }}>
            Prefer to talk first? We&apos;ll call you to answer questions before scheduling.
          </div>
        </div>
      </label>
    </>
  );
}
