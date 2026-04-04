'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewItem    { name: string; url: string; body: string; takeaway: string; }
interface ContentPiece  { label: string; note: string; body: string; flags: string[]; }
interface PartnerItem   { name: string; url?: string; body: string; }
interface LocalEvent    { title: string; date: string; body: string; takeaway: string; }
interface DemandSignal  { title: string; body: string; }
interface ContentOpp    { title: string; url?: string; body: string; }
interface SourceItem    { label: string; url: string; }

// ─── Static data ──────────────────────────────────────────────────────────────

const weatherText = `67°F, patchy morning fog clearing to mostly cloudy, 7% precip chance, 10mph winds. First warm spring day of the season.`;

const reviewItems: ReviewItem[] = [
  {
    name: 'Yelp',
    url: 'https://www.yelp.com/biz/not-the-rug-brooklyn',
    body: `No new reviews detected. Count remains at 34.`,
    takeaway: `Maintain soft ask cadence with current clients. Do not push aggressively — brand voice is warm and personal, not transactional.`,
  },
];

const contentPieces: ContentPiece[] = [
  {
    label: 'Instagram Post Copy',
    note: 'ready to post',
    body: `67 degrees and Brooklyn dogs are losing their minds in the best way.\n\nFirst real spring day of the year. The parks are filling up, the sidewalks finally smell like something other than February, and every dog on our routes has an extra gear today. Longer sniff stops. Tighter tail wags. That full-body shake at the door when we show up.\n\nWe've been doing this since 2011 and April still catches us by surprise a little. The city turns back on and the dogs feel it first.\n\nIf you've been thinking about getting a walker ahead of summer, now's a good time to reach out. DM us or find the link in bio.\n\n#WilliamsburgDogs #BrooklynDogWalker #NotTheRug`,
    flags: [
      `⚠ Competitor "Wag" mentioned — default direction is no competitor references. Review: is this context newsworthy enough to justify?`,
      `⚠ Weather specificity (67°F) cannot be verified as current-date sourced data. Per factual rules, specific temperatures must come from current weather data or live search results.`,
      `⚠ The phrase 'We've been doing this since 2011' is correct but slightly static in tone. Given the Neighborhood Fluency and Trust Through Specifics pillars, the statement could lean more into what 13+ years in Williamsburg specifically means (e.g., 'We've watched these blocks and these dogs change for over a decade').`,
    ],
  },
  {
    label: 'Content Angle',
    note: 'strategy recap',
    body: `This post uses today's 67°F weather as a real, time-sensitive content signal rather than a manufactured hook. The strategy is neighborhood authority — positioning NTR as a team that actually works these streets every day and notices what the dogs notice, rather than a service that shows up when booked. The behavioral observation (dogs having an extra gear on the first warm day) does two things: it gives dog owners a moment of recognition that earns trust, and it subtly signals operational experience without making a claim. The soft CTA captures any warm-weather demand from owners who are thinking about summer coverage. Separately, the Hug Your Dog Day post (April 10) should be shot today while the light and temperature hold — a natural, unstaged photo of a walker with a familiar client dog, with one honest line about the relationship. Draft and schedule before end of day so the window doesn't close over the weekend.`,
    flags: [
      `⚠ Hug Your Dog Day reference (April 10) is included in the strategy but not verified as a real, current dog-related holiday for the current or upcoming date. Per rules, only reference verified holidays.`,
    ],
  },
];

const partners: PartnerItem[] = [
  {
    name: 'Williamsburg-area veterinary practices',
    body: `National Pet ID Week (April 17–23) creates a natural co-content moment around microchipping and ID tags. NTR's GPS walk tracking is a complementary message.`,
  },
  {
    name: 'NAPPS (National Association of Professional Pet Sitters)',
    url: 'https://www.petsitters.org',
    body: `Membership offers certification programs, networking, referral opportunities, and discounted bonding/insurance. $165/year with 10-day trial. Adds third-party credibility signal to website and intake materials.`,
  },
];

