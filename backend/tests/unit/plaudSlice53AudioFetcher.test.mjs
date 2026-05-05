/**
 * Phase 5 Slice 5.3 — applaudAudioFetcher tests
 * ===============================================
 * Behavioral coverage of validateAudioUrl + fetchAudioWithCaps +
 * isPrivateOrLocalAddress. Mocks `dns.lookup` and `fetch` for
 * deterministic SSRF bypass scenarios.
 *
 * Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §3.3 V1.4 + §11.1, §11.2.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dnsModule from 'node:dns';
import {
  AudioUrlError,
  AudioFetchError,
  validateAudioUrl,
  fetchAudioWithCaps,
  isPrivateOrLocalAddress,
} from '../../services/applaudAudioFetcher.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = readFileSync(
  resolve(__dirname, '../../services/applaudAudioFetcher.mjs'),
  'utf8',
);

const ALLOWED_BASE = 'https://applaud-tunnel.test.local';
const VALID_URL = 'https://applaud-tunnel.test.local/media/rec_a1b2c3.mp3';

function mockDnsLookup(addressList) {
  return vi
    .spyOn(dnsModule.promises, 'lookup')
    .mockResolvedValue(addressList);
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── isPrivateOrLocalAddress ───────────────────────────────────────────
describe('Slice 5.3 — isPrivateOrLocalAddress', () => {
  it('rejects 127.0.0.1 (loopback)', () => {
    expect(isPrivateOrLocalAddress('127.0.0.1')).toBe(true);
  });
  it('rejects 10.x.x.x (RFC1918)', () => {
    expect(isPrivateOrLocalAddress('10.0.0.1')).toBe(true);
    expect(isPrivateOrLocalAddress('10.255.255.255')).toBe(true);
  });
  it('rejects 192.168.x.x (RFC1918)', () => {
    expect(isPrivateOrLocalAddress('192.168.1.1')).toBe(true);
    expect(isPrivateOrLocalAddress('192.168.255.254')).toBe(true);
  });
  it('rejects 172.16.x.x through 172.31.x.x (RFC1918)', () => {
    expect(isPrivateOrLocalAddress('172.16.0.1')).toBe(true);
    expect(isPrivateOrLocalAddress('172.31.255.255')).toBe(true);
  });
  it('accepts 172.15.x.x (NOT in RFC1918 range)', () => {
    expect(isPrivateOrLocalAddress('172.15.255.255')).toBe(false);
  });
  it('accepts 172.32.x.x (NOT in RFC1918 range)', () => {
    expect(isPrivateOrLocalAddress('172.32.0.1')).toBe(false);
  });
  it('rejects 169.254.x.x (link-local — AWS metadata service lives at 169.254.169.254)', () => {
    expect(isPrivateOrLocalAddress('169.254.169.254')).toBe(true);
    expect(isPrivateOrLocalAddress('169.254.0.1')).toBe(true);
  });
  it('rejects 100.64.x.x through 100.127.x.x (CGNAT)', () => {
    expect(isPrivateOrLocalAddress('100.64.0.1')).toBe(true);
    expect(isPrivateOrLocalAddress('100.127.255.255')).toBe(true);
  });
  it('accepts 100.63.x.x and 100.128.x.x (outside CGNAT)', () => {
    expect(isPrivateOrLocalAddress('100.63.255.255')).toBe(false);
    expect(isPrivateOrLocalAddress('100.128.0.1')).toBe(false);
  });
  it('rejects multicast (224-239.x.x.x)', () => {
    expect(isPrivateOrLocalAddress('224.0.0.1')).toBe(true);
    expect(isPrivateOrLocalAddress('239.255.255.255')).toBe(true);
  });
  it('rejects 0.0.0.0/8', () => {
    expect(isPrivateOrLocalAddress('0.0.0.0')).toBe(true);
    expect(isPrivateOrLocalAddress('0.255.255.255')).toBe(true);
  });
  it('rejects 240.x.x.x and beyond (reserved + broadcast)', () => {
    expect(isPrivateOrLocalAddress('240.0.0.0')).toBe(true);
    expect(isPrivateOrLocalAddress('255.255.255.255')).toBe(true);
  });
  it('accepts public IPv4 (8.8.8.8 — Google DNS, 1.1.1.1 — Cloudflare)', () => {
    expect(isPrivateOrLocalAddress('8.8.8.8')).toBe(false);
    expect(isPrivateOrLocalAddress('1.1.1.1')).toBe(false);
    expect(isPrivateOrLocalAddress('104.18.0.1')).toBe(false); // Cloudflare IP
  });
  it('rejects ::1 (IPv6 loopback)', () => {
    expect(isPrivateOrLocalAddress('::1')).toBe(true);
  });
  it('rejects fe80:: (IPv6 link-local)', () => {
    expect(isPrivateOrLocalAddress('fe80::1')).toBe(true);
    expect(isPrivateOrLocalAddress('FE80::1')).toBe(true);
  });
  it('rejects fc00::/7 (IPv6 ULA)', () => {
    expect(isPrivateOrLocalAddress('fc00::1')).toBe(true);
    expect(isPrivateOrLocalAddress('fd00::1')).toBe(true);
  });
  it('rejects ff00::/8 (IPv6 multicast)', () => {
    expect(isPrivateOrLocalAddress('ff02::1')).toBe(true);
  });
  it('rejects IPv4-mapped IPv6 of private addresses', () => {
    expect(isPrivateOrLocalAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateOrLocalAddress('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivateOrLocalAddress('::ffff:169.254.169.254')).toBe(true);
  });
  it('accepts public IPv6', () => {
    expect(isPrivateOrLocalAddress('2606:4700::1')).toBe(false); // Cloudflare
    expect(isPrivateOrLocalAddress('2001:4860:4860::8888')).toBe(false); // Google DNS
  });
  it('fail-closed on un-parseable input', () => {
    expect(isPrivateOrLocalAddress('')).toBe(true);
    expect(isPrivateOrLocalAddress('not-an-ip')).toBe(true);
    expect(isPrivateOrLocalAddress(null)).toBe(true);
    expect(isPrivateOrLocalAddress(undefined)).toBe(true);
    expect(isPrivateOrLocalAddress(12345)).toBe(true);
  });
});

// ─── validateAudioUrl ─────────────────────────────────────────────────
describe('Slice 5.3 — validateAudioUrl (Codex CR-4)', () => {
  it('accepts valid URL with public DNS resolution', async () => {
    mockDnsLookup([{ address: '104.18.1.1', family: 4 }]);
    const result = await validateAudioUrl(VALID_URL, ALLOWED_BASE);
    expect(result.hostname).toBe('applaud-tunnel.test.local');
  });

  it('throws AUDIO_URL_ALLOWLIST_UNCONFIGURED when no allowedBaseUrl set', async () => {
    await expect(validateAudioUrl(VALID_URL, '')).rejects.toThrow(
      expect.objectContaining({ code: 'AUDIO_URL_ALLOWLIST_UNCONFIGURED' }),
    );
    await expect(validateAudioUrl(VALID_URL, null)).rejects.toThrow(
      expect.objectContaining({ code: 'AUDIO_URL_ALLOWLIST_UNCONFIGURED' }),
    );
  });

  it('throws AUDIO_URL_MALFORMED on un-parseable URL', async () => {
    // Inputs that cause `new URL()` to throw TypeError (no scheme, missing host).
    // NOTE: 'not://x' actually parses (becomes scheme=not:); use truly broken inputs.
    await expect(validateAudioUrl('not-a-url-at-all', ALLOWED_BASE)).rejects.toThrow(
      expect.objectContaining({ code: 'AUDIO_URL_MALFORMED' }),
    );
    await expect(validateAudioUrl('', ALLOWED_BASE)).rejects.toThrow(
      expect.objectContaining({ code: 'AUDIO_URL_MALFORMED' }),
    );
    await expect(validateAudioUrl('http://', ALLOWED_BASE)).rejects.toThrow(
      expect.objectContaining({ code: 'AUDIO_URL_MALFORMED' }),
    );
  });

  it('REJECTS http:// (HTTPS-only)', async () => {
    await expect(
      validateAudioUrl('http://applaud-tunnel.test.local/media/rec.mp3', ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS file:// scheme', async () => {
    await expect(
      validateAudioUrl('file:///etc/passwd', ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS data: URL', async () => {
    await expect(
      validateAudioUrl('data:audio/mp3;base64,AAAA', ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS credentials in URL (https://allowed@evil.com)', async () => {
    await expect(
      validateAudioUrl('https://attacker:pass@applaud-tunnel.test.local/media/rec.mp3', ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
    // Bypass attempt: credentials trick where the "real" hostname is after @
    await expect(
      validateAudioUrl('https://applaud-tunnel.test.local@evil.com/media/rec.mp3', ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS subdomain prefix attack (allowed.com.evil.com)', async () => {
    await expect(
      validateAudioUrl('https://applaud-tunnel.test.local.attacker.com/media/rec.mp3', ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS wrong hostname entirely (https://evil.com)', async () => {
    await expect(
      validateAudioUrl('https://evil.com/media/rec.mp3', ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS wrong port (different port on allowed host)', async () => {
    mockDnsLookup([{ address: '1.1.1.1', family: 4 }]);
    await expect(
      validateAudioUrl('https://applaud-tunnel.test.local:8443/media/rec.mp3', ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS when hostname resolves to 127.0.0.1 (DNS rebinding)', async () => {
    mockDnsLookup([{ address: '127.0.0.1', family: 4 }]);
    await expect(
      validateAudioUrl(VALID_URL, ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS when hostname resolves to 169.254.169.254 (AWS metadata)', async () => {
    mockDnsLookup([{ address: '169.254.169.254', family: 4 }]);
    await expect(
      validateAudioUrl(VALID_URL, ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS when hostname resolves to 10.0.0.1 (RFC1918 private)', async () => {
    mockDnsLookup([{ address: '10.0.0.1', family: 4 }]);
    await expect(
      validateAudioUrl(VALID_URL, ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS when hostname resolves to ANY private address among multiple', async () => {
    // Multi-A-record DNS. If any address is private, reject.
    mockDnsLookup([
      { address: '1.1.1.1', family: 4 },
      { address: '127.0.0.1', family: 4 }, // ← rebinding payload
    ]);
    await expect(
      validateAudioUrl(VALID_URL, ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }));
  });

  it('REJECTS when DNS lookup fails', async () => {
    vi.spyOn(dnsModule.promises, 'lookup').mockRejectedValue(new Error('NXDOMAIN'));
    await expect(
      validateAudioUrl(VALID_URL, ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_DNS_FAILED' }));
  });

  it('REJECTS when DNS returns empty result', async () => {
    mockDnsLookup([]);
    await expect(
      validateAudioUrl(VALID_URL, ALLOWED_BASE),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_DNS_FAILED' }));
  });

  it('REJECTS when allowedBaseUrl itself is malformed', async () => {
    await expect(
      validateAudioUrl(VALID_URL, 'not-a-url'),
    ).rejects.toThrow(expect.objectContaining({ code: 'AUDIO_URL_ALLOWLIST_UNCONFIGURED' }));
  });
});

// ─── fetchAudioWithCaps ───────────────────────────────────────────────
describe('Slice 5.3 — fetchAudioWithCaps', () => {
  function buildResponse({ ok = true, status = 200, contentLength, contentType = 'audio/mpeg', bodyBytes }) {
    const buf = bodyBytes ?? Buffer.from('mp3-data');
    const headers = new Map();
    if (contentLength != null) headers.set('content-length', String(contentLength));
    if (contentType) headers.set('content-type', contentType);
    let cancelled = false;
    return {
      ok,
      status,
      headers: { get: (k) => headers.get(k.toLowerCase()) || null },
      body: {
        getReader: () => {
          let yielded = false;
          return {
            async read() {
              if (cancelled) return { done: true };
              if (yielded) return { done: true };
              yielded = true;
              return { done: false, value: new Uint8Array(buf) };
            },
            async cancel() { cancelled = true; },
          };
        },
      },
    };
  }

  it('happy path: fetches and returns bytes + mimetype', async () => {
    mockDnsLookup([{ address: '1.1.1.1', family: 4 }]);
    const fakeFetch = vi.fn().mockResolvedValue(buildResponse({
      contentLength: 8,
      contentType: 'audio/mpeg',
      bodyBytes: Buffer.from('mp3-data'),
    }));
    const result = await fetchAudioWithCaps(VALID_URL, 8, {
      allowedBaseUrl: ALLOWED_BASE,
      fetchImpl: fakeFetch,
    });
    expect(result.ok).toBe(true);
    expect(result.bytes).toEqual(Buffer.from('mp3-data'));
    expect(result.mimetype).toBe('audio/mpeg');
    expect(fakeFetch).toHaveBeenCalledWith(
      VALID_URL,
      expect.objectContaining({
        redirect: 'error',  // CR-4: redirect:'error', not 'manual', not 'follow'
      }),
    );
  });

  it('returns AUDIO_TOO_LARGE on declared size > cap', async () => {
    mockDnsLookup([{ address: '1.1.1.1', family: 4 }]);
    const result = await fetchAudioWithCaps(VALID_URL, 99 * 1024 * 1024, {
      allowedBaseUrl: ALLOWED_BASE,
      fetchImpl: vi.fn(), // should not be called
      maxBytes: 25 * 1024 * 1024,
    });
    expect(result.error).toBe(true);
    expect(result.errorCode).toBe('AUDIO_TOO_LARGE');
    expect(result.errorStatus).toBe(413);
  });

  it('returns AUDIO_TOO_LARGE when Content-Length header > cap', async () => {
    mockDnsLookup([{ address: '1.1.1.1', family: 4 }]);
    const fakeFetch = vi.fn().mockResolvedValue(buildResponse({
      contentLength: 99 * 1024 * 1024,
    }));
    const result = await fetchAudioWithCaps(VALID_URL, 1024, {
      allowedBaseUrl: ALLOWED_BASE,
      fetchImpl: fakeFetch,
      maxBytes: 25 * 1024 * 1024,
    });
    expect(result.error).toBe(true);
    expect(result.errorCode).toBe('AUDIO_TOO_LARGE');
  });

  it('returns AUDIO_TOO_LARGE when streamed bytes exceed cap (Content-Length lies)', async () => {
    mockDnsLookup([{ address: '1.1.1.1', family: 4 }]);
    // Build a response with Content-Length: 100 (under cap) but actual body 50 KB.
    const bigBody = Buffer.alloc(50 * 1024, 0x42);
    const fakeFetch = vi.fn().mockResolvedValue(buildResponse({
      contentLength: 100,            // claims 100 bytes
      bodyBytes: bigBody,            // actually 50KB
    }));
    const result = await fetchAudioWithCaps(VALID_URL, 100, {
      allowedBaseUrl: ALLOWED_BASE,
      fetchImpl: fakeFetch,
      maxBytes: 1024,                // 1 KB cap
    });
    expect(result.error).toBe(true);
    expect(result.errorCode).toBe('AUDIO_TOO_LARGE');
    expect(result.errorStatus).toBe(413);
  });

  it('returns AUDIO_FETCH_TIMEOUT on TimeoutError', async () => {
    mockDnsLookup([{ address: '1.1.1.1', family: 4 }]);
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';
    const fakeFetch = vi.fn().mockRejectedValue(timeoutErr);
    const result = await fetchAudioWithCaps(VALID_URL, 1024, {
      allowedBaseUrl: ALLOWED_BASE,
      fetchImpl: fakeFetch,
    });
    expect(result.error).toBe(true);
    expect(result.errorCode).toBe('AUDIO_FETCH_TIMEOUT');
    expect(result.errorStatus).toBe(500);
  });

  it('returns AUDIO_URL_REDIRECT_REJECTED when redirect:error fires', async () => {
    mockDnsLookup([{ address: '1.1.1.1', family: 4 }]);
    const redirectErr = new Error('redirect not allowed');
    redirectErr.code = 'UND_ERR_REDIRECT';
    const fakeFetch = vi.fn().mockRejectedValue(redirectErr);
    const result = await fetchAudioWithCaps(VALID_URL, 1024, {
      allowedBaseUrl: ALLOWED_BASE,
      fetchImpl: fakeFetch,
    });
    expect(result.error).toBe(true);
    expect(result.errorCode).toBe('AUDIO_URL_REDIRECT_REJECTED');
    expect(result.errorStatus).toBe(400);
  });

  it('returns AUDIO_FETCH_FAILED on upstream 5xx', async () => {
    mockDnsLookup([{ address: '1.1.1.1', family: 4 }]);
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: false, status: 503,
      headers: { get: () => null },
      body: null,
    });
    const result = await fetchAudioWithCaps(VALID_URL, 1024, {
      allowedBaseUrl: ALLOWED_BASE,
      fetchImpl: fakeFetch,
    });
    expect(result.error).toBe(true);
    expect(result.errorCode).toBe('AUDIO_FETCH_FAILED');
  });

  it('passes URL validation errors through with proper status mapping', async () => {
    const result = await fetchAudioWithCaps('http://evil.com/x', 1024, {
      allowedBaseUrl: ALLOWED_BASE,
      fetchImpl: vi.fn(),
    });
    expect(result.error).toBe(true);
    expect(result.errorCode).toBe('AUDIO_URL_NOT_ALLOWED');
    expect(result.errorStatus).toBe(400);
  });

  it('returns 500 on AUDIO_URL_ALLOWLIST_UNCONFIGURED (server config error)', async () => {
    const result = await fetchAudioWithCaps(VALID_URL, 1024, {
      allowedBaseUrl: '',
      fetchImpl: vi.fn(),
    });
    expect(result.error).toBe(true);
    expect(result.errorCode).toBe('AUDIO_URL_ALLOWLIST_UNCONFIGURED');
    expect(result.errorStatus).toBe(500);
  });
});

// ─── Source-text regression locks (Codex CR-4 + Rule 50) ───────────────
describe('Slice 5.3 — source-text regression locks', () => {
  it('uses redirect: \'error\' on fetch (NOT \'manual\', NOT \'follow\')', () => {
    expect(SRC).toMatch(/redirect:\s*'error'/);
    expect(SRC).not.toMatch(/redirect:\s*'follow'/);
    expect(SRC).not.toMatch(/redirect:\s*'manual'/);
  });
  it('parses URL via new URL() — not regex', () => {
    expect(SRC).toMatch(/new URL\(/);
  });
  it('checks parsed.protocol === \'https:\' explicitly (HTTPS-only)', () => {
    expect(SRC).toMatch(/protocol\s*!==\s*'https:'/);
  });
  it('rejects parsed.username || parsed.password (no creds in URL)', () => {
    expect(SRC).toMatch(/incoming\.username\s*\|\|\s*incoming\.password/);
  });
  it('uses dns.lookup with all: true (multi-A defends rebinding)', () => {
    expect(SRC).toMatch(/dns\.lookup\([\s\S]{0,80}all:\s*true/);
  });
  it('exact hostname match (=== not regex)', () => {
    expect(SRC).toMatch(/incoming\.hostname\s*!==\s*allowed\.hostname/);
  });
  it('exact port match (=== not regex)', () => {
    expect(SRC).toMatch(/incoming\.port\s*!==\s*allowed\.port/);
  });
  it('uses AbortSignal.timeout for fetch timeout (not setTimeout race)', () => {
    expect(SRC).toMatch(/AbortSignal\.timeout/);
  });
  it('reads response.body via getReader() with size cap (not response.arrayBuffer)', () => {
    // arrayBuffer would buffer the whole body before the cap is checked,
    // defeating the streamed-cap defense against Content-Length lies.
    expect(SRC).toMatch(/getReader\(\)/);
    expect(SRC).not.toMatch(/response\.arrayBuffer/);
    expect(SRC).not.toMatch(/response\.text/);
    expect(SRC).not.toMatch(/response\.blob/);
  });
  it('cancels reader stream on size-cap exceed (releases socket)', () => {
    expect(SRC).toMatch(/reader\.cancel/);
  });
});
