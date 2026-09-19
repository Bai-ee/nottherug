import { describe, it, expect, vi } from 'vitest';
import {
  WELCOME_MODAL_STORAGE_KEY,
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
