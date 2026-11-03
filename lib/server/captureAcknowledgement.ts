import { fsGetDoc, fsMergeDoc } from '@/lib/server/firestoreRest';
import { getFromAddress, getResend } from '@/lib/email/resend';
import { isSandboxSender } from '@/lib/email/sandbox';
import { captureAcknowledgementEmail } from '@/lib/email/templates';
import { consentLink } from '@/lib/leads/consentLinks';
import { TEST_DEVICES_COLLECTION } from '@/lib/testing/classification';

const EMAIL_TIMEOUT_MS = 8_000;
/** Same per-call ceiling the capture route gives every Firestore call. */
const FS_CALL = { timeoutMs: 2_500 };

export type AcknowledgementOutcome = 'sent' | 'failed' | 'skipped';

/**
 * "We have your email" for an address seen for the first time in the booking
 * flow (the caller only invokes this when recordCapture CREATED the row, so it
 * goes at most once per address). Skipped for a marked test device and for
 * the @resend.dev sandbox sender. The outcome is written on the capture row.
 */
export async function sendCaptureAcknowledgement(input: {
  captureId: string;
  email: string;
  alreadyNewsletter: boolean;
  testDeviceId?: string;
}): Promise<AcknowledgementOutcome> {
  let outcome: AcknowledgementOutcome = 'skipped';
  try {
    let isTest = false;
    if (input.testDeviceId) {
      try {
        isTest = (await fsGetDoc(`${TEST_DEVICES_COLLECTION}/${input.testDeviceId}`, FS_CALL)).exists;
      } catch {
        isTest = false;
      }
    }
    if (!isTest) outcome = await send(input);
  } finally {
    try {
      await fsMergeDoc(
        `leads/${input.captureId}`,
        { acknowledgement: outcome, acknowledgementAt: new Date().toISOString() },
        { ...FS_CALL, precondition: { exists: true } },
      );
    } catch {
      console.error('[lead:capture] acknowledgement status persist failed');
    }
  }
  return outcome;
}

async function send(input: { captureId: string; email: string; alreadyNewsletter: boolean }): Promise<AcknowledgementOutcome> {
  let from: string;
  let resend: ReturnType<typeof getResend>;
  try {
    resend = getResend();
    from = getFromAddress();
  } catch {
    return 'skipped';
  }
  if (isSandboxSender(from)) return 'skipped';
  const mail = captureAcknowledgementEmail({
    newsletterUrl: consentLink(input.captureId, 'newsletter'),
    contactUrl: consentLink(input.captureId, 'contact'),
    alreadyNewsletter: input.alreadyNewsletter,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timed out')), EMAIL_TIMEOUT_MS);
    });
    const result = await Promise.race([
      resend.emails.send({ from, to: input.email, subject: mail.subject, html: mail.html, text: mail.text }),
      timeout,
    ]);
    if (result.error) {
      console.error('[lead:capture] acknowledgement email failed');
      return 'failed';
    }
    return 'sent';
  } catch {
    console.error('[lead:capture] acknowledgement email error');
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}
