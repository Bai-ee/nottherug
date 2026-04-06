import type { NextConfig } from "next";

// Directories and files that must never be traced into server render functions.
// These are large repo assets (videos, images, docs) with no runtime dependency.
const TRACE_EXCLUDES = [
  './public/**/*',
  './logos/**/*',
  './dogs/**/*',
  './docs/**/*',
  './style-guide/**/*',
  './misc/**/*',
  './README.md',
  './index.html',
  './optimize_video.py',
  './download_video.py',
  './tsconfig.tsbuildinfo',
  './lib/media/renderers/ffmpeg.ts',
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ['sharp', 'firebase-admin'],

  outputFileTracingExcludes: {
    '/api/admin/generator/render': TRACE_EXCLUDES,
    '/api/admin/photos/render':    TRACE_EXCLUDES,
  },
};

export default nextConfig;
