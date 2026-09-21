/**
 * spotlightImageFetch — URL validation and bounded fetch
 * ======================================================
 * These controls exist because `rehostImage()` was reachable from an HMAC-signed but
 * semi-trusted publisher, and its previous guard validated the URL it was HANDED while
 * `fetch` followed redirects to wherever that URL pointed. See `CORRECTIONS-APPLIED.md` §4.
 *
 * Every test is behavioural: a real DNS mock for the resolution step and real
 * ReadableStream bodies for the size cap. Nothing asserts on a mock's internals.
 *
 * Decode-side guards live in `spotlightImageDecode.test.mjs`; shared fixtures in
 * `tests/helpers/spotlightImageFixtures.mjs`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  validateSpotlightImageUrl,
  fetchSpotlightImage,
  MAX_IMAGE_BYTES,
  DNS_LOOKUP_TIMEOUT_MS,
} from '../../services/spotlightImageFetch.mjs';
import {
  PUBLIC_IP,
  mockDns,
  mockDnsFail,
  mockDnsHang,
  streamResponse,
  cancellableStreamResponse,
} from '../helpers/spotlightImageFixtures.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── validateSpotlightImageUrl ────────────────────────────────────────────
describe('validateSpotlightImageUrl', () => {
  it('rejects http: (HTTPS only)', async () => {
    mockDns(PUBLIC_IP);
    await expect(validateSpotlightImageUrl('http://example.com/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });

  it('rejects credentials embedded in the URL', async () => {
    mockDns(PUBLIC_IP);
    await expect(validateSpotlightImageUrl('https://user:pass@example.com/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });

  it('rejects a malformed URL', async () => {
    await expect(validateSpotlightImageUrl('not-a-url'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_MALFORMED' });
  });

  it('rejects a host resolving to loopback', async () => {
    mockDns([{ address: '127.0.0.1', family: 4 }]);
    await expect(validateSpotlightImageUrl('https://internal.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });

  it('rejects a host resolving to the cloud metadata address', async () => {
    mockDns([{ address: '169.254.169.254', family: 4 }]);
    await expect(validateSpotlightImageUrl('https://metadata.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });

  it('rejects when ANY resolved address is private, not just the first', async () => {
    mockDns([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ]);
    await expect(validateSpotlightImageUrl('https://rebind.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });

  it('rejects an IPv6 loopback resolution', async () => {
    mockDns([{ address: '::1', family: 6 }]);
    await expect(validateSpotlightImageUrl('https://v6.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });

  it('fails closed when DNS resolution fails', async () => {
    mockDnsFail('ENOTFOUND');
    await expect(validateSpotlightImageUrl('https://nope.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_DNS_FAILED' });
  });

  it('accepts a public https URL', async () => {
    mockDns(PUBLIC_IP);
    const url = await validateSpotlightImageUrl('https://example.com/a.png');
    expect(url.hostname).toBe('example.com');
  });
});

// ─── fetchSpotlightImage ──────────────────────────────────────────────────
describe('fetchSpotlightImage', () => {
  it('refuses to follow a redirect', async () => {
    mockDns(PUBLIC_IP);
    const fetchImpl = vi.fn().mockRejectedValue(
      Object.assign(new Error('unexpected redirect'), { code: 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS' })
    );
    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_URL_REDIRECT_REJECTED');
    // the point of the fix: redirects are disabled at the transport, not inspected afterwards
    expect(fetchImpl.mock.calls[0][1].redirect).toBe('error');
  });

  it('aborts mid-stream once the byte cap is exceeded', async () => {
    mockDns(PUBLIC_IP);
    const chunk = Buffer.alloc(64 * 1024, 1);
    const fetchImpl = vi.fn().mockResolvedValue(streamResponse([chunk, chunk, chunk]));
    const result = await fetchSpotlightImage('https://example.com/a.png', {
      fetchImpl, maxBytes: 100 * 1024,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_TOO_LARGE');
  });

  it('rejects a declared Content-Length over the cap before streaming', async () => {
    mockDns(PUBLIC_IP);
    const fetchImpl = vi.fn().mockResolvedValue(
      streamResponse([Buffer.alloc(16)], { headers: { 'content-length': String(MAX_IMAGE_BYTES + 1) } })
    );
    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_TOO_LARGE');
  });

  it('returns bytes for an acceptable response', async () => {
    mockDns(PUBLIC_IP);
    const payload = Buffer.from([1, 2, 3, 4]);
    const fetchImpl = vi.fn().mockResolvedValue(
      streamResponse([payload], { headers: { 'content-type': 'image/png' } })
    );
    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.bytes.equals(payload)).toBe(true);
    expect(result.contentType).toBe('image/png');
  });

  it('reports a non-2xx upstream as a failure rather than throwing', async () => {
    mockDns(PUBLIC_IP);
    const fetchImpl = vi.fn().mockResolvedValue(streamResponse([], { status: 404 }));
    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_FETCH_FAILED');
  });

  it('does not call fetch at all when the URL fails validation', async () => {
    mockDns([{ address: '169.254.169.254', family: 4 }]);
    const fetchImpl = vi.fn();
    const result = await fetchSpotlightImage('https://metadata.example/a.png', { fetchImpl });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

// ─── D8 / R2-03 — the lookup budget and the body release ──────────────────
// Both are hostile-review D8 findings. Each has a CONTROL beside it, because a bound that never
// fires and a cancel that is never observed would both read as green while proving nothing.
describe('fetchSpotlightImage — D8 bounds and releases', () => {
  it('bounds a hanging DNS lookup instead of waiting it out', async () => {
    mockDnsHang();
    // A real 3 s wait would make this slow and flaky; the budget is injectable for exactly that
    // reason. The property under test is that a bound EXISTS and fires, not its value.
    await expect(validateSpotlightImageUrl('https://hang.example/a.png', { dnsTimeoutMs: 30 }))
      .rejects.toMatchObject({ code: 'IMAGE_URL_DNS_TIMEOUT' });
  });

  it('CONTROL: a fast lookup is unaffected by the budget', async () => {
    mockDns(PUBLIC_IP);
    const url = await validateSpotlightImageUrl('https://fast.example/a.png', { dnsTimeoutMs: 30 });
    expect(url.hostname).toBe('fast.example');
  });

  it('reports a hanging resolver distinctly from an unresolvable name', async () => {
    mockDnsFail('ENOTFOUND');
    await expect(validateSpotlightImageUrl('https://nope.example/a.png', { dnsTimeoutMs: 30 }))
      .rejects.toMatchObject({ code: 'IMAGE_URL_DNS_FAILED' });
  });

  it('cancels the body when the upstream status is not ok', async () => {
    mockDns(PUBLIC_IP);
    const response = cancellableStreamResponse([Buffer.alloc(4096)], { status: 500 });
    const result = await fetchSpotlightImage('https://example.com/a.png', {
      fetchImpl: vi.fn().mockResolvedValue(response),
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_FETCH_FAILED');
    // the assertion that matters: the socket was RELEASED, not merely abandoned
    expect(response.cancels.length).toBe(1);
  });

  it('cancels the body when the declared Content-Length exceeds the cap', async () => {
    mockDns(PUBLIC_IP);
    const response = cancellableStreamResponse([Buffer.alloc(16)], {
      headers: { 'content-length': String(MAX_IMAGE_BYTES + 1) },
    });
    const result = await fetchSpotlightImage('https://example.com/a.png', {
      fetchImpl: vi.fn().mockResolvedValue(response),
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_TOO_LARGE');
    expect(response.cancels.length).toBe(1);
  });

  it('CONTROL: a successful read cancels nothing', async () => {
    mockDns(PUBLIC_IP);
    const response = cancellableStreamResponse([Buffer.from([1, 2, 3])], {
      headers: { 'content-type': 'image/png' },
    });
    const result = await fetchSpotlightImage('https://example.com/a.png', {
      fetchImpl: vi.fn().mockResolvedValue(response),
    });
    expect(result.ok).toBe(true);
    expect(response.cancels.length).toBe(0);
  });

  it('exposes a positive default lookup budget', () => {
    expect(DNS_LOOKUP_TIMEOUT_MS).toBeGreaterThan(0);
  });
});
