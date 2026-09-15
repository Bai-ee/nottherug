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
