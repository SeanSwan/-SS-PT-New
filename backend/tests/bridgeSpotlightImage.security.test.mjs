/**
 * bridgeSpotlightImage.security.test.mjs
 * ======================================
 * R1 acceptance evidence for the `rehostImage()` SSRF fix — the **range and robustness**
 * half of it.
 *
 * THIS FILE IS COMPLEMENTARY, NOT A SECOND OPINION. The primary suites are
 * `tests/unit/spotlightImageFetch.test.mjs` (URL admission + bounded fetch) and
 * `tests/unit/spotlightImageDecode.test.mjs` (decode guards, re-encode, entry point).
 * They already cover scheme/credential rejection, the metadata address, loopback, IPv6
 * loopback, split-horizon answers, redirect rejection, the byte cap, Content-Length
 * pre-rejection, non-2xx, SVG, polyglot, pdf, animation, alpha handling, EXIF stripping,
 * the long-edge cap, and a lying upstream Content-Type.
 *
 * What is added here is only what those do not assert:
 *   - the full private-IPv4 and private-IPv6 range tables, not one address per family;
 *   - IPv4-mapped IPv6 (`::ffff:169.254.169.254`), which must not slip through as "public";
 *   - an empty DNS answer, as distinct from a failed lookup;
 *   - a fetch timeout, and a bodyless response;
 *   - that the byte cap aborts *mid-stream* rather than merely returning the right code;
 *   - that no failure mode can escape as a thrown exception.
 *
 * Fixtures are shared with those suites via `tests/helpers/spotlightImageFixtures.mjs` —
 * a second copy of the DNS mock or the stream builder is the failure mode, not the fix.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  validateSpotlightImageUrl,
  fetchSpotlightImage,
  fetchAndDecodeSpotlightImage,
  MAX_IMAGE_BYTES,
} from '../services/spotlightImageFetch.mjs';
import {
  PUBLIC_IP,
  mockDns,
  streamResponse,
} from './helpers/spotlightImageFixtures.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('R1 — the private-address range tables', () => {
  it('rejects every private, loopback, link-local, CGNAT and reserved IPv4 range', async () => {
    const addresses = [
      '0.0.0.0',        // "this network"
      '10.0.0.1',       // RFC1918
      '10.255.255.254', // RFC1918 upper bound
      '127.0.0.1',      // loopback
      '169.254.169.254',// link-local / cloud metadata
      '172.16.0.1',     // RFC1918 lower bound
      '172.31.255.254', // RFC1918 upper bound
      '192.168.0.1',    // RFC1918
      '100.64.0.1',     // CGNAT
      '100.127.255.254',// CGNAT upper bound
      '224.0.0.1',      // multicast
      '239.255.255.255',// multicast upper bound
      '240.0.0.1',      // reserved
      '255.255.255.255',// broadcast
    ];
    for (const address of addresses) {
      mockDns([{ address, family: 4 }]);
      await expect(
        validateSpotlightImageUrl('https://internal.example/a.png'),
        `expected ${address} to be refused`,
      ).rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    }
  });

  it('rejects every private IPv6 range, including the link-local upper half', async () => {
    const addresses = [
      '::1',            // loopback
      '::',             // unspecified
      'fc00::1',        // ULA lower
      'fd12:3456::1',   // ULA upper
      'fe80::1',        // link-local lower
      'febf::1',        // link-local upper — the /10 boundary an off-by-one misses
      'ff02::1',        // multicast
    ];
    for (const address of addresses) {
      mockDns([{ address, family: 6 }]);
      await expect(
        validateSpotlightImageUrl('https://internal6.example/a.png'),
        `expected ${address} to be refused`,
      ).rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    }
  });

  it('rejects an IPv4-mapped IPv6 address wrapping a private IPv4', async () => {
    // The IPv6 branch must not read `::ffff:169.254.169.254` as a public IPv6 literal.
    mockDns([{ address: '::ffff:169.254.169.254', family: 6 }]);
    await expect(validateSpotlightImageUrl('https://mapped.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });

  it('fails closed on an empty DNS answer, not only on a failed lookup', async () => {
    mockDns([]);
    await expect(validateSpotlightImageUrl('https://empty.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_DNS_FAILED' });
  });
});

describe('R1 — fetch robustness', () => {
  it('reports a timeout as a value rather than an exception', async () => {
    mockDns(PUBLIC_IP);
    const timeout = Object.assign(new Error('The operation was aborted due to timeout'), {
      name: 'TimeoutError',
    });
    const result = await fetchSpotlightImage('https://cdn.example/a.png', {
      fetchImpl: vi.fn().mockRejectedValue(timeout),
    });
    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_TIMEOUT' });
  });

  it('reports a bodyless response as a failure', async () => {
    mockDns(PUBLIC_IP);
    const response = streamResponse([Buffer.from('x')]);
    response.body = null;
    const result = await fetchSpotlightImage('https://cdn.example/a.png', {
      fetchImpl: vi.fn().mockResolvedValue(response),
    });
    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
  });

  it('aborts MID-STREAM on the byte cap — it does not read the body and then measure it', async () => {
    // 64 chunks of 1 MiB against a 5 MiB cap. The pre-fix code buffered all 64 MiB via
    // arrayBuffer() and compared lengths afterwards, so the cap bounded what was STORED,
    // not what was CONSUMED. Counting reads is what distinguishes the two.
    mockDns(PUBLIC_IP);
    const chunk = Buffer.alloc(1024 * 1024, 0x41);
    const chunks = Array.from({ length: 64 }, () => chunk);

    const base = streamResponse(chunks, { headers: { 'content-type': 'image/png' } });
    let reads = 0;
    const counted = {
      ...base,
      body: {
        getReader() {
          const inner = base.body.getReader();
          return {
            read: async () => { reads += 1; return inner.read(); },
            cancel: (reason) => inner.cancel(reason),
          };
        },
      },
    };

    const result = await fetchSpotlightImage('https://cdn.example/a.png', {
      fetchImpl: vi.fn().mockResolvedValue(counted),
      maxBytes: MAX_IMAGE_BYTES,
    });

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
    // The proof it streamed: it stopped far short of 64 chunks instead of draining them.
    expect(reads).toBeLessThan(chunks.length);
    expect(reads).toBeLessThanOrEqual(7);
  });
});

describe('R1 — graceful degradation (an image must never break the ingest)', () => {
  it('returns a value, never an exception, for every failure mode', async () => {
    const cases = [
      ['not a url', 'IMAGE_URL_MALFORMED'],
      ['http://example.com/a.png', 'IMAGE_URL_NOT_ALLOWED'],
      ['https://user:pass@example.com/a.png', 'IMAGE_URL_NOT_ALLOWED'],
    ];
    for (const [url, code] of cases) {
      const result = await fetchAndDecodeSpotlightImage(url, { fetchImpl: vi.fn() });
      expect(result, `expected a value for ${url}`).toMatchObject({ ok: false, code });
    }

    mockDns([{ address: '169.254.169.254', family: 4 }]);
    expect(await fetchAndDecodeSpotlightImage('https://metadata.example/x', { fetchImpl: vi.fn() }))
      .toMatchObject({ ok: false, code: 'IMAGE_URL_NOT_ALLOWED' });

    mockDns(PUBLIC_IP);
    expect(await fetchAndDecodeSpotlightImage('https://cdn.example/a.png', {
      fetchImpl: vi.fn().mockRejectedValue(new Error('socket hang up')),
    })).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });

    // A successful fetch of non-image bytes still degrades to a value, via the sniff gate.
    const notAnImage = streamResponse([Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')], {
      headers: { 'content-type': 'image/svg+xml' },
    });
    expect(await fetchAndDecodeSpotlightImage('https://cdn.example/a.svg', {
      fetchImpl: vi.fn().mockResolvedValue(notAnImage),
    })).toMatchObject({ ok: false, code: 'IMAGE_TYPE_REJECTED' });
  });
});
