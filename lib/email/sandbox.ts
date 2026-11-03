/**
 * True for Resend's shared @resend.dev test sender, in either form
 * ("x@resend.dev" or "Name <x@resend.dev>"). It can only deliver to the
 * Resend account's own address, so customer emails are skipped with it.
 */
export function isSandboxSender(from: string): boolean {
  return /@resend\.dev>?\s*$/i.test(from.trim());
}
