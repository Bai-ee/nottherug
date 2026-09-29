import { describe, it, expect, vi } from 'vitest';
import {
  WELCOME_MODAL_STORAGE_KEY,
  WELCOME_MODAL_DELAY_MS,
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

describe('welcome modal delay', () => {
  it('waits 20 seconds before a first-visit open', () => {
    expect(WELCOME_MODAL_DELAY_MS).toBe(20_000);
  });
});

describe('openWelcomeWalkModal', () => {
  it('carries the thank-you request to the modal and reports whether it was claimed', async () => {
    const { openWelcomeWalkModal, WELCOME_MODAL_OPEN_EVENT } = await import('@/lib/marketing/welcome-modal');
    const target = new EventTarget();
    vi.stubGlobal('window', target);
    let detail: unknown;
    const claim = (e: Event) => {
      detail = (e as CustomEvent).detail;
      e.preventDefault();
    };

    expect(openWelcomeWalkModal({ thankYou: true })).toBe(false);

    target.addEventListener(WELCOME_MODAL_OPEN_EVENT, claim);
    expect(openWelcomeWalkModal({ thankYou: true })).toBe(true);
    expect(detail).toEqual({ thankYou: true });
    vi.unstubAllGlobals();
  });
});
