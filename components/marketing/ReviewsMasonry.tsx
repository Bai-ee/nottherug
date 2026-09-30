/**
 * Yelp reviews carry a star rating; Reddit comments do not, so their cards
 * show no stars and link to the comment itself. Reddit quotes are verbatim
 * (source: "Not The Rug — Reddit Mentions", 2026-09-29).
 */
const REVIEWS: Array<{ initials: string; name: string; meta: string; text: string; href?: string }> = [
  {
    initials: 'ZD', name: 'u/Zealousideal_Door392', meta: 'r/williamsburg · Reddit',
    text: 'Try Luis and his team from Not The Rug. Great, locally owned.',
    href: 'https://www.reddit.com/r/williamsburg/comments/1s2ys0x/comment/ocbskur/',
  },
  {
    initials: 'ZD', name: 'u/Zealousideal_Door392', meta: 'r/williamsburg · Reddit',
    text: 'Not The Rug is great',
    href: 'https://www.reddit.com/r/williamsburg/comments/1g52hdf/comment/lsa0zsu/',
  },
  {
    initials: 'JY', name: 'Jessica Y.', meta: 'Williamsburg · Yelp',
    text: "Luis and team are truly the best of the best. It's not easy to trust just anyone with our beloved fur baby, but Luis's professionalism and kindness combined with the GPS tracking he provides puts even the most nervous pet parent (me!!!) at ease.",
  },
  {
    initials: 'HM', name: 'Hayley M.', meta: 'Williamsburg · Google',
    text: 'They were so awesome with my dog and super patient with me. Daily updates on how the walk went, cute photos, and the price is really nice for a longer walk duration. My dog LOVES Nuria!',
  },
  {
    initials: 'JA', name: 'Jayne A.', meta: 'Williamsburg · Yelp',
    text: "Luis is the guy you want your fur babies to be taken care of by. We have used him for over two years now and couldn't even begin to tell you how grateful we are to have him! He has saved us so many times with our busy work schedules. From their normal walk, we get text updates and pics every day. He's even helped us with the rehab of one of our dogs recovering from surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug. They won't disappoint.",
  },
  {
    initials: 'KT', name: 'Kassie T.', meta: 'Williamsburg · Yelp',
    text: 'Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own. He is also flexible and accommodating with schedule changes. Your dogs will be in great hands!',
  },
];

export default function ReviewsMasonry() {
  return (
    <div className="reviews-masonry">
      {REVIEWS.map((review) => (
        <div className="review-card card-hover" key={review.href ?? review.initials}>
          <div className="review-mark">&quot;</div>
          {review.href ? null : <div className="stars">★★★★★</div>}
          <p className="review-text">{review.text}</p>
          <div className="review-author">
            <div className="review-avatar"><div className="review-avatar-ph">{review.initials}</div></div>
            <div>
              <div className="review-name">{review.name}</div>
              <div className="review-meta">
                {review.href ? (
                  <a href={review.href} target="_blank" rel="noopener">{review.meta}</a>
                ) : (
                  review.meta
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
