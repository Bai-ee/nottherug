import type { Metadata } from 'next';
import EmailPreferenceConfirm from '@/components/marketing/EmailPreferenceConfirm';

export const metadata: Metadata = {
  title: 'Email preferences',
  robots: { index: false, follow: false },
};

/** Landing page for the "we have your email" message's two buttons. */
export default async function EmailPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const p = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
  return (
    <main id="email-preferences-page" className="container" style={{ padding: 'clamp(48px, 10vw, 120px) 16px' }}>
      <EmailPreferenceConfirm id={one(p.id)} kind={one(p.a)} token={one(p.t)} />
    </main>
  );
}
