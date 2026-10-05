import { FirestorePreconditionError, UpstreamTimeoutError } from '@/lib/server/errors';

export { FirestorePreconditionError, UpstreamTimeoutError };

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

// ---- Deadlines ----

/** Per-request options accepted by every helper in this module and in firebaseStorage. */
export interface FsRequestOptions {
  /** Caller cancellation. A caller abort rejects with the signal's reason, never UpstreamTimeoutError. */
  signal?: AbortSignal;
  /** Deadline for the whole helper call (token, request, body read). Defaults to DEFAULT_FS_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * Default budget for one Firestore helper call. The tightest public routes
 * (capture, track) have a 10 s limit; 8 s leaves ~2 s to respond and persist
 * status. Routes with longer limits should pass a larger `timeoutMs` explicitly.
 */
export const DEFAULT_FS_TIMEOUT_MS = 8_000;

/**
 * Run `fn` under a combined caller-signal + timeout deadline. `fn` receives the
 * signal to hand to `fetch`. The returned promise also settles on abort even if
 * `fn` is stuck on something that ignores the signal (e.g. credential refresh).
 * Never retries.
 */
export async function withUpstreamDeadline<T>(
  service: 'firestore' | 'storage',
  operation: string,
  opts: FsRequestOptions | undefined,
  defaultTimeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? defaultTimeoutMs;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = opts?.signal ? AbortSignal.any([opts.signal, timeoutSignal]) : timeoutSignal;

  // Caller abort wins over timeout if both are set.
  const classify = (err: unknown): unknown => {
    if (opts?.signal?.aborted) return err instanceof Error && err.name === 'AbortError' ? err : opts.signal.reason ?? err;
    if (timeoutSignal.aborted) return new UpstreamTimeoutError(service, operation, timeoutMs);
    return err;
  };

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(classify(signal.reason));
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([fn(signal), aborted]);
  } catch (err) {
    throw classify(err);
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
}

function fsDeadline<T>(operation: string, opts: FsRequestOptions | undefined, fn: (signal: AbortSignal) => Promise<T>) {
  return withUpstreamDeadline('firestore', operation, opts, DEFAULT_FS_TIMEOUT_MS, fn);
}

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

/** `updateTime` is the document's last-write time; pass it back as a `precondition` to fsMergeDoc. */
export async function fsGetDoc(
  path: string,
  opts?: FsRequestOptions
): Promise<{ exists: boolean; data?: Record<string, unknown>; updateTime?: string }> {
  return fsDeadline(`GET ${path}`, opts, async (signal) => {
    const token = await getToken();
    const res = await fetch(`${FS_BASE}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (res.status === 404) return { exists: false };
    if (!res.ok) throw new Error(`Firestore GET ${path}: ${res.status} ${await res.text()}`);
    const doc = (await res.json()) as { fields?: Record<string, FsValue>; updateTime?: string };
    return { exists: true, data: fromFields(doc.fields ?? {}), updateTime: doc.updateTime };
  });
}

export async function fsSetDoc(
  path: string,
  data: Record<string, unknown>,
  opts?: FsRequestOptions
): Promise<void> {
  return fsDeadline(`SET ${path}`, opts, async (signal) => {
    const token = await getToken();
    const res = await fetch(`${FS_BASE}/${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFields(data) }),
      signal,
    });
    if (!res.ok) throw new Error(`Firestore SET ${path}: ${res.status} ${await res.text()}`);
  });
}

/**
 * Merge top-level fields into a document, leaving every other field untouched.
 *
 * `fsSetDoc` sends no `updateMask`, so Firestore replaces the whole document.
 * This variant masks each top-level key, so fields absent from `data` survive.
 * Creates the document if it does not exist. Nested maps are still replaced as
 * a unit (the mask is per top-level key).
 *
 * `precondition` makes the write conditional (compare-and-set, sent via :commit):
 *  - `{ updateTime }` succeeds only if the document's current updateTime matches.
 *  - `{ exists: false }` succeeds only if the document does not exist yet.
 *  - `{ exists: true }` succeeds only if the document already exists.
 * A rejected precondition throws FirestorePreconditionError (see
 * `isPreconditionFailure` for the exact statuses). `deleteFields` removes the
 * named top-level fields. Returns the document's new `updateTime`.
 */
