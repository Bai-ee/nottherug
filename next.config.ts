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
  './ignore/**/*',
  './updated_images/**/*',
  './assets-src/**/*',
  './app-assets/**/*',
  './plans/**/*',
  './README.md',
  './index.html',
  './optimize_video.py',
  './download_video.py',
  './tsconfig.tsbuildinfo',
];

// Full transitive dep tree of firebase-admin (resolved via npm). Next 16 +
// Turbopack file tracing misses many of these even with serverExternalPackages.
// Listing them explicitly is more reliable than chasing each runtime error.
const FIREBASE_ADMIN_INCLUDES = [
  './node_modules/firebase-admin/**/*',
  // Only the @firebase packages firebase-admin actually pulls in (via
  // @firebase/database-compat). The broad '@firebase/**/*' glob also dragged in
  // the *client* SDK (firestore 52MB, auth 15MB, ai 2.5MB), which server code
  // never loads and which pushed the function past Vercel's 250MB limit.
  './node_modules/@firebase/database-compat/**/*',
  './node_modules/@firebase/database/**/*',
  './node_modules/@firebase/database-types/**/*',
  './node_modules/@firebase/component/**/*',
  './node_modules/@firebase/logger/**/*',
  './node_modules/@firebase/util/**/*',
  './node_modules/@firebase/app-check-interop-types/**/*',
  './node_modules/@firebase/auth-interop-types/**/*',
  './node_modules/@google-cloud/**/*',
  './node_modules/@grpc/**/*',
  './node_modules/@opentelemetry/**/*',
  './node_modules/@protobufjs/**/*',
  './node_modules/@tootallnate/**/*',
  './node_modules/@types/caseless/**/*',
  './node_modules/@types/long/**/*',
  './node_modules/@types/request/**/*',
  './node_modules/@types/tough-cookie/**/*',
  './node_modules/abort-controller/**/*',
  './node_modules/agent-base/**/*',
  './node_modules/ansi-regex/**/*',
  './node_modules/asynckit/**/*',
  './node_modules/base64-js/**/*',
  './node_modules/bignumber.js/**/*',
  './node_modules/buffer-equal-constant-time/**/*',
  './node_modules/call-bind-apply-helpers/**/*',
  './node_modules/cliui/**/*',
  './node_modules/combined-stream/**/*',
  './node_modules/debug/**/*',
  './node_modules/delayed-stream/**/*',
  './node_modules/dunder-proto/**/*',
  './node_modules/duplexify/**/*',
  './node_modules/ecdsa-sig-formatter/**/*',
  './node_modules/emoji-regex/**/*',
  './node_modules/end-of-stream/**/*',
  './node_modules/es-define-property/**/*',
  './node_modules/es-errors/**/*',
  './node_modules/es-object-atoms/**/*',
  './node_modules/es-set-tostringtag/**/*',
  './node_modules/escalade/**/*',
  './node_modules/event-target-shim/**/*',
  './node_modules/extend/**/*',
  './node_modules/fast-deep-equal/**/*',
  './node_modules/form-data/**/*',
  './node_modules/function-bind/**/*',
  './node_modules/functional-red-black-tree/**/*',
  './node_modules/gaxios/**/*',
  './node_modules/gcp-metadata/**/*',
  './node_modules/get-caller-file/**/*',
  './node_modules/get-intrinsic/**/*',
  './node_modules/get-proto/**/*',
  './node_modules/google-auth-library/**/*',
  './node_modules/google-gax/**/*',
  './node_modules/google-logging-utils/**/*',
  './node_modules/gopd/**/*',
  './node_modules/gtoken/**/*',
  './node_modules/has-symbols/**/*',
  './node_modules/has-tostringtag/**/*',
  './node_modules/hasown/**/*',
  './node_modules/http-proxy-agent/**/*',
  './node_modules/https-proxy-agent/**/*',
  './node_modules/inherits/**/*',
  './node_modules/is-fullwidth-code-point/**/*',
  './node_modules/is-stream/**/*',
  './node_modules/json-bigint/**/*',
  './node_modules/jwa/**/*',
  './node_modules/jws/**/*',
  './node_modules/lodash.camelcase/**/*',
  './node_modules/long/**/*',
  './node_modules/math-intrinsics/**/*',
  './node_modules/mime-db/**/*',
  './node_modules/mime-types/**/*',
  './node_modules/ms/**/*',
  './node_modules/node-fetch/**/*',
  './node_modules/object-hash/**/*',
  './node_modules/once/**/*',
  './node_modules/proto3-json-serializer/**/*',
  './node_modules/protobufjs/**/*',
  './node_modules/readable-stream/**/*',
  './node_modules/require-directory/**/*',
  './node_modules/retry-request/**/*',
  './node_modules/safe-buffer/**/*',
  './node_modules/stream-events/**/*',
  './node_modules/stream-shift/**/*',
  './node_modules/string-width/**/*',
  './node_modules/string_decoder/**/*',
  './node_modules/strip-ansi/**/*',
  './node_modules/stubs/**/*',
  './node_modules/teeny-request/**/*',
  './node_modules/tr46/**/*',
  './node_modules/undici-types/**/*',
  './node_modules/util-deprecate/**/*',
  './node_modules/webidl-conversions/**/*',
  './node_modules/whatwg-url/**/*',
  './node_modules/wrappy/**/*',
  './node_modules/y18n/**/*',
  './node_modules/yargs/**/*',
  './node_modules/yargs-parser/**/*',
];

