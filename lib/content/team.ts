/**
 * The walker roster, shared by the /about team grid and the homepage team
 * scroller. One source so a hire or a bio edit lands on both surfaces.
 */

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  photo: string;
  /** Intrinsic pixel size of `photo` — used by the homepage scroller's
   *  full-photo preview (TeamScroller.tsx) so its <Image> reserves the
   *  correct aspect ratio instead of guessing one shared value across a
   *  roster of differently-cropped portraits. */
  photoWidth: number;
  photoHeight: number;
  photoSize: string;
  photoPosition: string;
  /** Pixel widths of the AVIF/WebP derivatives written for the homepage chips
   *  by scripts/build-assets.mjs (`/img/team/<slug>-w<px>.{avif,webp}`):
   *  [1x desktop chip, source width]. The JPEG in `photo` stays the /about
   *  grid + preview source and the <img> fallback. */
  chipWidths: readonly [number, number];
}

export const TEAM: readonly TeamMember[] = [
  {
    name: 'Luis', role: 'Founder',
    bio: 'A former SiriusXM Program Director and Red Bull music strategist, Luis traded the broadcast world for Brooklyn sidewalks. He founded Not The Rug in 2011 after discovering dog walking on the Upper West Side. A Williamsburg resident since 2006, he knows the blocks, the parks, and most of the dogs by name.',
    photo: '/img/team/luis.jpg', photoWidth: 675, photoHeight: 900, photoSize: '150%', photoPosition: '48% 40%',
    chipWidths: [225, 675],
  },
  {
    name: 'Lincoln', role: 'Manager',
    bio: 'Originally from South Louisiana, with roots in DownEast Maine, Lincoln grew up surrounded by animals, including dogs, miniature donkeys, and even emus. If it had four legs or feathers, she likely helped care for it. Four years ago, Lincoln moved to Brooklyn with her three Southern pups, bringing her deep respect for animals with her. Her understanding of animal behavior, along with her steady and generous approach, makes her a trusted presence on the team. Now a Williamsburg local, Lincoln feels lucky to do this work every day.',
    photo: '/img/team/lincoln.jpg', photoWidth: 506, photoHeight: 900, photoSize: '275%', photoPosition: '46% 48%',
    chipWidths: [413, 506],
  },
  {
    name: 'Marcus', role: 'Sr Walker',
    bio: "Marcus has spent his life around animals, from growing up with pets to working as a dog trainer at Petco. He brings a thoughtful understanding of how dogs communicate, learn, and respond. A theater kid, video gamer, curious thinker, and devoted animal lover, Marcus sees every walk as a chance to build trust and connection. Say hello when you see him in the neighborhood — he's always happy to meet pups and their people.",
    photo: '/img/team/marcus.jpg', photoWidth: 675, photoHeight: 900, photoSize: '275%', photoPosition: '48% 3%',
    chipWidths: [413, 675],
  },
  {
    name: 'Christian', role: 'Sr Walker',
    bio: 'Christian spent more than six years working as a chef and kitchen manager, where he developed discipline, focus, and strong attention to detail. Over time, he realized he wanted work that felt more grounded and connected. With a lifelong love for animals, Christian chose a new path that brought more balance into his life. He brings patience, care, and a steady presence to every walk, treating each dog with the same respect he would give his own.',
    photo: '/img/team/christian.jpg', photoWidth: 506, photoHeight: 900, photoSize: '170%', photoPosition: '60% 42%',
    chipWidths: [255, 506],
  },
  {
    name: 'Shawn', role: 'Walker',
    bio: "Shawn brings care, precision, and a calm presence to every walk. An artist, musician, and visual creator, he approaches dog care with patience and intention. Before joining Not The Rug, Shawn spent two years with another service and came to us wanting a more thoughtful approach to the work. He has been a strong addition to the team, and we're glad to have him.",
    photo: '/img/team/shawn.jpg', photoWidth: 675, photoHeight: 900, photoSize: '290%', photoPosition: '53% 3%',
    chipWidths: [435, 675],
  },
  {
    name: 'Yenny', role: 'Walker',
    bio: "Yenny is an experienced dog walker and a returning member of the Not The Rug team. Before joining us, she spent three years managing a doggy daycare in Long Island City, working with dogs of all personalities and energy levels. After stepping away to have her baby, Yenny is back with us and already reconnecting with the neighborhood pups. We're excited to have her back.",
    photo: '/img/team/yenny.jpg', photoWidth: 750, photoHeight: 1000, photoSize: '265%', photoPosition: '47% 9%',
    chipWidths: [398, 750],
  },
];

const POSITION_RE = /^(-?[\d.]+)%\s+(-?[\d.]+)%$/;

export interface TeamChipPhoto {
  avifSrcSet: string;
  webpSrcSet: string;
  /** Layout hint for srcset: the chip window x the photo's zoom. */
  sizes: string;
  /** <img> placement reproducing the old `background-size` (% of the window
   *  width, height auto) + `background-position` (%, %) inside the square
   *  chip window — same pixels, but a real <img> can load lazily. */
  style: { width: string; left: string; top: string };
}

/**
 * Derivative URLs and exact crop geometry for a homepage team chip.
 * A percentage background-position offsets the image by
 * (window - image) * pct on each axis; the window is square, so both axes
 * resolve against the same length and the image height is width * (h / w).
 */
export function teamChipPhoto(member: TeamMember): TeamChipPhoto {
  const size = parseFloat(member.photoSize);
  const match = POSITION_RE.exec(member.photoPosition);
  if (!match || !Number.isFinite(size)) {
    throw new Error(`Unsupported team photo crop for ${member.name}`);
  }
  const [x, y] = [parseFloat(match[1]), parseFloat(match[2])];
  const heightPct = size * (member.photoHeight / member.photoWidth);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const base = member.photo.replace(/\.jpg$/, '');
  const set = (ext: 'avif' | 'webp') =>
    member.chipWidths.map((w) => `${base}-w${w}.${ext} ${w}w`).join(', ');
  const zoom = size / 100;
  return {
    avifSrcSet: set('avif'),
    webpSrcSet: set('webp'),
    // >900px the chips are a six-up grid (~150px windows at 1440); below it
    // a swipe strip of min(62vw, 280px) prints with ~21px of paper padding.
    sizes: `(min-width: 901px) ${round(zoom * 150)}px, calc((min(62vw, 280px) - 21px) * ${zoom})`,
    style: {
      width: `${size}%`,
      left: `${round(((100 - size) * x) / 100)}%`,
      top: `${round(((100 - heightPct) * y) / 100)}%`,
    },
  };
}
