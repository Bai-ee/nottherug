import Link from 'next/link';
import CertificationStrip from './CertificationStrip';

// Closing trust recap — safety credentials + Williamsburg-specific proof
// combined into one section, positioned right before Reviews as the site's
// final "why us" push before the ask. Copy is reused verbatim from the
// /safety and /neighborhoods/williamsburg pages (source of truth for these
// claims), same as in the original app/page.tsx.
export default function ClosingTrust() {
  return (
    <section className="section" id="home-closing-trust-section">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="label">Why Williamsburg Trusts Us</div>
          <h2>Insured, background-checked, and <em style={{ fontStyle: 'normal', color: 'var(--sage-light)' }}>local since 2011</em></h2>
        </div>
        <div className="grid-2" id="home-closing-trust-grid" style={{ gap: '56px', alignItems: 'start' }}>
          <div id="home-closing-safety-list">
            <div style={{ display: 'flex', gap: '16px', padding: '20px 0', borderBottom: '1px solid var(--light-gray)' }}>
              <div className="trust-icon-box" style={{ flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <div>
                <h4>Fully Insured &amp; Bonded</h4>
                <p>Comprehensive pet care liability insurance, fully bonded. Proof shared on request.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', padding: '20px 0', borderBottom: '1px solid var(--light-gray)' }}>
              <div className="trust-icon-box" style={{ flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
              <div>
                <h4>Background-Checked Team</h4>
                <p>Every walker vetted before their first walk — the same way you&apos;d vet anyone holding a key to your home.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', padding: '20px 0', borderBottom: '1px solid var(--light-gray)' }}>
              <div className="trust-icon-box" style={{ flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
              <div>
                <h4>GPS Tracking on Every Walk</h4>
                <p>A post-walk route map showing exactly where your dog went and how long they were out. No guessing.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', padding: '20px 0' }}>
              <div className="trust-icon-box" style={{ flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div>
                <h4>Double-Leash Safety Method</h4>
                <p>Secure collar-and-harness plus a leash belt — two points of contact on every walk, every dog.</p>
              </div>
            </div>
          </div>
          <div id="home-closing-williamsburg-pitch">
            <h3>We&apos;re a Williamsburg service, through and through</h3>
            <p style={{ fontSize: '16px', lineHeight: '1.8', marginTop: '12px' }}>We know every park, shortcut, and puddle to avoid — because we&apos;ve been walking these blocks since 2011. Not a citywide app dispatching whoever&apos;s nearest: the same local team, every time.</p>
            <div className="divider" style={{ margin: '28px 0' }}></div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link href="/book" className="btn btn-primary">Book a Walk in Williamsburg</Link>
              <Link href="/contact" className="btn btn-outline">Ask About Williamsburg Coverage</Link>
            </div>
          </div>
        </div>
        <CertificationStrip id="home-closing-cert-strip" style={{ justifyContent: 'center', marginTop: '56px' }} />
      </div>
    </section>
  );
}
