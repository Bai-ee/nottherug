'use client';

import { useState } from 'react';

const FAQS: Array<{ q: string; a: string }> = [
  { q: 'What happens if my dog gets injured on a walk?', a: 'We contact you immediately, provide basic first aid if needed, and take your dog to your designated vet or the nearest emergency clinic. We document everything clearly and stay with your dog until you can be there. Our insurance covers veterinary costs related to walker negligence.' },
  { q: 'Will my dog always have the same walker?', a: "Yes, in the vast majority of cases. We assign a primary walker at onboarding and only introduce a backup walker (who you'll meet in advance) if your regular walker is unavailable. We never send an unknown person to your home." },
  { q: 'What are your vaccination requirements?', a: 'All dogs must be current on Rabies, DHPP (distemper/parvo), and Bordetella vaccines. We require documentation at onboarding. This protects your dog, our walkers, and other dogs in our care.' },
  { q: "What's your cancellation policy?", a: "For individual walks, we ask for 24 hours' notice to avoid a charge. For boarding, we ask for 72 hours' notice. We understand life happens and handle special circumstances with flexibility." },
  { q: "Why do you clean dogs' paws after every walk?", a: "We clean paws after every walk to help remove dirt, debris, and anything harmful your dog may have stepped in outside. It's a simple step that supports your dog's health and helps keep your home clean." },
];

// Replaces the source's global `document.querySelectorAll('details')` toggle
// listener with per-item React state — same "+ / −" summary indicator,
// scoped to this component instead of a page-wide DOM query.
export default function SafetyFaq() {
  const [openIndex, setOpenIndex] = useState<Set<number>>(new Set());

  return (
    <div style={{ background: 'var(--warm-white)', border: '1px solid var(--light-gray)', borderRadius: 'var(--radius-lg)', padding: '48px', marginTop: '64px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div className="label">Common Questions</div>
        <h3>What families usually ask</h3>
      </div>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {FAQS.map((faq, i) => (
          <details
            key={faq.q}
            style={{
              borderBottom: i < FAQS.length - 1 ? '1px solid var(--light-gray)' : undefined,
              borderTop: i === FAQS.length - 1 ? '1px solid var(--light-gray)' : undefined,
              padding: '18px 0',
              cursor: 'pointer',
            }}
            onToggle={(e) => {
              const isOpen = e.currentTarget.open;
              setOpenIndex((prev) => {
                const next = new Set(prev);
                if (isOpen) next.add(i); else next.delete(i);
                return next;
              });
            }}
          >
            <summary style={{ fontWeight: 600, fontSize: '15px', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
              {faq.q} <span style={{ color: 'var(--sage)' }}>{openIndex.has(i) ? '−' : '+'}</span>
            </summary>
            <p style={{ color: 'var(--mid-gray)', fontSize: '14px', marginTop: '12px', lineHeight: '1.7' }}>{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
