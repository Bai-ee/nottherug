const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID!;

/**
 * Set only by the Firebase emulator (and by tests that start one). Google's
 * client libraries use the same variable, and it is never present in a deployed
 * environment, so this cannot accidentally redirect production traffic.
 */
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST?.trim();

const FS_BASE = EMULATOR_HOST
  ? `http://${EMULATOR_HOST}/v1/projects/${encodeURIComponent(PROJECT)}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT)}/databases/(default)/documents`;

async function getToken(): Promise<string> {
  // The emulator accepts any bearer token; asking for a real one would demand
  // service-account keys just to run a test.
  if (EMULATOR_HOST) return 'owner';
  // Imported lazily: lib/firebase-admin.ts initialises at module scope and throws
  // on a malformed key, so a static import would make merely loading this module
  // require valid credentials even on code paths that never call Firestore.
  const { adminApp } = await import('@/lib/firebase-admin');
  const result = await adminApp.options.credential!.getAccessToken();
  return result.access_token;
}

// ---- Firestore value serialization ----

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { timestampValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FsValue> } }
  | { arrayValue: { values: FsValue[] } };

function toValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  // Dates serialize as real Firestore timestamps because a TTL policy can only
  // expire a timestamp field — a stored ISO string would be ignored by it.
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, toValue(val)])
        ),
      },
    };
  }
  return { stringValue: String(v) };
}

function fromValue(v: FsValue): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return fromFields(v.mapValue.fields ?? {});
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromValue);
  return undefined;
}

function fromFields(fields: Record<string, FsValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]));
}

function toFields(obj: Record<string, unknown>): Record<string, FsValue> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

// ---- Public helpers ----

export async function fsGetDoc(
  path: string
): Promise<{ exists: boolean; data?: Record<string, unknown> }> {
  const token = await getToken();
  const res = await fetch(`${FS_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`Firestore GET ${path}: ${res.status} ${await res.text()}`);
  const doc = (await res.json()) as { fields?: Record<string, FsValue> };
  return { exists: true, data: fromFields(doc.fields ?? {}) };
}

export async function fsSetDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${FS_BASE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore SET ${path}: ${res.status} ${await res.text()}`);
}

/**
 * Create a document only if it does not already exist.
 *
 * Firestore's createDocument endpoint rejects a duplicate id with 409, which is
 * what makes this usable as an idempotency guard: two concurrent retries of the
 * same submission race here, and exactly one wins.
 *
 * `path` is a full document path, e.g. `leads/<id>`.
 */
export async function fsCreateDoc(
  path: string,
  data: Record<string, unknown>
): Promise<{ created: boolean }> {
  const segments = path.split('/');
  const documentId = segments.pop();
  if (!documentId) throw new Error(`fsCreateDoc: no document id in "${path}"`);
  const parent = segments.join('/');

  const token = await getToken();
  const url = `${FS_BASE}${parent ? `/${parent}` : ''}?documentId=${encodeURIComponent(documentId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });

  if (res.status === 409) return { created: false };
  if (!res.ok) throw new Error(`Firestore CREATE ${path}: ${res.status} ${await res.text()}`);
  return { created: true };
}

/**
 * Atomically add `amount` to a numeric field, creating the document if needed,
 * and return the resulting value. `seed` fields are written alongside on the
 * same commit (patch semantics), so a first hit can record its window bounds.
 *
 * Used for counters that must survive across serverless instances, where an
 * in-process map would reset on every cold start.
 */
export async function fsIncrementField(
  path: string,
  field: string,
  amount: number,
  seed: Record<string, unknown> = {}
): Promise<number> {
  const token = await getToken();
  const name = `projects/${encodeURIComponent(PROJECT)}/databases/(default)/documents/${path}`;

  const res = await fetch(`${FS_BASE}:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          update: { name, fields: toFields(seed) },
          updateMask: { fieldPaths: Object.keys(seed) },
          updateTransforms: [{ fieldPath: field, increment: { integerValue: String(amount) } }],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Firestore INCREMENT ${path}.${field}: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as {
    writeResults?: Array<{ transformResults?: FsValue[] }>;
  };
  const result = body.writeResults?.[0]?.transformResults?.[0];
  return result ? Number(fromValue(result)) : NaN;
}

export async function fsDeleteDoc(path: string): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${FS_BASE}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404)
    throw new Error(`Firestore DELETE ${path}: ${res.status} ${await res.text()}`);
}

