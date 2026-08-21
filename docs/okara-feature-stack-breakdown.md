# Okara Feature Parity — Tech Stack Breakdown
**Client:** Not The Rug (Dog Walking)
**Date:** April 9, 2026

This document maps each Okara.ai capability to what currently exists in the repo and what needs to be added to achieve parity.

---

## Current Stack Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| AI | Anthropic Claude SDK (`@anthropic-ai/sdk`) |
| Database | Firebase Firestore + Firebase Storage |
| Auth | Firebase Auth + Firebase Admin |
| Hosting / Cron | Vercel (cron via `vercel.json`) |
| Brief Pipeline | Node.js (CommonJS): xscout → scribe → guardian → reporter |
| Existing Integrations | Reddit OAuth (read), Instagram Graph API (read), NWS Weather API |
| Content Gen | Scribe agent (Claude) with brand voice, guardian QA pass |

---

## Feature-by-Feature Breakdown

---

### 1. Reddit & Community
> *"Finds relevant threads and drafts reply ideas and posts for you to review before publishing."*

**Status: 60% exists**

What's already built:
- `services/reddit.js` — Reddit OAuth 2.0 client credentials flow, fetches subreddit signals, brand mentions, sentiment analysis via Claude
- `reddit.js` runner and `store.js` persistence
- Claude drafts are generated inside the Scribe stage

What's missing:
- Reddit OAuth **write scope** — the current token only reads. Need `submit` + `privatemessage` scopes added to the Reddit app credentials
- **Approval UI** — an admin page in Next.js that shows pending Reddit drafts and has Approve / Edit / Discard actions before posting
- **Post submission API route** — a Next.js route handler that calls Reddit's `POST /api/submit` endpoint after approval

New packages needed:
```
# None — Reddit API is raw fetch (already the pattern in services/reddit.js)
# Just need expanded OAuth scopes and a new route handler
```

New env vars needed:
```
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REFRESH_TOKEN=         # generated via OAuth 2.0 Authorization Code flow (adds write scope)
REDDIT_USER_AGENT=NotTheRug/1.0
```

New files to create:
- `app/admin/dashboard/reddit/page.tsx` — draft review UI
- `app/api/admin/reddit/drafts/route.ts` — list pending drafts from Firestore
- `app/api/admin/reddit/publish/route.ts` — submit post to Reddit API
- `not-the-rug-brief/services/reddit-publisher.js` — posting helper

---

### 2. X (Twitter)
> *"Generates post and thread drafts you can edit, refine, and post yourself."*

**Status: 20% exists**

What's already built:
- `xscout.js` scans X/Twitter content via web search (Claude tool use) for brand signals — this is read-only intelligence gathering, not API access

What's missing:
- **Twitter API v2** connection — xscout uses web search to scrape X mentions, not the actual Twitter API. Need proper OAuth 2.0 PKCE credentials to draft + post
- **Scribe X content drafts** — Scribe already drafts "X posts" as a content type in the content schema, but they're never pushed anywhere
- **Draft approval UI** — same pattern as Reddit above
- **Post/thread publishing** — call `POST /2/tweets` after approval

New packages needed:
```bash
npm install twitter-api-v2
```

New env vars needed:
```
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
TWITTER_BEARER_TOKEN=
```

New files to create:
- `not-the-rug-brief/services/twitter-publisher.js` — uses `twitter-api-v2` to post tweets/threads
- `app/admin/dashboard/twitter/page.tsx` — draft review UI (reuse same pattern as Reddit UI)
- `app/api/admin/twitter/publish/route.ts` — triggers publisher after approval

Notes:
- Twitter API v2 Free tier allows 1,500 tweets/month (write). That's plenty for a dog walking brand.
- Thread support requires posting sequentially with `reply.in_reply_to_tweet_id`

---

### 3. Hacker News
> *"Identifies the right moments to share and drafts comments for you to post."*

**Status: 0% exists**

