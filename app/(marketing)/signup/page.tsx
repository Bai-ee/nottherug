import type { Metadata } from 'next';
import SignupPageContent from '@/components/marketing/SignupPageContent';
import { buildPageMetadata } from '@/lib/content/site';

export const metadata: Metadata = buildPageMetadata({
  path: '/signup',
  title: 'Sign Up',
  description: 'Tell us about your dog and book a free Meet & Greet with Not The Rug, Williamsburg\u2019s neighborhood dog walkers.',
});

export default function SignupPage() {
  return <SignupPageContent />;
}
