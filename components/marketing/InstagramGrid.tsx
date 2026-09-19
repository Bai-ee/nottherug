import { INSTAGRAM_POSTS, type InstagramPost } from '@/lib/content/instagram';
import { INSTAGRAM_URL } from '@/lib/content/site';

// The five latest Instagram posts as taped polaroids, between the service-area
// band and the contact sheet. Content lives in lib/content/instagram.ts — this
// file only lays it out. Tiles alternate tilt so the row reads as a pinned-up
// strip rather than a stock social widget.
const TILT_CLASSES = ['polaroid-tilt-left', 'polaroid-tilt-right'];

// Instagram's own shortening: 4820 -> 4.8K, 12400 -> 12K.
function formatCount(value: number): string {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands < 10 ? thousands.toFixed(1).replace(/\.0$/, '') : Math.round(thousands)}K`;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3c5 0 9 3.4 9 7.6 0 4.2-4 7.6-9 7.6a10.7 10.7 0 0 1-2.6-.3L4 21l1.3-3.8C3.2 15.8 3 13.3 3 10.6 3 6.4 7 3 12 3z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.1v13.8L19.5 12 8 5.1z" />
    </svg>
  );
}

// Reels report views, photos report likes and comments — whichever counts the
// post actually carries are the ones that print. A post given none falls back
// to the link cue alone, so nothing here ever shows an invented number.
function TileStats({ post }: { post: InstagramPost }) {
  const stats: Array<{ key: string; icon: React.ReactNode; value: number; label: string }> = [];
  if (post.views !== undefined) stats.push({ key: 'views', icon: <PlayIcon />, value: post.views, label: 'views' });
  if (post.likes !== undefined) stats.push({ key: 'likes', icon: <HeartIcon />, value: post.likes, label: 'likes' });
  if (post.comments !== undefined) stats.push({ key: 'comments', icon: <CommentIcon />, value: post.comments, label: 'comments' });

  return (
    <div className="instagram-tile-stats">
      {stats.length > 0 && (
        <div className="instagram-tile-stats-row">
          {stats.map((stat) => (
            <span className="instagram-tile-stat" key={stat.key}>
              {stat.icon}
              <span>{formatCount(stat.value)}</span>
              {/* The glyph carries the meaning visually; screen readers get the word. */}
              <span className="sr-only"> {stat.label}</span>
            </span>
          ))}
        </div>
      )}
      <span className="instagram-tile-stats-cue">View on Instagram</span>
    </div>
  );
}

export default function InstagramGrid() {
  return (
    <section className="section" id="home-instagram-section">
      <div className="container">
        <div id="home-instagram-header">
          <div className="stamp-label stamp-label-dark stamp-label-heading">Roll 03 · Instagram</div>
          <h2 id="home-instagram-headline">Find us on <em style={{ fontStyle: 'normal', color: 'var(--gold-light)' }}>Instagram</em></h2>
        </div>

        {/* Scroll-snaps on mobile, five across on desktop — see globals.css. */}
        <ul id="home-instagram-grid">
          {INSTAGRAM_POSTS.map((post, i) => (
            <li className="instagram-tile" key={post.src}>
              <a
                className={`polaroid ${TILT_CLASSES[i % TILT_CLASSES.length]}`}
                href={post.permalink ?? INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="polaroid-window instagram-tile-window">
                  {/* Plain img: these are fixed local assets sized for the tile,
                      and the rest of the marketing surface does not use next/image. */}
                  <img src={post.src} alt={post.alt} loading="lazy" decoding="async" width={900} height={900} />
                  <TileStats post={post} />
                </div>
                <div className="polaroid-caption instagram-tile-caption">{post.caption}</div>
              </a>
            </li>
          ))}
        </ul>

        <div id="home-instagram-follow-row">
          <a className="btn btn-primary btn-accent" id="home-instagram-follow-cta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            Follow us on Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
