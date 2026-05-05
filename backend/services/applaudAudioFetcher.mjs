/**
 * applaudAudioFetcher.mjs
 * ========================
 * URL allowlist validation + bounded HTTP fetch for Applaud-served audio.
 *
 * Phase 5 Slice 5.3 (2026-05-04). Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §3.3 V1.4 + §4.2 step 8 + §5.2.
 *
 * Codex CR-4 requirements (no compromises):
 *   1. Parse via `new URL()` — reject on parse fail
 *   2. EXACT hostname match against allowed base — no prefix/suffix/wildcard
 *   3. EXACT port match
 *   4. HTTPS-only (`https:`)
 *   5. No credentials in URL (reject `https://allowed@evil.com`)
 *   6. DNS resolution — reject if ANY resolved address is private/loopback/
 *      link-local/multicast (defeats DNS rebinding)
 *   7. `redirect: 'error'` on fetch — no redirect-following
 *   8. Content-Length cap (declared) + streamed-bytes cap (in case header lies)
 *   9. 30-second fetch timeout
 *
 * Public API:
 *   validateAudioUrl(rawUrl, allowedBaseUrl) -> URL | throws AudioUrlError
 *   fetchAudioWithCaps(audioUrl, declaredSizeBytes, opts) -> {ok, bytes, mimetype} | {error, errorCode, errorStatus, message}
 *   isPrivateOrLocalAddress(ip) -> bool   (exported for tests)
 *
 * Error classes:
 *   AudioUrlError(code) — URL validation failures
 *   AudioFetchError(code, status) — HTTP fetch failures
 */
import { promises as dns } from 'node:dns';

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB — matches PLAUD_MAX_FILE_BYTES
const DEFAULT_TIMEOUT_MS = 30_000;          // 30s per §5.2

export class AudioUrlError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'AudioUrlError';
    this.code = code;
  }
}

export class AudioFetchError extends Error {
  constructor(code, status, message) {
    super(message || code);
    this.name = 'AudioFetchError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Validate `rawUrl` against `allowedBaseUrl`. Throws AudioUrlError on any
 * violation; returns the parsed URL on success.
 *
 * Codex CR-4: "exact match, HTTPS, no creds, DNS-resolved private-IP rejection".
 * Q2 (regex vs exact) is CLOSED — exact only. No wildcards, no patterns.
 */
export async function validateAudioUrl(rawUrl, allowedBaseUrl) {
  if (!allowedBaseUrl || typeof allowedBaseUrl !== 'string') {
    // §13.2 startup validation should prevent this in production, but
    // fail-closed at runtime as defense in depth.
    throw new AudioUrlError('AUDIO_URL_ALLOWLIST_UNCONFIGURED');
  }

  let incoming;
  try {
    incoming = new URL(rawUrl);
  } catch {
    throw new AudioUrlError('AUDIO_URL_MALFORMED');
  }

  let allowed;
  try {
    allowed = new URL(allowedBaseUrl);
  } catch {
    throw new AudioUrlError('AUDIO_URL_ALLOWLIST_UNCONFIGURED');
  }

  // 1. HTTPS only — defeats `http://allowed.com`, `gopher://`, `file://`, `data:`
  if (incoming.protocol !== 'https:') {
    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', 'protocol must be https');
  }

  // 2. No credentials in URL — defeats `https://allowed@evil.com` where
  //    Node's URL parser puts evil.com in hostname but URLs with @ embed
  //    credentials before the authority.
  if (incoming.username || incoming.password) {
    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', 'credentials in URL not allowed');
  }

  // 3. EXACT hostname match (Codex CR-4 — no prefix/suffix tricks)
  if (incoming.hostname !== allowed.hostname) {
    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `hostname ${incoming.hostname} != allowed ${allowed.hostname}`);
  }

  // 4. EXACT port match. Empty port string == default for protocol;
  //    URL.port is '' when default, so empty == empty matches.
  if (incoming.port !== allowed.port) {
    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `port ${incoming.port || '(default)'} != allowed ${allowed.port || '(default)'}`);
  }

  // 5. DNS resolution check — defeats DNS rebinding where allowed.com
  //    resolves to 127.0.0.1 / 169.254.169.254 / 10.0.0.1 / etc.
  let addrs;
  try {
    addrs = await dns.lookup(incoming.hostname, { all: true });
  } catch (err) {
    throw new AudioUrlError('AUDIO_URL_DNS_FAILED', `DNS lookup failed: ${err.message}`);
  }
  if (!Array.isArray(addrs) || addrs.length === 0) {
    throw new AudioUrlError('AUDIO_URL_DNS_FAILED', 'DNS lookup returned no addresses');
  }
  for (const { address } of addrs) {
    if (isPrivateOrLocalAddress(address)) {
      throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `host resolves to private/local address ${address}`);
    }
  }

  return incoming;
}

/**
 * Fetch audio bytes with timeout, content-length cap, streamed-bytes cap,
 * and redirect: 'error' (no redirect following — defeats SSRF redirect chains).
 *
 * Returns {ok: true, bytes, mimetype} on success.
 * Returns {error: true, errorCode, errorStatus, message} on any failure
 * — never throws (controller composes it into a JSON error response).
 */