const localEvents: LocalEvent[] = [
  {
    title: 'National Hug Your Dog Day',
    date: '2026-04-10',
    body: `Content deadline is now one week out. Post must be ready to schedule by end of this week.`,
    takeaway: `Warm, personal photo of Luis or a walker with a client dog. One honest line about the relationship built over time. No staging needed.`,
  },
  {
    title: 'National Pet Day + Dog Therapy Appreciation Day',
    date: '2026-04-11',
    body: `Double holiday on the same date adds content depth. Pet Day drives broad engagement; Therapy Day enables a more specific, trust-building angle.`,
    takeaway: `Lean into the emotional support and consistency NTR provides — positions Luis and team as more than a service, aligns with therapy appreciation framing honestly.`,
  },
  {
    title: 'National Dog Bite Prevention Week',
    date: '2026-04-12 to 2026-04-18',
    body: `High credibility opportunity. NTR's protocols (double leash/collar, no pack walking, supervised training) directly validate safe handling practices.`,
    takeaway: `One educational post explaining NTR's safety approach in plain language. Positions brand as professional and safety-conscious without being preachy. No local competitor is expected to run this lane.`,
  },
  {
    title: 'National Pet ID Week',
    date: '2026-04-17 to 2026-04-23',
    body: `Referral content opportunity — pairs naturally with local vets and groomers in the Williamsburg referral ecosystem.`,
    takeaway: `Share a reminder about microchipping, ID tags, and GPS tracking. NTR's own GPS walk tracking is a natural tie-in. Could co-post or tag a local vet partner.`,
  },
  {
    title: 'Adopt a Shelter Pet Day / National Therapy Animal Day',
    date: '2026-04-30',
    body: `End-of-month content anchor. Lower urgency now but worth slotting into the April content calendar.`,
    takeaway: `New adopter angle — NTR's onboarding and personalized approach is ideal for first-time dog owners post-adoption.`,
  },
];

const demandSignals: DemandSignal[] = [
  {
    title: `First warm spring day (67°F) drives park and outdoor activity surge`,
    body: `McCarren and Domino Park will see significantly increased foot traffic today. Dog owners who have been avoiding winter walks may re-engage with care routines or seek professional walkers for increased activity needs.`,
  },
  {
    title: `Yelp review friction as a demand signal`,
    body: `A confirmed Yelp review references difficulty finding a Brooklyn dog walker due to long intake forms and waitlists at competitors. NTR's accessibility and responsiveness is a differentiator that should be surfaced in content and intake messaging.`,
  },
];

const contentOpps: ContentOpp[] = [
  {
    title: `First warm spring walk — live from the neighborhood`,
    body: `67°F today is the first genuinely warm spring day. Authentic in-the-moment content will outperform anything staged later.`,
  },
  {
    title: `Hug Your Dog Day — relationship, not performance`,
    url: 'https://www.4knines.com/blogs/news/dog-holidays',
    body: `April 10 is one week out. Window to shoot, edit, and schedule closes by end of this weekend.`,
  },
  {
    title: `Dog Bite Prevention Week — NTR's safety protocols explained`,
    url: 'https://www.4knines.com/blogs/news/dog-holidays',
    body: `April 12–18. No local competitor is expected to run educational safety content. NTR's double-leash/collar method and no-pack-walking policy are exactly what this week validates.`,
  },
];

const qualityFlags: string[] = [
  `[MAJOR][voice] instagram_post_copy: Competitor "Wag" mentioned — default direction is no competitor references. Review: is this context newsworthy enough to justify?`,
  `[MAJOR][factual] instagram_post_copy: Weather specificity (67°F) cannot be verified as current-date sourced data. Per factual rules, specific temperatures must come from current weather data or live search results.`,
];

