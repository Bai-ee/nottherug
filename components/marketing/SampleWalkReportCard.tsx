// Sample walk-report mock shown next to the How It Works process steps.
export default function SampleWalkReportCard() {
  return (
    <div style={{ position: 'sticky', top: '100px' }}>
      <div className="label">Sample Walk Report</div>
      <div className="report-card-mock">
        <div className="rc-header">
          <div className="rc-paw"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="4" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><path d="M12 17c-2.5 0-6 1.5-6 4v1h12v-1c0-2.5-3.5-4-6-4z"/></svg></div>
          <div>
            <div className="rc-title">Walk Report — Bruno</div>
            <div className="rc-subtitle">Tuesday, March 18 · 10:15 AM</div>
          </div>
        </div>
        <div className="rc-body">
          <div className="rc-row">
            <div className="rc-icon">⏱️</div>
            <div><div className="rc-label">Duration</div><div className="rc-value">46 minutes</div></div>
          </div>
          <div className="rc-row">
            <div className="rc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 8.7 8.7 21.3c-.9.9-2.4.9-3.3 0l-2.7-2.7a2.3 2.3 0 0 1 0-3.3L15.3 2.7c.9-.9 2.4-.9 3.3 0l2.7 2.7c.9.9.9 2.4 0 3.3z"/><line x1="7.5" y1="10.5" x2="10" y2="13"/><line x1="10.5" y1="7.5" x2="13" y2="10"/><line x1="13.5" y1="4.5" x2="16" y2="7"/></svg></div>
            <div><div className="rc-label">Distance</div><div className="rc-value">1.8 miles</div></div>
          </div>
          <div className="rc-row">
            <div className="rc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22 C2 22 8 16 14 10 C20 4 22 2 22 2 C22 2 20 4 14 10 C8 16 2 22 2 22z"/><path d="M22 2 L12 12"/></svg></div>
            <div><div className="rc-label">Potty Breaks</div><div className="rc-value">2 times — all cleaned up</div></div>
          </div>
          <div className="rc-row">
            <div className="rc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 10c.7-.7 1-1.6 1-2.5a3.5 3.5 0 0 0-3.5-3.5C13.6 4 12.7 4.3 12 5L5 12c-.7.7-1 1.6-1 2.5a3.5 3.5 0 0 0 3.5 3.5c.9 0 1.8-.3 2.5-1l7-7z"/><path d="M14 10l-4 4"/></svg></div>
            <div><div className="rc-label">Treats</div><div className="rc-value">2 × Zukes Mini Naturals</div></div>
          </div>
          <div className="rc-map">
            <div className="rc-map-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> GPS Route · McCarren Park Loop</div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mid-gray)', marginBottom: '10px' }}>Walker&apos;s Note</div>
          <p style={{ fontSize: '14px', color: 'var(--charcoal)', lineHeight: '1.6', marginBottom: '16px' }}>&quot;Bruno was in great spirits today! He made a new friend at the park — a golden named Lucy. He was a bit tired on the way back so we took the shady route home. Paws cleaned, water bowl topped up. See you Thursday!&quot;</p>
          <div className="rc-photo-row">
            <div className="rc-photo img-placeholder img-ph-1" style={{ aspectRatio: '1' }}></div>
            <div className="rc-photo img-placeholder img-ph-2" style={{ aspectRatio: '1' }}></div>
            <div className="rc-photo img-placeholder img-ph-3" style={{ aspectRatio: '1' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
