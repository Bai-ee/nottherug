import { fsGetDoc, fsQueryCollection, fsSetDoc } from '@/lib/server/firestoreRest';
import {
  BENCH_COLLECTIONS,
  BENCH_SETTINGS_DOC,
  DEFAULT_BENCH_SETTINGS,
  type BenchPerson,
  type BenchSettings,
} from '@/lib/bench/contract';

/** The bench is dozens of people; this is a safety ceiling, not a page size. */
export const BENCH_PEOPLE_CAP = 1000;

/**
 * Stored settings merged over the defaults, so a missing document (a fresh
 * project) or a field added later still yields a complete settings object.
 */
export async function getBenchSettings(): Promise<BenchSettings> {
  const doc = await fsGetDoc(BENCH_SETTINGS_DOC);
  if (!doc.exists || !doc.data) return DEFAULT_BENCH_SETTINGS;
  return { ...DEFAULT_BENCH_SETTINGS, ...(doc.data as Partial<BenchSettings>) };
}

/** For the public page: a Firestore outage must not take the application form down. */
export async function getBenchSettingsOrDefault(): Promise<BenchSettings> {
  try {
    return await getBenchSettings();
  } catch (err) {
    console.error('[bench] settings read failed, using defaults', err instanceof Error ? err.message : 'unknown');
    return DEFAULT_BENCH_SETTINGS;
  }
}

export async function saveBenchSettings(settings: BenchSettings, by: string): Promise<BenchSettings> {
  const stored: BenchSettings = { ...settings, updatedAt: new Date().toISOString(), updatedBy: by };
  await fsSetDoc(BENCH_SETTINGS_DOC, stored as unknown as Record<string, unknown>);
  return stored;
}

export async function listBenchPeople(): Promise<BenchPerson[]> {
  const rows = await fsQueryCollection(BENCH_COLLECTIONS.people, 'createdAt', 'DESCENDING', BENCH_PEOPLE_CAP);
  return rows as unknown as BenchPerson[];
}

export async function getBenchPerson(id: string): Promise<BenchPerson | null> {
  const doc = await fsGetDoc(`${BENCH_COLLECTIONS.people}/${id}`);
  return doc.exists && doc.data ? (doc.data as unknown as BenchPerson) : null;
}

export async function saveBenchPerson(person: BenchPerson): Promise<void> {
  await fsSetDoc(`${BENCH_COLLECTIONS.people}/${person.id}`, person as unknown as Record<string, unknown>);
}

/** Person ids are opaque and server-issued; this guards route params before they become a Firestore path. */
export function isBenchPersonId(value: string): boolean {
  return /^bench_[a-f0-9]{32}$/.test(value);
}

export type AdminBenchPerson = Omit<BenchPerson, 'resumeUploadTokenHash' | 'resumeUploadExpiresAt'>;

/** Strips the server-only upload token before a record leaves for the admin UI. */
export function toAdminPerson(person: BenchPerson): AdminBenchPerson {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resumeUploadTokenHash, resumeUploadExpiresAt, ...rest } = person;
  return rest;
}
