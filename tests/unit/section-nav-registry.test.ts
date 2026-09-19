/**
 * Coverage for lib/navigation/sections.ts — the section-nav contract shared by
 * the desktop rail (SectionRail) and the mobile jump button (SectionJump).
 *
 * The registry is plain data pointing at DOM ids that live in other files, so
 * the failure mode it invites is drift: a section gets renamed or deleted and
 * the rail silently grows a dead marker. This suite reads the JSX on disk and
 * proves every registered id still resolves to a real element, which the
 * hookless-component convention of this suite (vitest env is 'node', no DOM)
 * can't cover any other way.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { SECTION_NAV, MIN_SECTIONS, getSectionLinks } from '@/lib/navigation/sections';

const ROOT = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const ALL_JSX = [...sourceFiles('components'), ...sourceFiles('app')]
  .map((path) => readFileSync(join(ROOT, path), 'utf8'))
  .join('\n');

describe('section-nav registry', () => {
  it('registers only routes with enough destinations to be worth a nav', () => {
    for (const [pathname, links] of Object.entries(SECTION_NAV)) {
      expect(links.length, `${pathname} is below MIN_SECTIONS`).toBeGreaterThanOrEqual(MIN_SECTIONS);
    }
  });

  it('gives every destination a unique id and a label', () => {
    for (const [pathname, links] of Object.entries(SECTION_NAV)) {
      const ids = links.map((link) => link.id);
      expect(new Set(ids).size, `${pathname} repeats a section id`).toBe(ids.length);
      links.forEach((link) => expect(link.label.trim(), `${pathname}/${link.id}`).not.toBe(''));
    }
  });

  it('points every destination at an id that exists in the rendered markup', () => {
    for (const [pathname, links] of Object.entries(SECTION_NAV)) {
      links.forEach((link) => {
        expect(ALL_JSX, `${pathname} → #${link.id} has no element`).toContain(`id="${link.id}"`);
      });
    }
  });

  it('returns nothing for a route with no registered sections', () => {
    expect(getSectionLinks('/book')).toHaveLength(0);
    expect(getSectionLinks('/not-a-route')).toHaveLength(0);
  });

  it('hands back one stable array per route, so consumers can use it as an effect dep', () => {
    expect(getSectionLinks('/')).toBe(getSectionLinks('/'));
    expect(getSectionLinks('/book')).toBe(getSectionLinks('/book'));
  });
});
