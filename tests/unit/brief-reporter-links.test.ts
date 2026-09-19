/**
 * R10 coverage for not-the-rug-brief/reporter.js, exercised through the real
 * CJS module (not a reimplementation) so the assertions hold against the
 * actual generated HTML. generateReport() only touches the local filesystem
 * (via NOT_THE_RUG_BRIEF_DATA_DIR, pointed at an isolated temp directory
 * below) — no network, no paid model, no real storage.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);

let tmpDataDir: string;
let originalDataDirEnv: string | undefined;

beforeAll(async () => {
  originalDataDirEnv = process.env.NOT_THE_RUG_BRIEF_DATA_DIR;
  tmpDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ntr-reporter-test-'));
  process.env.NOT_THE_RUG_BRIEF_DATA_DIR = tmpDataDir;

  // Seed a Scout brief containing both safe and unsafe source URLs, mirroring
  // what upstream scraping (Reddit, review sites, search results) can return.
  const briefDir = path.join(tmpDataDir, 'briefs', 'not-the-rug');
  await fs.mkdir(briefDir, { recursive: true });
  await fs.writeFile(
    path.join(briefDir, 'latest.json'),
    JSON.stringify({
      timestamp: '2026-09-01T12:00:00.000Z',
      status: 'success',
      agentData: {
        competitorIntel: [{ competitor: 'Rover', finding: 'Raised prices', impact: 'medium', url: 'https://example.com/rover-pricing' }],
        redditSignals: [
          { title: 'Evil link', subreddit: 'nyc', summary: 'x', actionableTakeaway: 'y', url: 'javascript:alert(1)' },
          { title: 'Protocol-relative', subreddit: 'nyc', summary: 'x', actionableTakeaway: 'y', url: '//evil.example.com/x?a=alert(2)' },
          { title: 'Uppercase scheme', subreddit: 'nyc', summary: 'x', actionableTakeaway: 'y', url: 'JAVASCRIPT:alert(3)' },
          { title: 'Tab in scheme', subreddit: 'nyc', summary: 'x', actionableTakeaway: 'y', url: 'java\tscript:alert(4)' },
          { title: 'Newline in scheme', subreddit: 'nyc', summary: 'x', actionableTakeaway: 'y', url: 'java\nscript:alert(5)' },
          { title: 'Unicode in scheme', subreddit: 'nyc', summary: 'x', actionableTakeaway: 'y', url: 'jávascript:alert(6)' },
        ],
        weatherImpact: { summary: 'Mild', operationalTakeaway: 'Normal routes', url: 'data:text/html,<script>alert(1)</script>' },
        localEvents: [],
        reviewInsights: [{ source: 'Yelp', insight: 'Good reviews', actionableTakeaway: 'keep it up', url: 'https://yelp.com/biz/not-the-rug' }],
        localDemandSignals: [],
        partnershipOpportunities: [],
        contentOpportunities: { found: false, opportunities: [] },
      },
    }),
    'utf8',
  );
});

afterAll(async () => {
  process.env.NOT_THE_RUG_BRIEF_DATA_DIR = originalDataDirEnv;
  await fs.rm(tmpDataDir, { recursive: true, force: true });
});

describe('generateReport HTML output', () => {
  it('rejects javascript: and data: source URLs while https: URLs pass through as links', async () => {
    const { generateReport } = require('../../not-the-rug-brief/reporter.js') as {
      generateReport: (scribeOutput: unknown, clientId: string) => Promise<{ markdownPath: string; htmlPath: string } | null>;
    };

    const scribeOutput = {
      timestamp: '2026-09-01T12:05:00.000Z',
      content: { instagram_post_copy: 'Nice day for a walk!', content_angle: 'Weather-led post.' },
      contentOpportunities: [],
      guardianFlags: { readyToPublish: true, reviewRequired: false, hardBlock: false, overallScore: 90, flags: [], concerns: [] },
    };

    const paths = await generateReport(scribeOutput, 'not-the-rug');
    expect(paths).not.toBeNull();

    const html = await fs.readFile(paths!.htmlPath, 'utf8');

    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('data:text/html');
    expect(html).toContain('href="https://example.com/rover-pricing"');
    expect(html).toContain('href="https://yelp.com/biz/not-the-rug"');

    // Escaping still applies alongside the new scheme check.
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('rejects protocol-relative URLs, uppercase schemes, embedded whitespace, and non-ASCII scheme characters', async () => {
    const { generateReport } = require('../../not-the-rug-brief/reporter.js') as {
      generateReport: (scribeOutput: unknown, clientId: string) => Promise<{ markdownPath: string; htmlPath: string } | null>;
    };

    const scribeOutput = {
      timestamp: '2026-09-01T12:06:00.000Z',
      content: { instagram_post_copy: 'Nice day for a walk!', content_angle: 'Weather-led post.' },
      contentOpportunities: [],
      guardianFlags: { readyToPublish: true, reviewRequired: false, hardBlock: false, overallScore: 90, flags: [], concerns: [] },
    };

    const paths = await generateReport(scribeOutput, 'not-the-rug');
    expect(paths).not.toBeNull();
    const html = await fs.readFile(paths!.htmlPath, 'utf8');

    // None of the bypass-attempt URLs above ever produce a working link — if
    // any had been accepted, its "alert(N)" marker would appear inside an
    // href. The title text itself never contains the word "alert".
    expect(html).not.toContain('alert(');
    // The legitimate https: URL from the first test's fixture is unaffected.
    expect(html).toContain('href="https://example.com/rover-pricing"');
  });
});
