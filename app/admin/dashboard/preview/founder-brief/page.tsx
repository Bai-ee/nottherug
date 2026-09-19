'use client';

import { useEffect, useState } from 'react';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { useAbortSignal, isAbortError, type GetIdToken } from '@/components/admin/adminFetch';

// Presentation runs on the site's marketing skin (app/globals.css) — the
// same `.card` paper panels, `.stamp-label` stamped headings, `.btn` paper
// buttons and `.form-note` meta text every other restyled admin page uses —
// in place of the former standalone dark theme built from inline styles.
// This page does not mount the shared AdminShell (it never did; its own
// identity bar + tab row are kept as-is, just restyled), so it wraps its own
// content in `.container` directly. The rendered brief HTML inside the
// iframe is untouched — only the chrome around it (the frame's own
// layout-only sizing rule, `#founder-brief-preview-frame`) belongs to this
// restyle.
const css = `
#founder-brief-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
#founder-brief-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
#founder-brief-actions-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
#founder-brief-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
#founder-brief-preview-frame { width: 100%; height: calc(100vh - 260px); min-height: 480px; border: 0; display: block; }
.card-pad > * + * { margin-top: 10px; }
`;

function FounderBriefPreviewPageContent({
  email,
  getToken,
}: {
  email: string;
  getToken: GetIdToken;
}) {
  const [html, setHtml] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string>('');

  const abortSignal = useAbortSignal();

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/admin/preview/founder-brief?format=json', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: abortSignal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Preview load failed (${res.status})`);
        }
        const data = (await res.json()) as { subject: string; html: string };
        setSubject(data.subject);
        setHtml(data.html);
      } catch (e) {
        if (isAbortError(e)) return;
        setError(e instanceof Error ? e.message : 'Preview load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, abortSignal]);

  async function send(opts: { runFirst: boolean }) {
    if (sending) return;
    const msg = opts.runFirst
      ? 'Run a fresh brief AND send the founder brief email?\n\nNote: on Vercel Hobby, requests time out at 60s. The brief regen often takes longer — if it times out, the cached brief will still be sent and the daily 8am ET cron will refresh the data on its next run.'
      : 'Send the current founder brief email to the configured FOUNDER_EMAIL right now?';
    if (!confirm(msg)) return;
    setSending(true);
    setSendStatus(opts.runFirst ? 'Running brief + sending…' : 'Sending…');
    try {
      const token = await getToken();
      const url = '/admin/founder-brief/run-and-send' + (opts.runFirst ? '' : '?skipRun=1');
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: abortSignal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setSendStatus(`Error: ${data.error || data.sendError || `HTTP ${res.status}`}`);
        return;
      }
      // A skip is the per-day send guard working correctly, not a failure —
      // but it is also not a send, so it must never fall through to the
      // "Sent to ..." success message below (both fields would be undefined).
      if (data.skipped) {
        setSendStatus(
          data.reason
            ? `${data.reason}${data.day ? ` (${data.day})` : ''}`
            : `Already sent today${data.day ? ` (${data.day})` : ''} — no email sent just now.`,
        );
        return;
      }
      setSendStatus(`Sent to ${data.sentTo} · email id ${data.emailId}`);
      // Refresh preview after a successful run
      if (opts.runFirst) {
        const tok = await getToken();
        const r = await fetch('/admin/preview/founder-brief?format=json', {
          headers: { Authorization: `Bearer ${tok}` },
          cache: 'no-store',
          signal: abortSignal,
        });
        if (r.ok) {
          const d = (await r.json()) as { subject: string; html: string };
          setSubject(d.subject);
          setHtml(d.html);
        }
      }
    } catch (e) {
      if (isAbortError(e)) return;
      setSendStatus(`Error: ${e instanceof Error ? e.message : 'Send failed'}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div id="founder-brief-preview-shell">
      <style>{css}</style>
      <div className="section-sm">
        <div className="container" id="founder-brief-preview-container">

          <div className="card card-pad" id="founder-brief-topbar">
            <div>
              <div className="stamp-label stamp-label-heading">NTR Admin · Founder Brief Preview</div>
            </div>
            <div id="founder-brief-topbar-right">
              <span className="form-note">{email}</span>{' '}
              <a href="/admin/dashboard" className="btn btn-outline btn-sm">Back</a>
            </div>
          </div>

          <div className="card card-pad" id="founder-brief-actions">
            <div>
              <div className="label">Send brief email</div>
              <h2>Trigger the founder brief now</h2>
            </div>
            <div id="founder-brief-actions-buttons">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => send({ runFirst: false })}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Send current →'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => send({ runFirst: true })}
                disabled={sending}
              >
                Run brief + send
              </button>
            </div>
          </div>

          <nav className="card card-pad" id="founder-brief-tabs">
            <a href="/admin/dashboard">Overview</a>
            <a href="/admin/dashboard/generator">Generator</a>
            <a href="/admin/dashboard/leads">Leads</a>
            <a href="/admin/dashboard/preview/founder-brief" className="text-sage" aria-current="page">Founder Brief</a>
          </nav>

          {sendStatus ? (
            <div className={sendStatus.startsWith('Error') ? 'form-note text-terra' : 'form-note text-sage'} id="founder-brief-send-status">
              {sendStatus}
            </div>
          ) : null}

          <div className="card card-pad" id="founder-brief-preview-panel">
            {loading ? (
              <div className="form-note">Loading preview…</div>
            ) : error ? (
              <div className="form-note text-terra">{error}</div>
            ) : (
              <>
                <div className="form-note">Subject: <strong>{subject}</strong></div>
                <iframe
                  id="founder-brief-preview-frame"
                  title="Founder brief email preview"
                  srcDoc={html}
                  // Fixture/generated report HTML is untrusted: no scripts, and never
                  // paired with allow-same-origin (that combination would let sandboxed
                  // script escape the sandbox). allow-popups lets source links in the
                  // report open in a new tab instead of silently doing nothing.
                  sandbox="allow-popups"
                />
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function FounderBriefPreviewPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <FounderBriefPreviewPageContent email={session.email} getToken={session.getToken} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
