// Helper for the "appointment_completed" event: plans/002-production-readiness.md
// P4 requires tracking a completed appointment only through a verified
// provider event (never inferred from the dialog simply being open) and
// requires any postMessage listener to filter by expected origin.
//
// Call site: components/booking/SchedulingDialog.tsx's window 'message'
// listener (plans/003-admin-dashboard-and-tracking.md A3 / decision 9).

const CALENDLY_MESSAGE_ORIGIN = 'https://calendly.com';

/**
 * True only for a MessageEvent that actually came from an embedded Calendly
 * iframe and reports its "event_scheduled" event — the one Calendly
 * postMessage payload that means a real booking was completed, not just that
 * the widget loaded or the visitor clicked around in it.
 *
 * `expectedSource`, when provided, additionally requires the message's
 * `source` window to be the exact Calendly iframe we rendered (its
 * `contentWindow`) — not just any window that happens to share Calendly's
 * origin. Optional so this stays testable/usable without a live iframe.
 */
export function isVerifiedCalendlyBookingEvent(event: MessageEvent, expectedSource?: Window | null): boolean {
  if (event.origin !== CALENDLY_MESSAGE_ORIGIN) return false;
  if (expectedSource !== undefined && event.source !== expectedSource) return false;
  const data = event.data as unknown;
  if (!data || typeof data !== 'object') return false;
  const eventName = (data as { event?: unknown }).event;
  return eventName === 'calendly.event_scheduled';
}
