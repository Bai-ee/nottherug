/**
 * The welcome modal's handoff is what carries a visitor's email across the
 * trip to /book after they book on Calendly — it is the whole return leg of
 * the booking-first journey, and it shipped without coverage.
 *
 * Every guarantee here is one the flow depends on: it never throws whatever
 * storage does, it refuses anything it did not write, and its expiry is real.
 */
import { describe, it, expect } from 'vitest';
import {
  createOnboardingHandoff,
  writeOnboardingHandoff,
  readOnboardingHandoff,
  clearOnboardingHandoff,
  newOnboardingAttemptId,
  ONBOARDING_HANDOFF_STORAGE_KEY,
  ONBOARDING_HANDOFF_TTL_MS,
  type HandoffStorage,
} from '@/lib/booking/onboarding-handoff';

function memoryStorage(seed: Record<string, string> = {}): HandoffStorage & { data: Record<string, string> } {
  const data = { ...seed };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
  };
}

/** Private browsing and blocked site data throw on every access. */
function hostileStorage(): HandoffStorage {
  return {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
}

const valid = { email: 'Owner@Example.com ', source: 'welcome-modal', attemptId: 'a1', bookingObserved: true };

describe('createOnboardingHandoff', () => {
  it('normalizes the email it carries', () => {
    expect(createOnboardingHandoff(valid)?.email).toBe('owner@example.com');
  });

  it('refuses a source that is not on the allowlist', () => {
    expect(createOnboardingHandoff({ ...valid, source: 'contact' })).toBeNull();
  });

  it('refuses an unusable email', () => {
    expect(createOnboardingHandoff({ ...valid, email: 'not-an-email' })).toBeNull();
    expect(createOnboardingHandoff({ ...valid, email: '' })).toBeNull();
  });
});

describe('write and read', () => {
  it('round-trips through storage', () => {
    const s = memoryStorage();
    const payload = createOnboardingHandoff({ ...valid, now: 1000 })!;
    expect(writeOnboardingHandoff(s, payload)).toBe(true);
    expect(readOnboardingHandoff(s, 1000)).toEqual(payload);
  });

  it('expires rather than carrying a stale address forever', () => {
    const s = memoryStorage();
    const payload = createOnboardingHandoff({ ...valid, now: 0 })!;
    writeOnboardingHandoff(s, payload);
    expect(readOnboardingHandoff(s, ONBOARDING_HANDOFF_TTL_MS - 1)).not.toBeNull();
    expect(readOnboardingHandoff(s, ONBOARDING_HANDOFF_TTL_MS)).toBeNull();
  });

  it('refuses anything it did not write', () => {
    expect(readOnboardingHandoff(memoryStorage({ [ONBOARDING_HANDOFF_STORAGE_KEY]: 'not json' }))).toBeNull();
    expect(readOnboardingHandoff(memoryStorage({ [ONBOARDING_HANDOFF_STORAGE_KEY]: '{"v":99,"email":"a@b.com"}' }))).toBeNull();
    expect(readOnboardingHandoff(memoryStorage())).toBeNull();
  });

  it('never throws when storage is hostile or absent', () => {
    const payload = createOnboardingHandoff(valid)!;
    expect(writeOnboardingHandoff(hostileStorage(), payload)).toBe(false);
    expect(writeOnboardingHandoff(null, payload)).toBe(false);
    expect(readOnboardingHandoff(hostileStorage())).toBeNull();
    expect(readOnboardingHandoff(undefined)).toBeNull();
    expect(() => clearOnboardingHandoff(hostileStorage())).not.toThrow();
    expect(() => clearOnboardingHandoff(null)).not.toThrow();
  });

  it('clears what it wrote', () => {
    const s = memoryStorage();
    writeOnboardingHandoff(s, createOnboardingHandoff(valid)!);
    clearOnboardingHandoff(s);
    expect(readOnboardingHandoff(s)).toBeNull();
  });
});

describe('newOnboardingAttemptId', () => {
  it('is different every time, so one attempt cannot be mistaken for another', () => {
    const ids = new Set(Array.from({ length: 25 }, () => newOnboardingAttemptId()));
    expect(ids.size).toBe(25);
  });
});
