/**
 * Shared fixture data for the Not The Rug brief pipeline tests. Mirrors the
 * real shape produced by not-the-rug-brief/xscout.js + scribe.js, trimmed to
 * what the read/summarize/run modules actually inspect.
 */

export function fixtureLatestBrief(overrides: Record<string, unknown> = {}) {
  return {
    timestamp: '2026-09-01T12:00:00.000Z',
    status: 'success',
    humanBrief: 'A quiet week for Not The Rug — no escalations.',
    agentData: {
      brandMentions: [],
      competitorIntel: [{ competitor: 'Rover', finding: 'Raised prices', impact: 'medium', url: 'https://example.com/rover' }],
      weatherImpact: { summary: 'Mild and dry', operationalTakeaway: 'Normal routes.', url: 'https://weather.gov/point' },
      localEvents: [],
      redditSignals: [{ title: 'Looking for a dog walker', subreddit: 'williamsburg', summary: 'thread', actionableTakeaway: 'engage', url: 'https://reddit.com/r/williamsburg/1' }],
      reviewInsights: [],
      localDemandSignals: [],
      partnershipOpportunities: [],
      contentOpportunities: { found: false, opportunities: [] },
      ...overrides,
    },
  };
}

export function fixtureLatestContent(overrides: Record<string, unknown> = {}) {
  return {
    timestamp: '2026-09-01T12:05:00.000Z',
    status: 'success',
    scoutPriorityAction: 'Post about the mild weather window.',
    content: {
      instagram_post_copy: 'Beautiful day for a walk in Williamsburg!',
      content_angle: 'Weather-led local content.',
    },
    guardianFlags: {
      readyToPublish: true,
      reviewRequired: false,
      hardBlock: false,
      overallScore: 92,
      factualScore: 95,
      voiceScore: 90,
      flags: [],
      concerns: [],
    },
    contentOpportunities: [],
    rawOutput: null,
    ...overrides,
  };
}
