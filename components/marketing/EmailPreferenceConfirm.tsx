'use client';

import { useState } from 'react';
import Link from 'next/link';

const COPY: Record<string, { title: string; body: string; button: string; done: string }> = {
  newsletter: {
    title: 'Get Not The Rug news?',
    body: 'Occasional updates from Not The Rug. Every email has an unsubscribe link.',
    button: 'Yes, add me to the newsletter',
    done: 'Done — you’re on the list.',
  },
  contact: {
    title: 'Can Luis contact you?',
    body: 'Luis will reach out by email about your free Meet & Greet.',
    button: 'Yes, Luis can contact me',
    done: 'Thanks — Luis will be in touch.',
  },
};

/**
 * One Confirm button. Nothing is recorded by opening the link (mail scanners
 * open links); only this button records the yes, and only once it is saved
 * does the page say so.
 */
export default function EmailPreferenceConfirm({ id, kind, token }: { id: string; kind: string; token: string }) {
  const copy = COPY[kind];
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function confirm() {
    setState('saving');
    setError('');
    try {
      const res = await fetch('/api/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, a: kind, t: token }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState('done');
        return;
      }
      setState('error');
      setError(data.error || 'Something went wrong. Please try again.');
    } catch {
      setState('error');
      setError('We couldn’t reach the server. Please try again.');
    }
  }

  if (!copy || !id || !token) {
    return (
      <div id="email-preferences-panel" className="alt-time-panel alt-time-success-panel">
        <h1 className="alt-time-title">This link is incomplete</h1>
        <p className="alt-time-explainer">Reply to our email instead and we’ll take care of it.</p>
        <Link className="btn btn-primary booking-forward-btn btn-sm" href="/">Go to the site</Link>
      </div>
    );
  }

  return (
    <div id="email-preferences-panel" className="alt-time-panel alt-time-success-panel">
      <h1 id="email-preferences-title" className="alt-time-title">{state === 'done' ? copy.done : copy.title}</h1>
      {state === 'done' ? (
        <Link id="email-preferences-home-link" className="btn btn-primary booking-forward-btn btn-sm" href="/">Back to the site</Link>
      ) : (
        <>
          <p className="alt-time-explainer">{copy.body}</p>
          <div className="alt-time-actions alt-time-success-actions">
            <button
              type="button"
              id="email-preferences-confirm-btn"
              className="btn btn-primary booking-forward-btn btn-accent"
              disabled={state === 'saving'}
              onClick={confirm}
            >
              {state === 'saving' ? 'Saving…' : copy.button}
            </button>
          </div>
          <p id="email-preferences-error" className="form-alert form-alert-slot" role="alert">{state === 'error' ? error : ''}</p>
          <p className="form-note">Changed your mind? Just close this page — nothing is saved unless you press the button.</p>
        </>
      )}
    </div>
  );
}
