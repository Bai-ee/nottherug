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
 * Images here are PLACEHOLDERS from public/dogs — replace all five before
 * this section ships.
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
    src: '/img/instagram/placeholder-01.jpg',
    alt: 'Placeholder — a dog on a Williamsburg sidewalk mid-walk',
    caption: 'Morning group walk',
    likes: 214,
    comments: 11,
  },
  {
    src: '/img/instagram/placeholder-02.jpg',
    alt: 'Placeholder — a dog waiting at a Brooklyn stoop',
    caption: 'Pickup, 9:40am',
    likes: 168,
    comments: 7,
  },
  {
    src: '/img/instagram/placeholder-03.jpg',
    alt: 'Placeholder — two dogs greeting each other on leash',
    caption: 'New friend on N 7th',
    views: 4820,
    likes: 309,
  },
  {
    src: '/img/instagram/placeholder-04.jpg',
    alt: 'Placeholder — a dog resting in the grass after a walk',
    caption: 'Post-walk nap earned',
    likes: 252,
    comments: 19,
  },
  {
    src: '/img/instagram/placeholder-05.jpg',
    alt: 'Placeholder — a dog looking up at its walker',
    caption: 'Same crew, every day',
    likes: 187,
    comments: 9,
  },
];
