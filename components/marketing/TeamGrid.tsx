import Link from 'next/link';
import { TEAM } from '@/lib/content/team';

export default function TeamGrid() {
  return (
    <div className="grid-3">
      {TEAM.map((member) => (
        <div className="team-card card-hover" key={member.name}>
          <div
            className="team-photo"
            style={{ height: '280px', backgroundImage: `url('${member.photo}')`, backgroundSize: member.photoSize, backgroundPosition: member.photoPosition }}
            role="img"
            aria-label={`${member.name}, Not The Rug dog walker`}
          ></div>
          <div className="team-info">
            <div className="team-name">{member.name}</div>
            <div className="team-role">{member.role}</div>
            <p className="team-bio">{member.bio}</p>
          </div>
        </div>
      ))}
      <div id="join-team-card" className="team-card" style={{ gridColumn: '1 / -1', border: '2px dashed var(--sage-light)', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg></div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '10px' }}>Join the team</h4>
        <p style={{ fontSize: '14px', color: 'var(--mid-gray)', marginBottom: '20px' }}>We hire experienced, passionate walkers who want to build real relationships — not just fill shifts.</p>
        <Link href="/contact" className="btn btn-outline btn-sm">Learn More</Link>
      </div>
    </div>
  );
}
