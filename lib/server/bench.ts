import {
  fsGetDoc,
  fsMergeDoc,
  fsQueryCollection,
  fsSetDoc,
  type FsRequestOptions,
} from '@/lib/server/firestoreRest';
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
export async function getBenchSettings(opts?: FsRequestOptions): Promise<BenchSettings> {
  const doc = await fsGetDoc(BENCH_SETTINGS_DOC, opts);
  if (!doc.exists || !doc.data) return DEFAULT_BENCH_SETTINGS;
  return { ...DEFAULT_BENCH_SETTINGS, ...(doc.data as Partial<BenchSettings>) };
}

/** For the public page: a Firestore outage must not take the application form down. */
export async function getBenchSettingsOrDefault(opts?: FsRequestOptions): Promise<BenchSettings> {
  try {
    return await getBenchSettings(opts);
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

export async function listBenchPeople(opts?: FsRequestOptions): Promise<BenchPerson[]> {
  const rows = await fsQueryCollection(BENCH_COLLECTIONS.people, 'createdAt', 'DESCENDING', BENCH_PEOPLE_CAP, opts);
  return rows as unknown as BenchPerson[];
}

export async function getBenchPerson(id: string, opts?: FsRequestOptions): Promise<BenchPerson | null> {
  return (await getBenchPersonWithMeta(id, opts)).person;
}

/** The person plus the document's updateTime, the token a conditional write is checked against. */
export async function getBenchPersonWithMeta(
  id: string,
  opts?: FsRequestOptions,
): Promise<{ person: BenchPerson | null; updateTime?: string }> {
  const doc = await fsGetDoc(`${BENCH_COLLECTIONS.people}/${id}`, opts);
  if (!doc.exists || !doc.data) return { person: null };
  return { person: doc.data as unknown as BenchPerson, updateTime: doc.updateTime };
}

export type BenchPersonPrecondition = { updateTime: string } | { exists: boolean };

/**
 * Field-scoped write: only the keys in `fields` change, so a writer can never
 * overwrite what another writer owns (an admin's stage or notes, an applicant's
 * resume fields). A precondition is required, so this can neither resurrect a
 * deleted person nor apply a read-modify-write on top of a newer version.
 * Brand-new people are created with fsCreateDoc in the apply route; there is
 * deliberately no whole-record save.
 */
export async function mergeBenchPerson(
  id: string,
  fields: Partial<BenchPerson>,
  opts: FsRequestOptions & { precondition: BenchPersonPrecondition },
): Promise<void> {
  await fsMergeDoc(`${BENCH_COLLECTIONS.people}/${id}`, fields as Record<string, unknown>, opts);
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
