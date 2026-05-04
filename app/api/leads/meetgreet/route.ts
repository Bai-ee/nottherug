import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { fsSetDoc } from '@/lib/server/firestoreRest';
import { getResend, getFromAddress, getFounderEmail } from '@/lib/email/resend';
import { founderMeetGreetEmail, customerMeetGreetEmail } from '@/lib/email/templates';

export const runtime = 'nodejs';

type MeetGreetPayload = {
  ownerName: string;
  phone: string;
  email: string;
  neighborhood: string;
  dogName: string;
  breedAge: string;
  serviceInterest: string;
  spayNeuter: string;
  vaccinations: string;
  dogSocial: string;
  strangerSocial: string;
  walkFrequency: string;
  notes: string;
  source?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isEmail(v: unknown): v is string {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export async function POST(req: Request) {
  let body: Partial<MeetGreetPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const required: Array<keyof MeetGreetPayload> = [
    'ownerName', 'phone', 'email', 'neighborhood',
    'dogName', 'breedAge', 'serviceInterest',
    'spayNeuter', 'vaccinations', 'dogSocial', 'strangerSocial', 'walkFrequency',
  ];

  const missing = required.filter(k => !isNonEmptyString(body[k]));
  if (missing.length) {
    return NextResponse.json({ ok: false, error: `Missing: ${missing.join(', ')}` }, { status: 400 });
  }
  if (!isEmail(body.email)) {
    return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
  }

  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  const lead = {
    id,
    type: 'meetgreet' as const,
    submittedAt,
    ownerName: body.ownerName!.trim(),
    phone: body.phone!.trim(),
    email: body.email!.trim().toLowerCase(),
    neighborhood: body.neighborhood!.trim(),
    dogName: body.dogName!.trim(),
    breedAge: body.breedAge!.trim(),
    serviceInterest: body.serviceInterest!.trim(),
    spayNeuter: body.spayNeuter!.trim(),
    vaccinations: body.vaccinations!.trim(),
    dogSocial: body.dogSocial!.trim(),
    strangerSocial: body.strangerSocial!.trim(),
    walkFrequency: body.walkFrequency!.trim(),
    notes: (body.notes ?? '').trim(),
    source: (body.source ?? 'unknown').trim(),
  };

  try {
    await fsSetDoc(`leads/${id}`, lead);
  } catch (err) {
    console.error('[lead:meetgreet] firestore write failed', err);
    return NextResponse.json({ ok: false, error: 'Could not save lead. Please try again.' }, { status: 500 });
  }

  console.log('[lead:meetgreet] saved', id);

  // Fire-and-log emails. Failures don't block the success response — the lead is already saved.
  try {
    const resend = getResend();
    const from = getFromAddress();
    const founder = getFounderEmail();
    const sandbox = from.endsWith('@resend.dev');

    const founderMail = founderMeetGreetEmail(lead);
    const founderResult = await resend.emails.send({
      from,
      to: founder,
      replyTo: lead.email,
      subject: founderMail.subject,
      html: founderMail.html,
      text: founderMail.text,
    });
    if (founderResult.error) {
      console.error('[lead:meetgreet] founder email failed', founderResult.error);
    } else {
      console.log('[lead:meetgreet] founder email sent', founderResult.data?.id);
    }

    if (sandbox) {
      console.log('[lead:meetgreet] customer confirmation skipped (sandbox sender — only delivers to verified address)');
    } else {
      const customerMail = customerMeetGreetEmail(lead);
      const customerResult = await resend.emails.send({
        from,
        to: lead.email,
        subject: customerMail.subject,
        html: customerMail.html,
        text: customerMail.text,
      });
      if (customerResult.error) {
        console.error('[lead:meetgreet] customer email failed', customerResult.error);
      } else {
        console.log('[lead:meetgreet] customer email sent', customerResult.data?.id);
      }
    }
  } catch (err) {
    console.error('[lead:meetgreet] email pipeline error', err);
  }

  return NextResponse.json({ ok: true, id });
}
