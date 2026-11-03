import { NextResponse } from 'next/server';
import { fsGetDoc, fsMergeDoc } from '@/lib/server/firestoreRest';
import { consentFields } from '@/lib/leads/consent';
import { isConsentKind, verifyConsentLink } from '@/lib/leads/consentLinks';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Records a "yes" from the acknowledgement email's Confirm page. Only a
 * correctly signed link counts (lib/leads/consentLinks.ts). Never clears a
 * consent and never creates a record: an unknown or deleted address is a 404.
 * The yes is copied onto the person's questionnaire lead too when there is one,
 * because the admin list shows that lead instead of the capture row.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
  const { id, a: kind, t: token } = body;
  if (!isConsentKind(kind) || !verifyConsentLink(id, kind, token)) {
    return NextResponse.json({ ok: false, error: 'This link is not valid. Reply to our email instead and we’ll take care of it.' }, { status: 400 });
  }
  try {
    const capture = await fsGetDoc(`leads/${id}`);
    if (!capture.exists || !capture.data) {
      return NextResponse.json({ ok: false, error: 'We could not find this request anymore.' }, { status: 404 });
    }
    const flag = kind === 'newsletter' ? 'newsletterOptIn' : 'contactOptIn';
    const fields = consentFields(kind, 'email-link', new Date().toISOString());
    if (capture.data[flag] !== true) await fsMergeDoc(`leads/${id}`, fields);
    const leadId = capture.data.convertedLeadId;
    if (typeof leadId === 'string' && /^[a-f0-9]{64}$/.test(leadId)) {
      try {
        const lead = await fsGetDoc(`leads/${leadId}`);
        if (lead.exists && lead.data?.[flag] !== true) await fsMergeDoc(`leads/${leadId}`, fields);
      } catch {
        // The capture row holds the yes either way.
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
