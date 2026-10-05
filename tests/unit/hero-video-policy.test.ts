import { describe, expect, it } from 'vitest';
import { pickHeroVideo } from '../../components/marketing/hooks/heroVideoPolicy';

const base = { reducedMotion: false, isMobile: false };

describe('pickHeroVideo', () => {
  it('uses the 1080 pair on desktop and the 540 pair on mobile', () => {
    expect(pickHeroVideo(base)?.webm).toBe('/video/hero-mccarren-1080.webm');
    expect(pickHeroVideo({ ...base, isMobile: true })).toEqual({
      webm: '/video/hero-mccarren-540.webm',
      mp4: '/video/hero-mccarren-540.mp4',
    });
  });

  it('never downloads video for reduced motion', () => {
    expect(pickHeroVideo({ ...base, reducedMotion: true })).toBeNull();
  });

  it('never downloads video for save-data or 2g connections', () => {
    expect(pickHeroVideo({ ...base, saveData: true })).toBeNull();
    expect(pickHeroVideo({ ...base, effectiveType: '2g' })).toBeNull();
    expect(pickHeroVideo({ ...base, effectiveType: 'slow-2g' })).toBeNull();
    expect(pickHeroVideo({ ...base, effectiveType: '4g' })).not.toBeNull();
  });
});