export async function fetchAudioWithCaps(audioUrl, declaredSizeBytes, opts = {}) {
  const {
    allowedBaseUrl = process.env.PLAUD_APPLAUD_MEDIA_BASE_URL,
    maxBytes = DEFAULT_MAX_BYTES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
  } = opts;

  // Pre-validate URL
  let validatedUrl;
  try {
    validatedUrl = await validateAudioUrl(audioUrl, allowedBaseUrl);
  } catch (err) {
    if (err instanceof AudioUrlError) {
      const status = err.code === 'AUDIO_URL_ALLOWLIST_UNCONFIGURED'
        || err.code === 'AUDIO_URL_DNS_FAILED'
        ? 500
        : 400;
      return { error: true, errorCode: err.code, errorStatus: status, message: err.message };
    }
    return { error: true, errorCode: 'AUDIO_URL_VALIDATION_INTERNAL', errorStatus: 500, message: err.message };
  }

  // Pre-check declared Content-Length (saves a fetch round-trip on obvious bigs)
  const declared = Number(declaredSizeBytes);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return {
      error: true,
      errorCode: 'AUDIO_TOO_LARGE',
      errorStatus: 413,
      message: `declared size ${declared} > cap ${maxBytes}`,
    };
  }

  // Issue the fetch with redirect:'error' + timeout
  let response;
  try {
    response = await fetchImpl(validatedUrl.toString(), {
      method: 'GET',
      redirect: 'error',                          // CR-4: no redirect chains
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // Node's fetch throws on redirect when redirect:'error' is set
    if (err && (err.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS'
        || err.code === 'UND_ERR_REDIRECT'
        || /redirect/i.test(err.message || ''))) {
      return {
        error: true,
        errorCode: 'AUDIO_URL_REDIRECT_REJECTED',
        errorStatus: 400,
        message: err.message || 'redirect rejected',
      };
    }
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError'
        || /timeout|aborted/i.test(err.message || ''))) {
      return {
        error: true,
        errorCode: 'AUDIO_FETCH_TIMEOUT',
        errorStatus: 500,
        message: 'audio fetch timed out',
      };
    }
    return {
      error: true,
      errorCode: 'AUDIO_FETCH_FAILED',
      errorStatus: 500,
      message: err.message || 'audio fetch failed',
    };
  }

  if (!response.ok) {
    return {
      error: true,
      errorCode: 'AUDIO_FETCH_FAILED',
      errorStatus: 500,
      message: `upstream returned ${response.status}`,
    };
  }

  // Content-Length header check — abort before streaming if too big.
  // This is OPTIONAL because Applaud may not set it; the streamed cap
  // below is the authoritative gate.
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      error: true,
      errorCode: 'AUDIO_TOO_LARGE',
      errorStatus: 413,
      message: `Content-Length ${contentLength} > cap ${maxBytes}`,
    };
  }

  // Streamed read with size cap. Aborts mid-stream if cumulative bytes
  // exceed cap — defeats lying Content-Length headers.
  const chunks = [];
  let totalBytes = 0;
  try {
    if (!response.body) {
      return {
        error: true,
        errorCode: 'AUDIO_FETCH_FAILED',
        errorStatus: 500,
        message: 'response has no body',
      };
    }
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        // Cancel the upstream stream to release the socket
        try { await reader.cancel('size cap exceeded'); } catch { /* ignore */ }
        return {
          error: true,
          errorCode: 'AUDIO_TOO_LARGE',
          errorStatus: 413,
          message: `streamed bytes ${totalBytes} > cap ${maxBytes}`,
        };
      }
      chunks.push(chunk);
    }
  } catch (err) {
    return {
      error: true,
      errorCode: 'AUDIO_FETCH_FAILED',
      errorStatus: 500,
      message: `stream read failed: ${err.message}`,
    };
  }

  return {
    ok: true,
    bytes: Buffer.concat(chunks),
    mimetype: response.headers.get('content-type') || 'application/octet-stream',
  };
}

/**
 * Reject any address that's NOT publicly routable.
 *
 * Covers IPv4 + IPv6:
 *   - 127.0.0.0/8       loopback
 *   - 10.0.0.0/8        RFC1918 private
 *   - 172.16.0.0/12     RFC1918 private
 *   - 192.168.0.0/16    RFC1918 private
 *   - 169.254.0.0/16    link-local
 *   - 100.64.0.0/10     CGNAT (carrier-grade NAT)
 *   - 224.0.0.0/4       multicast (224.0.0.0 - 239.255.255.255)
 *   - 0.0.0.0/8         "this network"
 *   - 240.0.0.0/4       reserved (240.0.0.0 - 255.255.255.255 incl broadcast)
 *   - ::1               IPv6 loopback
 *   - fc00::/7          IPv6 ULA
 *   - fe80::/10         IPv6 link-local
 *   - ff00::/8          IPv6 multicast
 *
 * Defaults to "private" on unknown / un-parseable input (fail-closed).
 */
export function isPrivateOrLocalAddress(ip) {
  if (typeof ip !== 'string' || ip.length === 0) return true;

  // IPv6
  if (ip.includes(':')) {
    if (ip === '::1' || ip === '::') return true;
    if (/^[fF][cCdD]/.test(ip)) return true;            // fc00::/7 ULA
    if (/^[fF][eE]8/.test(ip)) return true;             // fe80::/10 link-local
    if (/^[fF][fF]/.test(ip)) return true;              // ff00::/8 multicast
    // IPv4-mapped IPv6 (::ffff:1.2.3.4) — extract and recurse
    const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (v4mapped) return isPrivateOrLocalAddress(v4mapped[1]);
    return false; // public IPv6
  }

  // IPv4
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return true; // can't parse → fail closed
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0) return true;                              // 0.0.0.0/8
  if (a === 10) return true;                             // 10.0.0.0/8
  if (a === 127) return true;                            // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;               // 169.254.0.0/16 link-local
  if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16.0.0/12
  if (a === 192 && b === 168) return true;               // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true;     // 100.64.0.0/10 CGNAT
  if (a >= 224 && a <= 239) return true;                 // multicast
  if (a >= 240) return true;                             // reserved + broadcast
  return false;                                          // public IPv4
}
