import TeamScroller from './TeamScroller';

// The team roster band — File 01 stamp, headline, then the full-bleed roster.
// The headline names the roster itself; it used to read "From the first hello
// to your dog's daily routine", which is the process strip's headline (and
// still is) — one line cannot introduce two different bands.
// Sits in the green band above the rest of the closing bands (globals.css:
// #home-team-section). Label, headline and the roster only; nothing else lives
// in this band.
export default function TeamBand() {
  return (
    <section className="section" id="home-team-section">
      <div className="container">
        <div id="home-team-block">
          <div className="home-band-block-header">
            <div className="stamp-label stamp-label-dark stamp-label-heading">File 01 · The Team</div>
            <h2 id="home-team-band-headline">Meet our team of <em style={{ fontStyle: 'normal', color: 'var(--gold-light)' }}>professionals</em></h2>
          </div>
        </div>
      </div>
      {/* Outside .container so the roster runs the full width of the section
          without viewport maths — a 100vw bleed counts the scrollbar and
          widens the page. Its own padding re-aligns the first chip with the
          heading above it. */}
      <TeamScroller />
    </section>
  );
}
