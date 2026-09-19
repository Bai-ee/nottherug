import { describe, it, expect, vi } from 'vitest';
import {
  WELCOME_MODAL_STORAGE_KEY,
  WELCOME_MODAL_SCROLL_TRIGGER_PX,
  hasScrolledPastTrigger,
  hasSeenWelcomeModal,
  markWelcomeModalSeen,
} from '@/lib/marketing/welcome-modal';

function memoryStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

describe('welcome modal seen gate', () => {
  it('shows the modal to a first-time visitor', () => {
    expect(hasSeenWelcomeModal(memoryStorage())).toBe(false);
  });

  it('does not show it again once marked seen', () => {
    const storage = memoryStorage();
    markWelcomeModalSeen(storage);
    expect(storage.store.get(WELCOME_MODAL_STORAGE_KEY)).toBeTruthy();
    expect(hasSeenWelcomeModal(storage)).toBe(true);
  });

  it('fails closed when storage is missing or throws', () => {
    expect(hasSeenWelcomeModal(null)).toBe(true);
    const throwing = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    };
    expect(hasSeenWelcomeModal(throwing)).toBe(true);
    expect(() => markWelcomeModalSeen(throwing)).not.toThrow();
  });
});

describe('welcome modal scroll trigger', () => {
  const T = WELCOME_MODAL_SCROLL_TRIGGER_PX;

  it('does not fire at the top of the page', () => {
    expect(hasScrolledPastTrigger(0, 0)).toBe(false);
  });

  it('does not fire on a nudge shorter than the threshold', () => {
    expect(hasScrolledPastTrigger(T - 1, 0)).toBe(false);
  });

  it('fires once the visitor scrolls down past the threshold', () => {
    expect(hasScrolledPastTrigger(T, 0)).toBe(true);
    expect(hasScrolledPastTrigger(T + 500, 0)).toBe(true);
  });

  it('measures from where the visitor started, not from the top', () => {
    // Reload restored a mid-page offset, or the visitor landed on a #section.
    expect(hasScrolledPastTrigger(900, 900)).toBe(false);
    expect(hasScrolledPastTrigger(900 + T, 900)).toBe(true);
  });

  it('never fires on an upward scroll', () => {
    expect(hasScrolledPastTrigger(0, 900)).toBe(false);
  });
});
