import type { NextConfig } from "next";

// Directories and files that must never be traced into server render functions.
// These are large repo assets (videos, images, docs) with no runtime dependency.
const SHARED_TRACE_EXCLUDES = [
  './public/**/*',
  './logos/**/*',
  './dogs/**/*',
  './docs/**/*',
  './style-guide/**/*',
  './misc/**/*',
  './data/**/*',
  './README.md',
  './index.html',
  './optimize_video.py',
  './download_video.py',
  './tsconfig.tsbuildinfo',
  './lib/media/renderers/ffmpeg.ts',
];

const GENERATOR_TRACE_EXCLUDES = [
  ...SHARED_TRACE_EXCLUDES,
  './not-the-rug-brief/**/*',
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ['sharp', 'firebase-admin', '@anthropic-ai/sdk'],

  outputFileTracingExcludes: {
    '/api/admin/generator/render':              GENERATOR_TRACE_EXCLUDES,
    '/api/admin/photos/render':                 GENERATOR_TRACE_EXCLUDES,
    '/admin/not-the-rug/run-brief':             SHARED_TRACE_EXCLUDES,
    '/admin/not-the-rug/latest-brief':          SHARED_TRACE_EXCLUDES,
    '/admin/not-the-rug/latest-brief/html':     SHARED_TRACE_EXCLUDES,
    '/admin/not-the-rug/history':               SHARED_TRACE_EXCLUDES,
    '/admin/not-the-rug/history/[id]/html':     SHARED_TRACE_EXCLUDES,
    '/api/cron/not-the-rug-brief':              SHARED_TRACE_EXCLUDES,
    '/api/cron/founder-brief':                  SHARED_TRACE_EXCLUDES,
    '/api/cron/leads-digest':                   SHARED_TRACE_EXCLUDES,
    '/api/leads/meetgreet':                     SHARED_TRACE_EXCLUDES,
    '/admin/preview/founder-brief':             SHARED_TRACE_EXCLUDES,
    '/admin/founder-brief/run-and-send':        SHARED_TRACE_EXCLUDES,
    '/admin/leads':                             SHARED_TRACE_EXCLUDES,
  },

  outputFileTracingIncludes: {
    '/admin/not-the-rug/run-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
    '/admin/not-the-rug/latest-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
    '/admin/not-the-rug/latest-brief/html': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
    '/admin/not-the-rug/history': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
    '/admin/not-the-rug/history/[id]/html': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
    '/api/cron/not-the-rug-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
    // New routes that import lib/not-the-rug-brief/server.ts also need the
    // brief sources + Anthropic SDK traced in even though we excluded the
    // shared heavy dirs above.
    '/api/cron/founder-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
    '/admin/preview/founder-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
    '/admin/founder-brief/run-and-send': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
    ],
  },
};

export default nextConfig;
