/**
 * Regression cover for three defects an independent review found after the
 * slices were already merged. Each had no test behind it, which is how each
 * survived.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { timingSafeEquals } from '@/lib/server/errors';
import { UnauthorizedError, ForbiddenError, ServiceError } from '@/lib/server/errors';

const verifyAdmin = vi.fn();
vi.mock('@/lib/server/verifyAdmin', () => ({ verifyAdmin: (r: unknown) => verifyAdmin(r) }));

const storageDownload = vi.fn(async (_path: string) => Buffer.from('bytes'));
vi.mock('@/lib/server/firebaseStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/firebaseStorage')>()),
  storageDownload: (p: string) => storageDownload(p),
  storageUpload: vi.fn(async () => 'https://example.test/o?alt=media&token=t'),
  storageDelete: vi.fn(async () => {}),
  storageList: vi.fn(async () => []),
}));

vi.mock('@/lib/server/firestoreRest', () => ({
  fsGetDoc: vi.fn(async () => ({ exists: false })),
  fsSetDoc: vi.fn(async () => {}),
  fsCreateDoc: vi.fn(async () => ({ created: true })),
  fsDeleteDoc: vi.fn(async () => {}),
  fsQueryCollection: vi.fn(async () => []),
  fsIncrementField: vi.fn(async () => 1),
}));

function req(url = 'http://localhost/x', init: RequestInit = {}) {
  return new NextRequest(new Request(url, init));
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyAdmin.mockReset();
});

/**
 * Every admin route that calls verifyAdmin. The typed error boundary existed
 * from the start but only the five photo routes adopted it; the rest collapsed
 * 401/403/500 into a hardcoded 401 and echoed the internal detail to the client.
 */
const ADMIN_ROUTES: Array<{ name: string; load: () => Promise<{ GET?: unknown; POST?: unknown; DELETE?: unknown }> }> = [
  { name: 'admin/leads', load: () => import('@/app/admin/leads/route') },
  { name: 'api/admin/generator/list', load: () => import('@/app/api/admin/generator/list/route') },
  { name: 'api/admin/generator/render', load: () => import('@/app/api/admin/generator/render/route') },
  { name: 'api/admin/photos/list', load: () => import('@/app/api/admin/photos/list/route') },
  { name: 'api/admin/photos/assets', load: () => import('@/app/api/admin/photos/assets/route') },
  { name: 'api/admin/photos/upload', load: () => import('@/app/api/admin/photos/upload/route') },
  { name: 'api/admin/photos/delete', load: () => import('@/app/api/admin/photos/delete/route') },
  { name: 'api/admin/photos/render', load: () => import('@/app/api/admin/photos/render/route') },
  { name: 'admin/not-the-rug/history', load: () => import('@/app/admin/not-the-rug/history/route') },
  { name: 'admin/not-the-rug/latest-brief', load: () => import('@/app/admin/not-the-rug/latest-brief/route') },
  { name: 'admin/not-the-rug/latest-brief/html', load: () => import('@/app/admin/not-the-rug/latest-brief/html/route') },
  { name: 'admin/not-the-rug/run-brief', load: () => import('@/app/admin/not-the-rug/run-brief/route') },
  { name: 'admin/founder-brief/run-and-send', load: () => import('@/app/admin/founder-brief/run-and-send/route') },
];

const SECRET_DETAIL = 'admin whitelist lookup failed: cluster-7 credentials rejected';

