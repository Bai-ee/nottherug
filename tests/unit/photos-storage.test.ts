import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getAccessToken = vi.fn(async () => ({ access_token: 'fake-access-token' }));

vi.mock('@/lib/firebase-admin', () => ({
  adminApp: { options: { credential: { getAccessToken } } },
}));

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return { ok: true, status, json: async () => body, text: async () => JSON.stringify(body) };
}

function failResponse(status: number, text: string) {
  return { ok: false, status, json: async () => ({}), text: async () => text };
}

describe('storageUpload / storageUploadPrivate logging and privacy (R09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockResolvedValue({ access_token: 'fake-access-token' });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('never logs the bucket, upload URL, response body, or the token-bearing download URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ downloadTokens: 'super-secret-token-abc' }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { storageUpload } = await import('@/lib/server/firebaseStorage');
    const url = await storageUpload('photos/originals/x.jpg', Buffer.from('data'), 'image/jpeg');
    expect(url).toContain('token=super-secret-token-abc');

    const logged = [...logSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
      .join('\n');

    expect(logged).not.toContain('token=');
    expect(logged).not.toContain('super-secret-token-abc');
    expect(logged).not.toContain('test-bucket');

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs only a status code and path on upload failure, never the response body', async () => {
    fetchMock.mockResolvedValue(failResponse(403, 'Permission denied for project secret-project-id-xyz'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { storageUpload } = await import('@/lib/server/firebaseStorage');
    await expect(storageUpload('photos/originals/x.jpg', Buffer.from('data'), 'image/jpeg')).rejects.toThrow();

    const logged = errorSpy.mock.calls.flat().map(String).join('\n');
    expect(logged).not.toContain('secret-project-id-xyz');
    errorSpy.mockRestore();
  });

  it('storageUploadPrivate uploads then clears the auto-issued token, leaving no public URL', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ downloadTokens: 'auto-issued-token' }))
      .mockResolvedValueOnce(jsonResponse({}));

    const { storageUploadPrivate } = await import('@/lib/server/firebaseStorage');
    await expect(
      storageUploadPrivate('private/report.html', Buffer.from('<html></html>'), 'text/html'),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, patchCall] = fetchMock.mock.calls;
    const [, patchInit] = patchCall as [string, RequestInit];
    expect(patchInit.method).toBe('PATCH');
    expect(JSON.parse(patchInit.body as string)).toEqual({ metadata: { firebaseStorageDownloadTokens: '' } });
  });

  it('storageUploadPrivate throws if clearing the token fails, rather than silently leaving it public', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ downloadTokens: 'auto-issued-token' }))
      .mockResolvedValueOnce(failResponse(500, 'internal error'));

    const { storageUploadPrivate } = await import('@/lib/server/firebaseStorage');
    await expect(storageUploadPrivate('private/report.html', Buffer.from('x'), 'text/html')).rejects.toThrow();
  });
});
