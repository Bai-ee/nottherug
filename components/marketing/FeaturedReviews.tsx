import { YELP_URL } from '@/lib/content/site';

// Client voices. The founder story and the principles both moved out to
// HomeWilliamsburgBand, which now carries the whole "who we are" argument in
// one file; the team roster moved out to TeamBand. Poster treatment throughout
// (globals.css: POSTER TREATMENT).
//
// Four equal columns, one review each: the band used to run a large featured
// pull quote beside three compact ones, so the four voices read as one loud
// and three small. They now share one column width, one type treatment and a
// bottom-aligned byline, separated by hairlines rather than card chrome. The
// rating strip is its own full-width row under the grid.
//
// The quotes render static — this section is excluded from the scroll-reveal
// batch in useSectionReveals.

// Meta line stays short on purpose: it has to hold one line inside a quarter
// column, or the hairline above the bylines steps up and down across the row.
// The neighbourhood is already all over the band's copy.
const REVIEWS: Array<{ name: string; meta: string; quote: string }> = [
  {
    name: 'Jessica Y.',
    meta: 'Rev. 01 · Yelp',
    quote: "Luis and team are truly the best of the best. It's not easy to trust just anyone with our fur baby, but Luis's professionalism and kindness — combined with the GPS tracking — puts even the most nervous pet parent at ease.",
  },
  {
    name: 'Jayne A.',
    meta: 'Rev. 02 · Yelp',
    quote: "We've been with Not The Rug for over two years and couldn't be more grateful. Luis has saved us so many times with our busy schedules. He even helped rehab one of our dogs after surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug.",
  },
  {
    name: 'Kassie T.',
    meta: 'Rev. 03 · Yelp',
    quote: 'Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own — flexible with schedule changes and always reliable. Your dogs will be in great hands!',
  },
  {
    name: 'Hayley M.',
    meta: 'Rev. 04 · Yelp',
    quote: 'They were so awesome with my dog and super patient with me. Daily updates on how the walk went, cute photos, and the price is really nice for a longer walk duration. My dog LOVES Nuria!',
  },
];

export default function FeaturedReviews() {
  return (
    <section className="section" id="home-featured-reviews-section">
      <div className="container">
        <div id="home-featured-reviews-header-row">
          <div id="home-featured-reviews-header">
            <div className="stamp-label stamp-label-heading">NTR 03 · Voices</div>
            <h2>What our <em style={{ fontStyle: 'normal', color: 'var(--sage-dark)' }}>clients</em> say</h2>
          </div>
        </div>

        <div id="home-featured-reviews-grid">
          {REVIEWS.map((review) => (
            <figure className="review-card" key={review.name}>
              <div className="stars">★★★★★</div>
              <blockquote className="review-text">{review.quote}</blockquote>
              <figcaption className="review-author">
                <div>
                  <div className="review-name">{review.name}</div>
                  <div className="review-meta">{review.meta}</div>
                </div>
                <a className="review-source-link" href={YELP_URL} target="_blank" rel="noopener">
                  Read on Yelp
                </a>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Two clickouts instead of the old rating strip: the 5-star stats and
            the hairline above them are gone, and the reviews they summarised
            are one tap away on the platforms that host them. Same URLs the
            stat items linked to. */}
        <div id="home-featured-reviews-clickout-row">
          <a
            id="home-reviews-yelp-clickout"
            className="btn btn-primary btn-accent home-reviews-clickout"
            href="https://www.yelp.com/biz/not-the-rug-brooklyn-8"
            target="_blank"
            rel="noopener"
          >
            Read our Yelp reviews
          </a>
          <a
            id="home-reviews-google-clickout"
            className="btn btn-primary btn-accent home-reviews-clickout"
            href="https://share.google/xbrJjkZt4eoHUOxBl"
            target="_blank"
            rel="noopener"
          >
            Read our Google reviews
          </a>
        </div>
      </div>
    </section>
  );
}