export async function fsMergeDoc(
  path: string,
  data: Record<string, unknown>,
  opts?: FsRequestOptions & {
    precondition?: { updateTime: string } | { exists: boolean };
    deleteFields?: string[];
  }
): Promise<{ updateTime?: string }> {
  const deleteFields = [...new Set(opts?.deleteFields ?? [])];
  const setKeys = Object.keys(data).filter((k) => !deleteFields.includes(k));
  // An empty updateMask means "replace the whole document" — the opposite of a merge.
  if (setKeys.length === 0 && deleteFields.length === 0) return {};
  const precondition = opts?.precondition;
  const maskKeys = [...setKeys, ...deleteFields];
  const fields = toFields(Object.fromEntries(setKeys.map((k) => [k, data[k]])));
  return fsDeadline(`MERGE ${path}`, opts, async (signal) => {
    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    let res: Response;
    if (precondition) {
      // Conditional writes go through :commit rather than PATCH ?currentDocument.*:
      // the emulator ignores the updateTime query parameter on PATCH (it compares
      // against version 0 and always fails), while commit's `currentDocument`
      // precondition behaves identically on the emulator and on Firestore.
      const name = `projects/${encodeURIComponent(PROJECT)}/databases/(default)/documents/${path}`;
      res = await fetch(`${FS_BASE}:commit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          writes: [
            {
              update: { name, fields },
              updateMask: { fieldPaths: maskKeys.map(fieldPath) },
              currentDocument: precondition,
            },
          ],
        }),
        signal,
      });
    } else {
      const mask = maskKeys.map((key) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath(key))}`).join('&');
      res = await fetch(`${FS_BASE}/${path}?${mask}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
        signal,
      });
    }
    if (!res.ok) {
      const text = await res.text();
      if (precondition && isPreconditionFailure(res.status, text)) {
        throw new FirestorePreconditionError(`Firestore MERGE ${path}: precondition failed (${res.status})`);
      }
      throw new Error(`Firestore MERGE ${path}: ${res.status} ${text}`);
    }
    const body = (await res.json()) as { updateTime?: string; writeResults?: Array<{ updateTime?: string }> };
    return { updateTime: precondition ? body.writeResults?.[0]?.updateTime : body.updateTime };
  });
}

/**
 * Statuses Firestore returns for a failed `currentDocument` precondition.
 * Observed on the emulator (see plans/reports/013-P1-worker-A.md) and matching
 * Firestore's documented codes: stale updateTime -> 400 FAILED_PRECONDITION;
 * `exists:true` on a missing doc -> 404 NOT_FOUND; `exists:false` on an
 * existing doc -> 409 ALREADY_EXISTS. Real Firestore also returns 409 ABORTED on a
 * contended commit; that is mapped here too (not emulator-observed). Only consulted
 * when a precondition was sent, i.e. on the conditional :commit path, never for
 * unconditional writes.
 */
function isPreconditionFailure(status: number, body: string): boolean {
  let code: string | undefined;
  try {
    code = (JSON.parse(body) as { error?: { status?: string } }).error?.status;
  } catch {
    return false;
  }
  return (
    (status === 400 && code === 'FAILED_PRECONDITION') ||
    (status === 404 && code === 'NOT_FOUND') ||
    (status === 409 && code === 'ALREADY_EXISTS') ||
    // Contended commit: nothing was written, and the caller's retry re-reads and re-decides.
    (status === 409 && code === 'ABORTED')
  );
}

/**
 * Optimistic-concurrency loop: re-runs `attempt` (a read-modify-write that uses
 * a precondition) only when it throws FirestorePreconditionError. Any other
 * error, including timeouts, propagates immediately. Rethrows the last
 * precondition error once `maxAttempts` (default 5) is exhausted.
 */
export async function withOptimisticRetry<T>(
  attempt: () => Promise<T>,
  opts?: { maxAttempts?: number }
): Promise<T> {
  const maxAttempts = Math.max(1, opts?.maxAttempts ?? 5);
  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (err) {
      if (!(err instanceof FirestorePreconditionError) || n >= maxAttempts) throw err;
      // 10-30 ms growing with the attempt number, jittered so racers de-synchronise.
      await new Promise((r) => setTimeout(r, 10 * n + Math.random() * 20));
    }
  }
}

/** Backtick-quote a field name unless it is a plain identifier. */
function fieldPath(key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `\`${key.replace(/[\\`]/g, '\\$&')}\``;
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
  data: Record<string, unknown>,
  opts?: FsRequestOptions
): Promise<{ created: boolean }> {
  const segments = path.split('/');
  const documentId = segments.pop();
  if (!documentId) throw new Error(`fsCreateDoc: no document id in "${path}"`);
  const parent = segments.join('/');

  return fsDeadline(`CREATE ${path}`, opts, async (signal) => {
    const token = await getToken();
    const url = `${FS_BASE}${parent ? `/${parent}` : ''}?documentId=${encodeURIComponent(documentId)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFields(data) }),
      signal,
    });

    if (res.status === 409) return { created: false };
    if (!res.ok) throw new Error(`Firestore CREATE ${path}: ${res.status} ${await res.text()}`);
    return { created: true };
  });
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
  seed: Record<string, unknown> = {},
  opts?: FsRequestOptions
): Promise<number> {
  return fsDeadline(`INCREMENT ${path}.${field}`, opts, async (signal) => {
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
      signal,
  });

  if (!res.ok) throw new Error(`Firestore INCREMENT ${path}.${field}: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as {
    writeResults?: Array<{ transformResults?: FsValue[] }>;
  };
  const result = body.writeResults?.[0]?.transformResults?.[0];
  return result ? Number(fromValue(result)) : NaN;
  });
}

export async function fsDeleteDoc(path: string, opts?: FsRequestOptions): Promise<void> {
  return fsDeadline(`DELETE ${path}`, opts, async (signal) => {
    const token = await getToken();
    const res = await fetch(`${FS_BASE}/${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!res.ok && res.status !== 404)
      throw new Error(`Firestore DELETE ${path}: ${res.status} ${await res.text()}`);
  });
}

export async function fsQueryCollection(
  collectionId: string,
  orderByField: string,
  direction: 'ASCENDING' | 'DESCENDING' = 'DESCENDING',
  limit = 100,
  opts?: FsRequestOptions
): Promise<Record<string, unknown>[]> {
  return fsDeadline(`QUERY ${collectionId}`, opts, async (signal) => {
    const token = await getToken();
    const res = await fetch(`${FS_BASE}:runQuery`, {
      signal,
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
  });
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
  direction: 'ASCENDING' | 'DESCENDING' = 'ASCENDING',
  opts?: FsRequestOptions
): Promise<Record<string, unknown>[]> {
  const rows = await runRangeQuery(collectionId, field, start, end, limit, direction, opts);
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
  direction: 'ASCENDING' | 'DESCENDING' = 'ASCENDING',
  opts?: FsRequestOptions
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  return runRangeQuery(collectionId, field, start, end, limit, direction, opts);
}

async function runRangeQuery(
  collectionId: string,
  field: string,
  start: string | number,
  end: string | number,
  limit: number,
  direction: 'ASCENDING' | 'DESCENDING',
  opts?: FsRequestOptions
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  return fsDeadline(`RANGE ${collectionId}`, opts, async (signal) => {
    const token = await getToken();
    const res = await fetch(`${FS_BASE}:runQuery`, {
      signal,
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
  });
}

/**
 * Count documents in a range without transferring them, via Firestore's
 * aggregation endpoint.
 *
 * This exists so a total is never inferred by counting a capped result set.
 * `lib/leads/stats.ts` has a standing caveat that its 1,000-record cap must not
 * be labelled "all time"; this is how a genuine total is obtained instead.
 *
 * `equalityFilter` optionally adds one more `field == value` clause to the
 * same AND, e.g. to count only one document "type" within the range rather
 * than every document. It is EQUAL, never NOT_EQUAL: Firestore requires any
 * range/inequality filter and any not-equal filter in the same compound query
 * to target the SAME field, so a not-equal filter here (on a field other than
 * `field`) would be rejected outright, not just slow. An equality filter on a
 * different field is valid but, combined with the range filter above, needs a
 * composite Firestore index over (equalityFilter.field, field) — if that
 * index does not exist yet, Firestore returns FAILED_PRECONDITION, which
 * callers should treat the same as any other query failure (this function
 * does not swallow it).
 *
 * Equality filters also never match a document where the field is absent
 * entirely — this can undercount a collection whose schema added the filtered
 * field partway through its history. Callers filtering on a field that is not
 * universally present should say so explicitly where the count is used.
 */
export async function fsQueryRangeCount(
  collectionId: string,
  field: string,
  start: string,
  end: string,
  opts?: FsRequestOptions,
): Promise<number> {
  return fsDeadline(`COUNT ${collectionId}`, opts, async (signal) => {
    const token = await getToken();
    const filters: Array<Record<string, unknown>> = [
      { fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: start } } },
      { fieldFilter: { field: { fieldPath: field }, op: 'LESS_THAN', value: { stringValue: end } } },
    ];

    const res = await fetch(`${FS_BASE}:runAggregationQuery`, {
      signal,
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery: {
            from: [{ collectionId }],
            where: { compositeFilter: { op: 'AND', filters } },
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
  });
}
