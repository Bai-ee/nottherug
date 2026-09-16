import {
  PHONE_DISPLAY,
  PHONE_HREF,
  EMAIL_DISPLAY,
  EMAIL_HREF,
  ADDRESS_LINE_1,
  ADDRESS_LINE_2,
  RESPONSE_HOURS,
  RESPONSE_TIME_NOTE,
  SERVICE_AREA_NOTE,
} from '@/lib/content/contact';
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/content/site';
import TrackedCtaAnchor from './TrackedCtaAnchor';

// Verified contact details — moved here from the SPA's `?page=contact`
// content (app/page.tsx), which was reachable only inside the toggling
// virtual-page system and is now the real /contact page. Same copy, real
// tel:/mailto: links, no fake form (R02).
export default function ContactInfoCard() {
  return (
    <div id="contact-info-card-shell">
      <div className="contact-card">
        <div className="contact-method">
          <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
          <div>
            <h4>Call or Text</h4>
            <p>The fastest way to reach us. Luis personally responds to all messages.</p>
            <TrackedCtaAnchor href={PHONE_HREF} id="contact-phone-link" cta="contact_phone" page="contact" style={{ display: 'block', marginTop: '10px' }}>{PHONE_DISPLAY}</TrackedCtaAnchor>
          </div>
        </div>
        <div className="contact-method">
          <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
          <div>
            <h4>Email</h4>
            <p>For new client intake, less urgent inquiries, or detailed questions.</p>
            <TrackedCtaAnchor href={EMAIL_HREF} id="contact-email-link" cta="contact_email" page="contact" style={{ display: 'block', marginTop: '10px' }}>{EMAIL_DISPLAY}</TrackedCtaAnchor>
          </div>
        </div>
        <div className="contact-method">
          <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
          <div>
            <h4>Service Area</h4>
            <p>{SERVICE_AREA_NOTE}</p>
            <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--mid-gray)' }}>{ADDRESS_LINE_1}<br />{ADDRESS_LINE_2}</p>
          </div>
        </div>
        <div className="contact-method">
          <div className="contact-method-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div>
            <h4>Response Hours</h4>
            <p>{RESPONSE_HOURS}</p>
            <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--mid-gray)' }}>{RESPONSE_TIME_NOTE}</p>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--charcoal)', borderRadius: 'var(--radius-lg)', padding: '32px', marginTop: '24px', color: 'white' }}>
        <div style={{ marginBottom: '12px' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '8px', color: 'white' }}>Follow us on Instagram</h4>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '16px' }}>Daily walk photos, dog spotlights, neighborhood content, and the occasional chaos.</p>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener" className="btn btn-outline-white btn-sm" style={{ display: 'inline-flex' }}>{INSTAGRAM_HANDLE}</a>
      </div>
    </div>
  );
}