// Routes that only compose text/email have no image pipeline; keep the multi-
// hundred-MB libvips binaries out of them.
const SHARP_TRACE_EXCLUDES = [
  './node_modules/sharp/**/*',
  './node_modules/@img/**/*',
];

const GENERATOR_TRACE_EXCLUDES = [
  ...SHARED_TRACE_EXCLUDES,
  './not-the-rug-brief/**/*',
];

// SHARED_TRACE_EXCLUDES drops all of app-assets, but renderGeneratorImage falls
// back to these logo files when both Storage and the public path miss. Every
// route that can render an image has to add them back.
const GENERATOR_ASSET_INCLUDES = ['./app-assets/generator-logos/**/*'];

// Text/email routes: shared repo assets + the sharp binaries.
const BRIEF_TRACE_EXCLUDES = [
  ...SHARED_TRACE_EXCLUDES,
  ...SHARP_TRACE_EXCLUDES,
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },

  // The standalone /services and /how-it-works pages are gone — rates live in
  // the home page's #home-personalized-care-section panel and the process steps
  // in #home-how-it-works-section. Old links and bookmarks land there.
  // Not permanent: a 308 would be cached by browsers indefinitely, and this
  // consolidation is still settling.
  async redirects() {
    return [
      { source: '/services', destination: '/#home-personalized-care-section', permanent: false },
      { source: '/how-it-works', destination: '/#home-how-it-works-block', permanent: false },
    ];
  },

  // plans/010-production-final-mile-optimization.md P5 header review. This is
  // deliberately the SAFE subset only — headers with no plausible interaction
  // with Firebase Auth, the Calendly iframe, or Next's own scripts, so they
  // can ship without a live preview check. See the comment below for what is
  // intentionally NOT here and why.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Stops a browser from MIME-sniffing a response into executing it
          // as something other than its declared Content-Type. No route
          // relies on sniffing; safe everywhere.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Sends the full path to same-origin navigations/requests (so
          // internal analytics/referrer logic keeps working) but only the
          // origin cross-site, instead of the previous default of sending the
          // full URL everywhere. Booking/admin URLs never carry PII in the
          // path itself (lead data is POSTed, not query-stringed), so this
          // has nothing sensitive to leak either way.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Denies APIs this app never calls (verified via a repo-wide grep
          // for navigator.geolocation / getUserMedia / mediaDevices — no
          // hits). Firebase Auth's popup flow doesn't need any of these.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          // No route in this app is meant to be framed by another origin
          // (the booking flow embeds Calendly, nothing embeds us), so
          // same-origin framing is the only case to allow.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
  // NOT included above, and why:
  //
  // - Content-Security-Policy: a real one needs to allowlist, at minimum,
  //   Firebase Auth's popup/redirect domains (accounts.google.com,
  //   apis.google.com, *.firebaseapp.com), Firestore/Storage REST endpoints
  //   (firestore.googleapis.com, firebasestorage.googleapis.com — see
  //   lib/server/firestoreRest.ts / firebaseStorage.ts), Calendly's iframe
  //   and its postMessage origin (assets.calendly.com, calendly.com — see
  //   lib/analytics/verifiedOrigin.ts), Google Fonts, and Next's own
  //   inline/hash-based scripts and styles. Getting any one of those wrong
  //   silently breaks admin sign-in or the booking scheduler rather than
  //   failing loudly, so this needs a page-by-page pass verified against a
  //   real preview deploy, not a global rule shipped from a read of the
  //   source. lib/not-the-rug-brief/security.ts already has the pattern this
  //   app uses for a narrow, single-route CSP (BRIEF_HTML_CSP) — the safest
  //   next step is more routes adopting that per-route approach, or a
  //   verified global policy built the same way, not a guessed one here.
  // - Cross-Origin-Opener-Policy: `same-origin` (the common "secure by
  //   default" value) breaks `signInWithPopup` (app/admin/page.tsx) — the
  //   popup can no longer report back to the opener. `same-origin-allow-
  //   popups` is the compatible value, but it still needs to be verified
  //   against the live Google sign-in popup before shipping, so it is
  //   recommended, not applied.
  // - Strict-Transport-Security: Vercel already sets this at the platform
  //   edge for the production domain; adding it here would be redundant and
  //   risks a mismatched max-age/preload configuration.
  serverExternalPackages: ['sharp', 'firebase-admin'],

  outputFileTracingExcludes: {
    '/api/admin/generator/render':              GENERATOR_TRACE_EXCLUDES,
    '/api/admin/photos/render':                 GENERATOR_TRACE_EXCLUDES,
    '/admin/not-the-rug/run-brief':             GENERATOR_TRACE_EXCLUDES,
    '/admin/not-the-rug/latest-brief':          BRIEF_TRACE_EXCLUDES,
    '/admin/not-the-rug/latest-brief/html':     BRIEF_TRACE_EXCLUDES,
    '/admin/not-the-rug/history':               BRIEF_TRACE_EXCLUDES,
    '/admin/not-the-rug/history/[id]/html':     BRIEF_TRACE_EXCLUDES,
    '/api/cron/not-the-rug-brief':              GENERATOR_TRACE_EXCLUDES,
    '/api/cron/founder-brief':                  BRIEF_TRACE_EXCLUDES,
    '/api/cron/leads-digest':                   BRIEF_TRACE_EXCLUDES,
    '/api/leads/meetgreet':                     BRIEF_TRACE_EXCLUDES,
    '/admin/preview/founder-brief':             BRIEF_TRACE_EXCLUDES,
    '/admin/founder-brief/run-and-send':        GENERATOR_TRACE_EXCLUDES,
    '/admin/leads':                             BRIEF_TRACE_EXCLUDES,
  },

  outputFileTracingIncludes: {
    '/admin/not-the-rug/run-brief': [
      './not-the-rug-brief/**/*',
      ...GENERATOR_ASSET_INCLUDES,
    ],
    '/admin/not-the-rug/latest-brief': [
      './not-the-rug-brief/**/*',
    ],
    '/admin/not-the-rug/latest-brief/html': [
      './not-the-rug-brief/**/*',
    ],
    '/admin/not-the-rug/history': [
      './not-the-rug-brief/**/*',
    ],
    '/admin/not-the-rug/history/[id]/html': [
      './not-the-rug-brief/**/*',
    ],
    '/api/cron/not-the-rug-brief': [
      './not-the-rug-brief/**/*',
      ...GENERATOR_ASSET_INCLUDES,
      ...FIREBASE_ADMIN_INCLUDES,
    ],
    // Routes importing lib/not-the-rug-brief/read.ts or run.ts still need the
    // CommonJS pipeline sources traced in, since the shared heavy directories
    // are excluded above.
    '/api/cron/founder-brief': [
      './not-the-rug-brief/**/*',
      ...FIREBASE_ADMIN_INCLUDES,
    ],
    '/admin/preview/founder-brief': [
      './not-the-rug-brief/**/*',
      ...FIREBASE_ADMIN_INCLUDES,
    ],
    '/admin/founder-brief/run-and-send': [
      './not-the-rug-brief/**/*',
      ...GENERATOR_ASSET_INCLUDES,
      ...FIREBASE_ADMIN_INCLUDES,
    ],
    '/api/admin/generator/render': GENERATOR_ASSET_INCLUDES,
    '/api/admin/photos/render': GENERATOR_ASSET_INCLUDES,
    // Other routes that import firebase-admin via verifyAdmin or fsQueryCollection
    '/api/leads/meetgreet': FIREBASE_ADMIN_INCLUDES,
    '/admin/leads': FIREBASE_ADMIN_INCLUDES,
    '/api/cron/leads-digest': FIREBASE_ADMIN_INCLUDES,
  },
};

export default nextConfig;
