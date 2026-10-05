import { describe, expect, it, vi } from 'vitest';
import {
  ENTRANCE_CUTOFF_MS,
  INTRO_CEILING_MS,
  INTRO_DONE_AT_MS,
  INTRO_REVEAL_AT_MS,
  planHomeIntro,
  shouldPlayEntrance,
  startHomeIntro,
} from '../../components/marketing/hooks/homeIntroTiming';

describe('home intro timing', () => {
  it('measures reveal and done from one clock: no additive floor on top of a wait', () => {
    const plan = planHomeIntro(0);
    expect(plan).toEqual({ revealInMs: INTRO_REVEAL_AT_MS, doneInMs: INTRO_CEILING_MS });
    // The old sequence was up to 2500 (asset wait) + 800 (floor) before reveal.
    expect(plan.revealInMs).toBeLessThanOrEqual(400);
    expect(INTRO_DONE_AT_MS).toBeLessThanOrEqual(1500);
  });

  it('subtracts time already spent loading and never goes negative', () => {
    expect(planHomeIntro(300)).toEqual({ revealInMs: 100, doneInMs: INTRO_CEILING_MS - 300 });
    expect(planHomeIntro(5000)).toEqual({ revealInMs: 0, doneInMs: 0 });
  });

  it('runs reveal and done as concurrent timers, independent of any asset', () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onDone = vi.fn();
    startHomeIntro({ elapsedMs: 0, onReveal, onDone });
    vi.advanceTimersByTime(INTRO_REVEAL_AT_MS);
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(INTRO_CEILING_MS - INTRO_REVEAL_AT_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('ends on the keyframes finishing, not on a timer that could cut them off', async () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    let finishKeyframes!: () => void;
    const keyframesDone = new Promise<void>((resolve) => {
      finishKeyframes = resolve;
    });
    startHomeIntro({ elapsedMs: 0, onReveal: () => {}, onDone, keyframesDone });
    vi.advanceTimersByTime(INTRO_DONE_AT_MS + 500); // slow phone: past nominal end
    expect(onDone).not.toHaveBeenCalled();
    finishKeyframes();
    await Promise.resolve();
    await Promise.resolve();
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(INTRO_CEILING_MS); // ceiling must not fire it twice
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('still finishes when the reveal step throws (failure path)', () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onDone = vi.fn();
    startHomeIntro({
      elapsedMs: 0,
      onReveal: () => {
        throw new Error('boom');
      },
      onDone,
    });
    vi.advanceTimersByTime(INTRO_CEILING_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    vi.useRealTimers();
  });

  it('cancels both timers on teardown', () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onDone = vi.fn();
    const cancel = startHomeIntro({ elapsedMs: 0, onReveal, onDone });
    cancel();
    vi.advanceTimersByTime(INTRO_CEILING_MS * 2);
    expect(onReveal).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('plays the entrance unless the intro ran and the page is already very late', () => {
    expect(shouldPlayEntrance(false, 60_000)).toBe(true); // client-side nav back to home
    expect(shouldPlayEntrance(true, 300)).toBe(true);
    expect(shouldPlayEntrance(true, ENTRANCE_CUTOFF_MS + 1)).toBe(false);
    expect(ENTRANCE_CUTOFF_MS).toBeLessThanOrEqual(1200);
  });
});
