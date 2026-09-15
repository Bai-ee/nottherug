import Link from 'next/link';
import type { NeighborhoodInfo } from '@/lib/content/coverage';

// Real JSX replacement for the SPA's `showNeighborhood()` innerHTML
// injection (R13) — same content and colors, driven by NeighborhoodInfo
// instead of a template string.
export default function NeighborhoodDetail({ hood }: { hood: NeighborhoodInfo }) {
  return (
    <>
      <div style={{ background: `${hood.color}22`, border: `1px solid ${hood.color}44`, borderRadius: 'var(--radius-lg)', padding: '48px', marginBottom: '40px' }}>
        <div className="label">{hood.seo}</div>
        <h2>Dog Walking in<br /><span style={{ color: hood.color, fontStyle: 'italic', fontFamily: 'var(--font-italic)' }}>{hood.name}</span></h2>
        <div className="divider"></div>
        <p style={{ color: 'var(--mid-gray)', fontSize: '16px', lineHeight: '1.8', maxWidth: '620px', marginBottom: '28px' }}>{hood.desc}</p>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--mid-gray)', marginBottom: '12px' }}>Parks We Walk</div>
          <div className="hood-parks">
            {hood.parks.map((park) => (
              <span key={park} className="park-tag" style={{ background: `${hood.color}33`, borderColor: `${hood.color}66`, color: 'var(--charcoal)' }}>{park}</span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '32px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <Link href="/book" className="btn btn-primary">Book a Walk in {hood.name}</Link>
          <Link href="/contact" className="btn btn-outline">Ask About {hood.name} Coverage</Link>
        </div>
      </div>
      <div className="grid-3" style={{ gap: '24px' }}>
        <div className="card card-pad">
          <div style={{ marginBottom: '12px' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '8px' }}>Your Assigned Walker</h4>
          <p style={{ fontSize: '14px', color: 'var(--mid-gray)' }}>We match you with a walker who lives or regularly works in {hood.name} — they know the neighborhood the way you know your apartment.</p>
        </div>
        <div className="card card-pad">
          <div style={{ marginBottom: '12px' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg></div>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '8px' }}>Local Park Routes</h4>
          <p style={{ fontSize: '14px', color: 'var(--mid-gray)' }}>Our walkers have season-calibrated routes for {hood.name} — shaded summer paths, dry winter routes, and parks with good off-leash hours.</p>
        </div>
        <div className="card card-pad">
          <div style={{ marginBottom: '12px' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '8px' }}>Fast Availability</h4>
          <p style={{ fontSize: '14px', color: 'var(--mid-gray)' }}>We typically have walker availability in {hood.name} within 1–2 weeks of inquiry. Contact us to check current capacity.</p>
        </div>
      </div>
    </>
  );
}
