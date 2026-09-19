// Shared analytics contract — imported by the browser tracker, the public
// ingestion route, and the admin reporting service so all three agree on
// exactly what an event may contain. Decisions referenced below are the
// locked A0 table in plans/003-admin-dashboard-and-tracking.md.
//
// Everything here is an allowlist. The server re-validates against these same
// constants after the client has already filtered, because a public endpoint
// must assume the client is hostile.

/** Every event the system records. Adding a name here is a deliberate act. */
export const EVENT_NAMES = [
  'page_view',
  'engagement',
  'cta_click',
  'booking_form_start',
  'booking_step',
  'lead_saved',
  'scheduling_dialog_opened',
  'appointment_completed',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/**
 * Public marketing routes we will record. A path not in this list is reported
 * as null rather than stored — that keeps unknown/probed URLs, query strings
 * and hashes out of the dataset without needing to sanitize them.
 */
export const TRACKED_ROUTES = [
  '/',
  '/about',
  '/book',
  '/contact',
  '/neighborhoods/williamsburg',
  '/reviews',
  '/safety',
] as const;

export type TrackedRoute = (typeof TRACKED_ROUTES)[number];

/**
 * Stable CTA identifiers, re-derived from the rendered site in plan 009 P2.
 * Every id below is wired to a control that exists at some viewport width; the
 * ids for the retired /services and /how-it-works pages, and for a hero "book"
 * button that no longer exists, were removed rather than left as permanent
 * zero rows.
 */
export const CTA_IDS = [
  // Booking entry points. The homepage ones open the welcome modal instead of
  // navigating, but the intent measured is the same: someone asked to book.
  'nav_book',
  'mobile_menu_book',
  'closing_trust_book',
  'neighborhood_detail_book',
  'footer_book',
  'group_walk_card_submit',
  'welcome_modal_schedule',
  'welcome_modal_details',

  // Contact intent. On the homepage these are in-page anchors, not the
  // /contact route, so the id says where the visitor clicked, not where the
  // click landed.
  'nav_contact',
  'footer_contact',
  'hero_contact',
  'neighborhood_detail_contact',

  // tel: links. A tap-to-call is intent — it cannot tell us a call connected.
  'contact_phone',

  // mailto: links. The "join our team" mailto is recruiting, not a customer
  // action, so it is deliberately absent.
  'contact_email',

  // Service discovery. Measures interest in what is offered, before booking.
  'hero_view_services',
  'nav_services',
  'footer_services',
] as const;

/**
 * Outbound proof links (Yelp, Google, Instagram) exist in the rendered UI but
 * are deliberately NOT instrumented in this pass — plan 004 defaults to
 * excluding them until they answer a specific business question. Listed so the
 * next person can see they were considered rather than missed:
 *   HomeHero            Yelp rating, Google rating (two links)
 *   ContactInfoCard     Instagram profile
 *   ServicesPageContent Instagram credit
 * Adding one means adding its id above, instrumenting the element, and
 * deciding where it surfaces in the report.
 */

export type CtaId = (typeof CTA_IDS)[number];

/**
 * Every id above is wired to an element that actually renders, so this is
 * currently the whole list. It stays a separate export because the dashboard
 * must render rows only for controls that exist: an id with no element shows
 * as a zero row reading "nobody clicks this" when the truth is "this is not on
 * the site." If an id is ever added before its element ships, keep it out of
 * here until the element lands.
 */
export const LIVE_CTA_IDS = CTA_IDS;


/** Named steps in the booking flow, in order. Used for the funnel. */
export const BOOKING_STEPS = ['details', 'dog', 'schedule', 'review'] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number];

/**
 * Campaign slugs for links handed out physically or in a bio (decision 8).
 * Bounded on purpose: arbitrary UTM text is never ingested, because free text
 * from a URL is exactly the vector that smuggles personal data into analytics.
 */
export const CAMPAIGN_SLUGS = [
  'flyer',
  'ig-bio',
  'ig-story',
  'google-business',
  'yelp',
  'referral-card',
  'door-hanger',
] as const;

export type CampaignSlug = (typeof CAMPAIGN_SLUGS)[number];

/**
 * How a visit is attributed (decision 8). Exactly one kind per session, fixed
 * at session start so later internal navigation cannot overwrite it.
 */
export type SourceKind = 'campaign' | 'referral' | 'direct';

/**
 * A single event as it travels from browser to server. Deliberately flat and
 * short-keyed: this rides in a sendBeacon body during page unload.
 */
