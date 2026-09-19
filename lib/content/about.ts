/**
 * About copy shared by the /about page and the homepage story block inside
 * #home-featured-reviews-section. One source so the two surfaces cannot drift.
 */

export const FOUNDER_STORY: readonly string[] = [
  'Not The Rug was founded in 2011 by Luis, a Williamsburg resident since 2006. Before dog walking, Luis spent years in broadcasting and music, including work as a Program Director at SiriusXM Radio and consulting for Red Bull on music strategy and cultural programming.',
  'In 2008, the pace of that world pushed him to step away. He took a job walking dogs on the Upper West Side, and the work changed everything. It started with two dogs, Suzy and Oliver, and daily walks rooted in patience, observation, and trust. What began as a reset became a calling.',
  'The name is a promise: your dog won’t ruin your rug because they’ll be properly walked, genuinely cared for, and returned home happy. It’s also a nod to the neighborhood’s sense of humor. We don’t take ourselves too seriously, but we take your dog very seriously.',
  'We’ve never expanded beyond what we can do well. We don’t dispatch strangers. Every walker on our team is trained, trusted, and familiar with the neighborhood. Most importantly, they know your dog by name.',
];

export const ABOUT_STATS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '2011', label: 'Founded in Williamsburg' },
  { value: '5★', label: 'Avg. rating across platforms' },
];

/** Sits above the values grid on both surfaces. */
export const PRINCIPLES_INTRO =
  'Our walks are structured, consistent, and responsive. From pickup to drop-off, we give each dog a familiar rhythm while staying present to their pace, mood, leash cues, and body language. That repetition builds trust, helping dogs move with more ease and settle calmly when they return home.';

/** Founder portrait used by the story block on both surfaces. */
export const FOUNDER_PHOTO = '/img/team/luis-action.jpg';

/**
 * The four principles, shared by /about's values grid, the home page's
 * compact principles line, and anywhere else that states how we work.
 * `tinted` only drives the /about grid's alternating cells.
 */
export const PRINCIPLES: ReadonlyArray<{ num: string; title: string; copy: string; tinted?: boolean }> = [
  { num: '01', title: 'Consistency Over Convenience', copy: "We don't take on every client — not to be exclusive, but to protect the quality of care. We only accept new dogs when we can assign a consistent walker with the time and capacity to do the job well. Your dog deserves a familiar person, not a different face every week." },
  { num: '02', title: 'Small Groups, Real Attention', copy: "Three dogs maximum per walk. Always. It's not a marketing line. It's how we keep walks safe, calm, and attentive. Your dog gets real exercise and engagement, not crowd management.", tinted: true },
  { num: '03', title: 'Neighborhood Expertise', copy: 'We know the Williamsburg details that only come from years of daily walks: which areas of the park flood after rain, which blocks to avoid, which routes help reactive dogs feel calmer, and where to find shade in summer heat. Fifteen years builds that kind of knowledge.', tinted: true },
  { num: '04', title: 'Real People, Always Reachable', copy: "Luis's personal number is on the website, and you can text or call your walker directly. No support tickets. No call centers. Just real people who know your dog and respond when you need them." },
];
