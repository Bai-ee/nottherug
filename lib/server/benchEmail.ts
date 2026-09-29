import { getFromAddress, getResend } from '@/lib/email/resend';
import type { NotificationOutcome } from '@/lib/bench/contract';

const EMAIL_TIMEOUT_MS = 8_000;

/** Provider errors can embed the recipient address; keep it out of logs. */
function redact(message: string): string {
  const scrubbed = message.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[redacted-email]');
  return scrubbed.length > 200 ? `${scrubbed.slice(0, 200)}…` : scrubbed;
}

/**
 * Sends one applicant email and reports the outcome instead of throwing: a
 * failed email must never fail the stage change or the application behind it.
 * A @resend.dev sender only delivers to the account owner, so applicant mail
 * is skipped rather than bounced (same rule as the meet & greet route).
 */
export async function sendApplicantEmail(
  to: string,
  mail: { subject: string; html: string; text: string },
  label: string,
): Promise<NotificationOutcome> {
  let from: string;
  let resend: ReturnType<typeof getResend>;
  try {
    from = getFromAddress();
    resend = getResend();
  } catch (err) {
    console.error(`[bench:${label}] email config missing`, err instanceof Error ? err.message : 'unknown');
    return 'skipped';
  }
  if (from.endsWith('@resend.dev')) return 'skipped';

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} email timed out`)), EMAIL_TIMEOUT_MS);
    });
    const result = await Promise.race([
      resend.emails.send({ from, to, subject: mail.subject, html: mail.html, text: mail.text }),
      timeout,
    ]);
    if (result.error) {
      console.error(`[bench:${label}] email failed`, redact(result.error.message));
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    console.error(`[bench:${label}] email error`, err instanceof Error ? redact(err.message) : 'unknown');
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}
