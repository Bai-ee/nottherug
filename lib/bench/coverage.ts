import type { BenchPerson, BenchSettings } from './contract';

export type CoverageStatus = 'under' | 'at' | 'over';

export type CoverageCell = {
  areaId: string;
  weekday: number;
  block: string;
  depth: number;
  status: CoverageStatus;
  /** Ids of the bench walkers counted in `depth`. */
  personIds: string[];
};

type CoveragePerson = Pick<BenchPerson, 'id' | 'stage' | 'areas' | 'availability' | 'smsOptedOut'>;

function slotKey(areaId: string, weekday: number, block: string): string {
  return `${areaId}:${weekday}:${block}`;
}

/** A walker counts toward depth only while they can actually be called on. */
function countsTowardDepth(person: CoveragePerson): boolean {
  return person.stage === 'bench' && !person.smsOptedOut;
}

/**
 * Depth for every active area × weekday × block, against the target depth.
 * Pure and small by design: the bench is dozens of people, so reading all of
 * them and counting here beats any Firestore-side aggregation.
 */
export function computeCoverage(
  people: CoveragePerson[],
  settings: Pick<BenchSettings, 'areas' | 'timeBlocks' | 'targetDepth'>,
): CoverageCell[] {
  const byKey = new Map<string, string[]>();
  for (const person of people) {
    if (!countsTowardDepth(person)) continue;
    for (const areaId of person.areas ?? []) {
      for (const slot of person.availability ?? []) {
        const key = slotKey(areaId, slot.weekday, slot.block);
        const list = byKey.get(key) ?? [];
        list.push(person.id);
        byKey.set(key, list);
      }
    }
  }

  const cells: CoverageCell[] = [];
  for (const area of settings.areas) {
    if (!area.active) continue;
    for (let weekday = 0; weekday < 7; weekday++) {
      for (const block of settings.timeBlocks) {
        const personIds = byKey.get(slotKey(area.id, weekday, block.key)) ?? [];
        const depth = personIds.length;
        const status: CoverageStatus =
          depth < settings.targetDepth ? 'under' : depth === settings.targetDepth ? 'at' : 'over';
        cells.push({ areaId: area.id, weekday, block: block.key, depth, status, personIds });
      }
    }
  }
  return cells;
}

/**
 * How many under-target slots this person would help fill. The review queue
 * and the coverage-fit chip both read this; it is arithmetic on the person's
 * own answers, never a judgement about them.
 */
export function gapSlotsFilled(
  person: Pick<BenchPerson, 'areas' | 'availability'>,
  coverage: CoverageCell[],
): number {
  const under = new Set(
    coverage.filter((c) => c.status === 'under').map((c) => slotKey(c.areaId, c.weekday, c.block)),
  );
  let count = 0;
  for (const areaId of person.areas ?? []) {
    for (const slot of person.availability ?? []) {
      if (under.has(slotKey(areaId, slot.weekday, slot.block))) count++;
    }
  }
  return count;
}

/**
 * The review queue's order (plan §7.3, LL144): applicants who fill at least
 * one under-target slot first, then oldest first. Held applicants sink to the
 * bottom in the same order. Deterministic; never reads AI output.
 */
export function compareReviewQueue(
  a: Pick<BenchPerson, 'createdAt' | 'onHold'> & { gapSlots: number },
  b: Pick<BenchPerson, 'createdAt' | 'onHold'> & { gapSlots: number },
): number {
  if (a.onHold !== b.onHold) return a.onHold ? 1 : -1;
  const aFills = a.gapSlots > 0;
  const bFills = b.gapSlots > 0;
  if (aFills !== bFills) return aFills ? -1 : 1;
  return a.createdAt.localeCompare(b.createdAt);
}
