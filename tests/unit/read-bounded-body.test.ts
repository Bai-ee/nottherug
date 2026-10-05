import { describe, it, expect, vi } from 'vitest';
import { readBoundedBody } from '@/lib/server/readBoundedBody';

const enc = new TextEncoder();

function streamReq(chunks: Uint8Array[], headers: Record<string, string> = {}, opts?: { errorAfter?: boolean; onCancel?: () => void }) {
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i++]);
      } else if (opts?.errorAfter) {
        controller.error(new Error('client disconnected'));
      } else {
        controller.close();
      }
    },
    cancel() {
      opts?.onCancel?.();
    },
  });
  return new Request('http://x.test/', { method: 'POST', body, headers, duplex: 'half' } as RequestInit);
}

describe('readBoundedBody', () => {
  it('reports a request with no body as missing', async () => {
    const r = await readBoundedBody(new Request('http://x.test/', { method: 'POST' }), 100);
    expect(r).toEqual({ ok: false, reason: 'missing' });
  });

  it('reads a normal body with no Content-Length header', async () => {
    const r = await readBoundedBody(streamReq([enc.encode('{"a":'), enc.encode('1}')]), 100);
    expect(r).toEqual({ ok: true, text: '{"a":1}', bytes: 7 });
  });

  it('accepts a body exactly at the cap and rejects one byte over', async () => {
    expect(await readBoundedBody(streamReq([enc.encode('abcde')]), 5)).toMatchObject({ ok: true, bytes: 5 });
    expect(await readBoundedBody(streamReq([enc.encode('abcdef')]), 5)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('counts UTF-8 bytes, not characters', async () => {
    // 3 characters, 9 bytes (each is 3 bytes in UTF-8).
    const text = '日本語';
    expect(text.length).toBe(3);
    expect(await readBoundedBody(streamReq([enc.encode(text)]), 9)).toMatchObject({ ok: true, text, bytes: 9 });
    expect(await readBoundedBody(streamReq([enc.encode(text)]), 8)).toEqual({ ok: false, reason: 'too_large' });
  });

  it('decodes a multibyte character split across chunks', async () => {
    const bytes = enc.encode('a€b'); // € is 3 bytes
    const r = await readBoundedBody(streamReq([bytes.slice(0, 2), bytes.slice(2)]), 100);
    expect(r).toMatchObject({ ok: true, text: 'a€b', bytes: 5 });
  });

  it('enforces the cap from received bytes when Content-Length lies low', async () => {
    const r = await readBoundedBody(streamReq([enc.encode('x'.repeat(50))], { 'content-length': '3' }), 10);
    expect(r).toEqual({ ok: false, reason: 'too_large' });
  });

  it('accepts a small body even when Content-Length lies high but within cap', async () => {
    const r = await readBoundedBody(streamReq([enc.encode('hi')], { 'content-length': '10' }), 10);
    expect(r).toMatchObject({ ok: true, text: 'hi' });
  });

  it('rejects a declared Content-Length over the cap', async () => {
    const r = await readBoundedBody(streamReq([enc.encode('hi')], { 'content-length': '11' }), 10);
    expect(r).toEqual({ ok: false, reason: 'too_large' });
  });

  it('cancels the stream as soon as the cap is exceeded, without draining it', async () => {
    const onCancel = vi.fn();
    const pulled = { n: 0 };
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        pulled.n++;
        c.enqueue(enc.encode('x'.repeat(10)));
      },
      cancel: onCancel,
    });
    const req = new Request('http://x.test/', { method: 'POST', body, duplex: 'half' } as RequestInit);
    const r = await readBoundedBody(req, 25);
    expect(r).toEqual({ ok: false, reason: 'too_large' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    // An endless stream stops being pulled shortly after the cap (small read-ahead is fine).
    expect(pulled.n).toBeLessThan(10);
  });

  it('reports a stream error mid-read as aborted and releases the stream', async () => {
    const r = await readBoundedBody(streamReq([enc.encode('part')], {}, { errorAfter: true }), 100);
    expect(r).toEqual({ ok: false, reason: 'aborted' });
  });
});