export async function fsQueryCollection(
  collectionId: string,
  orderByField: string,
  direction: 'ASCENDING' | 'DESCENDING' = 'DESCENDING',
  limit = 100
): Promise<Record<string, unknown>[]> {
  const token = await getToken();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        orderBy: [{ field: { fieldPath: orderByField }, direction }],
        limit,
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore QUERY ${collectionId}: ${res.status} ${await res.text()}`);
  const results = (await res.json()) as Array<{
    document?: { fields?: Record<string, FsValue> };
  }>;
  return results
    .filter((r) => r.document?.fields)
    .map((r) => fromFields(r.document!.fields!));
}

/**
 * Query one collection for documents whose `field` falls inside a half-open
 * range [`start`, `end`), ordered by that same field. `start`/`end` accept a
 * number so a caller can range-query a numeric field (e.g. retention cleanup
 * ranging analyticsRateLimits' epoch-ms `windowStart`) — `toValue` encodes
 * each the same way a write of that same JS type would.
 *
 * Added for analytics reporting, which must never scan the whole collection:
 * every dashboard query is bounded by a date window. Firestore requires the
 * first orderBy to match the range field, so that ordering is not configurable
 * here — exposing it would just let a caller build a query Firestore rejects.
 *
 * `limit` is a real ceiling, not a page size. When a result comes back at the
 * limit the caller is seeing a truncated window and must not report the count
 * as a total — see `fsQueryRangeCount` for the honest way to ask "how many".
 */
export async function fsQueryRange(
  collectionId: string,
  field: string,
  start: string | number,
  end: string | number,
  limit = 5000,
  direction: 'ASCENDING' | 'DESCENDING' = 'ASCENDING'
): Promise<Record<string, unknown>[]> {
  const rows = await runRangeQuery(collectionId, field, start, end, limit, direction);
  return rows.map((r) => r.data);
}

/**
 * Same bounded [`start`, `end`) range query as `fsQueryRange`, but also
 * returns each document's id alongside its fields.
 *
 * Added for analytics retention cleanup (lib/analytics/retention.ts), which
 * must delete a specific document rather than only read it. `analytics_events`
 * happens to also store its own id as a field, but `analyticsRateLimits`
 * does not — its id is a composite of hash and window that only exists as
 * the document name — so `fsQueryRange`'s field-only result isn't enough for
 * a caller that needs to delete what it found.
 */
export async function fsQueryRangeWithIds(
  collectionId: string,
  field: string,
  start: string | number,
  end: string | number,
  limit = 5000,
  direction: 'ASCENDING' | 'DESCENDING' = 'ASCENDING'
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  return runRangeQuery(collectionId, field, start, end, limit, direction);
}

async function runRangeQuery(
  collectionId: string,
  field: string,
  start: string | number,
  end: string | number,
  limit: number,
  direction: 'ASCENDING' | 'DESCENDING'
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const token = await getToken();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN_OR_EQUAL', value: toValue(start) } },
              { fieldFilter: { field: { fieldPath: field }, op: 'LESS_THAN', value: toValue(end) } },
            ],
          },
        },
        orderBy: [{ field: { fieldPath: field }, direction }],
        limit,
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore RANGE ${collectionId}: ${res.status} ${await res.text()}`);
  const results = (await res.json()) as Array<{ document?: { name?: string; fields?: Record<string, FsValue> } }>;
  return results
    .filter((r) => r.document?.fields && r.document?.name)
    .map((r) => ({ id: r.document!.name!.split('/').pop()!, data: fromFields(r.document!.fields!) }));
}

/**
 * Count documents in a range without transferring them, via Firestore's
 * aggregation endpoint.
 *
 * This exists so a total is never inferred by counting a capped result set.
 * `lib/leads/stats.ts` has a standing caveat that its 1,000-record cap must not
 * be labelled "all time"; this is how a genuine total is obtained instead.
 */
export async function fsQueryRangeCount(
  collectionId: string,
  field: string,
  start: string,
  end: string
): Promise<number> {
  const token = await getToken();
  const res = await fetch(`${FS_BASE}:runAggregationQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: {
          from: [{ collectionId }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                { fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: start } } },
                { fieldFilter: { field: { fieldPath: field }, op: 'LESS_THAN', value: { stringValue: end } } },
              ],
            },
          },
        },
        aggregations: [{ alias: 'total', count: {} }],
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore COUNT ${collectionId}: ${res.status} ${await res.text()}`);
  const results = (await res.json()) as Array<{ result?: { aggregateFields?: Record<string, FsValue> } }>;
  const raw = results.find((r) => r.result?.aggregateFields)?.result?.aggregateFields?.total;
  if (!raw || !('integerValue' in raw)) return 0;
  return Number(raw.integerValue);
}
