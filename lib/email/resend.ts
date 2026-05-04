import { Resend } from 'resend';

let client: Resend | null = null;

export function getResend(): Resend {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  client = new Resend(key);
  return client;
}

export function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error('RESEND_FROM_EMAIL is not set');
  return from;
}

export function getFounderEmail(): string {
  const to = process.env.FOUNDER_EMAIL;
  if (!to) throw new Error('FOUNDER_EMAIL is not set');
  return to;
}
