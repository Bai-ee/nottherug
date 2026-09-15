import { notFound } from 'next/navigation';
import PlaygroundClient from './PlaygroundClient';

// Dev-only animation playground (R16) — the tuning UI here is explicitly
// out of scope for production. `notFound()` only works reliably from a
// Server Component, so this file stays a server wrapper around the client
// component that holds the actual playground.
export default function ServiceCardsPlaygroundPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <PlaygroundClient />;
}