What's needed:
- **HN Algolia Search API** — free, no auth required. Searches HN posts/comments by keyword (e.g. "dog walking NYC", "pet services", "Brooklyn dogs")
- **Relevance scoring** — Claude reads HN results and scores which threads are worth entering
- **Comment drafting** — Scribe generates on-brand HN comments (technical, community-first tone)
- **Approval UI** — user reviews + manually posts (HN doesn't have a posting API; users post manually)

New packages needed:
```
# None — Algolia HN API is a free REST endpoint (hn.algolia.com/api)
# No SDK required
```

New env vars needed:
```
# None — HN Algolia API requires no credentials
```

New files to create:
- `not-the-rug-brief/services/hacker-news.js` — fetches HN signals via `https://hn.algolia.com/api/v1/search`
- `not-the-rug-brief/hacker-news.js` — standalone runner (same pattern as reddit.js)
- Add `hackernews` module to `index.js` pipeline

Client config addition in `clients.js`:
```js
hackernews: {
  searchTerms: ['dog walking', 'pet care NYC', 'dog sitter Brooklyn'],
  minScore: 10,          // ignore low-traction posts
  commentStyle: 'community-first, avoid salesy language'
}
```

Notes:
- HN does not have a write API. All posting is manual. The feature is draft-and-display only — same model as how Okara presents it ("drafts comments for you to post").
- This is the easiest feature to add since the data source is free and unauthenticated.

---

### 4. LinkedIn
> *"Suggests content ideas and drafts professional posts for you to personalise and share."*

**Status: 0% exists**

What's needed:
- **LinkedIn OAuth 2.0** — 3-legged OAuth flow for the business page
- **LinkedIn Pages API** — `POST /v2/ugcPosts` to create posts on behalf of a LinkedIn Page
- **Draft approval UI** — same pattern as Twitter/Reddit
- Scribe already produces professional-tone content; needs a LinkedIn content type added to `content-schema.js`

New packages needed:
```bash
npm install linkedin-api-client
# OR raw fetch — LinkedIn's API is straightforward REST
```

New env vars needed:
```
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=         # long-lived token from OAuth flow
LINKEDIN_ORGANIZATION_ID=      # LinkedIn Company Page URN
```

New files to create:
- `not-the-rug-brief/services/linkedin-publisher.js`
- `app/admin/dashboard/linkedin/page.tsx`
- `app/api/admin/linkedin/publish/route.ts`
- Add LinkedIn content type to `not-the-rug-brief/content-schema.js`

Notes:
- LinkedIn's API requires a verified LinkedIn App with `w_member_social` or `w_organization_social` scope
- Token refresh needs to be handled — LinkedIn access tokens expire in 60 days; store refresh token in Firebase

---

### 5. SEO Content
> *"Suggests keyword opportunities and drafts blog posts and landing pages for your approval."*

**Status: 30% exists**

What's already built:
- Scribe can draft long-form content when given a topic
- Brand voice, tone, and business facts are already loaded into the prompt context

What's missing:
- **Keyword opportunity discovery** — needs Google Search Console data (see Feature 7) to find queries where NTR ranks positions 5–20 (quick-win targets)
- **Blog post drafting workflow** — a dedicated admin page where keyword opportunities are presented and the user can trigger a full blog draft
- **Landing page generator** — Claude drafts neighborhood landing pages (e.g., "Dog Walking in Williamsburg") based on GSC + keyword data
- **Content calendar** — brief-context.json already has a seasonal calendar; wire this into a UI that surfaces monthly content ideas

New packages needed:
```
# None beyond googleapis (see Feature 7)
```

New files to create:
- `app/admin/dashboard/seo-content/page.tsx` — keyword opportunities + draft triggers
- `app/api/admin/seo/generate-post/route.ts` — calls Claude to write blog post
- `app/api/admin/seo/generate-landing-page/route.ts` — neighborhood page generator
- `not-the-rug-brief/services/seo-content.js` — keyword scoring + content briefing

---

### 6. SEO Issue Fixes
> *"Audits your site for broken pages, missing tags, and gaps, and tells exactly what to fix."*

**Status: 0% exists**

What's needed:
- **Site crawler** — crawl NTR's production URL, collect all pages, extract meta tags, H1s, canonical tags, alt text, internal links
- **Issue classifier** — Claude or rule-based logic flags: missing title tags, duplicate H1s, broken internal links, missing alt text, thin content pages
- **Actionable fix report** — rendered in admin UI with exact fix instructions per issue

New packages needed:
```bash
npm install crawlee          # Apify's crawler — works headless in Node
# OR
npm install playwright       # if JS-rendered pages need auditing
# OR (simpler, no JS rendering needed for NTR's static HTML site):
npm install node-html-parser cheerio
```

Approach recommendation — since NTR's site is a static HTML export (index.html in repo), a lightweight internal crawler using `cheerio` is sufficient and zero cost:

```bash
npm install cheerio node-fetch
```

New files to create:
- `not-the-rug-brief/services/seo-auditor.js` — crawls site, extracts tags, flags issues
- `app/admin/dashboard/seo-audit/page.tsx` — issue list with fix instructions
- `app/api/admin/seo/audit/route.ts` — triggers audit on demand, saves to Firestore

---

### 7. Google Search Console
> *"Uses search data to find ranking opportunities and pages needing a boost."*

**Status: 0% exists**

What's needed:
- **Google OAuth 2.0** — service account or user OAuth for GSC API access
- **Search Console API** — query `searchanalytics.query` for impressions, clicks, CTR, average position by page and query
- **Opportunity surfacing** — Claude analyzes GSC data to identify: queries with high impressions/low CTR, pages ranking 5–15 (boost candidates), pages losing clicks YoY

New packages needed:
```bash
npm install googleapis
```

New env vars needed:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://nottherug.com
```

New files to create:
- `lib/google-auth.ts` — shared Google OAuth/service account helper
- `not-the-rug-brief/services/search-console.js` — queries GSC API
- `app/api/admin/gsc/route.ts` — exposes GSC data to admin UI
- Integrate GSC signals into the Scout stage of the brief pipeline

---

### 8. Google Analytics (GA4)
> *"Connects to GA4 to surface what is working and where to focus next."*

**Status: 0% exists**

What's needed:
- **GA4 Data API** — query sessions, engagement rate, top pages, traffic sources, conversion events
- **Insight generation** — Claude reads GA4 data and writes plain-English summaries: "Your /services page has a 70% bounce rate — consider adding a direct booking CTA"
- **Admin dashboard widget** — surface top performing pages, traffic trends, and AI-written recommendations

New packages needed:
```bash
npm install @google-analytics/data
```

New env vars needed:
```
GA4_PROPERTY_ID=              # format: 123456789
# Shares same service account as GSC (above)
```

New files to create:
- `not-the-rug-brief/services/google-analytics.js` — queries GA4 Data API
- `app/api/admin/analytics/route.ts` — exposes GA4 summary to admin UI
- Add GA4 insights to Scribe context (feeds content recommendations)

---

## Shared Infrastructure Needed

These pieces support multiple features above and should be built once:

### OAuth Token Management
Reddit, Twitter, and LinkedIn all require stored OAuth tokens. Firebase Firestore is already in place — create a `tokens` collection:

```
Firestore: /tokens/{provider}
  accessToken: string
  refreshToken: string
  expiresAt: timestamp
  scopes: string[]
```

New file: `lib/token-store.ts` — read/write OAuth tokens from Firestore server-side

### Unified Draft Approval UI
All social platforms (Reddit, Twitter, LinkedIn) follow the same pattern: **draft → review → edit → approve → publish**. Build one reusable component:

New file: `app/admin/dashboard/components/DraftApprovalCard.tsx`

### Admin Nav Update
Add nav links for each new feature section to `app/admin/layout.tsx`

---

## Full Package Install Command

```bash
# Social publishing
npm install twitter-api-v2

# SEO audit (lightweight)
npm install cheerio

# Google APIs (GSC + GA4)
npm install googleapis @google-analytics/data

# Optional: LinkedIn (or use raw fetch)
npm install linkedin-api-client
```

---

## New Environment Variables Summary

```bash
# Reddit (write scope)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REFRESH_TOKEN=
REDDIT_USER_AGENT=NotTheRug/1.0

# Twitter
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
TWITTER_BEARER_TOKEN=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_ID=

# Google (shared service account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://nottherug.com
GA4_PROPERTY_ID=
```

---

## Build Priority Order

| Priority | Feature | Effort | Value |
|---|---|---|---|
| 1 | Google Search Console | Medium | High — feeds SEO Content + Scribe |
| 2 | Reddit write scope + approval UI | Low | High — 60% already built |
| 3 | X (Twitter) drafts + publish | Medium | High — Scribe already drafts these |
| 4 | SEO Content workflow UI | Low | High — content already generates |
| 5 | Google Analytics | Medium | Medium — strategic insight |
| 6 | Hacker News | Low | Medium — free, no auth |
| 7 | SEO Issue Fixes | Medium | Medium — one-time audit value |
| 8 | LinkedIn | Medium | Low — least relevant for local dog walking |

---

## What Makes This Dog-Walking Specific

Unlike Okara (which is generic), this implementation is pre-loaded with NTR context that Okara cannot replicate out of the box:
- `brief-context.json` — competitor list (Rover, Wag, Swifto, POOChi, etc.), seasonal content calendar, borough-specific signals
- `brand-voice.json` — NTR tone, voice pillars, formatting rules, few-shot examples
- `game-knowledge-supplement.json` — business facts, service areas, team info
- `glossary.json` — brand terminology
- Weather service tied to dog-walking operational windows

Every new feature above will automatically inherit this context through the existing Scribe + knowledge loading system.
