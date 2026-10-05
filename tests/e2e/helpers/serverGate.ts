import { test, type Page } from '@playwright/test';

/**
 * Guard for specs that need the built server to be answering.
 *
 * Locally an unreachable server skips the spec with a reason, so a half-set-up
 * checkout is not a wall of red. In CI (`CI` set) the same condition throws:
 * an outage of a mandatory route is a failure, never a skip.
 */
export async function requireServer(page: Page, url: string, label: string): Promise<void> {
  let problem: string | null = null;
  try {
    const res = await page.request.get(url, { timeout: 5000 });
    if (!res.ok()) problem = `Server at ${url} responded ${res.status()} — ${label} cannot run`;
  } catch {
    problem = `No server reachable at ${url} — ${label} cannot run (run "npm run build && npm run start" first)`;
  }
  if (!problem) return;
  if (process.env.CI) throw new Error(`${problem}. Failing instead of skipping because CI is set.`);
  test.skip(true, problem);
}
