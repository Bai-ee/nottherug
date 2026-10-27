/**
 * The five Instagram posts featured on the home page (see
 * components/marketing/InstagramGrid.tsx).
 *
 * Curated by hand, not fetched: @nottherug is a personal account, so the
 * Instagram Graph API is not available without converting it to a
 * Business/Creator account and carrying a 60-day access token. Editing this
 * file is the refresh mechanism.
 *
 * To swap in a real post:
 *   1. Save the post image to public/img/instagram/ (square, ~900px, jpg).
 *   2. Copy the post URL from Instagram (the "..." menu → Copy link) into
 *      `permalink` — it is what the tile links to.
 *   3. Write an `alt` that describes the photo and a short `caption`.
 *   4. Copy the real like/comment counts (or the view count, on a reel) off
 *      the post. These print on hover — never invent them, and leave the
 *      field off rather than guess: the overlay drops any count it is not
 *      given, and a tile with no counts at all simply shows the link cue.
 *
 * Current set: the account's five most-liked posts of all time, counts copied
 * off each post on 2026-10-23. #4 swapped on 2026-10-26 for a recent walker
 * post (the PSA screenshot it replaced was off-brand for the homepage). The reel (#5) carries likes and comments only —
 * Instagram does not show its view count to visitors.
 */

export interface InstagramPost {
  /** Path under /public. Square crops read best in the grid. */
  src: string;
  /** Direct post URL. Falls back to the profile when omitted. */
  permalink?: string;
  /** Describes the photo for screen readers — never "Instagram post". */
  alt: string;
  /** Short line printed under the tile, polaroid-style. Keep it under ~40 chars. */
  caption: string;
  /** Real like count off the post. Omit rather than estimate. */
  likes?: number;
  /** Real comment count off the post. Omit rather than estimate. */
  comments?: number;
  /** Reels/video only — the play count Instagram shows in place of likes. */
  views?: number;
}

export const INSTAGRAM_POSTS: readonly InstagramPost[] = [
  {
    src: '/img/instagram/post-01.jpg',
    permalink: 'https://www.instagram.com/p/BjiWqr0HwUf/',
    alt: 'A curly apricot doodle lying on a leash in a Williamsburg park',
    caption: 'Mr. Peychaud, park boss',
    likes: 169,
    comments: 7,
  },
  {
    src: '/img/instagram/post-02.jpg',
    permalink: 'https://www.instagram.com/p/BuKMHMDngJL/',
    alt: 'Two curly red doodles side by side on a sunny sidewalk, one in a red coat',
    caption: 'Cuteness overload',
    likes: 153,
    comments: 5,
  },
  {
    src: '/img/instagram/post-03.jpg',
    permalink: 'https://www.instagram.com/p/B2hA0ZzAFDZ/',
    alt: 'A walker holding a puppy on a Brooklyn sidewalk with two doodles on leash at his feet',
    caption: 'One in each color',
    likes: 129,
    comments: 11,
  },
  {
    src: '/img/instagram/post-06.jpg',
    permalink: 'https://www.instagram.com/p/DezE8plGz_2/',
    alt: 'A walker and a fluffy cream doodle looking down into the camera against a blue sky',
    caption: 'Thank you, Nuria',
    likes: 57,
    comments: 4,
  },
  {
    src: '/img/instagram/post-05.jpg',
    permalink: 'https://www.instagram.com/reel/C_f304jO8sD/',
    alt: 'The Not The Rug walkers and their dogs gathered in a Williamsburg park',
    caption: '12 years in Williamsburg',
    likes: 103,
    comments: 8,
  },
];
