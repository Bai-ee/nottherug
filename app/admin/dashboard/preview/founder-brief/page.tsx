'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getIdToken, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function FounderBriefPreviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [html, setHtml] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser?.email) { router.push('/admin'); return; }
      const snap = await getDoc(doc(db, 'admins', firebaseUser.email));
      if (!snap.exists()) { router.push('/admin'); return; }
      setUser(firebaseUser);

      try {
        const token = await getIdToken(firebaseUser, true);
        const res = await fetch('/admin/preview/founder-brief?format=json', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Preview load failed (${res.status})`);
        }
        const data = (await res.json()) as { subject: string; html: string };
        setSubject(data.subject);
        setHtml(data.html);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Preview load failed');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string>('');

  async function send(opts: { runFirst: boolean }) {
    if (!user || sending) return;
    const msg = opts.runFirst
      ? 'Run a fresh brief AND send the founder brief email?\n\nNote: on Vercel Hobby, requests time out at 60s. The brief regen often takes longer — if it times out, the cached brief will still be sent and the daily 8am ET cron will refresh the data on its next run.'
      : 'Send the current founder brief email to the configured FOUNDER_EMAIL right now?';
    if (!confirm(msg)) return;
    setSending(true);
    setSendStatus(opts.runFirst ? 'Running brief + sending…' : 'Sending…');
    try {
      const token = await getIdToken(user, true);
      const url = '/admin/founder-brief/run-and-send' + (opts.runFirst ? '' : '?skipRun=1');
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setSendStatus(`Error: ${data.error || data.sendError || `HTTP ${res.status}`}`);
        return;
      }
      setSendStatus(`Sent to ${data.sentTo} · email id ${data.emailId}`);
      // Refresh preview after a successful run
      if (opts.runFirst) {
        const tok = await getIdToken(user, true);
        const r = await fetch('/admin/preview/founder-brief?format=json', {
          headers: { Authorization: `Bearer ${tok}` },
          cache: 'no-store',
        });
        if (r.ok) {
          const d = (await r.json()) as { subject: string; html: string };
          setSubject(d.subject);
          setHtml(d.html);
        }
      }
    } catch (e) {
      setSendStatus(`Error: ${e instanceof Error ? e.message : 'Send failed'}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#55624C', color: '#EDF3DB', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(237,243,219,0.12)', background: 'rgba(50,60,38,0.96)' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          NTR Admin · Founder Brief Preview
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, opacity: 0.6 }}>{user?.email}</span>
          <button
            onClick={() => send({ runFirst: false })}
            disabled={sending}
            style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(237,243,219,0.25)', background: 'transparent', color: '#EDF3DB', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.5 : 1 }}
          >
            Send current
          </button>
          <button
            onClick={() => send({ runFirst: true })}
            disabled={sending}
            style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, padding: '8px 14px', borderRadius: 6, border: '1px solid #EDF3DB', background: '#EDF3DB', color: '#1c1c1a', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.5 : 1, fontWeight: 600 }}
          >
            Run brief + send
          </button>
          <a
            href="/admin/dashboard"
            style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(237,243,219,0.25)', color: '#EDF3DB', textDecoration: 'none' }}
          >
            Back
          </a>
        </div>
      </div>

      <nav style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid rgba(237,243,219,0.12)', background: 'rgba(50,60,38,0.96)' }}>
        <a href="/admin/dashboard" style={{ display: 'block', padding: '12px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(237,243,219,0.5)', fontFamily: 'Space Mono, monospace', textDecoration: 'none' }}>Overview</a>
        <a href="/admin/dashboard/generator" style={{ display: 'block', padding: '12px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(237,243,219,0.5)', fontFamily: 'Space Mono, monospace', textDecoration: 'none' }}>Generator</a>
        <a href="/admin/dashboard/leads" style={{ display: 'block', padding: '12px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(237,243,219,0.5)', fontFamily: 'Space Mono, monospace', textDecoration: 'none' }}>Leads</a>
        <a href="/admin/dashboard/preview/founder-brief" style={{ display: 'block', padding: '12px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#EDF3DB', borderBottom: '2px solid rgba(237,243,219,0.7)', fontFamily: 'Space Mono, monospace', textDecoration: 'none' }}>Founder Brief</a>
      </nav>

      {sendStatus ? (
        <div style={{ padding: '10px 24px', fontFamily: 'Space Mono, monospace', fontSize: 12, color: sendStatus.startsWith('Error') ? '#ffb4a2' : '#cfe1c5', borderBottom: '1px solid rgba(237,243,219,0.12)' }}>
          {sendStatus}
        </div>
      ) : null}

      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, opacity: 0.7 }}>Loading preview…</div>
        ) : error ? (
          <div style={{ color: '#ffb4a2', fontFamily: 'Space Mono, monospace', fontSize: 13 }}>{error}</div>
        ) : (
          <>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
              Subject: <strong style={{ color: '#EDF3DB' }}>{subject}</strong>
            </div>
            <iframe
              title="Founder brief email preview"
              srcDoc={html}
              style={{ width: '100%', height: 'calc(100vh - 200px)', border: '1px solid rgba(237,243,219,0.2)', borderRadius: 8, background: '#fff' }}
            />
          </>
        )}
      </div>
    </div>
  );
}
