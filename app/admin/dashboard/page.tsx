'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentPiece {
  label: string;
  note: string;
  body: string;
  flag: string;
}

interface CompetitorItem {
  name: string;
  detail: string;
}

interface EcosystemItem {
  title: string;
  body: string;
}

interface ViralItem {
  title: string;
  meta: string;
  body: string;
}

interface SourceItem {
  label: string;
  url: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const contentPieces: ContentPiece[] = [
  {
    label: 'X Post',
    note: 'READY TO POST',
    body: `Play-and-Earn isn't a rebrand. It's what $QUEST was built to do — on Solana, on-chain, since day one. Lucky Pick goes live April 15. The category already has an owner.`,
    flag: `⚠ April 15 date stated as confirmed ('goes live April 15'). Per rules, Lucky Pick target is April 15, 2026, but exact dates should not be stated unless fully confirmed.`,
  },
  {
    label: 'X Thread Opener',
    note: 'POST FIRST, BUILD THREAD AFTER',
    body: `The industry just quietly retired "Play-to-Earn." Play-and-Earn is the new frame. No Solana project has planted a flag in it yet. 1/`,
    flag: `⚠ Opening line 'The industry just quietly retired' reads slightly passive and narrative-focused. Could be more terse and lead-heavy per 'Terse Drama' pillar.`,
  },
  {
    label: 'Discord Announcement',
    note: 'POST IN #ANNOUNCEMENTS',
    body: `The broader gaming space is shifting from "Play-to-Earn" to "Play-and-Earn" — and we've been building that model since before the term existed. Token-bound NFTs, the mining protocol, fair $QUEST distribution. That's not us catching a trend. Lucky Pick drops April 15, and the category already has a name on it.`,
    flag: `⚠ Same April 15 confirmation issue. 'Lucky Pick drops April 15' states it as fact when target date is TBA-adjacent.`,
  },
  {
    label: 'Content Angle',
    note: 'STRATEGIST REVIEW',
    body: `RavenQuest's Staking Season 2 is surfacing "$QUEST token earning" in category searches and creating real brand confusion for Critters Quest on Solana. Simultaneously, the Play-and-Earn vocabulary shift is live across crypto media with no dominant Solana claimant. This thread executes a two-move play: establish Critters Quest as the definitional Play-and-Earn project on Solana using existing infrastructure proof points (token-bound NFTs, mining protocol, MEs, BPS, $QUEST fair distribution), then use Lucky Pick on April 15 as forward momentum — proof that the earn loop is about to get a major new entry point.`,
    flag: `⚠ Competitor "RavenQuest" mentioned — default direction is no competitor references. Review: is this context newsworthy enough to justify?`,
  },
];

const competitors: CompetitorItem[] = [
  {
    name: 'RavenQuest',
    detail: `Running Staking Season 2 with '$QUEST token earning' APR language in active category search results. Direct brand term collision risk for Critters Quest's $QUEST token.`,
  },
  {
    name: 'Wildcard',
    detail: `Season 1 ends early May 2026 — overlaps with Critters Quest mainnet launch. Audience attention will be fragmented in the same window.`,
  },
  {
    name: 'Parallel TCG',
    detail: `Mobile expansion (iOS/Android) planned Q1 2026 with $PRIME token growth expected. Competing for play-and-earn mindshare during Critters' critical launch period.`,
  },
  {
    name: 'Pudgy Penguins',
    detail: `Continuing multi-vertical IP expansion (Dreamworks, Random House, hardware). Sets mainstream legitimacy benchmark. Not a direct competitor but raises bar for brand credibility.`,
  },
];

const ecosystemItems: EcosystemItem[] = [
  {
    title: `Play-and-Earn replaces Play-to-Earn as dominant industry framing`,
    body: `Industry-wide pivot confirmed across Bitrue, GlobalStraits, CoinPaper. Games must be fun independent of financial rewards. Critters Quest mechanics (faction warfare, quest explorer, daily events) map directly — this language should be adopted immediately in all copy.`,
  },
  {
    title: `Utility-anchored NFT value over speculative scarcity`,
    body: `Bitrue explicitly frames NFT value as anchored to in-game utility and relevance. Critters' token-bound Master Edition NFTs with wallet accounts and clone systems are a direct fit for this framing.`,
  },
  {
    title: `Sustainable tokenomics as trust signal`,
    body: `Market now values sinks, crafting systems, and diversified revenue to prevent hyperinflation. Lucky Pick's fair distribution mining protocol is a direct answer to this concern and should be framed as such.`,
  },
];

const viralItems: ViralItem[] = [
  {
    title: `Web3 gaming 'Play-and-Earn' vs old 'Play-to-Earn' framing is actively being written about — no single Solana project has planted a flag in this vocabulary shift`,
    meta: '96h window',
    body: `Critters Quest positions as the Solana project that actually embodies the Play-and-Earn shift — token-bound NFTs, mining protocol, fair distribution — not just talking about it`,
  },
  {
    title: `RavenQuest Staking Season 2 surfacing '$QUEST token earning' in category searches — creating brand confusion for Critters Quest`,
    meta: '48h window',
    body: `Proactively own $QUEST brand identity in thread content before confusion compounds — make it unambiguous which project is $QUEST on Solana`,
  },
];

const sources: SourceItem[] = [
  { label: 'Competitors: RavenQuest', url: 'https://dappradar.com' },
  { label: 'Competitors: Pudgy Penguins', url: 'https://opensea.io' },
  { label: 'Viral Opportunities: Web3 gaming...', url: 'https://bitrue.com' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || !firebaseUser.email) {
        router.push('/admin');
        return;
      }
      const ref = doc(db, 'admins', firebaseUser.email);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        router.push('/admin');
        return;
      }
      setUser(firebaseUser);
      setAuthChecked(true);
    });
    return () => unsub();
  }, [router]);

  async function handleSignOut() {
    await signOut(auth);
    router.push('/admin');
  }

  if (!authChecked) {
    return (
      <>
        <style>{fonts}</style>
        <div style={s.loadingPage}>
          <p style={s.loadingLabel}>[LOADING...]</p>
        </div>
      </>
    );
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ' — ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();

  return (
    <>
      <style>{fonts}</style>
      <div style={s.page}>

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <div id="admin-topbar" style={s.topBar}>
          <div style={s.topBarInner}>
            <span style={s.topBarBrand}>NTR</span>
            <div style={s.topBarRight}>
              <span style={s.topBarEmail}>{user?.email}</span>
              <button
                onClick={handleSignOut}
                style={s.signOutBtn}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                SIGN OUT
              </button>
            </div>
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div id="admin-hero-section" style={s.hero}>
          <div style={s.heroInner}>
            <div style={s.heroEyebrow}>
              <span style={s.heroDot} />
              <span style={s.heroEyebrowText}>Founder Intelligence · Brooklyn Dog Walking</span>
            </div>
            <h1 style={s.heroTitle}>Critters Quest</h1>
            <p style={s.heroSubtitle}>Daily Brief</p>
            <p style={s.heroGreeting}>Hello Team</p>
            <p style={s.heroDate}>{dateLabel}</p>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div id="admin-dashboard-content" style={s.content}>

          {/* SECTION 1 — OUR WORLD */}
          <section id="admin-section-our-world" style={s.section}>
            <SectionHeader eyebrow="our world" title="Our World" />

            <SubHead label="Weather Impact" />
            <div style={s.weatherBox}>
              <p style={s.fallbackText}>No weather impact surfaced this cycle.</p>
            </div>

            <div style={{ marginTop: '28px' }}>
              <SubHead label="Review Insights" />
              <p style={s.fallbackText}>No review insights detected this cycle.</p>
            </div>
          </section>

          {/* SECTION 2 — TODAY'S CONTENT */}
          <section id="admin-section-content" style={s.section}>
            <SectionHeader eyebrow="content ready to post" title="Today's Content" />

            <div style={s.pieceList}>
              {contentPieces.map((piece) => (
                <ContentPieceCard key={piece.label} piece={piece} />
              ))}
            </div>
          </section>

          {/* SECTION 3 — OPERATIONAL CONTEXT */}
          <section id="admin-section-context" style={s.section}>
            <SectionHeader eyebrow="context" title="Operational Context" />

            <SubHead label="Competitors" />
            <div style={s.itemList}>
              {competitors.map((c) => (
                <div key={c.name} style={s.itemRow}>
                  <p style={s.itemTitle}>{c.name}</p>
                  <p style={s.itemBody}>{c.detail}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '28px' }}>
              <SubHead label="KOLs" />
              <p style={s.fallbackText}>No KOL activity detected this cycle.</p>
            </div>

            <div style={{ marginTop: '28px' }}>
              <SubHead label="Local Events" />
              <p style={s.fallbackText}>No local events or holiday hooks surfaced this cycle.</p>
            </div>

            <div style={{ marginTop: '28px' }}>
              <SubHead label="What's Happening in the Ecosystem" />
              <div style={s.itemList}>
                {ecosystemItems.map((item) => (
                  <div key={item.title} style={s.itemRow}>
                    <p style={s.itemTitle}>{item.title}</p>
                    <p style={s.itemBody}>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '28px' }}>
              <SubHead label="Viral Opportunities" />
              <div style={s.itemList}>
                {viralItems.map((item) => (
                  <div key={item.title} style={s.itemRow}>
                    <p style={s.itemTitle}>{item.title}</p>
                    <p style={s.itemMeta}>{item.meta}</p>
                    <p style={s.itemBody}>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 4 — QUALITY SCORE */}
          <section id="admin-section-quality" style={s.section}>
            <SectionHeader eyebrow="guardian review" title="Quality Score" />

            <div style={s.qualityBanner}>
              REVIEW REQUIRED — 93/100
            </div>

            <div style={s.flagItem}>
              <p style={s.flagItemText}>
                [MAJOR][voice] content_angle: Competitor &quot;RavenQuest&quot; mentioned — default direction is no competitor references. Review: is this context newsworthy enough to justify?
              </p>
            </div>
          </section>

          {/* SECTION 5 — SOURCES */}
          <section id="admin-section-sources" style={{ ...s.section, borderBottom: 'none' }}>
            <SectionHeader eyebrow="references" title="Sources" />

            <div style={s.itemList}>
              {sources.map((src) => (
                <div key={src.label} style={s.itemRow}>
                  <p style={s.itemTitle}>{src.label}</p>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={s.sourceLink}
                  >
                    {src.url}
                  </a>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={s.sectionHeaderBlock}>
      <p style={s.sectionEyebrow}>{eyebrow.toUpperCase()}</p>
      <h2 style={s.sectionTitle}>{title}</h2>
      <div style={s.sectionRule} />
    </div>
  );
}

function SubHead({ label }: { label: string }) {
  return (
    <div style={s.subHead}>
      <span style={s.subHeadDot} />
      <span style={s.subHeadLabel}>{label}</span>
    </div>
  );
}

function ContentPieceCard({ piece }: { piece: ContentPiece }) {
  return (
    <div style={s.pieceCard}>
      <div style={s.pieceHeaderRow}>
        <span style={s.pieceLabel}>{piece.label}</span>
        <span style={s.pieceNote}>{piece.note}</span>
      </div>
      <div style={s.pieceBody}>
        <p style={s.pieceBodyText}>{piece.body}</p>
      </div>
      {piece.flag && (
        <div style={s.pieceFlag}>
          <p style={s.pieceFlagText}>{piece.flag}</p>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300..700&family=Outfit:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #1F2318; }
`;

const s: Record<string, React.CSSProperties> = {
  // Loading
  loadingPage: {
    minHeight: '100vh',
    background: '#1F2318',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLabel: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '13px',
    color: '#4E5A42',
    letterSpacing: '0.06em',
  },

  // Page shell
  page: {
    minHeight: '100vh',
    background: '#1F2318',
    fontFamily: 'Outfit, sans-serif',
  },

  // Top bar
  topBar: {
    position: 'sticky',
    top: 0,
    height: '48px',
    background: '#1F2318',
    borderBottom: '1px solid #2E3828',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
  },
  topBarInner: {
    width: '100%',
    maxWidth: '760px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarBrand: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '11px',
    color: '#7A9068',
    letterSpacing: '0.08em',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  topBarEmail: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '11px',
    color: '#4E5A42',
    letterSpacing: '0.04em',
  },
  signOutBtn: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '11px',
    color: '#C4674B',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '0.06em',
    padding: 0,
    transition: 'opacity 0.15s',
  },

  // Hero
  hero: {
    width: '100%',
    background: '#4E5A42',
    padding: '52px 24px 44px',
  },
  heroInner: {
    maxWidth: '760px',
    margin: '0 auto',
  },
  heroEyebrow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  heroDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#B4C89E',
    flexShrink: 0,
  },
  heroEyebrowText: {
    fontFamily: 'Fraunces, serif',
    fontStyle: 'italic',
    fontSize: '13px',
    color: '#E8D4A8',
  },
  heroTitle: {
    fontFamily: 'Fraunces, serif',
    fontSize: '56px',
    fontWeight: 400,
    color: '#EEF4DB',
    lineHeight: 1.0,
  },
  heroSubtitle: {
    fontFamily: 'Fraunces, serif',
    fontStyle: 'italic',
    fontSize: '20px',
    fontWeight: 300,
    color: '#B4C89E',
    marginTop: '4px',
  },
  heroGreeting: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '16px',
    fontWeight: 500,
    color: 'rgba(238,244,219,0.88)',
    marginTop: '28px',
  },
  heroDate: {
    fontFamily: 'Fraunces, serif',
    fontStyle: 'italic',
    fontSize: '14px',
    fontWeight: 300,
    color: 'rgba(238,244,219,0.5)',
    marginTop: '4px',
  },

  // Main content wrapper
  content: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '0 24px',
  },

  // Section
  section: {
    padding: '44px 0',
    borderBottom: '1px solid #2E3828',
  },
  sectionHeaderBlock: {
    marginBottom: '28px',
  },
  sectionEyebrow: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#4E5A42',
  },
  sectionTitle: {
    fontFamily: 'Fraunces, serif',
    fontSize: '32px',
    fontWeight: 400,
    color: '#EEF4DB',
    lineHeight: 1.1,
    marginTop: '4px',
  },
  sectionRule: {
    width: '28px',
    height: '2px',
    background: '#7A9068',
    margin: '16px 0 0',
  },

  // Sub-head
  subHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  subHeadDot: {
    display: 'inline-block',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#7A9068',
    flexShrink: 0,
  },
  subHeadLabel: {
    fontFamily: 'Fraunces, serif',
    fontSize: '16px',
    fontWeight: 400,
    color: '#B4C89E',
  },

  // Item rows
  itemList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  itemRow: {
    background: '#232B1E',
    border: '1px solid #2E3828',
    borderRadius: '10px',
    padding: '14px 16px',
  },
  itemTitle: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '15px',
    fontWeight: 600,
    color: '#EEF4DB',
    marginBottom: '4px',
  },
  itemBody: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    color: '#7A9068',
    lineHeight: 1.55,
  },
  itemMeta: {
    fontFamily: 'Fraunces, serif',
    fontStyle: 'italic',
    fontSize: '13px',
    color: '#7A9068',
    marginTop: '4px',
    marginBottom: '4px',
  },

  // Weather box
  weatherBox: {
    background: '#232B1E',
    border: '1px solid #2E3828',
    borderRadius: '14px',
    padding: '20px 22px',
  },
  fallbackText: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '15px',
    fontStyle: 'italic',
    color: '#4E5A42',
  },

  // Content pieces
  pieceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  pieceCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  pieceHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  pieceLabel: {
    fontFamily: 'Fraunces, serif',
    fontSize: '19px',
    color: '#EEF4DB',
    fontWeight: 400,
  },
  pieceNote: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    color: '#7A9068',
    background: '#2E3828',
    padding: '5px 10px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
  },
  pieceBody: {
    background: '#232B1E',
    borderLeft: '3px solid #4E5A42',
    borderRadius: '0 10px 10px 0',
    padding: '16px 20px',
  },
  pieceBodyText: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '15px',
    color: '#B4C89E',
    lineHeight: 1.7,
  },
  pieceFlag: {
    background: 'rgba(196,103,75,0.08)',
    border: '1px solid rgba(196,103,75,0.2)',
    borderRadius: '10px',
    padding: '10px 14px',
    marginTop: '12px',
  },
  pieceFlagText: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    fontWeight: 500,
    color: '#C4674B',
    lineHeight: 1.5,
  },

  // Quality banner
  qualityBanner: {
    display: 'inline-flex',
    background: 'rgba(196,103,75,0.12)',
    color: '#C4674B',
    fontFamily: 'Space Mono, monospace',
    fontSize: '13px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '10px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  flagItem: {
    background: 'rgba(196,103,75,0.08)',
    border: '1px solid rgba(196,103,75,0.2)',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  flagItemText: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    fontWeight: 500,
    color: '#C4674B',
    lineHeight: 1.6,
  },

  // Sources
  sourceLink: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: '13px',
    color: '#4E5A42',
    textDecoration: 'none',
    marginTop: '4px',
    display: 'inline-block',
  },
};
