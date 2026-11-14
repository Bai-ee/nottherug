/**
 * Booking notifications (meet & greet and time requests) also go to the
 * admin inbox in BOOKING_NOTIFY_EMAIL, alongside FOUNDER_EMAIL. Unset or the
 * same address as the founder: just the founder.
 */
export function withBookingNotifyCopy(founderEmail: string): string | string[] {
  const extra = process.env.BOOKING_NOTIFY_EMAIL?.trim();
  if (!extra || extra.toLowerCase() === founderEmail.trim().toLowerCase()) return founderEmail;
  return [founderEmail, extra];
}
