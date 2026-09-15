// clients.js — Central client registry for Scout/Scribe/Guardian runtime
//
// Why a dedicated registry:
// - Keeps client-specific search terms, brand rules, and prompt customizations
//   out of the runtime modules.
// - Makes adding a new client a data/config exercise instead of a code fork.

function withComputedEvents(config) {
  const upcomingEvents = (config.upcomingEvents || []).map((event) => {
    if (typeof event.daysOut === 'number') return event;

    const date = new Date(event.date);
    const now = new Date();
    const daysOut = Number.isNaN(date.getTime())
      ? null
      : Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    return { ...event, daysOut };
  });

  return { ...config, upcomingEvents };
}

const notTheRug = withComputedEvents({
  clientId: 'not-the-rug',
  clientName: 'Not The Rug',
  clientDescriptor: 'a premium Williamsburg, Brooklyn dog walking and pet care business',
  timeZone: 'America/New_York',
  brandKeywords: ['"Not The Rug"', '"nottherug.com"', '"Williamsburg dog walking"', '"Brooklyn dog walker"'],
  competitors: ['Rover', 'Wag', 'Swifto', 'POOCHi', '"Happy Pants NYC"', '"Spot Dog Walkers"'],
  categoryTerms: ['dog walking industry trends 2026', 'pet care business news', 'NYC dog walking', 'Brooklyn dog owner trends', 'pet services local SEO', 'dog walking app updates', 'pet care consumer trends', 'Williamsburg Brooklyn pets'],
  kols: ['NAPPS', '"Time To Pet"', '"Fear Free Pets"', '"BringFido"', '"Dogster"'],
  upcomingEvents: [],
  weather: {
    provider: 'nws',
    operationalWindowStartHour: 7,
    operationalWindowHours: 12,
    serviceNeighborhoods: [
      { name: 'Brooklyn', latitude: 40.7184, longitude: -73.9571 },
    ],
    thresholds: {
      heatWatchTempF: 80,
      heatRiskTempF: 85,
      coldRiskTempF: 35,
      highRainChancePct: 50,
      moderateRainChancePct: 30,
      windyMph: 18,
    },
  },
  reviews: {
    provider: 'web-search',
    sources: [
      {
        key: 'yelp',
        label: 'Yelp',
        query: '"site:yelp.com/biz/not-the-rug-brooklyn" OR "Not The Rug Yelp Brooklyn"',
      },
    ],
  },
  instagram: {
    provider: 'meta-graph',
    profileUrl: '',
    accessTokenEnv: 'INSTAGRAM_ACCESS_TOKEN',
    userIdEnv: 'NOT_THE_RUG_INSTAGRAM_USER_ID',
    recentMediaLimit: 3,
  },
  reddit: {
    provider: null,
    clientIdEnv: 'REDDIT_CLIENT_ID',
    clientSecretEnv: 'REDDIT_CLIENT_SECRET',
    userAgentEnv: 'REDDIT_USER_AGENT',
    brandTerms: ['not the rug', 'nottherug'],
    mentionQueries: ['"Not The Rug"', 'nottherug'],
    subreddits: ['williamsburg', 'Brooklyn', 'AskNYC', 'nyc', 'dogs', 'puppy101'],
    opportunityQueries: ['"dog walker"', '"dog walking"', 'Rover', 'Wag', '"dog boarding"'],
    limitPerQuery: 3,
    maxMentions: 5,
    maxParticipationOpportunities: 8,
  },
  scout: {
    freshnessDays: 7,
    sourceFocus: 'Focus on pet care industry news, local Brooklyn and NYC dog-owner conversations, neighborhood trends, reviews, and service-business opportunities that can drive bookings or organic reach.',
    kolSearchSuffix: 'dog walking OR pet care OR Brooklyn',
    analysisInstructions: 'Prioritize high-trust local service signals: neighborhood conversations, platform shifts, seasonal pet-safety topics, SEO/content gaps, referral or partnership opportunities, and the exact language buyers use when choosing a dog walker. Treat Reddit as a primary source for recommendation threads, buyer pain points, and neighborhood participation opportunities. Surface Reddit only when the thread is recent enough and specific enough to matter.',
    preferredSources: ['Instagram', 'Reddit', 'Google reviews', 'Google Trends', 'TikTok', 'Meta Ad Library', 'NAPPS', 'APPA', 'Time To Pet', 'local blogs'],
    deprioritizedSources: ['X/Twitter'],
    searchPlan: [
      {
        label: 'BRAND + LOCAL WEB',
        query: '"Not The Rug" OR nottherug.com OR "Williamsburg dog walking" OR "Brooklyn dog walker" OR "Greenpoint dog walker" OR site:reddit.com/r/williamsburg "Not The Rug" OR site:reddit.com/r/Brooklyn "Not The Rug"',
        goal: 'Find direct brand mentions, local listicles, neighborhood content, Reddit mentions, and organic search-result opportunities.',
      },
      {
        label: 'COMPETITOR REVIEWS + POSITIONING',
        query: 'Rover OR Wag OR Swifto OR POOCHi OR "Happy Pants NYC" OR "Spot Dog Walkers" reviews Brooklyn OR NYC dog walker',
        goal: 'Find review themes, complaints, trust gaps, and competitor positioning language from review pages, local directories, and service pages.',
      },
      {
        label: 'LOCAL EVENTS + DOG HOLIDAYS',
        query: '"Williamsburg Brooklyn events this week" OR "Brooklyn dog events" OR "National Dog Day" OR "National Pet Day" OR "National Puppy Day"',
        goal: 'Find real upcoming events, neighborhood disruptions, or dog-related calendar hooks that can drive content or operations.',
      },
      {
        label: 'LOCAL DEMAND + REDDIT',
        query: 'site:reddit.com/r/williamsburg "dog walker" OR site:reddit.com/r/Brooklyn "dog walker" OR site:reddit.com/r/AskNYC "dog walker" Brooklyn OR site:reddit.com/r/nyc Rover Williamsburg OR site:reddit.com/r/nyc Wag Brooklyn OR site:reddit.com/r/dogs "dog walker" NYC',
        goal: 'Find real buyer questions, neighborhood pain points, pricing objections, recommendation threads, and local Reddit participation opportunities.',
      },
      {
        label: 'OPERATOR + INDUSTRY INTEL',
        query: 'site:timetopet.com dog walking OR site:petsitters.org pet sitter OR site:americanpetproducts.org pet industry OR "Google Business Profile" dog walker',
        goal: 'Find operator-side trends, local SEO opportunities, software/process shifts, and pet-industry demand signals.',
      },
    ],
    agentDataTemplate: `{
  "brandMentions": [{"source":"...","author":"...","content":"...","sentiment":"positive|neutral|negative","reach":"high|medium|low","url":"..."}],
  "competitorIntel": [{"competitor":"...","finding":"...","impact":"high|medium|low","url":"..."}],
  "weatherImpact": null,
  "localEvents": [{"event":"...","date":"...","impact":"...","opportunity":"...","url":"..."}],
  "redditSignals": [{"title":"...","subreddit":"...","signalType":"brand_mention|recommendation_thread|pain_point|participation_opportunity","summary":"...","actionableTakeaway":"...","url":"..."}],
  "localDemandSignals": [{"signal":"...","relevance":"high|medium|low","detail":"..."}],
  "reviewInsights": [{"source":"...","insight":"...","sentiment":"positive|neutral|negative","actionableTakeaway":"...","url":"..."}],
  "partnershipOpportunities": [{"partner":"...","type":"referral|community|creator|local_business","finding":"...","priority":"high|medium|low","url":"..."}],
  "escalations": [{"level":"CRITICAL|IMPORTANT|QUIET","status":"NEW|CHANGED|ESCALATED|RESOLVED","summary":"..."}],
  "contentOpportunities": {
    "found": true,
    "opportunities": [{"topic":"...","whyNow":"...","format":"...","priority":"high|medium|low","source":"...","url":"..."}],
    "searchedFor": ["trigger 1","trigger 2"]
  }
}`,
  },
  intelligence: {
    primarySignalsKey: 'localDemandSignals',
    primarySignalsLabel: 'Local Demand Signals',
    promptPrimarySignalLabel: 'Local Demand Context',
    primarySignalsFallback: 'No local demand signals detected this cycle.',
    weatherKey: 'weatherImpact',
    weatherLabel: 'Weather Impact',
    promptWeatherLabel: 'Weather Impact',
    weatherFallback: 'No weather impact surfaced this cycle.',
    localEventsKey: 'localEvents',
    localEventsLabel: 'Local Events',
    promptLocalEventsLabel: 'Local Events',
    localEventsFallback: 'No local events or holiday hooks surfaced this cycle.',
    redditSignalsKey: 'redditSignals',
    redditSignalsLabel: 'Reddit Signals',
    promptRedditSignalsLabel: 'Reddit Signals',
    redditSignalsFallback: 'No Reddit signals surfaced this cycle.',
    reviewInsightsKey: 'reviewInsights',
    reviewInsightsLabel: 'Review Insights',
    promptReviewInsightsLabel: 'Review Insights',
    relationshipSignalsKey: 'partnershipOpportunities',
    relationshipSignalsLabel: 'Partnership / Referral Opportunities',
    promptRelationshipSignalsLabel: 'Partnership / Referral Opportunities',
    relationshipSignalsFallback: 'No partnership or referral opportunities detected this cycle.',
    contentOpportunitiesKey: 'contentOpportunities',
    contentOpportunitiesLabel: 'Content Opportunities',
    promptContentOpportunitiesLabel: 'Content Opportunities',
    contentOpportunitiesFallback: 'Scout found NO content opportunities this cycle.',
    brandMentionsLabel: 'Brand + Local Mentions',
  },
  viralTargets: {
    hashtags: ['#dogwalking', '#brooklyndogs', '#nycdogs', '#petcare', '#williamsburgbrooklyn', '#dogsofinstagram'],
    injectableTopics: ['Williamsburg dog owners', 'Brooklyn dog parks', 'pet care tips', 'dog walking safety', 'puppy routines', 'dog separation anxiety', 'local dog-friendly businesses'],
    viralTriggers: ['Brooklyn dog park', 'NYC dog owner tips', 'dog walking safety', 'pet care trends', 'Williamsburg events dogs', 'summer dog safety NYC', 'rainy day dog tips'],
    exclusions: ['animal abuse', 'graphic injury', 'lawsuit', 'politics', 'crypto rug pull'],
  },
  scribe: {
    role: 'marketing writer',
    fallbackTone: 'Tone: warm, local, trustworthy, lightly funny, never corporate.\nNever use: guilt-based fear tactics, generic startup jargon, or fake luxury language.',
    outputSchema: [
      {
        key: 'instagram_post_copy',
        label: 'INSTAGRAM_POST_COPY',
        displayLabel: 'Instagram Post Copy',
        note: 'ready to post',
        prompt: '[One Instagram post caption that is correct to publish today. Never make the main hook a future holiday or future event before its actual date. If Scout describes a multi-post runway, write only the best post to publish now; leave future-post planning to Priority Action and Content Angle. Lead with a strong first line. Keep it concise, grounded, local, and ready to publish now. Soft CTA only. Max 3 relevant hashtags.]',
      },
      {
        key: 'content_angle',
        label: 'CONTENT_ANGLE',
        displayLabel: 'Content Angle',
        note: 'strategy recap',
        prompt: '[One short paragraph. Recap the overall strategy this post is implementing and the behavior or perception shift it is trying to create. Write for the founder, not for publication.]',
      },
    ],
    pillarHints: {
      CRITICAL: 'trust_reassurance or timely_local_update — calm, factual communication first.',
      IMPORTANT: 'service_highlight or neighborhood_authority — be useful, specific, and local.',
      QUIET: 'brand_story, trust_signal, or neighborhood_tips — create authority and familiarity.',
    },
    hardConstraints: [
      'Every piece connects to Scout\'s priority action',
      'Zero live signal = create useful or local signal, not vague filler',
      'Do not imply veterinary, behavioral, or medical expertise unless surfaced in the brief',
      'Do not invent client stories, review quotes, certifications, or safety claims',
      'Keep the voice human and neighborhood-specific, not platform-generic',
      'Avoid dunking on competitors by name unless Scout surfaced a clearly newsworthy comparison',
      'Prefer "founded in 2011" or "since 2011" over hardcoding the business age unless the current age is explicitly provided',
      'Do not claim "same walker every time", "never a stranger", or any no-substitution absolute unless the brief explicitly verifies that guarantee',
      'Prefer "consistent walker relationships", "familiar walker", or "known team" over absolutes',
      'Each output complete and ready to copy-paste',
    ],
  },
  guardian: {
    reviewerContext: 'a Williamsburg Brooklyn dog walking and pet care business',
    competitorNames: ['Rover', 'Wag', 'Swifto', 'POOCHi', 'Happy Pants NYC', 'Spot Dog Walkers', 'Windy City Paws', 'BringFido', 'PetSmart'],
    restrictedPatterns: ['insured and bonded', 'veterinarian approved'],
  },
  // ─── last30days integration ─────────────────────────────────────────────
  // Controls what the last30days service fetches and how signals are classified.
  // This config shape is intentionally portable — other clients can copy and
  // adapt it without changing any logic in the service or normalization layer.
  last30days: {
    enabled: true,

    // Topic passed to the last30days CLI — keyword-heavy, covers brand + category
    primaryTopic: 'Brooklyn NYC dog walking pet care Williamsburg',

    // Sources to search (comma-separated last30days source IDs)
    // Omit 'x' here if X auth is not configured — the CLI handles it gracefully
    sources: 'reddit,x,youtube,tiktok,instagram,hackernews',

    // How many days back to look — matches scout.freshnessDays
    lookbackDays: 7,

    // Targeted Reddit communities (no r/ prefix)
    subreddits: 'williamsburg,Brooklyn,AskNYC,nyc,dogs,puppy101',

    // TikTok hashtags to search (no # prefix)
    tiktokHashtags: 'dogwalking,brooklyndogs,nycpets,petcare,dogwalker',

    // Primary X/Twitter handle for the brand (null = no targeted handle search)
    xHandle: null,

    // Terms used to classify a signal as a brand_mention
    brandTerms: ['not the rug', 'nottherug', 'nottherug.com'],

    // Competitor names used to classify a signal as a competitor_mention
    // Must match strings that appear naturally in social content
    competitorNames: ['Rover', 'Wag', 'Swifto', 'POOCHi', 'Happy Pants', 'Spot Dog Walkers'],
  },
});

const CLIENTS = {
  [notTheRug.clientId]: notTheRug,
};

function getClientConfig(clientId) {
  return clientId ? CLIENTS[clientId] || null : null;
}

function getDefaultClientConfig() {
  return notTheRug;
}

function listClientConfigs() {
  return Object.values(CLIENTS);
}

function listActiveClientConfigs() {
  return listClientConfigs().filter((client) => client.active !== false);
}

function requireClientConfig(clientId) {
  const config = getClientConfig(clientId);
  if (!config) {
    const known = listClientConfigs().map((client) => client.clientId).join(', ');
    throw new Error(`Unknown client "${clientId}". Known clients: ${known}`);
  }
  return config;
}

module.exports = {
  CLIENTS,
  getClientConfig,
  getDefaultClientConfig,
  listClientConfigs,
  listActiveClientConfigs,
  requireClientConfig,
};
