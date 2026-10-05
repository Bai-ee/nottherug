/**
 * teamChipPhoto reproduces the old CSS `background-size` / `background-position`
 * crop with a positioned <img>, and points at derivatives that exist on disk.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { TEAM, teamChipPhoto } from '@/lib/content/team';

describe('teamChipPhoto', () => {
  it('maps a percentage background crop to image width/left/top', () => {
    const lincoln = TEAM.find((m) => m.name === 'Lincoln')!;
    const { style } = teamChipPhoto(lincoln);
    // 275% wide, 506x900 source => 489.1...% tall; offsets are (window - image) * pct.
    expect(style.width).toBe('275%');
    expect(style.left).toBe(`${Math.round(((100 - 275) * 46) / 100 * 1000) / 1000}%`);
    const heightPct = 275 * (900 / 506);
    expect(style.top).toBe(`${Math.round(((100 - heightPct) * 48) / 100 * 1000) / 1000}%`);
  });

  it('lists AVIF and WebP srcsets at both widths', () => {
    const luis = TEAM.find((m) => m.name === 'Luis')!;
    const photo = teamChipPhoto(luis);
    expect(photo.avifSrcSet).toBe('/img/team/luis-w225.avif 225w, /img/team/luis-w675.avif 675w');
    expect(photo.webpSrcSet).toBe('/img/team/luis-w225.webp 225w, /img/team/luis-w675.webp 675w');
  });

  it('every derivative exists in public/ and the large one is the source width', () => {
    for (const member of TEAM) {
      expect(member.chipWidths[1]).toBe(member.photoWidth);
      const photo = teamChipPhoto(member);
      for (const set of [photo.avifSrcSet, photo.webpSrcSet]) {
        for (const entry of set.split(', ')) {
          const url = entry.split(' ')[0];
          expect(existsSync(path.join(process.cwd(), 'public', url))).toBe(true);
        }
      }
    }
  });

  it('rejects a crop it cannot express', () => {
    expect(() => teamChipPhoto({ ...TEAM[0], photoPosition: 'center top' })).toThrow();
  });
});
