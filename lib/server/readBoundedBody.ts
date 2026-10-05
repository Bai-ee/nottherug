export type BoundedBodyResult =
  | { ok: true; text: string; bytes: number }
  | { ok: false; reason: 'too_large' | 'aborted' | 'missing' };

/**
 * Read a request body as UTF-8 text without ever buffering more than `maxBytes`.
 *
 * Counts the bytes actually received from the stream (not string length, and
 * not the client-declared Content-Length, which may be absent or dishonest) and
 * cancels the stream as soon as the cap is exceeded. A declared Content-Length
 * over the cap is rejected up front as a fast path only.
 *
 *  - `missing`: the request has no body stream.
 *  - `too_large`: more than `maxBytes` bytes were declared or received.
 *  - `aborted`: the stream errored mid-read (e.g. the client disconnected).
 */
export async function readBoundedBody(req: Request, maxBytes: number): Promise<BoundedBodyResult> {
  const declared = req.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) return { ok: false, reason: 'too_large' };
  if (!req.body) return { ok: false, reason: 'missing' };

  const reader = req.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: 'too_large' };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    await reader.cancel().catch(() => {});
    return { ok: false, reason: 'aborted' };
  }
  return { ok: true, text, bytes };
}
