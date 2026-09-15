import 'server-only';
import path from 'path';
import { createRequire } from 'module';
import type { BriefPayload, ContentPayload, BriefArtifacts } from '@/lib/not-the-rug-brief/types';
import type { StageCost } from '@/lib/not-the-rug-brief/costs';

/**
 * The CommonJS pipeline (not-the-rug-brief/index.js) is loaded through
 * node:module's createRequire rather than an ordinary import, because it is
 * not bundled into Vercel functions the same way (see next.config.ts's
 * outputFileTracingIncludes) and is only available at runtime.
 *
 * Isolated in its own module (rather than inlined in read.ts/run.ts) purely
 * so tests can mock this one boundary and exercise the real orchestration
 * logic around it without ever loading the actual pipeline — which would
 * otherwise reach the network and a paid model.
 */

export type BriefBundleRunResult = {
  status: 'success' | 'error';
  stage?: string;
  error?: string;
  pipelineStartedAt?: string;
  latestBrief?: BriefPayload | null;
  latestContent?: ContentPayload | null;
  guardianFlags?: import('@/lib/not-the-rug-brief/types').GuardianFlags | null;
  scoutPriorityAction?: string | null;
  reportPaths?: { markdownPath?: string; htmlPath?: string } | null;
  artifacts?: Partial<BriefArtifacts>;
  runCostData?: { stageCosts?: StageCost[] };
};

export interface BriefBundle {
  runNotTheRugBrief: (options?: { fresh?: boolean }) => Promise<BriefBundleRunResult>;
  getLatestNotTheRugArtifacts: () => Promise<{
    latestBrief?: BriefPayload | null;
    latestContent?: ContentPayload | null;
    artifacts?: Partial<BriefArtifacts>;
  }>;
}

const requireFromRoot = createRequire(path.join(process.cwd(), 'package.json'));

let _bundle: BriefBundle | null = null;

export function loadBriefBundle(): BriefBundle {
  return _bundle ??= requireFromRoot('./not-the-rug-brief/index.js') as BriefBundle;
}
