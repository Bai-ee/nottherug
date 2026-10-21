import { fsGetDoc, fsQueryCollection } from '@/lib/server/firestoreRest';
import { getBenchPerson, getBenchSettingsOrDefault, isBenchPersonId, listBenchPeople } from '@/lib/server/bench';
import { TZ, isoDateInTZ } from '@/lib/leads/stats';
import { isConvertedCapture, isOutstandingCapture, type AdminLeadRecord } from '@/components/admin/leads/adminLeadRecord';
import { APPLICATION_FIELDS, type ApplicationRecord } from '@/lib/bench/applicationFields';
import { BENCH_STAGES, BENCH_STAGE_LABELS, type BenchStage, type BenchPerson, type TimeBlock } from '@/lib/bench/contract';

/**
 * Person-level records for the HITLOOP client MCP (GET /api/stats/people).
 * Full PII by owner decision: names, emails, phones, every answer. Server to
 * server only, behind the STATS_API_KEY bearer. Never returns resume contents,
 * storage paths, signed URLs, tokens, hashes or notification outcomes.
 */

export const PEOPLE_KINDS = ['leads', 'captures', 'applicants'] as const;
export type PeopleKind = (typeof PEOPLE_KINDS)[number];
export const PEOPLE_RANGES = ['today', '7d', '30d', 'all'] as const;
export type PeopleRange = (typeof PEOPLE_RANGES)[number];

export function isPeopleKind(v: unknown): v is PeopleKind {
  return typeof v === 'string' && (PEOPLE_KINDS as readonly string[]).includes(v);
}
export function isPeopleRange(v: unknown): v is PeopleRange {
  return typeof v === 'string' && (PEOPLE_RANGES as readonly string[]).includes(v);
}
export function isBenchStage(v: unknown): v is BenchStage {
  return typeof v === 'string' && (BENCH_STAGES as readonly string[]).includes(v);
}

export const PEOPLE_DEFAULT_LIMIT = 100;
export const PEOPLE_MAX_LIMIT = 200;

const SITE = 'nottherug.com' as const;
const DAY_MS = 24 * 60 * 60 * 1000;
// Same bound getLeadStats uses for a single read of the leads collection.
const LEADS_READ_LIMIT = 1000;
const LEAD_ID = /^[A-Za-z0-9_-]{1,100}$/;

export type PeopleQuery = {
  kind: PeopleKind;
  range: PeopleRange;
  id?: string;
  stage?: BenchStage;
  limit: number;
};

export type PeopleListResult = {
  site: typeof SITE;
  generatedAt: string;
  kind: PeopleKind;
  range: PeopleRange;
  total: number;
  count: number;
  items: Record<string, unknown>[];
};
export type PeopleDetailResult = {
  site: typeof SITE;
  generatedAt: string;
  kind: PeopleKind;
  item: Record<string, unknown>;
};

const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function inRange(iso: string | null, range: PeopleRange, now: Date): boolean {
  if (range === 'all') return true;
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  if (range === 'today') return isoDateInTZ(new Date(t), TZ) === isoDateInTZ(now, TZ);
  return t >= now.getTime() - (range === '7d' ? 7 : 30) * DAY_MS;
}

function toLead(r: AdminLeadRecord): Record<string, unknown> {
  return {
    id: str(r.id),
    submittedAt: str(r.submittedAt),
    ownerName: str(r.ownerName),
    email: str(r.email),
    phone: str(r.phone),
    neighborhood: str(r.neighborhood),
    dogName: str(r.dogName),
    breedAge: str(r.breedAge),
    serviceInterest: str(r.serviceInterest),
    vaccinations: str(r.vaccinations),
    walkFrequency: str(r.walkFrequency),
    reactivity: str(r.reactivity),
    allergies: str(r.allergies),
    spayNeuter: str(r.spayNeuter),
    dogSocial: str(r.dogSocial),
    strangerSocial: str(r.strangerSocial),
    phoneConsult: typeof r.phoneConsult === 'boolean' ? r.phoneConsult : null,
    notes: str(r.notes),
    source: str(r.source),
    bookedSelfReported: r.bookedSelfReported === true,
  };
}