const sources: SourceItem[] = [
  { label: 'Review Insights: Yelp', url: 'https://www.yelp.com/biz/not-the-rug-brooklyn' },
  { label: 'Partnership / Referral Opportunities: NAPPS (National Association of Professional Pet Sitters)', url: 'https://www.petsitters.org' },
  { label: 'Content Opportunities: Hug Your Dog Day — relationship, not performance', url: 'https://www.4knines.com/blogs/news/dog-holidays' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Outfit:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #1F2318; }

  .da { background: #1F2318; color: #B4C89E; font-family: 'Outfit', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; }

  /* TOPBAR */
  .da-top { position: sticky; top: 0; z-index: 20; height: 48px; background: #1F2318; border-bottom: 1px solid #2E3828; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; }
  .da-top-l { display: flex; align-items: center; gap: 14px; }
  .da-brand { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #4E5A42; }
  .da-vsep  { width: 1px; height: 14px; background: #2E3828; }
  .da-brief-id { font-family: 'Fraunces', serif; font-size: 14px; font-weight: 400; color: #EEF4DB; }
  .da-top-r { display: flex; align-items: center; gap: 20px; }
  .da-topdate { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.04em; color: #4E5A42; }
  .da-topemail { font-family: 'Space Mono', monospace; font-size: 11px; color: #4E5A42; }
  .da-signout { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #C4674B; background: none; border: none; cursor: pointer; padding: 0; transition: color 150ms; }
  .da-signout:hover { color: #EEF4DB; }

  /* ── NAV ── */
  .da-nav { display: flex; align-items: center; border-bottom: 1px solid #2E3828; background: #1A1E14; padding: 0 32px; }
  .da-nav-link { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #4E5A42; padding: 12px 16px; border-bottom: 2px solid transparent; text-decoration: none; transition: color 150ms; display: block; }
  .da-nav-link:hover { color: #B4C89E; }
  .da-nav-link-active { color: #EEF4DB; border-bottom-color: #B4C89E; }

  /* HEADER */
  .da-header { display: grid; grid-template-columns: 1fr 360px; gap: 1px; background: #2E3828; border-bottom: 1px solid #2E3828; }
  .da-header-identity { background: #4E5A42; padding: 48px 40px 44px; position: relative; overflow: hidden; }
  .da-header-identity::after { content: ''; position: absolute; top: 0; right: 0; width: 200px; height: 200px; background: radial-gradient(circle at top right, rgba(180,200,158,0.12) 0%, transparent 65%); pointer-events: none; }
  .da-eyebrow-row { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
  .da-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #B4C89E; flex-shrink: 0; }
  .da-eyebrow-txt { font-family: 'Fraunces', serif; font-style: italic; font-size: 13px; font-weight: 300; color: #E8D4A8; letter-spacing: 0.02em; }
  .da-hero-title { font-family: 'Fraunces', serif; font-size: clamp(36px, 4vw, 52px); font-weight: 400; color: #EEF4DB; line-height: 1.0; margin-bottom: 4px; }
  .da-hero-sub { font-family: 'Fraunces', serif; font-style: italic; font-size: 18px; font-weight: 300; color: #B4C89E; margin-bottom: 28px; }
  .da-hero-greeting { font-size: 15px; font-weight: 500; color: rgba(238,244,219,0.85); margin-bottom: 4px; }
  .da-hero-date { font-family: 'Fraunces', serif; font-style: italic; font-size: 13px; font-weight: 300; color: rgba(238,244,219,0.45); }
  .da-quality-widget { background: #252E1F; padding: 40px 36px; display: flex; flex-direction: column; justify-content: center; }
  .da-widget-lbl { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #4E5A42; margin-bottom: 12px; }
  .da-quality-num { font-family: 'Fraunces', serif; font-size: 88px; font-weight: 400; color: #EEF4DB; line-height: 1.0; letter-spacing: -0.02em; }
  .da-quality-denom { font-family: 'Space Mono', monospace; font-size: 16px; color: #4E5A42; margin-top: 4px; margin-bottom: 20px; }
  .da-seg-bar { display: flex; gap: 3px; margin-bottom: 20px; }
  .da-seg { height: 6px; flex: 1; border-radius: 1px; }
  .da-seg-filled { background: #B4C89E; }
  .da-seg-empty  { background: #2E3828; }
  .da-review-badge { display: inline-flex; align-items: center; gap: 6px; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #C4674B; background: rgba(196,103,75,0.1); border: 1px solid rgba(196,103,75,0.25); padding: 5px 10px; border-radius: 4px; }
  .da-badge-dot { width: 4px; height: 4px; border-radius: 50%; background: #C4674B; }

  /* STATS */
  .da-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #2E3828; border-bottom: 1px solid #2E3828; margin-bottom: 40px; }
  .da-stat { background: #252E1F; padding: 20px 24px; }
  .da-stat-val { font-family: 'Fraunces', serif; font-size: 40px; font-weight: 400; line-height: 1.0; margin-bottom: 6px; }
  .da-stat-lbl { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #4E5A42; }

  /* PAGE */
  .da-page { max-width: 1100px; margin: 0 auto; padding: 0 32px 80px; }

  /* SECTION */
  .da-section { margin-bottom: 40px; }
  .da-section-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #2E3828; }
  .da-section-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #4E5A42; }
  .da-section-title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 400; color: #EEF4DB; }
  .da-section-rule { width: 20px; height: 2px; background: #7A9068; border-radius: 1px; flex-shrink: 0; align-self: center; }
  .da-sub { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #4E5A42; padding: 10px 0; border-bottom: 1px solid #2E3828; margin-bottom: 12px; }

  /* 2-COL GRID */
  .da-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #2E3828; border: 1px solid #2E3828; border-radius: 10px; overflow: hidden; margin-bottom: 40px; }
  .da-grid-cell { background: #252E1F; padding: 24px; }
  .da-grid-cell-lbl { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #4E5A42; margin-bottom: 14px; }
  .da-weather-text { font-size: 14px; color: #B4C89E; line-height: 1.6; }
  .da-review-item { border-top: 1px solid #2E3828; padding-top: 12px; margin-top: 12px; }
  .da-review-item:first-child { border-top: none; padding-top: 0; margin-top: 0; }
  .da-review-name { font-size: 13px; font-weight: 600; color: #EEF4DB; margin-bottom: 4px; }
  .da-review-body { font-size: 13px; color: #5C6455; line-height: 1.5; margin-bottom: 6px; }
  .da-takeaway { font-size: 12px; color: #7A9068; font-style: italic; line-height: 1.5; border-left: 2px solid #3A4532; padding-left: 10px; }

  /* CONTENT CARDS */
  .da-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 40px; }
  .da-card { background: #252E1F; border: 1px solid #2E3828; border-radius: 10px; padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; }
  .da-card-wide { grid-column: 1 / -1; }
  .da-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .da-card-label { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 400; color: #EEF4DB; line-height: 1.2; }
  .da-card-note { flex-shrink: 0; font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 0.07em; text-transform: uppercase; color: #4E5A42; background: #2E3828; padding: 4px 8px; border-radius: 3px; white-space: nowrap; align-self: flex-start; margin-top: 3px; }
  .da-card-body { font-size: 14px; color: #7A9068; line-height: 1.7; border-left: 2px solid #3A4532; padding-left: 14px; white-space: pre-line; }
  .da-card-flags { display: grid; gap: 8px; }
  .da-card-flag { font-size: 13px; font-weight: 500; color: #C4674B; background: rgba(196,103,75,0.07); border: 1px solid rgba(196,103,75,0.18); border-radius: 6px; padding: 9px 12px; line-height: 1.5; }

  /* CONTEXT ROWS */
  .da-context-rows { border: 1px solid #2E3828; border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
  .da-context-row { padding: 14px 18px; border-bottom: 1px solid #2E3828; background: #252E1F; }
  .da-context-row:last-child { border-bottom: none; }
  .da-context-name { font-size: 13px; font-weight: 600; color: #EEF4DB; margin-bottom: 4px; }
  .da-context-meta { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.04em; color: #4E5A42; margin-bottom: 4px; }
  .da-context-detail { font-size: 13px; color: #5C6455; line-height: 1.5; }
  .da-context-takeaway { font-size: 12px; color: #7A9068; font-style: italic; line-height: 1.5; border-left: 2px solid #3A4532; padding-left: 10px; margin-top: 8px; }
  .da-empty { font-size: 14px; color: #4E5A42; font-style: italic; margin-bottom: 24px; }
  .da-link { color: #7A9068; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  .da-link:hover { color: #EEF4DB; }

  /* QUALITY */
  .da-quality-section { display: grid; grid-template-columns: 200px 1fr; gap: 24px; margin-bottom: 40px; align-items: start; }
  .da-q-widget { background: #252E1F; border: 1px solid #2E3828; border-radius: 10px; padding: 24px; }
  .da-q-lbl { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #4E5A42; margin-bottom: 8px; }
  .da-q-num { font-family: 'Fraunces', serif; font-size: 64px; font-weight: 400; color: #EEF4DB; line-height: 1.0; }
  .da-q-denom { font-family: 'Space Mono', monospace; font-size: 13px; color: #4E5A42; margin-bottom: 16px; }
  .da-q-segs { display: flex; gap: 3px; margin-bottom: 16px; }
  .da-q-seg { height: 5px; flex: 1; border-radius: 1px; }
  .da-q-banner { display: inline-flex; align-items: center; gap: 6px; font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 0.07em; text-transform: uppercase; color: #C4674B; background: rgba(196,103,75,0.1); border: 1px solid rgba(196,103,75,0.22); padding: 4px 8px; border-radius: 3px; }
  .da-q-banner-dot { width: 4px; height: 4px; border-radius: 50%; background: #C4674B; }
  .da-flags-col { display: grid; gap: 8px; }
  .da-flag-item { font-size: 13px; color: #C4674B; background: rgba(196,103,75,0.07); border: 1px solid rgba(196,103,75,0.18); border-left: 2px solid #C4674B; border-radius: 0 8px 8px 0; padding: 12px 16px; line-height: 1.5; }

  /* SOURCES */
  .da-src-rows { border: 1px solid #2E3828; border-radius: 10px; overflow: hidden; }
  .da-src-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 13px 18px; border-bottom: 1px solid #2E3828; background: #252E1F; }
  .da-src-row:last-child { border-bottom: none; }
  .da-src-label { font-size: 13px; color: #B4C89E; }
  .da-src-url { font-family: 'Space Mono', monospace; font-size: 11px; color: #7A9068; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; white-space: nowrap; flex-shrink: 0; }
  .da-src-url:hover { color: #EEF4DB; }

  @media (max-width: 768px) {
    .da-header { grid-template-columns: 1fr; }
    .da-stats { grid-template-columns: repeat(2, 1fr); }
    .da-grid2 { grid-template-columns: 1fr; }
    .da-cards { grid-template-columns: 1fr; }
    .da-quality-section { grid-template-columns: 1fr; }
    .da-page { padding: 0 16px 60px; }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser || !firebaseUser.email) { router.push('/admin'); return; }
        const snap = await getDoc(doc(db, 'admins', firebaseUser.email));
        if (!snap.exists()) { router.push('/admin'); return; }
        setUser(firebaseUser);
        setAuthChecked(true);
      } catch (err) {
        console.error('[dashboard] Firestore check failed:', err);
        router.push('/admin');
      }
    });
    return () => unsub();
  }, [router]);

  async function handleSignOut() {
    await signOut(auth);
    router.push('/admin');
  }

  if (!authChecked) {
    return (
      <div style={{ background: '#1F2318', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400&display=swap');`}</style>
        <span style={{ fontFamily: '"Space Mono",monospace', fontSize: '11px', letterSpacing: '0.1em', color: '#4E5A42', textTransform: 'uppercase' }}>[LOADING...]</span>
      </div>
    );
  }

  // 89/100 → 9 of 10 segments filled
  const segs = Array.from({ length: 10 }, (_, i) => i < 9);

  return (
    <>
      <style>{css}</style>
      <div className="da" id="admin-dashboard-shell">

        {/* TOPBAR */}
        <div className="da-top" id="admin-topbar">
          <div className="da-top-l">
            <span className="da-brand">NTR</span>
            <div className="da-vsep" />
            <span className="da-brief-id">Not The Rug · Daily Brief</span>
          </div>
          <div className="da-top-r">
            <span className="da-topdate">FRI APR 03 2026 · 08:21</span>
            <span className="da-topemail">{user?.email}</span>
            <button className="da-signout" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        {/* NAV */}
        <nav className="da-nav" id="admin-section-nav">
          <a className="da-nav-link da-nav-link-active" href="/admin/dashboard">Overview</a>
          <a className="da-nav-link" href="/admin/dashboard/photos">Photos</a>
          <a className="da-nav-link" href="/admin/dashboard/generator">Generator</a>
        </nav>

        {/* HEADER — identity left, quality score right */}
        <div className="da-header" id="admin-brief-header">
          <div className="da-header-identity">
            <div className="da-eyebrow-row">
              <div className="da-eyebrow-dot" />
              <span className="da-eyebrow-txt">Founder Intelligence · Brooklyn Dog Walking</span>
            </div>
            <div className="da-hero-title">Not The Rug</div>
            <div className="da-hero-sub">Daily Brief</div>
            <div className="da-hero-greeting">Hello Team</div>
            <div className="da-hero-date">It&apos;s Friday, April 3 2026 — 8:21am</div>
          </div>
          <div className="da-quality-widget" id="admin-quality-hero-widget">
            <div className="da-widget-lbl">Quality Score</div>
            <div className="da-quality-num">89</div>
            <div className="da-quality-denom">/100</div>
            <div className="da-seg-bar">
              {segs.map((filled, i) => (
                <div key={i} className={`da-seg ${filled ? 'da-seg-filled' : 'da-seg-empty'}`} />
              ))}
            </div>
            <div className="da-review-badge">
              <div className="da-badge-dot" />
              Review Required
            </div>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="da-stats" id="admin-stats-strip">
          <div className="da-stat">
            <div className="da-stat-val" style={{color:'#EEF4DB'}}>2</div>
            <div className="da-stat-lbl">Content Pieces</div>
          </div>
          <div className="da-stat">
            <div className="da-stat-val" style={{color:'#EEF4DB'}}>5</div>
            <div className="da-stat-lbl">Local Events</div>
          </div>
          <div className="da-stat">
            <div className="da-stat-val" style={{color:'#C9A96E'}}>3</div>
            <div className="da-stat-lbl">Opportunities</div>
          </div>
          <div className="da-stat">
            <div className="da-stat-val" style={{color:'#C4674B'}}>2</div>
            <div className="da-stat-lbl">Flags</div>
          </div>
        </div>

        <div className="da-page">

          {/* OUR WORLD */}
          <div className="da-section" id="admin-section-our-world">
            <div className="da-section-head">
              <span className="da-section-eyebrow">Our World</span>
              <span className="da-section-title">Local Intelligence</span>
              <div className="da-section-rule" />
            </div>
            <div className="da-grid2">
              <div className="da-grid-cell">
                <div className="da-grid-cell-lbl">Weather Impact</div>
                <p className="da-weather-text">{weatherText}</p>
              </div>
              <div className="da-grid-cell">
                <div className="da-grid-cell-lbl">Review Insights</div>
                {reviewItems.map((r, i) => (
                  <div key={i} className="da-review-item">
                    <div className="da-review-name">
                      <a href={r.url} target="_blank" rel="noreferrer" className="da-link">{r.name}</a>
                    </div>
                    <div className="da-review-body">{r.body}</div>
                    <div className="da-takeaway">{r.takeaway}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TODAY'S CONTENT */}
          <div className="da-section" id="admin-section-content">
            <div className="da-section-head">
              <span className="da-section-eyebrow">Content Ready to Post</span>
              <span className="da-section-title">Today&apos;s Content</span>
              <div className="da-section-rule" />
            </div>
            <div className="da-cards">
              {contentPieces.map((piece, i) => (
                <div key={i} className={`da-card${i === 0 ? ' da-card-wide' : ''}`}>
                  <div className="da-card-head">
                    <span className="da-card-label">{piece.label}</span>
                    <span className="da-card-note">{piece.note}</span>
                  </div>
                  <div className="da-card-body">{piece.body}</div>
                  {piece.flags.length > 0 && (
                    <div className="da-card-flags">
                      {piece.flags.map((f, j) => <div key={j} className="da-card-flag">{f}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* OPERATIONAL CONTEXT */}
          <div className="da-section" id="admin-section-context">
            <div className="da-section-head">
              <span className="da-section-eyebrow">Context</span>
              <span className="da-section-title">Operational Context</span>
              <div className="da-section-rule" />
            </div>

            <div className="da-sub">Competitors</div>
            <p className="da-empty">No competitor activity detected.</p>

            <div className="da-sub">Partnership / Referral Opportunities</div>
            <div className="da-context-rows">
              {partners.map((p, i) => (
                <div key={i} className="da-context-row">
                  <div className="da-context-name">
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="da-link">{p.name}</a> : p.name}
                  </div>
                  <div className="da-context-detail">{p.body}</div>
                </div>
              ))}
            </div>

            <div className="da-sub">Local Events</div>
            <div className="da-context-rows">
              {localEvents.map((ev, i) => (
                <div key={i} className="da-context-row">
                  <div className="da-context-name">{ev.title}</div>
                  <div className="da-context-meta">{ev.date}</div>
                  <div className="da-context-detail">{ev.body}</div>
                  <div className="da-context-takeaway">{ev.takeaway}</div>
                </div>
              ))}
            </div>

            <div className="da-sub">Local Demand Signals</div>
            <div className="da-context-rows">
              {demandSignals.map((d, i) => (
                <div key={i} className="da-context-row">
                  <div className="da-context-name">{d.title}</div>
                  <div className="da-context-detail">{d.body}</div>
                </div>
              ))}
            </div>

            <div className="da-sub">Content Opportunities</div>
            <div className="da-context-rows">
              {contentOpps.map((op, i) => (
                <div key={i} className="da-context-row">
                  <div className="da-context-name">
                    {op.url ? <a href={op.url} target="_blank" rel="noreferrer" className="da-link">{op.title}</a> : op.title}
                  </div>
                  <div className="da-context-detail">{op.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* QUALITY SCORE */}
          <div className="da-section" id="admin-section-quality">
            <div className="da-section-head">
              <span className="da-section-eyebrow">Guardian Review</span>
              <span className="da-section-title">Quality Score</span>
              <div className="da-section-rule" />
            </div>
            <div className="da-quality-section">
              <div className="da-q-widget">
                <div className="da-q-lbl">Score</div>
                <div className="da-q-num">89</div>
                <div className="da-q-denom">/100</div>
                <div className="da-q-segs">
                  {segs.map((filled, i) => (
                    <div key={i} className={`da-q-seg ${filled ? 'da-seg-filled' : 'da-seg-empty'}`} />
                  ))}
                </div>
                <div className="da-q-banner">
                  <div className="da-q-banner-dot" />
                  Review Required
                </div>
              </div>
              <div className="da-flags-col">
                {qualityFlags.map((f, i) => <div key={i} className="da-flag-item">{f}</div>)}
              </div>
            </div>
          </div>

          {/* SOURCES */}
          <div className="da-section" id="admin-section-sources">
            <div className="da-section-head">
              <span className="da-section-eyebrow">References</span>
              <span className="da-section-title">Sources</span>
              <div className="da-section-rule" />
            </div>
            <div className="da-src-rows">
              {sources.map((s, i) => (
                <div key={i} className="da-src-row">
                  <span className="da-src-label">{s.label}</span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="da-src-url">{s.url}</a>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
