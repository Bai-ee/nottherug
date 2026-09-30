import type { Metadata } from 'next';
import SignupPageContent from '@/components/marketing/SignupPageContent';
import { buildPageMetadata, OG_IMAGES } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/signup',
  ogImage: OG_IMAGES.book,
  title: 'Sign Up',
  description: 'Tell us about your dog and book a free Meet & Greet with Not The Rug, Williamsburg\u2019s neighborhood dog walkers.',
});

export default function SignupPage() {
  return <SignupPageContent />;
}