function toCapture(r: AdminLeadRecord): Record<string, unknown> {
  return {
    id: str(r.id),
    email: str(r.email),
    source: str(r.source),
    firstSeenAt: str(r.submittedAt),
    lastSeenAt: str(r.lastSeenAt),
    bookedSelfReported: r.bookedSelfReported === true,
  };
}

// Application fields already exposed as top-level keys, or that must not be sent.
const TOP_LEVEL_FIELD_KEYS = new Set([
  'createdAt', 'stage', 'source', 'utm', 'fullName', 'email', 'phone', 'notes', 'id', 'resume',
]);

function toApplicant(p: BenchPerson, blocks: TimeBlock[]): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resumeUploadTokenHash, resumeUploadExpiresAt, ...record } = p;
  const rec = record as ApplicationRecord;
  const answers: Record<string, string | null> = {};
  for (const f of APPLICATION_FIELDS) {
    if (TOP_LEVEL_FIELD_KEYS.has(f.key)) continue;
    answers[f.label] = str(f.value(rec, blocks));
  }
  return {
    id: p.id,
    createdAt: str(p.createdAt),
    updatedAt: str(p.updatedAt),
    stage: p.stage,
    stageLabel: BENCH_STAGE_LABELS[p.stage] ?? p.stage,
    onHold: p.onHold === true,
    fullName: str(p.fullName),
    email: str(p.email),
    phone: str(p.phoneE164),
    source: str(p.source),
    utm: p.utm ?? {},
    answers,
    notes: str(p.notes),
    aiSummary: str(p.aiSummary),
    hasResume: Boolean(p.resumePath),
  };
}

async function readLeadRows(): Promise<AdminLeadRecord[]> {
  const rows = (await fsQueryCollection('leads', 'submittedAt', 'DESCENDING', LEADS_READ_LIMIT)) as unknown as AdminLeadRecord[];
  // A converted capture's person already has their own lead row.
  return rows.filter((r) => !isConvertedCapture(r));
}

function matchesKind(r: AdminLeadRecord, kind: 'leads' | 'captures'): boolean {
  return kind === 'captures' ? isOutstandingCapture(r) : r.type !== 'capture';
}

/** Newest first, filtered by range (and stage for applicants), then limited. */
export async function listPeople(q: PeopleQuery, now = new Date()): Promise<PeopleListResult> {
  let matching: Record<string, unknown>[];
  if (q.kind === 'applicants') {
    const [people, settings] = await Promise.all([listBenchPeople(), getBenchSettingsOrDefault()]);
    matching = people
      .filter((p) => inRange(str(p.createdAt), q.range, now))
      .filter((p) => !q.stage || p.stage === q.stage)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map((p) => toApplicant(p, settings.timeBlocks));
  } else {
    const kind = q.kind;
    const rows = (await readLeadRows())
      .filter((r) => matchesKind(r, kind))
      .filter((r) => inRange(str(r.submittedAt), q.range, now))
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    matching = rows.map(kind === 'captures' ? toCapture : toLead);
  }
  const items = matching.slice(0, q.limit);
  return { site: SITE, generatedAt: now.toISOString(), kind: q.kind, range: q.range, total: matching.length, count: items.length, items };
}

/** One record, or null when the id is unknown or belongs to a different kind. */
export async function getPerson(kind: PeopleKind, id: string, now = new Date()): Promise<PeopleDetailResult | null> {
  let item: Record<string, unknown> | null = null;
  if (kind === 'applicants') {
    if (!isBenchPersonId(id)) return null;
    const [person, settings] = await Promise.all([getBenchPerson(id), getBenchSettingsOrDefault()]);
    item = person ? toApplicant(person, settings.timeBlocks) : null;
  } else {
    if (!LEAD_ID.test(id)) return null;
    const doc = await fsGetDoc(`leads/${id}`);
    if (doc.exists && doc.data) {
      const row = { ...doc.data, id } as unknown as AdminLeadRecord;
      if (!isConvertedCapture(row) && matchesKind(row, kind)) item = (kind === 'captures' ? toCapture : toLead)(row);
    }
  }
  return item ? { site: SITE, generatedAt: now.toISOString(), kind, item } : null;
}