describe('every admin route classifies auth failures the same way', () => {
  it.each(ADMIN_ROUTES)('$name maps unauthorized to 401 without leaking detail', async ({ load }) => {
    verifyAdmin.mockRejectedValue(new UnauthorizedError('token signature invalid for kid abc123'));
    const mod = await load();
    const handler = (mod.GET ?? mod.POST ?? mod.DELETE) as (r: NextRequest) => Promise<Response>;

    const res = await handler(req('http://localhost/x', { method: mod.GET ? 'GET' : 'POST' }));
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain('kid abc123');
  });

  it.each(ADMIN_ROUTES)('$name maps a non-whitelisted admin to 403, not 401', async ({ load }) => {
    verifyAdmin.mockRejectedValue(new ForbiddenError('not on admin whitelist'));
    const mod = await load();
    const handler = (mod.GET ?? mod.POST ?? mod.DELETE) as (r: NextRequest) => Promise<Response>;

    const res = await handler(req('http://localhost/x', { method: mod.GET ? 'GET' : 'POST' }));
    expect(res.status).toBe(403);
  });

  it.each(ADMIN_ROUTES)('$name maps a dependency outage to 500 and hides the reason', async ({ load }) => {
    verifyAdmin.mockRejectedValue(new ServiceError(SECRET_DETAIL));
    const mod = await load();
    const handler = (mod.GET ?? mod.POST ?? mod.DELETE) as (r: NextRequest) => Promise<Response>;

    const res = await handler(req('http://localhost/x', { method: mod.GET ? 'GET' : 'POST' }));
    // A Firestore outage is a server failure, not "you are not authorized".
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('cluster-7');
  });
});

describe('the photo render route will not read outside its permitted prefixes', () => {
  async function render(body: Record<string, unknown>) {
    verifyAdmin.mockResolvedValue('admin@example.test');
    const { POST } = await import('@/app/api/admin/photos/render/route');
    return POST(req('http://localhost/api/admin/photos/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));
  }

  const placement = { x: 0, y: 0, width: 10, height: 10, opacity: 1 };

  it('refuses a source path under the private artifact prefix', async () => {
    const res = await render({
      sourcePhotoId: 'abc',
      sourceStoragePath: 'private/briefs/not-the-rug/latest/latest-brief.html',
      logoStoragePath: 'photos/logos/green.png',
      placement,
    });
    expect(res.status).toBe(400);
    // The read must be refused before Storage is touched at all.
    expect(storageDownload).not.toHaveBeenCalled();
  });

  it('refuses a prefix sibling that merely starts with the same characters', async () => {
    const res = await render({
      sourcePhotoId: 'abc',
      sourceStoragePath: 'photos/originals-evil/x.jpg',
      logoStoragePath: 'photos/logos/green.png',
      placement,
    });
    expect(res.status).toBe(400);
    expect(storageDownload).not.toHaveBeenCalled();
  });

  it('refuses a logo path pointing somewhere else in the bucket', async () => {
    const res = await render({
      sourcePhotoId: 'abc',
      sourceStoragePath: 'photos/originals/x.jpg',
      logoStoragePath: 'photos/rendered/someone-elses-render.jpg',
      placement,
    });
    expect(res.status).toBe(400);
    expect(storageDownload).not.toHaveBeenCalled();
  });
});

describe('shared-secret comparison is constant time', () => {
  it('accepts an exact match and rejects everything else', () => {
    expect(timingSafeEquals('Bearer abc123', 'Bearer abc123')).toBe(true);
    expect(timingSafeEquals('Bearer abc124', 'Bearer abc123')).toBe(false);
    // A correct prefix must not be treated as a match.
    expect(timingSafeEquals('Bearer abc', 'Bearer abc123')).toBe(false);
    expect(timingSafeEquals('', 'Bearer abc123')).toBe(false);
    expect(timingSafeEquals('Bearer abc123 ', 'Bearer abc123')).toBe(false);
  });

  it('does not throw on a length mismatch', () => {
    expect(() => timingSafeEquals('a', 'a-much-longer-secret-value')).not.toThrow();
  });
});

describe('cron routes reject an unset or wrong secret', () => {
  const CRON_ROUTES = [
    () => import('@/app/api/cron/founder-brief/route'),
    () => import('@/app/api/cron/leads-digest/route'),
    () => import('@/app/api/cron/not-the-rug-brief/route'),
  ];

  it.each(CRON_ROUTES)('rejects a wrong bearer token', async (load) => {
    vi.stubEnv('CRON_SECRET', 'the-real-secret');
    const { GET } = await load();
    const res = await GET(req('http://localhost/api/cron/x', {
      headers: { authorization: 'Bearer not-the-secret' },
    }));
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });

  it.each(CRON_ROUTES)('fails closed when no secret is configured', async (load) => {
    vi.stubEnv('CRON_SECRET', '');
    const { GET } = await load();
    const res = await GET(req('http://localhost/api/cron/x', {
      headers: { authorization: 'Bearer anything' },
    }));
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });
});
