import MeetGreetForm from '@/components/MeetGreetForm';

/**
 * The "Let's Get Started" questionnaire band: stamp label, heading, the
 * dog collage and the full meet & greet form on a paper sheet.
 * Rendered on the home page (inside its closing band, as an h2) and as the
 * whole body of /signup (as that page's h1). The ids are shared on purpose —
 * every rule in app/globals.css hangs off #home-contact-sheet-* and the two
 * pages must paint identically.
 */
export default function ContactSheetSection({
  source,
  paneId,
  headingLevel = 'h2',
}: {
  /** Lead/funnel source category, e.g. 'home' or 'signup' (never free text). */
  source: string;
  /** Prefix for the form's own element ids, unique per page. */
  paneId: string;
  headingLevel?: 'h1' | 'h2';
}) {
  const Heading = headingLevel;
  return (
    <section className="section" id="home-contact-sheet-section">
      {/* Background photo — painted only inside #home-closing-band-shell
          (globals.css); parallax layer, see useCityscapeParallax. */}
      <div className="city-parallax-frame" id="home-contact-sheet-photo-frame" aria-hidden="true">
        <div className="city-parallax-art city-parallax-photo" id="home-contact-sheet-photo-art" data-city-parallax="photo" />
      </div>
      <div className="container">
        <div id="home-contact-sheet-header">
          <div id="home-contact-sheet-header-copy">
            <div className="stamp-label stamp-label-dark stamp-label-heading">Sign Up 05 · Let’s Get Started</div>
            <Heading>What We&apos;d Like to Know....</Heading>
          </div>
          {/* Decorative: the dog collage fills the empty half
              of this row on wide screens. Alt is empty on purpose — it
              carries no information the headline doesn't already give. */}
          {/* Shell takes the parallax transform; the image keeps its own
              CSS paste angle underneath. */}
          <div id="home-contact-sheet-clipping-shell" data-city-parallax="print">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              id="home-contact-sheet-clipping"
              src="/img/backgorund_dogs.png"
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              width={1536}
              height={642}
            />
          </div>
        </div>
        <div id="home-book-form-wrap" className="booking-form-wrap">
          <div className="booking-form" id="home-contact-sheet-form-sheet">
            <div className="booking-form-body">
              <MeetGreetForm paneId={paneId} source={source} layout="full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
