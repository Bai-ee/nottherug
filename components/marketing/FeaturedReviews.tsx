import {
  FRESHEST_REVIEWS,
  GOOGLE_REVIEW_URL,
  GOOGLE_WRITE_REVIEW_URL,
  REDDIT_RECOMMENDATIONS_URL,
  REVIEW_RATINGS,
  YELP_URL,
} from '@/lib/content/site';
import UpvoteIcon from './UpvoteIcon';

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
//
// Each voice links to where it was written. Yelp reviews carry a star rating;
// a Reddit comment has none, so its card shows no stars rather than invent a
// rating. Reddit quotes are verbatim (docs source: "Not The Rug — Reddit
// Mentions", 2026-09-29).
type Review = {
  name: string;
  meta: string;
  quote: string;
  source: 'Yelp' | 'Google' | 'Reddit';
  href: string;
  rated: boolean;
  /** Shown in the star row's place for an unrated voice, so the quotes stay aligned. */
  platformNote?: string;
  /** A thread with several recommendations: each comment verbatim, with its author. */
  comments?: Array<{ quote: string; author: string }>;
};

const REVIEWS: Review[] = [
  {
    // Two unprompted recommendations in one r/williamsburg thread
    // ("Looking for a confident and reliable dogwalker east Williamsburg"),
    // 5 + 3 upvotes as of 2026-09-29. Quotes verbatim.
    name: 'r/williamsburg',
    meta: 'Rec. 01 · 2 comments',
    quote: '',
    comments: [
      { quote: 'Try Luis and his team from Not The Rug. Great, locally owned.', author: 'u/Zealousideal_Door392' },
      { quote: 'Not The Rug!! nottherug.com', author: 'u/wickrob' },
    ],
    source: 'Reddit',
    href: REDDIT_RECOMMENDATIONS_URL,
    rated: false,
    platformNote: '8 upvotes · Reddit',
  },
  {
    name: 'Jessica Y.',
    meta: 'Rev. 02 · Yelp',
    quote: "Luis and team are truly the best of the best. It's not easy to trust just anyone with our fur baby, but Luis's professionalism and kindness — combined with the GPS tracking — puts even the most nervous pet parent at ease.",
    source: 'Yelp',
    href: YELP_URL,
    rated: true,
  },
  {
    // Labelled a Google review on nottherug.com/testimonials.
    name: 'Hayley M.',
    meta: 'Rev. 03 · Google',
    quote: 'They were so awesome with my dog and super patient with me. Daily updates on how the walk went, cute photos, and the price is really nice for a longer walk duration. My dog LOVES Nuria!',
    source: 'Google',
    href: GOOGLE_REVIEW_URL,
    rated: true,
  },
  {
    name: 'Jayne A.',
    meta: 'Rev. 04 · Yelp',
    quote: "We've been with Not The Rug for over two years and couldn't be more grateful. Luis has saved us so many times with our busy schedules. He even helped rehab one of our dogs after surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug.",
    source: 'Yelp',
    href: YELP_URL,
    rated: true,
  },
];

const PLATFORM_LABEL = { google: 'Google', yelp: 'Yelp' } as const;

export default function FeaturedReviews() {
  const other = FRESHEST_REVIEWS === 'google' ? 'yelp' : 'google';
  const freshest = { ...REVIEW_RATINGS[FRESHEST_REVIEWS], label: PLATFORM_LABEL[FRESHEST_REVIEWS] };
  const otherPlatform = { ...REVIEW_RATINGS[other], label: PLATFORM_LABEL[other] };
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
            <figure className="review-card" key={review.name} data-source={review.source.toLowerCase()}>
              {review.rated ? (
                <div className="stars">★★★★★</div>
              ) : (
                <div className="stars review-platform-note">
                  <UpvoteIcon />
                  {review.platformNote}
                </div>
              )}
              {review.comments ? (
                <div className="review-thread">
                  {review.comments.map((c) => (
                    <blockquote className="review-text review-thread-comment" key={c.author}>
                      {c.quote}
                      <cite className="review-thread-author">{c.author}</cite>
                    </blockquote>
                  ))}
                </div>
              ) : (
                <blockquote className="review-text">{review.quote}</blockquote>
              )}
              <figcaption className="review-author">
                <div>
                  <div className="review-name">{review.name}</div>
                  <div className="review-meta">{review.meta}</div>
                </div>
                <a className="review-source-link" href={review.href} target="_blank" rel="noopener">
                  {review.comments ? 'Read the thread' : `Read on ${review.source}`}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Reddit first, then the ask. Leave a Review goes to Google's form
            (Google lets a business ask); Recommended on Reddit showcases the
            unprompted threads; Read reviews goes to whichever platform has
            the freshest ones (FRESHEST_REVIEWS in lib/content/site.ts). Yelp
            forbids soliciting reviews, so it is only ever a place to read. */}
        <div id="home-featured-reviews-clickout-row">
          <a
            id="home-reviews-leave-review-cta"
            className="btn btn-primary btn-accent home-reviews-clickout"
            href={GOOGLE_WRITE_REVIEW_URL}
            target="_blank"
            rel="noopener"
          >
            Leave a Review
          </a>
          <a
            id="home-reviews-reddit-clickout"
            className="btn btn-outline home-reviews-clickout"
            href={REDDIT_RECOMMENDATIONS_URL}
            target="_blank"
            rel="noopener"
          >
            Recommended on Reddit
          </a>
          <a
            id="home-reviews-read-clickout"
            className="btn btn-outline home-reviews-clickout"
            href={freshest.url}
            target="_blank"
            rel="noopener"
          >
            Read {freshest.label} reviews · ★ {freshest.rating} ({freshest.count})
          </a>
        </div>
        <p id="home-featured-reviews-other-platform">
          <a href={otherPlatform.url} target="_blank" rel="noopener">
            Also on {otherPlatform.label} · ★ {otherPlatform.rating} from {otherPlatform.count} reviews
          </a>
        </p>
      </div>
    </section>
  );
}
