'use client';

import { useEffect, useState } from 'react';

type Props = {
  paneId: string;
  source: string;
  hidden?: boolean;
};

const initial = {
  ownerName: '',
  phone: '',
  email: '',
  neighborhood: 'Williamsburg',
  dogName: '',
  breedAge: '',
  serviceInterest: 'Daily Group Walks',
  spayNeuter: 'Yes',
  vaccinations: 'Yes — fully vaccinated',
  dogSocial: 'Very social — loves other dogs',
  strangerSocial: 'Loves new people',
  walkFrequency: 'Daily (Mon–Fri)',
  notes: '',
};

export default function MeetGreetForm({ paneId, source, hidden = false }: Props) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showCalendly, setShowCalendly] = useState(false);

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || '';

  // Lock background scroll + scroll page to top when the Calendly modal opens.
  useEffect(() => {
    if (!showCalendly) return;
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [showCalendly]);

  const update = <K extends keyof typeof initial>(key: K, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  async function handleSubmit() {
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/leads/meetgreet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      setForm(initial);
      if (calendlyUrl) setShowCalendly(true);
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  return (
    <div id={paneId} data-section={`meetgreet-${source}`} style={hidden ? { display: 'none' } : undefined}>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '6px' }}>Let&apos;s meet your dog</h3>
      <p style={{ color: 'var(--mid-gray)', fontSize: '14px', marginBottom: '28px' }}>
        Fill this out and we&apos;ll reach out within 2 hours on weekdays to schedule your free visit.
      </p>

      <div className="form-row">
        <div className="form-group">
          <label>Your Name</label>
          <input type="text" className="form-control" placeholder="First & last name"
            value={form.ownerName} onChange={e => update('ownerName', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input type="tel" className="form-control" placeholder="(347) 000-0000"
            value={form.phone} onChange={e => update('phone', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" className="form-control" placeholder="you@email.com"
            value={form.email} onChange={e => update('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Neighborhood</label>
          <select className="form-control form-select"
            value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)}>
            <option>Williamsburg</option>
            <option>Greenpoint</option>
            <option>Bushwick</option>
            <option>Bed-Stuy</option>
            <option>Park Slope</option>
            <option>East Williamsburg</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Dog&apos;s Name</label>
          <input type="text" className="form-control" placeholder="What's their name?"
            value={form.dogName} onChange={e => update('dogName', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Breed &amp; Age</label>
          <input type="text" className="form-control" placeholder="e.g. Golden, 3 years"
            value={form.breedAge} onChange={e => update('breedAge', e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label>Service Interested In</label>
        <select className="form-control form-select"
          value={form.serviceInterest} onChange={e => update('serviceInterest', e.target.value)}>
          <option>Daily Group Walks</option>
          <option>Walk + Training Sessions</option>
          <option>Puppy Visits</option>
          <option>Senior Dog Care</option>
          <option>Boarding / Sitting</option>
          <option>Not sure yet</option>
        </select>
      </div>

      <div data-survey="spay-neuter" className="form-group" style={{ marginBottom: '20px' }}>
        <label>Is your dog spayed or neutered?</label>
        <select className="form-control form-select"
          value={form.spayNeuter} onChange={e => update('spayNeuter', e.target.value)}>
          <option>Yes</option>
          <option>No</option>
          <option>Not yet — scheduled</option>
        </select>
      </div>

      <div data-survey="vaccinations" className="form-group" style={{ marginBottom: '20px' }}>
        <label>Is your dog up to date on vaccinations?</label>
        <select className="form-control form-select"
          value={form.vaccinations} onChange={e => update('vaccinations', e.target.value)}>
          <option>Yes — fully vaccinated</option>
          <option>Mostly — a few pending</option>
          <option>No</option>
          <option>Not sure</option>
        </select>
      </div>

      <div data-survey="dog-social" className="form-group" style={{ marginBottom: '20px' }}>
        <label>How does your dog do around other dogs?</label>
        <select className="form-control form-select"
          value={form.dogSocial} onChange={e => update('dogSocial', e.target.value)}>
          <option>Very social — loves other dogs</option>
          <option>Friendly with most</option>
          <option>Selective / depends on the dog</option>
          <option>Reactive or nervous</option>
          <option>Prefers to be solo</option>
        </select>
      </div>

      <div data-survey="stranger-social" className="form-group" style={{ marginBottom: '20px' }}>
        <label>How does your dog do around strangers?</label>
        <select className="form-control form-select"
          value={form.strangerSocial} onChange={e => update('strangerSocial', e.target.value)}>
          <option>Loves new people</option>
          <option>Warms up quickly</option>
          <option>Shy at first</option>
          <option>Anxious or fearful</option>
          <option>Protective / reactive</option>
        </select>
      </div>

      <div data-survey="walk-frequency" className="form-group" style={{ marginBottom: '20px' }}>
        <label>Preferred walk frequency</label>
        <select className="form-control form-select"
          value={form.walkFrequency} onChange={e => update('walkFrequency', e.target.value)}>
          <option>Once a week</option>
          <option>2–3 times a week</option>
          <option>Daily (Mon–Fri)</option>
          <option>Daily including weekends</option>
          <option>As-needed / occasional</option>
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: '24px' }}>
        <label>Anything we should know?</label>
        <textarea className="form-control" rows={3}
          placeholder="Quirks, anxieties, medication needs, building access info — anything helpful"
          value={form.notes} onChange={e => update('notes', e.target.value)} />
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
        disabled={status === 'submitting'}
        onClick={handleSubmit}
      >
        {status === 'submitting' ? 'Sending…' : 'Request My Free Meet & Greet'}
      </button>

      {status === 'success' && (
        <p className="form-note" style={{ color: 'var(--sage-light, #6b8e6b)' }}>
          ✅ Thanks! We&apos;ll be in touch within 2 hours on weekdays.
        </p>
      )}
      {status === 'error' && (
        <p className="form-note" style={{ color: '#c0392b' }}>⚠️ {errorMsg}</p>
      )}
      {status !== 'success' && status !== 'error' && (
        <p className="form-note">We respond within 2 hours Mon–Fri · No spam, ever · Your info stays private</p>
      )}

      {status === 'success' && calendlyUrl && !showCalendly && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '12px' }}
          onClick={() => setShowCalendly(true)}
        >
          Schedule your Meet &amp; Greet →
        </button>
      )}

      {showCalendly && (
        <div
          id="calendly-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendly-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28,28,26,0.82)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(8px, 2vw, 24px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCalendly(false); }}
        >
          <div
            id="calendly-modal-shell"
            style={{
              background: '#f7f5f1',
              borderRadius: '4px',
              border: '1px solid #1c1c1a',
              width: '96vw',
              height: '95vh',
              maxWidth: '1400px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            }}
          >
            <div
              id="calendly-modal-header"
              style={{
                padding: '18px 26px',
                borderBottom: '1px solid #1c1c1a',
                background: '#1c1c1a',
                color: '#EDF3DB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono, "Space Mono", "Courier New", monospace)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(237,243,219,0.6)',
                  }}
                >
                  Step 2 of 2
                </div>
                <div
                  id="calendly-modal-title"
                  style={{
                    fontFamily: 'var(--font-display, Georgia, serif)',
                    fontSize: 'clamp(16px, 2.4vw, 22px)',
                    color: '#EDF3DB',
                    letterSpacing: '-0.005em',
                    lineHeight: 1.15,
                  }}
                >
                  Schedule your Meet &amp; Greet
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowCalendly(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(237,243,219,0.35)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono, "Space Mono", "Courier New", monospace)',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  color: '#EDF3DB',
                  padding: '8px 14px',
                  flexShrink: 0,
                }}
              >
                Close ×
              </button>
            </div>
            <iframe
              id="calendly-modal-iframe"
              title="Calendly scheduling"
              src={calendlyUrl}
              style={{ flex: 1, width: '100%', border: 'none', background: '#f7f5f1' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
