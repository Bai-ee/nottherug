const REVIEWS: Array<{ initials: string; name: string; meta: string; text: string }> = [
  {
    initials: 'JY', name: 'Jessica Y.', meta: 'Williamsburg · Yelp',
    text: "Luis and team are truly the best of the best. It's not easy to trust just anyone with our beloved fur baby, but Luis's professionalism and kindness combined with the GPS tracking he provides puts even the most nervous pet parent (me!!!) at ease.",
  },
  {
    initials: 'JA', name: 'Jayne A.', meta: 'Williamsburg · Yelp',
    text: "Luis is the guy you want your fur babies to be taken care of by. We have used him for over two years now and couldn't even begin to tell you how grateful we are to have him! He has saved us so many times with our busy work schedules. From their normal walk, we get text updates and pics every day. He's even helped us with the rehab of one of our dogs recovering from surgery — adjusting walks and carrying our guy outside to help him heal. Seriously — hire Not The Rug. They won't disappoint.",
  },
  {
    initials: 'KT', name: 'Kassie T.', meta: 'Williamsburg · Yelp',
    text: 'Luis and his amazing team are the best! Our two dogs adore him and Reana, our primary walker. You can trust Luis to take care of your dog as if it was his own. He is also flexible and accommodating with schedule changes. Your dogs will be in great hands!',
  },
  {
    initials: 'HM', name: 'Hayley M.', meta: 'Williamsburg · Yelp',
    text: 'They were so awesome with my dog and super patient with me. Daily updates on how the walk went, cute photos, and the price is really nice for a longer walk duration. My dog LOVES Nuria!',
  },
];

export default function ReviewsMasonry() {
  return (
    <div className="reviews-masonry">
      {REVIEWS.map((review) => (
        <div className="review-card card-hover" key={review.initials}>
          <div className="review-mark">&quot;</div>
          <div className="stars">★★★★★</div>
          <p className="review-text">{review.text}</p>
          <div className="review-author">
            <div className="review-avatar"><div className="review-avatar-ph">{review.initials}</div></div>
            <div><div className="review-name">{review.name}</div><div className="review-meta">{review.meta}</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}
