import Link from 'next/link';

// Featured reviews — poster treatment (globals.css: POSTER TREATMENT).
// `.review-card` / `.booking-form` class names are kept on purpose: the
// scroll-reveal batch in useSectionReveals selects on them.
export default function FeaturedReviews() {
  return (
    <section className="section" id="home-featured-reviews-section">
      <div className="container">
        <div id="home-featured-reviews-header-row">
          <div id="home-featured-reviews-header">
            <div className="stamp-label stamp-label-heading">File 01 · Voices</div>
            <h2>What our <em style={{ fontStyle: 'normal', color: 'var(--sage-dark)' }}>clients</em> say</h2>
          </div>
          <Link href="/reviews" className="btn btn-ghost">Read All Reviews</Link>
        </div>
        <div className="grid-2" id="home-featured-reviews-grid">
          <figure className="review-card" id="home-featured-review-card">
            <div className="stamp-label zine-quote-stamp">Verified · Yelp</div>
            <div className="stars">★★★★★</div>
            <blockquote className="review-text">Luis and team are truly the best of the best. It&apos;s not easy to trust just anyone with our fur baby, but Luis&apos;s professionalism and kindness — combined with the GPS tracking — puts even the most nervous pet parent at ease.</blockquote>
            <figcaption className="review-author">
              <div>
                <div className="review-name">Jessica Y.</div>
                <div className="review-meta">Rev. 01 · Williamsburg · Yelp</div>
              </div>
            </figcaption>
          </figure>
          <div id="home-featured-reviews-secondary">
            <figure className="review-card">
              <div className="stars">★★★★★</div>
              <blockquote className="review-text">We&apos;ve been with Not The Rug for over two years and couldn&apos;t be more grateful. Luis has saved us so many times with our busy schedules. He even helped rehab one of our dogs after surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug.</blockquote>
              <figcaption className="review-author">
                <div>
                  <div className="review-name">Jayne A.</div>
                  <div className="review-meta">Rev. 02 · Williamsburg · Yelp</div>
                </div>
              </figcaption>
            </figure>
            <figure className="review-card">
              <div className="stars">★★★★★</div>
              <blockquote className="review-text">Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own — flexible with schedule changes and always reliable. Your dogs will be in great hands!</blockquote>
              <figcaption className="review-author">
                <div>
                  <div className="review-name">Kassie T.</div>
                  <div className="review-meta">Rev. 03 · Williamsburg · Yelp</div>
                </div>
              </figcaption>
            </figure>
            <div id="home-featured-reviews-stat-strip">
              <a className="hero-stat-item hero-stat-link" data-variant="star" href="https://www.yelp.com/biz/not-the-rug-brooklyn-8" target="_blank" rel="noopener">
                <div className="hero-stat-num" style={{ fontSize: '28px' }}>5★</div>
                <div className="hero-stat-label">Yelp rating</div>
              </a>
              <div className="hero-stat-divider"></div>
              <a className="hero-stat-item hero-stat-link" data-variant="star" href="https://share.google/xbrJjkZt4eoHUOxBl" target="_blank" rel="noopener">
                <div className="hero-stat-num" style={{ fontSize: '28px' }}>5★</div>
                <div className="hero-stat-label">Google rating</div>
              </a>
              <div className="hero-stat-divider"></div>
              <a className="hero-stat-item hero-stat-link" href="https://share.google/xbrJjkZt4eoHUOxBl" target="_blank" rel="noopener">
                <div className="hero-stat-num" style={{ fontSize: '28px' }}>79</div>
                <div className="hero-stat-label">Verified reviews</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
