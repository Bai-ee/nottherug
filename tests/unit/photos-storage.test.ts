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

  it('storageUploadPrivate posts to the GCS JSON API and makes no PATCH', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ name: 'private/report.html' }));

    const { storageUploadPrivate } = await import('@/lib/server/firebaseStorage');
    await expect(
      storageUploadPrivate('private/report.html', Buffer.from('<html></html>'), 'text/html'),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://storage.googleapis.com/upload/storage/v1/b/test-bucket/o?uploadType=media&name=private%2Freport.html',
    );
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer fake-access-token');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('text/html');
    expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit)?.method === 'PATCH')).toBe(false);
  });

  it('storageUploadPrivate throws on a non-OK upload and does nothing further', async () => {
    fetchMock.mockResolvedValueOnce(failResponse(500, 'internal error'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { storageUploadPrivate } = await import('@/lib/server/firebaseStorage');
    await expect(storageUploadPrivate('private/report.html', Buffer.from('x'), 'text/html')).rejects.toThrow(/500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('storageUploadPrivate deletes the object and throws if a download token shows up', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ metadata: { firebaseStorageDownloadTokens: 'leaked-token' } }))
      .mockResolvedValueOnce(jsonResponse({}));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { storageUploadPrivate } = await import('@/lib/server/firebaseStorage');
    await expect(storageUploadPrivate('private/report.html', Buffer.from('x'), 'text/html')).rejects.toThrow(/public download token/);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, delInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(delInit.method).toBe('DELETE');
    const logged = errorSpy.mock.calls.flat().map(String).join('\n');
    expect(logged).not.toContain('leaked-token');
    errorSpy.mockRestore();
  });

  it('storageUploadPrivate still honours the deadline and passes an AbortSignal to fetch', async () => {
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(init.signal!.reason));
      }),
    );

    const { storageUploadPrivate } = await import('@/lib/server/firebaseStorage');
    await expect(
      storageUploadPrivate('private/report.html', Buffer.from('x'), 'text/html', { timeoutMs: 20 }),
    ).rejects.toThrow(/timed out|timeout|Timeout/i);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
