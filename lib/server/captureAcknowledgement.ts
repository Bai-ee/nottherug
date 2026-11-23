import { fsGetDoc, fsMergeDoc } from '@/lib/server/firestoreRest';
import { getFounderEmail, getFromAddress, getResend } from '@/lib/email/resend';
import { withBookingNotifyCopy } from '@/lib/email/bookingRecipients';
import { isSandboxSender } from '@/lib/email/sandbox';
import { captureAcknowledgementEmail, founderCaptureEmail } from '@/lib/email/templates';
import { consentLink } from '@/lib/leads/consentLinks';
import { TEST_DEVICES_COLLECTION } from '@/lib/testing/classification';
import { notifyHitloopLead } from '@/lib/server/hitloopNotify';

const EMAIL_TIMEOUT_MS = 8_000;
/** Same per-call ceiling the capture route gives every Firestore call. */
const FS_CALL = { timeoutMs: 2_500 };

export type AcknowledgementOutcome = 'sent' | 'failed' | 'skipped';

type Mail = { subject: string; html: string; text: string };

/**
 * Emails for an address seen for the first time in the booking flow (the
 * caller only invokes this when recordCapture CREATED the row, so each goes at
 * most once per address):
 * - "We have your email" to the person (skipped for the @resend.dev sandbox).
 * - A real-time "new lead, email only" alert to the founder and the admin
 *   inbox, the same recipients as a meet & greet, so email-only leads reach
 *   Luis like any other lead.
 * - A "NTR - New Lead" Telegram ping via HITLOOP (lib/server/hitloopNotify).
 * All are skipped for a marked test device. Outcomes are written on the row.
 */
export async function sendCaptureAcknowledgement(input: {
  captureId: string;
  email: string;
  source: string;
  booked: boolean;
  alreadyNewsletter: boolean;
  testDeviceId?: string;
}): Promise<AcknowledgementOutcome> {
  let outcome: AcknowledgementOutcome = 'skipped';
  let founderOutcome: AcknowledgementOutcome = 'skipped';
  try {
    let isTest = false;
    if (input.testDeviceId) {
      try {
        isTest = (await fsGetDoc(`${TEST_DEVICES_COLLECTION}/${input.testDeviceId}`, FS_CALL)).exists;
      } catch {
        isTest = false;
      }
    }
    if (!isTest) {
      [outcome, founderOutcome] = await Promise.all([sendToPerson(input), sendToFounder(input), notifyHitloopLead('email-only')]);
    }
  } finally {
    try {
      const now = new Date().toISOString();
      await fsMergeDoc(
        `leads/${input.captureId}`,
        { acknowledgement: outcome, acknowledgementAt: now, founderNotification: founderOutcome, founderNotificationAt: now },
        { ...FS_CALL, precondition: { exists: true } },
      );
    } catch {
      console.error('[lead:capture] notification status persist failed');
    }
  }
  return outcome;
}

async function sendToPerson(input: { captureId: string; email: string; alreadyNewsletter: boolean }): Promise<AcknowledgementOutcome> {
  let from: string;
  try {
    from = getFromAddress();
  } catch {
    return 'skipped';
  }
  // A @resend.dev sender only delivers to the account's own address.
  if (isSandboxSender(from)) return 'skipped';
  const mail = captureAcknowledgementEmail({
    newsletterUrl: consentLink(input.captureId, 'newsletter'),
    contactUrl: consentLink(input.captureId, 'contact'),
    alreadyNewsletter: input.alreadyNewsletter,
  });
  return deliver({ to: input.email }, mail, 'acknowledgement');
}

async function sendToFounder(input: {
  captureId: string;
  email: string;
  source: string;
  booked: boolean;
  alreadyNewsletter: boolean;
}): Promise<AcknowledgementOutcome> {
  let founderEmail: string;
  try {
    founderEmail = getFounderEmail();
  } catch {
    return 'skipped';
  }
  const mail = founderCaptureEmail({
    id: input.captureId,
    email: input.email,
    source: input.source,
    submittedAt: new Date().toISOString(),
    booked: input.booked,
    newsletterOptIn: input.alreadyNewsletter,
  });
  return deliver({ to: withBookingNotifyCopy(founderEmail), replyTo: input.email }, mail, 'founder alert');
}

async function deliver(
  addressing: { to: string | string[]; replyTo?: string },
  mail: Mail,
  label: string,
): Promise<AcknowledgementOutcome> {
  let from: string;
  let resend: ReturnType<typeof getResend>;
  try {
    resend = getResend();
    from = getFromAddress();
  } catch {
    return 'skipped';
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timed out')), EMAIL_TIMEOUT_MS);
    });
    const result = await Promise.race([
      resend.emails.send({ from, ...addressing, subject: mail.subject, html: mail.html, text: mail.text }),
      timeout,
    ]);
    if (result.error) {
      console.error(`[lead:capture] ${label} email failed`);
      return 'failed';
    }
    return 'sent';
  } catch {
    console.error(`[lead:capture] ${label} email error`);
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}