export interface AnalyticsEvent {
  /** Event name; must be in EVENT_NAMES. */
  event: EventName;
  /** Client-generated unique id, used to deduplicate retries and double-fires. */
  id: string;
  /** Pseudonymous session id. NOT a person — see reporting rules below. */
  sid: string;
  /** Client clock, milliseconds. Advisory only; the server's receipt time is authoritative. */
  ts: number;
  /** Allowlisted route, or null when the page is not one we track. */
  route: TrackedRoute | null;
  /** Present on cta_click only. */
  cta?: CtaId;
  /** Present on booking_step only. */
  step?: BookingStep;
  /** Session attribution kind, sent on the session's first event. */
  src?: SourceKind;
  /** Referrer hostname only (never a full URL), when src === 'referral'. */
  ref?: string;
  /** Campaign slug, when src === 'campaign'. */
  camp?: CampaignSlug;
  /** 'test' keeps preview/acceptance traffic out of real business numbers (decision 10). */
  mode?: 'test';
}

/** Firestore collection holding raw events. No rollup collection exists by
 *  design — at the owner's traffic level (decision 5) reporting queries these
 *  directly, which keeps every number exact and removes a whole class of
 *  aggregation drift. */
export const EVENTS_COLLECTION = 'analytics_events';

/** Session lifetime. A gap longer than this starts a new session. Thirty
 *  minutes matches the common industry convention, so the numbers are at least
 *  comparable to what the owner has seen elsewhere. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** A visit counts as engaged (decision 2) once any one of these is true. The
 *  dashboard reports engaged-visit %, never classic bounce rate: on a brochure
 *  site, reading one page and then phoning is a success, not a bounce. */
export const ENGAGEMENT_DWELL_MS = 15_000;
export const ENGAGEMENT_SCROLL_RATIO = 0.5;

/** Hard caps enforced on the server. A public endpoint needs a byte ceiling
 *  regardless of how well-behaved our own client is. */
export const MAX_BATCH_EVENTS = 20;
export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_ID_LENGTH = 64;
export const MAX_REF_LENGTH = 128;

// --- validation helpers, shared by client and server ------------------------

export function isEventName(v: unknown): v is EventName {
  return typeof v === 'string' && (EVENT_NAMES as readonly string[]).includes(v);
}

export function isTrackedRoute(v: unknown): v is TrackedRoute {
  return typeof v === 'string' && (TRACKED_ROUTES as readonly string[]).includes(v);
}

export function isCtaId(v: unknown): v is CtaId {
  return typeof v === 'string' && (CTA_IDS as readonly string[]).includes(v);
}

export function isBookingStep(v: unknown): v is BookingStep {
  return typeof v === 'string' && (BOOKING_STEPS as readonly string[]).includes(v);
}

export function isCampaignSlug(v: unknown): v is CampaignSlug {
  return typeof v === 'string' && (CAMPAIGN_SLUGS as readonly string[]).includes(v);
}

/** Opaque-id shape check: our own ids are hex/uuid-ish. Rejects anything long
 *  enough or punctuated enough to be smuggling a value. */
export function isOpaqueId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_ID_LENGTH && /^[A-Za-z0-9_-]+$/.test(v);
}

/**
 * Normalizes an arbitrary pathname to a tracked route, or null. Strips query
 * and hash, tolerates a trailing slash. Returning null (rather than the raw
 * path) is what keeps un-enumerated URLs out of storage entirely.
 */
export function toTrackedRoute(pathname: string): TrackedRoute | null {
  const path = pathname.split('?')[0].split('#')[0];
  const trimmed = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return isTrackedRoute(trimmed) ? trimmed : null;
}

/**
 * Server-side validation of one event. Returns the accepted event or null.
 * Rejects rather than repairs: a malformed event from a public endpoint is not
 * worth guessing at, and a silently "fixed" event corrupts reporting quietly.
 */
export function validateEvent(input: unknown): AnalyticsEvent | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const e = input as Record<string, unknown>;

  if (!isEventName(e.event)) return null;
  if (!isOpaqueId(e.id) || !isOpaqueId(e.sid)) return null;
  if (typeof e.ts !== 'number' || !Number.isFinite(e.ts)) return null;

  const route = e.route === null || e.route === undefined ? null : isTrackedRoute(e.route) ? e.route : null;

  const out: AnalyticsEvent = { event: e.event, id: e.id, sid: e.sid, ts: e.ts, route };

  // Each optional field is accepted only on the event that may carry it, so a
  // crafted payload cannot attach a cta to a page_view and skew click reports.
  if (e.event === 'cta_click') {
    if (!isCtaId(e.cta)) return null;
    out.cta = e.cta;
  }
  if (e.event === 'booking_step') {
    if (!isBookingStep(e.step)) return null;
    out.step = e.step;
  }

  if (e.src === 'campaign' || e.src === 'referral' || e.src === 'direct') {
    out.src = e.src;
    if (e.src === 'campaign' && isCampaignSlug(e.camp)) out.camp = e.camp;
    if (e.src === 'referral' && typeof e.ref === 'string' && e.ref.length <= MAX_REF_LENGTH) {
      // Hostname only. A full URL carries paths and query strings we must not store.
      const host = e.ref.trim().toLowerCase();
      if (/^[a-z0-9.-]+$/.test(host)) out.ref = host;
    }
  }

  if (e.mode === 'test') out.mode = 'test';

  return out;
}
