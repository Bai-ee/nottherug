// Trust bar — the scene splitter between the hero and the rates section. The
// items scroll as one continuous line; the set is rendered twice in the source
// so the CSS marquee can loop seamlessly (same approach as ProofMarquee).
function TrustItems() {
  return (
    <>
        <div className="trust-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          NAPPS Certified
        </div>
        <div className="trust-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Fully Insured &amp; Bonded
        </div>
        <div className="trust-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          GPS-Tracked Every Walk
        </div>
        <div className="trust-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Background-Checked Team
        </div>
        <div className="trust-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Max 3 Dogs Per Walk
        </div>
    </>
  );
}

export default function TrustBar() {
  return (
    <div className="trust-bar" id="home-trust-marquee-bar">
      <div className="trust-bar-track" id="trust-bar-track">
        <TrustItems />
        <TrustItems />
      </div>
    </div>
  );
}
