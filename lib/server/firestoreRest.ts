import { adminApp } from '@/lib/firebase-admin';

const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID!;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT)}/databases/(default)/documents`;

async function getToken(): Promise<string> {
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
