// Helper for the "appointment_completed" event: plans/002-production-readiness.md
// P4 requires tracking a completed appointment only through a verified
// provider event (never inferred from the dialog simply being open) and
// requires any postMessage listener to filter by expected origin.
//
// This has no call site in files this task owns — the Calendly iframe lives
// in components/booking/SchedulingDialog.tsx, which belongs to Worker A. See
// the P4 report for the exact `window.addEventListener('message', ...)`
// change that would use this.

const CALENDLY_MESSAGE_ORIGIN = 'https://calendly.com';

/**
 * True only for a MessageEvent that actually came from an embedded Calendly
 * iframe and reports its "event_scheduled" event — the one Calendly
 * postMessage payload that means a real booking was completed, not just that
 * the widget loaded or the visitor clicked around in it.
 */
export function isVerifiedCalendlyBookingEvent(event: MessageEvent): boolean {
  if (event.origin !== CALENDLY_MESSAGE_ORIGIN) return false;
  const data = event.data as unknown;
  if (!data || typeof data !== 'object') return false;
  const eventName = (data as { event?: unknown }).event;
  return eventName === 'calendly.event_scheduled';
}
