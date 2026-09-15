// Scrolling social-proof marquee between the hero and How It Works. The
// track is duplicated once in the source markup so the CSS marquee loops
// seamlessly — preserved as-is.
const PROOF_ITEMS: Array<{ quote: string; author: string }> = [
  { quote: "Luis's professionalism puts even the most nervous pet parent at ease", author: 'Jessica Y., Williamsburg' },
  { quote: "Seriously — hire Not The Rug. They won't disappoint.", author: 'Jayne A., Williamsburg' },
  { quote: 'Trust Luis to take care of your dog as if it was his own', author: 'Kassie T., Williamsburg' },
  { quote: 'Daily updates, cute photos, and my dog LOVES her walker', author: 'Hayley M., Williamsburg' },
];

function ProofTrackItems({ keyPrefix }: { keyPrefix: string }) {
  return (
    <>
      {PROOF_ITEMS.map((item, i) => (
        <div key={`${keyPrefix}-item-${i}`} className="proof-item">
          <div className="stars">★★★★★</div>
          <span className="proof-quote">&quot;{item.quote}&quot;</span>
          <span className="proof-author">— {item.author}</span>
        </div>
      )).reduce<React.ReactNode[]>((acc, node, i) => {
        acc.push(node);
        acc.push(<div key={`${keyPrefix}-sep-${i}`} className="proof-sep"></div>);
        return acc;
      }, [])}
    </>
  );
}

export default function ProofMarquee() {
  return (
    <div className="social-proof-strip" id="home-proof-marquee">
      <div className="proof-track" id="proof-track">
        <ProofTrackItems keyPrefix="a" />
        <ProofTrackItems keyPrefix="b" />
      </div>
    </div>
  );
}
