import { createHash } from 'node:crypto';

/**
 * Server-side hash of Calendly's opaque invitee id. Every place that stores a
 * booking reference (analytics events, lead captures) stores this hash, never
 * the raw id, so records can be matched to each other without the stored
 * value being usable against Calendly's API.
 */
export function hashBookingRef(raw: string): string {
  return createHash('sha256').update(`calendly-invitee:${raw}`).digest('hex').slice(0, 32);
}
