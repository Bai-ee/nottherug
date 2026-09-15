// Shared "NAPPS / Background Checked / Fully Insured / Bonded" badge row —
// identical markup on the home page's closing trust section and the /safety
// page in the source JSX, extracted once rather than duplicated.
export default function CertificationStrip({ id, style }: { id?: string; style?: React.CSSProperties }) {
  return (
    <div className="cert-strip" id={id} style={style}>
      <div className="cert-item">
        <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg></div>
        <div className="cert-label">NAPPS Member</div>
      </div>
      <div className="cert-item">
        <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
        <div className="cert-label">Background Checked</div>
      </div>
      <div className="cert-item">
        <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></div>
        <div className="cert-label">Fully Insured</div>
      </div>
      <div className="cert-item">
        <div className="cert-badge"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
        <div className="cert-label">Bonded</div>
      </div>
    </div>
  );
}
