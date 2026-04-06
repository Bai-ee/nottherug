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
  },

  outputFileTracingIncludes: {
    '/admin/not-the-rug/run-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
    ],
    '/admin/not-the-rug/latest-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
    ],
    '/admin/not-the-rug/latest-brief/html': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
    ],
    '/admin/not-the-rug/history': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
    ],
    '/admin/not-the-rug/history/[id]/html': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
    ],
    '/api/cron/not-the-rug-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
    ],
  },
};

export default nextConfig;
