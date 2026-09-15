import 'server-only';
import path from 'path';

/**
 * Base working directory for the CommonJS pipeline's local JSON files
 * (not-the-rug-brief/store.js reads this same env var on every call — see
 * getDataDir() there). Shared by read.ts (cold-start fallback reads) and
 * run.ts (which points a single run at a per-run subdirectory of this base
 * and restores it afterward — see run.ts for why).
 */
const BASE_BRIEF_DATA_DIR = process.env.NOT_THE_RUG_BRIEF_DATA_DIR?.trim()
  ? path.resolve(process.env.NOT_THE_RUG_BRIEF_DATA_DIR)
  : process.env.VERCEL
    ? path.join('/tmp', 'not-the-rug-brief')
    : path.join(process.cwd(), 'data', 'not-the-rug-brief');

// Normalize immediately so every later reader of this env var (including the
// CJS pipeline) sees the same resolved absolute path.
process.env.NOT_THE_RUG_BRIEF_DATA_DIR = BASE_BRIEF_DATA_DIR;

export const NOT_THE_RUG_BRIEF_DATA_DIR = BASE_BRIEF_DATA_DIR;
