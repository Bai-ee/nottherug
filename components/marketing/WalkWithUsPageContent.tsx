import SiteNav from '@/components/SiteNav';
import SiteFooter from './SiteFooter';
import WalkerApplicationForm from '@/components/bench/WalkerApplicationForm';
import type { ApplicantUtm, TimeBlock } from '@/lib/bench/contract';

/**
 * /walk-with-us: the walker application (plans/011 §7.1), open to all
 * positions and led by the substitute-walker (on-call) framing. Built from the same band, sheet and
 * footer as /signup (SignupPageContent). The band and sheet keep the shared
 * #home-closing-band-shell / #home-contact-sheet-* ids on purpose:
 * app/globals.css paints the olive band, paper sheet and field styles off
 * those ids. Everything specific to this page carries its own walk-with-us-* id.
 */

/** The three terms of working with us, stated up front before anyone starts the form. */
const ON_CALL_TERMS = [
  {
    key: 'training',
    emphasized: true,
    stamp: 'Training first',
    title: 'We show you how we walk',
    body: 'New walkers complete training before walking on their own. You learn each dog’s care instructions and our handling protocols, then work up to walking up to three dogs at a time.',
  },
  {
    key: 'notice',
    emphasized: false,
    stamp: 'Premium rates',
    title: 'Available on short notice?',
    body: 'Substitute shifts earn a premium above our standard rate. You cover walks within 24 hours when a scheduled walker is unavailable or has an emergency. You pick the days and times you can cover, and we reach you when a shift opens.',
  },
  {
    key: 'experience',
    emphasized: false,
    stamp: 'All kinds of dogs',
    title: 'Bring what you know',
    body: 'Our clients’ dogs include puppies, seniors, big dogs and reactive dogs. Tell us what you have handled, whether professionally, as a volunteer or with your own dogs.',
  },
  {
    key: 'hours',
    emphasized: false,
    stamp: 'Part-time & full-time',
    title: 'Hours that fit you',
    body: 'We have part-time and full-time positions. Hours depend on client needs and are not guaranteed, so tell us when you can usually work.',
  },
] as const;

export default function WalkWithUsPageContent({
  timeBlocks,
  source,
  utm,
}: {
  timeBlocks: TimeBlock[];
  source?: string;
  utm: ApplicantUtm;
}) {
  return (
    <div id="walk-with-us-page-shell">
      <style>{`
        /* Same treatment as the home page's "Meet our team of professionals":
           an outlined gold stamp (over the terracotta fill the shared sheet
           header gives it) and a headline sized like that h2, last word in gold. */
        #walk-with-us-header-copy > .stamp-label-heading {
          background: transparent;
          border-color: rgba(232, 212, 168, 0.5);
          color: var(--gold-light);
        }
        #walk-with-us-headline { font-size: clamp(32px, 3.5vw, 52px); margin: 0; color: var(--cream); }
        #walk-with-us-headline em { font-style: normal; color: var(--gold-light); }
        #walk-with-us-on-call-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 14px 0 0;
          font-family: var(--font-type);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--cream);
        }
        #walk-with-us-on-call-kicker::before {
          content: '';
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--terracotta);
          box-shadow: 0 0 0 4px rgba(196, 103, 75, 0.25);
        }
        #walk-with-us-lede { color: var(--cream); max-width: none; width: 100%; margin: 14px 0 0; font-size: 16px; line-height: 1.55; }
        #walk-with-us-terms-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
          margin-top: 24px;
        }
        #walk-with-us-terms-row .walk-with-us-term {
          padding: 18px 18px 16px;
          border: 1px solid rgba(243, 236, 217, 0.35);
          border-radius: var(--radius);
          background: rgba(243, 236, 217, 0.08);
          color: var(--cream);
        }
        #walk-with-us-terms-row .walk-with-us-term .stamp-label { margin-bottom: 10px; justify-self: start; align-self: start; }
        #walk-with-us-terms-row .walk-with-us-term h2 {
          font-family: var(--font-display);
          font-size: clamp(20px, 2.2vw, 26px);
          line-height: 1.1;
          margin: 0 0 6px;
          color: var(--cream);
        }
        #walk-with-us-terms-row .walk-with-us-term p { margin: 0; font-size: 14px; line-height: 1.5; color: rgba(243, 236, 217, 0.82); }
        #walk-with-us-terms-row .walk-with-us-term[data-emphasis='true'] {
          border-color: var(--terracotta);
          background: rgba(243, 236, 217, 0.16);
          box-shadow: 0 0 0 1px var(--terracotta), 0 8px 24px rgba(0, 0, 0, 0.18);
        }
        /* Each card spans three rows of the parent grid (stamp, title, body) so
           those parts start at the same height in every card, whatever the
           length of the copy. */
        @media (min-width: 760px) {
          #walk-with-us-terms-row { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 0; column-gap: 12px; }
          #walk-with-us-terms-row .walk-with-us-term {
            display: grid;
            grid-row: span 3;
            grid-template-rows: subgrid;
            row-gap: 0;
            margin-bottom: 12px;
          }
        }
        @media (min-width: 1100px) {
          #walk-with-us-terms-row { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          #walk-with-us-terms-row .walk-with-us-term { margin-bottom: 0; }
        }
      `}</style>
      <SiteNav />
      <div id="home-closing-band-shell" style={{ paddingTop: 'var(--nav-h)' }}>
        <section className="section" id="home-contact-sheet-section" data-section="walk-with-us">
          <div className="container">
            <div id="home-contact-sheet-header">
              <div id="walk-with-us-header-copy">
                <div className="stamp-label stamp-label-dark stamp-label-heading">Now hiring · Dog Walkers</div>
                <h1 id="walk-with-us-headline">Join our <em>team</em></h1>
                <p id="walk-with-us-on-call-kicker">Williamsburg, Brooklyn</p>
                <p id="walk-with-us-lede">
                  We’re growing our team of dependable dog walkers in Williamsburg, Brooklyn. Tell us about your
                  experience and availability below. We’re especially looking for substitute walkers who can step in
                  within 24 hours of notification when a scheduled walker is unavailable or has an emergency.
                </p>
                <div id="walk-with-us-terms-row">
                  {ON_CALL_TERMS.map((t) => (
                    <div key={t.key} id={`walk-with-us-term-${t.key}`} className="walk-with-us-term" data-emphasis={t.emphasized}>
                      <span className="stamp-label">{t.stamp}</span>
                      <h2>{t.title}</h2>
                      <p>{t.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div id="home-book-form-wrap" className="booking-form-wrap">
              <div className="booking-form" id="home-contact-sheet-form-sheet">
                <div className="booking-form-body" id="walk-with-us-form-body">
                  <WalkerApplicationForm
                    paneId="walk-with-us-application"
                    timeBlocks={timeBlocks}
                    source={source}
                    utm={utm}
                    layout="full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        <SiteFooter />
      </div>
    </div>
  );
}
