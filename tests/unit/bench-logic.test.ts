/**
 * Pure bench logic (plans/011): knockouts, coverage depth and fit, the review
 * queue order, stage-action rules and resume type detection.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_BENCH_SETTINGS, type BenchPerson } from '@/lib/bench/contract';
import { knockoutReason } from '@/lib/bench/knockouts';
import { compareReviewQueue, computeCoverage, gapSlotsFilled } from '@/lib/bench/coverage';
import { actionAllowed, availableActions } from '@/lib/bench/stages';
import { detectResumeKind } from '@/lib/bench/resume';

type CoveragePerson = Pick<BenchPerson, 'id' | 'stage' | 'areas' | 'availability' | 'smsOptedOut'>;

function walker(id: string, overrides: Partial<CoveragePerson> = {}): CoveragePerson {
  return {
    id,
    stage: 'bench',
    areas: ['williamsburg'],
    availability: [{ weekday: 1, block: 'morning' }],
    smsOptedOut: false,
    ...overrides,
  };
}

const settings = { ...DEFAULT_BENCH_SETTINGS, targetDepth: 2 };

describe('knockoutReason', () => {
  const ok = {
    answers: { travelToWilliamsburg: 'yes', willingTraining: 'yes' } as const,
    availability: [{ weekday: 1, block: 'morning' }],
  };

  it('passes an applicant who meets every objective requirement', () => {
    expect(knockoutReason(ok)).toBeNull();
    expect(knockoutReason({ ...ok, answers: { ...ok.answers, travelToWilliamsburg: 'explain' } })).toBeNull();
  });

  it.each([
    [{ travelToWilliamsburg: 'no' }, [], 'no_travel'],
    [{ willingTraining: 'no' }, [], 'no_training'],
  ] as const)('rejects only on the applicant’s own answer: %o', (patch, _unused, reason) => {
    expect(knockoutReason({ ...ok, answers: { ...ok.answers, ...patch } })).toBe(reason);
  });

  it('rejects an application with no availability at all', () => {
    expect(knockoutReason({ ...ok, availability: [] })).toBe('no_availability');
  });
});

describe('computeCoverage', () => {
  it('produces one cell per active area × 7 days × block', () => {
    expect(computeCoverage([], settings)).toHaveLength(2 * 7 * 3);
  });

  it('counts only bench walkers who have not opted out', () => {
    const cells = computeCoverage(
      [
        walker('a'),
        walker('b'),
        walker('c', { stage: 'review' }),
        walker('d', { smsOptedOut: true }),
      ],
      settings,
    );
    const monMorning = cells.find((c) => c.areaId === 'williamsburg' && c.weekday === 1 && c.block === 'morning')!;
    expect(monMorning.depth).toBe(2);
    expect(monMorning.status).toBe('at');
    expect(monMorning.personIds).toEqual(['a', 'b']);
  });

  it('marks slots under, at and over target', () => {
    const cells = computeCoverage([walker('a'), walker('b'), walker('c')], settings);
    expect(cells.find((c) => c.weekday === 1 && c.block === 'morning' && c.areaId === 'williamsburg')!.status).toBe('over');
    expect(cells.find((c) => c.weekday === 2 && c.block === 'morning' && c.areaId === 'williamsburg')!.status).toBe('under');
  });

  it('skips inactive areas', () => {
    const areas = settings.areas.map((a) => (a.id === 'greenpoint' ? { ...a, active: false } : a));
    expect(computeCoverage([], { ...settings, areas })).toHaveLength(7 * 3);
  });
});

describe('gapSlotsFilled', () => {
  it('counts the under-target slots an applicant would cover', () => {
    const coverage = computeCoverage([walker('a'), walker('b')], settings);
    const applicant = {
      areas: ['williamsburg'],
      availability: [
        { weekday: 1, block: 'morning' }, // already at target
        { weekday: 2, block: 'morning' }, // under
        { weekday: 3, block: 'evening' }, // under
      ],
    };
    expect(gapSlotsFilled(applicant, coverage)).toBe(2);
  });

  it('is zero when the applicant only lists covered slots', () => {
    const coverage = computeCoverage([walker('a'), walker('b')], settings);
    expect(gapSlotsFilled({ areas: ['williamsburg'], availability: [{ weekday: 1, block: 'morning' }] }, coverage)).toBe(0);
  });
});

describe('compareReviewQueue', () => {
  const row = (createdAt: string, gapSlots: number, onHold = false) => ({ createdAt, gapSlots, onHold });

  it('puts gap-fillers first, then oldest first, with held applicants last', () => {
    const rows = [
      row('2026-09-03T00:00:00Z', 0),
      row('2026-09-02T00:00:00Z', 3),
      row('2026-09-01T00:00:00Z', 0, true),
      row('2026-09-01T00:00:00Z', 1),
      row('2026-09-01T12:00:00Z', 0),
    ];
    const sorted = [...rows].sort(compareReviewQueue);
    expect(sorted).toEqual([
      row('2026-09-01T00:00:00Z', 1),
      row('2026-09-02T00:00:00Z', 3),
      row('2026-09-01T12:00:00Z', 0),
      row('2026-09-03T00:00:00Z', 0),
      row('2026-09-01T00:00:00Z', 0, true),
    ]);
  });
});

describe('stage actions', () => {
  it('only offers actions the server accepts for the stage', () => {
    expect(availableActions('review', false)).toEqual(['invite_shadow', 'reject', 'hold']);
    expect(availableActions('review', true)).toEqual(['invite_shadow', 'reject', 'unhold']);
    expect(availableActions('offer_conditional', false)).toEqual(['mark_background_clear']);
    expect(availableActions('bench', false)).toEqual(['mark_inactive']);
  });

  it('never allows skipping the pipeline', () => {
    expect(actionAllowed('mark_background_clear', 'review', false)).toBe(false);
    expect(actionAllowed('conditional_offer', 'shadow_invited', false)).toBe(false);
    expect(actionAllowed('reject', 'bench', false)).toBe(false);
  });

  it('allows notes at any stage', () => {
    expect(actionAllowed('save_notes', 'rejected', false)).toBe(true);
  });
});

describe('detectResumeKind', () => {
  it('recognizes a PDF by its magic bytes', () => {
    expect(detectResumeKind(Buffer.from('%PDF-1.7\n...'))).toBe('pdf');
  });

  it('recognizes a DOCX zip by its word/ part', () => {
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....word/document.xml')]);
    expect(detectResumeKind(zip)).toBe('docx');
  });

  it('rejects anything else, whatever it claims to be', () => {
    expect(detectResumeKind(Buffer.from('<html>not a resume</html>'))).toBeNull();
    expect(detectResumeKind(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('xl/workbook.xml')]))).toBeNull();
  });
});
