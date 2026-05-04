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

// Modules that firebase-admin needs at runtime but Next/Turbopack file tracing
// sometimes misses (transitive deps of google-auth-library). Include these on
// every route that touches firebase-admin.
const FIREBASE_ADMIN_INCLUDES = [
  './node_modules/firebase-admin/**/*',
  './node_modules/google-auth-library/**/*',
  './node_modules/gcp-metadata/**/*',
  './node_modules/google-logging-utils/**/*',
  './node_modules/gtoken/**/*',
  './node_modules/jws/**/*',
  './node_modules/jwa/**/*',
  './node_modules/google-gax/**/*',
  './node_modules/@google-cloud/**/*',
  './node_modules/@firebase/**/*',
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
      ...FIREBASE_ADMIN_INCLUDES,
    ],
    // New routes that import lib/not-the-rug-brief/server.ts also need the
    // brief sources + Anthropic SDK traced in even though we excluded the
    // shared heavy dirs above.
    '/api/cron/founder-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
      ...FIREBASE_ADMIN_INCLUDES,
    ],
    '/admin/preview/founder-brief': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
      ...FIREBASE_ADMIN_INCLUDES,
    ],
    '/admin/founder-brief/run-and-send': [
      './not-the-rug-brief/**/*',
      './node_modules/@anthropic-ai/sdk/**/*',
      './node_modules/uuid/**/*',
      ...FIREBASE_ADMIN_INCLUDES,
    ],
    // Other routes that import firebase-admin via verifyAdmin or fsQueryCollection
    '/api/leads/meetgreet': FIREBASE_ADMIN_INCLUDES,
    '/admin/leads': FIREBASE_ADMIN_INCLUDES,
    '/api/cron/leads-digest': FIREBASE_ADMIN_INCLUDES,
  },
};

export default nextConfig;
