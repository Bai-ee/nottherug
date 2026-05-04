import type { LatestNotTheRugBrief } from '@/lib/not-the-rug-brief/server';

const TZ = 'America/New_York';

// Email-safe font stacks (Google fonts unreliable in mail clients).
const FONT_MONO = `'Courier New', Courier, ui-monospace, monospace`;
const FONT_DISPLAY = `Georgia, 'Times New Roman', serif`;
const FONT_SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;

// Brand palette (kept verbatim).
const C = {
  canvas: '#f3efe7',
  surface: '#ffffff',
  ink: '#1c1c1a',
  inkSoft: '#3a3a36',
  mid: '#888888',
  mute: '#b3b1aa',
  rule: '#ece8df',
  cream: '#f7f5f1',
  sage: '#55624C',
  sagePale: '#EDF3DB',
  sageHaze: '#eef3e3',
  warning: '#b85c00',
  ok: '#2d7a3a',
};

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripEmoji(s: string): string {
  return s
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, '')
    .replace(/️/g, '')
    .replace(/‍/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── primitives ────────────────────────────────────────────────────────

function label(text: string, color = C.inkSoft): string {
  return `<div style="font-family:${FONT_MONO};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${color};">${escape(text)}</div>`;
}

function sectionTitle(text: string, color = C.ink): string {
  return `<div style="font-family:${FONT_DISPLAY};font-size:20px;line-height:1.15;color:${color};margin-top:6px;letter-spacing:-0.005em;">${escape(text)}</div>`;
}

function rule(color = C.rule): string {
  return `<div style="height:1px;background:${color};line-height:1px;font-size:1px;">&nbsp;</div>`;
}

function kpiCell(value: string | number, lbl: string, opts: { dark?: boolean } = {}): string {
  const bg = opts.dark ? C.ink : C.sageHaze;
  const fg = opts.dark ? C.sagePale : C.ink;
  const lblColor = opts.dark ? C.sagePale : C.sage;
  return `<td class="kpi-cell" style="padding:0;width:33.33%;vertical-align:top;">
    <div style="padding:24px 22px;background:${bg};">
      ${label(lbl, lblColor)}
      <div style="font-family:${FONT_DISPLAY};font-size:48px;line-height:1;color:${fg};margin-top:12px;letter-spacing:-0.02em;">${escape(String(value))}</div>
    </div>
  </td>`;
}

function listItem(content: string): string {
  return `<div style="padding:14px 0;border-top:1px solid ${C.rule};font-family:${FONT_SANS};font-size:14px;line-height:1.55;color:${C.ink};">${content}</div>`;
}

// ── inputs ────────────────────────────────────────────────────────────

export type FounderBriefInputs = {
  brief: LatestNotTheRugBrief;
  dashboardUrl: string;
  briefUrl: string;
  leadsUrl: string;
  generatedAt: string;
};

export function founderDailyBriefEmail(input: FounderBriefInputs): { subject: string; html: string; text: string } {
  const { brief, dashboardUrl, briefUrl, leadsUrl, generatedAt } = input;
  const summary = brief.summary;
  const lead = brief.leadStats;

  const todayLabel = lead?.today.dateLabel ?? '—';
  const todayCount = lead?.today.count ?? 0;
  const subject = `Daily brief — ${todayCount} new lead${todayCount === 1 ? '' : 's'} · ${todayLabel}`;

  // ── HERO: 3 popouts (Today's leads · Weather · Priority action) ────
  const weatherText = summary.weatherImpact || 'No weather signal recorded.';
  const priorityText = summary.scoutPriorityAction || 'No priority action saved for the latest run.';

  // Pull temp/precip/wind/range out of the long weather string for the hero tile.
  const tempMatch = weatherText.match(/max\s*temp\s*(-?\d+)\s*°?F?/i);
  const precipMatch = weatherText.match(/max\s*precip\s*(\d+)\s*%/i);
  const windMatch = weatherText.match(/max\s*wind\s*(\d+)\s*mph/i);
  const tempBig = tempMatch ? `${tempMatch[1]}°` : '—';
  const tempMeta = [
    tempMatch ? `MAX ${tempMatch[1]}°F` : null,
    precipMatch ? `${precipMatch[1]}% PRECIP` : null,
    windMatch ? `${windMatch[1]} MPH WIND` : null,
    todayLabel,
  ].filter(Boolean).join(' · ');

  const hero = `
  <!-- Top row: Weather (fixed) + Priority Action (fills) -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="hero-grid" style="border-collapse:collapse;margin-top:8px;">
    <tr>
      <td valign="top" class="hero-col hero-col-weather" style="padding:0;width:240px;vertical-align:top;">
        <div style="background:${C.sageHaze};color:${C.ink};padding:28px 24px;min-height:200px;">
          ${label("WEATHER", C.sage)}
          <div style="font-family:${FONT_DISPLAY};font-size:88px;line-height:1;letter-spacing:-0.04em;margin-top:16px;color:${C.ink};">${escape(tempBig)}</div>
          <div style="font-family:${FONT_MONO};font-size:12px;font-weight:600;color:${C.sage};opacity:0.95;margin-top:20px;letter-spacing:0.06em;">${escape(tempMeta)}</div>
        </div>
      </td>

      <td class="hero-gap" style="width:8px;padding:0;">&nbsp;</td>

      <td valign="top" class="hero-col hero-col-priority" style="padding:0;vertical-align:top;">
        <div style="background:${C.sage};color:${C.sagePale};padding:28px 26px;min-height:200px;">
          ${label("PRIORITY ACTION", C.sagePale)}
          <div style="font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${C.sagePale};margin-top:14px;">${escape(priorityText)}</div>
        </div>
      </td>
    </tr>
  </table>`;

  // ── Weather section ──────────────────────────────────────────────
  // Headline = location only (everything before the first " · " or " | ")
  const weatherHeadline = (weatherText.split(/\s[·|]\s/)[0] || weatherText).trim();

  // Body = everything after the first em-dash " — " (skips meta + temp/precip/wind block)
  const dashIdx = weatherText.indexOf(' — ');
  const weatherBodyRaw = dashIdx >= 0 ? weatherText.slice(dashIdx + 3) : '';

  // Split into sentence items; bold the lead phrase before the first em-dash/comma.
  const weatherItems = weatherBodyRaw
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(Boolean);

  function weatherListItem(sentence: string): string {
    let lead = sentence;
    let rest = '';

    // 1. Prefer em-dash split (cleanest topic | detail)
    const dashSplit = sentence.match(/^(.+?)\s+—\s+(.+)$/);
    if (dashSplit) {
      lead = dashSplit[1].trim();
      rest = dashSplit[2].trim();
    } else {
      // 2. If a parenthetical exists, lead = up through ")", rest = remainder
      const parenSplit = sentence.match(/^([^()]+\([^)]*\))\s*(.*)$/);
      if (parenSplit && parenSplit[2]) {
        lead = parenSplit[1].trim();
        rest = parenSplit[2].trim().replace(/^[,.\s]+/, '');
      } else {
        // 3. Fallback: split at first comma that is NOT inside parens
        let depth = 0;
        let cut = -1;
        for (let i = 0; i < sentence.length; i++) {
          const c = sentence[i];
          if (c === '(') depth++;
          else if (c === ')') depth--;
          else if (c === ',' && depth === 0) { cut = i; break; }
        }
        if (cut > 3) {
          lead = sentence.slice(0, cut).trim();
          rest = sentence.slice(cut + 1).trim();
        }
      }
    }

    // Trim trailing period from lead for visual cleanliness
    lead = lead.replace(/[.\s]+$/, '');

    return listItem(`
      <div style="line-height:1.4;"><strong style="font-weight:600;">${escape(stripEmoji(lead))}</strong></div>
      ${rest ? `<div style="margin-top:4px;color:${C.inkSoft};font-size:13px;line-height:1.55;">${escape(stripEmoji(rest))}</div>` : ''}
    `);
  }

  const weatherBlock = weatherItems.length
    ? weatherItems.map(weatherListItem).join('')
    : `<div style="padding:14px 0;border-top:1px solid ${C.rule};font-family:${FONT_MONO};font-size:11px;color:${C.mute};letter-spacing:0.1em;text-transform:uppercase;">— NO WEATHER SIGNAL —</div>`;

  const weatherSection = `
  <div style="margin-top:52px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:bottom;">
          ${label("WEATHER", C.inkSoft)}
          ${sectionTitle(weatherHeadline || 'No weather signal recorded.', C.ink)}
        </td>
        <td style="vertical-align:bottom;text-align:right;font-family:${FONT_MONO};font-size:13px;font-weight:600;color:${C.ink};letter-spacing:0.08em;">${weatherItems.length.toString().padStart(2, '0')}</td>
      </tr>
    </table>
    <div style="margin-top:14px;">${weatherBlock}</div>
  </div>`;

  // ── KPI strip (secondary) — intel signal counts ────────────────────
  const redditCount = (summary.redditSignals ?? []).length;
  const eventsCount = (summary.localEvents ?? []).length;
  const kpiStrip = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="kpi-grid" style="border-collapse:separate;border-spacing:8px 0;margin-top:8px;">
    <tr>
      ${kpiCell(todayCount, 'Leads pipeline')}
      ${kpiCell(redditCount, `Reddit signal${redditCount === 1 ? '' : 's'}`)}
      ${kpiCell(eventsCount, `Local event${eventsCount === 1 ? '' : 's'}`)}
    </tr>
  </table>`;

  // ── PIPELINE STATUS row (secondary) ────────────────────────────────
  const readyTxt = summary.readyToPublish == null ? '—' : (summary.readyToPublish ? 'YES' : 'NO');
  const readyColor = summary.readyToPublish == null ? C.mid : (summary.readyToPublish ? C.ok : C.warning);
  const statusRow = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:32px;">
    <tr>
      <td style="padding:14px 0;border-top:1px solid ${C.ink};border-bottom:1px solid ${C.rule};vertical-align:middle;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">${label("PIPELINE")}</td>
            <td style="vertical-align:middle;text-align:right;font-family:${FONT_MONO};font-size:11px;color:${C.inkSoft};letter-spacing:0.04em;">
              LAST RUN <span style="color:${C.ink};">${escape(fmtDate(summary.latestRunAt)).toUpperCase()}</span>
              &nbsp;&nbsp;·&nbsp;&nbsp; SCOUT <span style="color:${C.ink};">${escape((summary.scoutStatus || '—').toUpperCase())}</span>
              &nbsp;&nbsp;·&nbsp;&nbsp; CONTENT <span style="color:${C.ink};">${escape((summary.contentStatus || '—').toUpperCase())}</span>
              &nbsp;&nbsp;·&nbsp;&nbsp; READY <span style="color:${readyColor};">${readyTxt}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  // ── Today's leads (tertiary list) ──────────────────────────────────
  const todayLeads = lead?.today.leads ?? [];
  const todayLeadsBlock = todayLeads.length
    ? todayLeads.map(l => listItem(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:top;">
              <span style="font-family:${FONT_MONO};font-size:11px;color:${C.mid};letter-spacing:0.05em;">${escape(fmtDate(l.submittedAt)).toUpperCase()}</span>
              <span style="display:inline-block;margin-left:10px;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${C.sage};">${escape(l.source || '—')}</span>
              <div style="margin-top:6px;font-family:${FONT_SANS};font-size:14px;color:${C.ink};">
                <strong style="font-weight:600;">${escape(l.ownerName || '—')}</strong>
                &nbsp;·&nbsp; ${escape(l.dogName || '—')} ${l.breedAge ? `<span style="color:${C.mid};">(${escape(l.breedAge)})</span>` : ''}
                &nbsp;·&nbsp; <span style="color:${C.inkSoft};">${escape(l.neighborhood || '—')}</span>
              </div>
              <div style="margin-top:4px;font-family:${FONT_MONO};font-size:11px;color:${C.mid};">
                <a href="mailto:${escape(l.email || '')}" style="color:${C.sage};text-decoration:none;">${escape(l.email || '—')}</a>
                &nbsp;·&nbsp; ${escape(l.phone || '—')}
                &nbsp;·&nbsp; ${escape(l.serviceInterest || '—')}
                &nbsp;·&nbsp; ${escape(l.walkFrequency || '—')}
              </div>
            </td>
          </tr>
        </table>`)).join('')
    : `<div style="padding:20px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.mute};border-top:1px solid ${C.rule};">— NO LEADS CAPTURED YET —</div>`;

  // ── intel sections ─────────────────────────────────────────────────
  const opps = (summary.contentOpportunities ?? []).slice(0, 3);
  const oppsBlock = opps.length
    ? opps.map(o => listItem(`
        <div><strong style="font-weight:600;">${escape(stripEmoji(o.title))}</strong>${o.priority ? ` <span style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${C.warning};margin-left:8px;">${escape(stripEmoji(o.priority))}</span>` : ''}</div>
        <div style="margin-top:4px;color:${C.inkSoft};font-size:13px;">${escape(stripEmoji(o.summary))}</div>
      `)).join('')
    : `<div style="padding:14px 0;border-top:1px solid ${C.rule};font-family:${FONT_MONO};font-size:11px;color:${C.mute};letter-spacing:0.1em;text-transform:uppercase;">— NONE —</div>`;

  const reddit = (summary.redditSignals ?? []).slice(0, 3);
  const redditBlock = reddit.length
    ? reddit.map(r => {
        const titleHtml = r.url
          ? `<a href="${escape(r.url)}" style="color:${C.ink};text-decoration:underline;text-underline-offset:2px;">${escape(stripEmoji(r.title))}</a>`
          : escape(stripEmoji(r.title));
        const linkTag = r.url
          ? ` <a href="${escape(r.url)}" style="font-family:${FONT_MONO};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${C.sage};text-decoration:none;margin-left:8px;">OPEN →</a>`
          : '';
        return listItem(`
          <div><span style="font-family:${FONT_MONO};font-size:11px;color:${C.sage};">r/${escape(r.subreddit)}</span> <strong style="font-weight:600;">${titleHtml}</strong>${linkTag}</div>
          <div style="margin-top:4px;color:${C.inkSoft};font-size:13px;">${escape(stripEmoji(r.takeaway))}</div>
        `);
      }).join('')
    : `<div style="padding:14px 0;border-top:1px solid ${C.rule};font-family:${FONT_MONO};font-size:11px;color:${C.mute};letter-spacing:0.1em;text-transform:uppercase;">— NONE —</div>`;

  const competitors = (summary.competitorIntel ?? []).slice(0, 3);
  const competitorsBlock = competitors.length
    ? competitors.map(c => listItem(`
        <div><strong style="font-weight:600;">${escape(c.competitor)}</strong></div>
        <div style="margin-top:4px;color:${C.inkSoft};font-size:13px;">${escape(c.finding)}${c.impact ? ` <span style="color:${C.mid};">— ${escape(c.impact)}</span>` : ''}</div>
      `)).join('')
    : `<div style="padding:14px 0;border-top:1px solid ${C.rule};font-family:${FONT_MONO};font-size:11px;color:${C.mute};letter-spacing:0.1em;text-transform:uppercase;">— NONE —</div>`;

  const events = (summary.localEvents ?? []).slice(0, 3);
  const eventsBlock = events.length
    ? events.map(e => listItem(`
        <div><strong style="font-weight:600;">${escape(e.event)}</strong>${e.date ? ` <span style="font-family:${FONT_MONO};font-size:11px;color:${C.mid};">${escape(e.date)}</span>` : ''}</div>
        <div style="margin-top:4px;color:${C.inkSoft};font-size:13px;">${escape(e.opportunity || e.impact || '')}</div>
      `)).join('')
    : `<div style="padding:14px 0;border-top:1px solid ${C.rule};font-family:${FONT_MONO};font-size:11px;color:${C.mute};letter-spacing:0.1em;text-transform:uppercase;">— NONE —</div>`;

  // ── sources (small dense table) ────────────────────────────────────
  const sourceEntries = lead?.bySource ? Object.entries(lead.bySource).sort((a, b) => b[1] - a[1]) : [];
  const sourcesBlock = sourceEntries.length
    ? sourceEntries.map(([k, v]) => `
        <tr>
          <td style="padding:8px 0;border-top:1px solid ${C.rule};font-family:${FONT_MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${C.inkSoft};">${escape(k)}</td>
          <td style="padding:8px 0;border-top:1px solid ${C.rule};text-align:right;font-family:${FONT_MONO};font-size:13px;color:${C.ink};font-variant-numeric:tabular-nums;">${v}</td>
        </tr>`).join('')
    : '';

  // ── section helper ─────────────────────────────────────────────────
  const section = (lbl: string, title: string, body: string, count?: number) => `
  <div style="margin-top:52px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:bottom;">
          ${label(lbl, C.inkSoft)}
          ${sectionTitle(title, C.ink)}
        </td>
        ${count !== undefined ? `<td style="vertical-align:bottom;text-align:right;font-family:${FONT_MONO};font-size:13px;font-weight:600;color:${C.ink};letter-spacing:0.08em;">${count.toString().padStart(2, '0')}</td>` : ''}
      </tr>
    </table>
    <div style="margin-top:14px;">${body}</div>
  </div>`;

  // ── compose ────────────────────────────────────────────────────────
  const html = `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    /* Mobile responsive for clients that respect @media (Apple Mail, iOS, Gmail-app, modern webmail) */
    @media only screen and (max-width:600px) {
      .email-shell { padding:20px 16px 32px 16px !important; }
      .hero-grid, .hero-grid tbody, .hero-grid tr { display:block !important; width:100% !important; }
      .hero-col { display:block !important; width:100% !important; padding:0 !important; }
      .hero-col-weather { margin-bottom:8px !important; }
      .hero-gap { display:none !important; height:0 !important; line-height:0 !important; font-size:0 !important; }
      .leads-strip-label, .leads-strip-num { display:block !important; width:100% !important; text-align:left !important; padding:0 !important; }
      .leads-strip-num { margin-top:6px !important; text-align:left !important; }
      .kpi-grid, .kpi-grid tbody, .kpi-grid tr { display:block !important; width:100% !important; border-spacing:0 !important; }
      .kpi-cell { display:block !important; width:100% !important; padding:0 0 8px 0 !important; }
      .masthead-right { text-align:left !important; padding-top:10px !important; }
      .footer-cta a { display:block !important; margin:0 0 8px 0 !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.canvas};">
  <div class="email-shell" style="max-width:760px;margin:0 auto;background:${C.surface};padding:36px 40px 48px 40px;font-family:${FONT_SANS};color:${C.ink};">

    <!-- masthead -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;">
          ${label("NOT THE RUG ⁄ FOUNDER BRIEF")}
          <div style="font-family:${FONT_DISPLAY};font-size:28px;line-height:1.05;color:${C.ink};margin-top:10px;letter-spacing:-0.01em;">Daily pipeline</div>
        </td>
        <td class="masthead-right" style="vertical-align:top;text-align:right;">
          <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.08em;color:${C.mid};">${escape(fmtDate(generatedAt)).toUpperCase()}</div>
          <div style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.12em;color:${C.mute};margin-top:4px;">${escape(TZ).toUpperCase()}</div>
        </td>
      </tr>
    </table>

    <!-- HERO popouts -->
    <div style="margin-top:28px;">${hero}</div>

    <!-- KPI strip -->
    ${kpiStrip}

    <!-- pipeline status row -->
    ${statusRow}

    <!-- weather full section -->
    ${weatherSection}

    <!-- intel grid -->
    ${section("SIGNALS", "Reddit signals", redditBlock, reddit.length)}
    ${section("EVENTS", "Local events", eventsBlock, events.length)}
    ${section("INTEL", "Competitor intel", competitorsBlock, competitors.length)}

    <!-- content opportunities directly above today's leads -->
    ${section("OPPORTUNITIES", "Content opportunities", oppsBlock, opps.length)}

    <!-- today's leads (placed above by-source) -->
    ${section("TODAY", "Today's leads", todayLeadsBlock, todayLeads.length)}

    ${sourcesBlock ? `
    <div style="margin-top:52px;">
      ${label("BY SOURCE", C.inkSoft)}
      ${sectionTitle("Leads by source · all-time", C.ink)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
        ${sourcesBlock}
      </table>
    </div>` : ''}

    <!-- footer / CTAs -->
    <div style="margin-top:64px;padding-top:24px;border-top:1px solid ${C.ink};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            ${label("OPEN")}
            <div class="footer-cta" style="margin-top:10px;">
              <a href="${escape(dashboardUrl)}" style="display:inline-block;padding:11px 18px;background:${C.ink};color:${C.surface};font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;border-radius:4px;">DASHBOARD →</a>
              &nbsp;
              <a href="${escape(leadsUrl)}" style="display:inline-block;padding:11px 18px;background:${C.sage};color:${C.sagePale};font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;border-radius:4px;">LEADS →</a>
              &nbsp;
              <a href="${escape(briefUrl)}" style="display:inline-block;padding:11px 18px;background:transparent;color:${C.ink};border:1px solid ${C.ink};font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;border-radius:4px;">BRIEF →</a>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="margin-top:32px;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:${C.mute};text-align:center;">
      AUTOMATED · 09:30 ET DAILY
    </div>
  </div>
</body></html>`;

  // plain text companion (unchanged content, mono-friendly)
  const text = [
    `NOT THE RUG · FOUNDER BRIEF`,
    `${fmtDate(generatedAt)} ${TZ}`,
    ``,
    `LEADS TODAY: ${todayCount}  (${todayLabel})`,
    `7d:${lead?.totals.last7Days ?? 0}  30d:${lead?.totals.last30Days ?? 0}  all:${lead?.totals.allTime ?? 0}`,
    ``,
    `WEATHER:  ${summary.weatherImpact || '—'}`,
    ``,
    `PRIORITY ACTION:`,
    summary.scoutPriorityAction || '(none)',
    ``,
    `PIPELINE  last:${fmtDate(summary.latestRunAt)}  scout:${summary.scoutStatus || '—'}  content:${summary.contentStatus || '—'}  ready:${summary.readyToPublish ?? '—'}`,
    ``,
    todayLeads.length ? `— TODAY'S LEADS —` : `No leads captured yet.`,
    ...todayLeads.map(l => `· ${fmtDate(l.submittedAt)} · ${l.ownerName} (${l.dogName}) · ${l.neighborhood} · ${l.email} · ${l.source}`),
    ``,
    `Dashboard: ${dashboardUrl}`,
    `Leads:     ${leadsUrl}`,
    `Brief:     ${briefUrl}`,
  ].join('\n');

  return { subject, html, text };
}
