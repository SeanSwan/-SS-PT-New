/**
 * Motion bind — agent half. The hash is re-verified at the point of use.
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *   1. The graph animating whatever bytes came back, hash unchecked.
 *   2. An object reference reaching the LoadImage node as "[object Object]".
 *   3. A plain-filename initImage (the pre-existing contract) being broken.
 *   4. A hash mismatch retried forever — it is a fact about the request.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { bindInitImage, isBoundInitImage, uploadToComfy, BindError } from '../../scripts/handlers/initImageBind.mjs';

const BYTES = Buffer.from('the approved frame');
const H = createHash('sha256').update(BYTES).digest('hex');
const ref = (sha = H) => ({ assetId: 'asset-1', r2Key: 'k', sha256: sha, mime: 'image/png' });

function deps(over = {}) {
  const calls = { api: [], fetch: [] };
  return {
    calls,
    comfyHost: 'http://127.0.0.1:8188',
    api: async (path, opts) => { calls.api.push({ path, opts }); return { data: { url: 'https://r2/x', sha256: H, mime: 'image/png' } }; },
    fetchImpl: async (url, init) => {
      calls.fetch.push({ url, init });
      if (String(url).endsWith('/upload/image')) return { ok: true, json: async () => ({ name: 'swan-bound-abc.png' }) };
      return { ok: true, arrayBuffer: async () => BYTES };
    },
    ...over,
  };
}

describe('shapes', () => {
  it('recognises a bound reference and passes a plain filename through', async () => {
    expect(isBoundInitImage(ref())).toBe(true);
    expect(isBoundInitImage('frame.png')).toBe(false);
    expect(await bindInitImage({ id: 'j', params: { initImage: 'frame.png' } }, deps())).toBe('frame.png');
    expect(await bindInitImage({ id: 'j', params: {} }, deps())).toBeNull();
  });
});

describe('the bind', () => {
  it('downloads via the server ticket, re-hashes, uploads, and returns the ComfyUI filename', async () => {
    const d = deps();
    const name = await bindInitImage({ id: 'job-9', params: { initImage: ref() } }, d);
    expect(name).toBe('swan-bound-abc.png');
    expect(d.calls.api[0].path).toBe('/jobs/job-9/init-image');
    expect(d.calls.fetch[0].url).toBe('https://r2/x');
    expect(d.calls.fetch[1].url).toBe('http://127.0.0.1:8188/upload/image');
    expect(d.calls.fetch[1].init.method).toBe('POST');
  });

  it('REFUSES when the downloaded bytes do not hash to the approved hash — permanent, no upload', async () => {
    const d = deps({ fetchImpl: async (url) => (String(url).endsWith('/upload/image') ? { ok: true, json: async () => ({ name: 'x' }) } : { ok: true, arrayBuffer: async () => Buffer.from('substituted') }) });
    const err = await bindInitImage({ id: 'job-9', params: { initImage: ref() } }, d).catch((e) => e);
    expect(err).toBeInstanceOf(BindError);
    expect(err.code).toBe('E_BIND_HASH_MISMATCH');
    expect(err.permanent).toBe(true);
    expect(d.calls.fetch.some((c) => String(c.url).endsWith('/upload/image'))).toBe(false);
  });

  it('a network failure downloading is retryable; a 404 is not', async () => {
    const down = deps({ fetchImpl: async () => { throw new Error('ECONNRESET'); } });
    const e1 = await bindInitImage({ id: 'j', params: { initImage: ref() } }, down).catch((e) => e);
    expect(e1.code).toBe('E_BIND_DOWNLOAD_FAILED');
    expect(e1.permanent).toBe(false);
    const gone = deps({ fetchImpl: async () => ({ ok: false, status: 404 }) });
    const e2 = await bindInitImage({ id: 'j', params: { initImage: ref() } }, gone).catch((e) => e);
    expect(e2.permanent).toBe(true);
  });

  it('refuses a malformed reference and a missing API', async () => {
    await expect(bindInitImage({ id: 'j', params: { initImage: { assetId: 'a' } } }, deps())).rejects.toMatchObject({ code: 'E_BIND_MALFORMED' });
    await expect(bindInitImage({ id: 'j', params: { initImage: ref() } }, deps({ api: undefined }))).rejects.toMatchObject({ code: 'E_BIND_NO_API' });
  });

  it('uploadToComfy surfaces a refusal with its status', async () => {
    await expect(uploadToComfy(BYTES, 'x.png', { comfyHost: 'http://c', fetchImpl: async () => ({ ok: false, status: 413 }) }))
      .rejects.toMatchObject({ code: 'E_COMFY_UPLOAD_FAILED', permanent: true });
  });
});
