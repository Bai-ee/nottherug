const TRUST_CARDS: Array<{ title: string; copy: string; icon: React.ReactNode }> = [
  {
    title: 'Fully Insured & Bonded',
    copy: "Not The Rug carries comprehensive pet care liability insurance and is fully bonded. In the unlikely event of an accident or property issue, you're protected. We'll share proof of insurance on request.",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
  {
    title: 'Background-Checked Team',
    copy: "Every member of our team undergoes a comprehensive background check before their first walk. We vet our walkers as carefully as you'd vet someone with a key to your home — because that's exactly what they have.",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  },
  {
    title: 'GPS Tracking on Every Walk',
    copy: 'Every walk is GPS logged. You receive a post-walk route map showing exactly where your dog went, how long they walked, and when they returned. No guessing, no vague check-ins.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  {
    title: 'Double-Leash Safety Method',
    copy: 'Every dog is walked with our secure collar-and-harness system, supported by a leash belt for added protection. Two points of contact help keep your dog safe, and every walker follows our no-phone-while-walking policy, completes hands-on safety training, and receives regular gear checks.',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  },
  {
    title: 'Max 3 Dogs Per Walk',
    copy: "We cap every group walk at three dogs. This is a safety standard and a quality standard. Your dog gets genuine attention — not a chaotic pack of strangers that can't be safely managed.",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
];

export default function TrustCards() {
  return (
    <div className="grid-2" style={{ gap: '32px', marginBottom: '64px' }}>
      {TRUST_CARDS.map((card) => (
        <div className="trust-card" key={card.title}>
          <div className="trust-icon-box">{card.icon}</div>
          <div>
            <h4>{card.title}</h4>
            <p>{card.copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
