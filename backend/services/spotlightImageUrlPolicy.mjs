/**
 * spotlightImageUrlPolicy.mjs
 * ===========================
 * URL ADMISSION for the SwanGuard → SwanStudios Spotlight image path.
 *
 * WHY THIS FILE EXISTS. Split out of `spotlightImageFetch.mjs` on 2026-09-20, when the D8 / R2-03
 * hardening (a bounded DNS lookup) pushed that file to 320 lines against `06-bans.md` #50 — "no
 * source file reaches 300 lines". The seam is **admission vs transport**: this module decides
 * whether a URL may be fetched at all; `spotlightImageFetch.mjs` performs the fetch and the decode.
 * Both exports are re-exported from `spotlightImageFetch.mjs`, so no existing importer changed.
 *
 * WHAT IS DELIBERATELY DIFFERENT FROM THE PLAUD AUDIO PRECEDENT. `applaudAudioFetcher.mjs` can
 * demand an EXACT hostname match because it only ever fetches one vendor. A Spotlight image URL is
 * chosen by the curator in SwanGuard and points at an arbitrary publisher, so an exact-host
 * allowlist is not available. The controls here are therefore the ones that survive an arbitrary
 * host: HTTPS only, no embedded credentials, and DNS-resolved private-range rejection that fails
 * closed and checks EVERY resolved address rather than the first.
 *
 * The private-range table is IMPORTED, never re-implemented — two copies of that table is the
 * failure mode, not the fix.
 */
import { promises as dns } from 'node:dns';
import { isPrivateOrLocalAddress } from './applaudAudioFetcher.mjs';

export class SpotlightImageError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'SpotlightImageError';
    this.code = code;
  }
}

/**
 * Budget for the pre-flight DNS lookup, SEPARATE from `IMAGE_FETCH_TIMEOUT_MS` in the fetch module.
 *
 * The fetch timeout is created as part of the `fetch()` call, and the lookup happens BEFORE that
 * call — so resolver time sat entirely outside the budget it appeared to bound. A host with a slow
 * or hanging resolver held the request open indefinitely (hostile review D8 / R2-03). Bounded here
 * instead, with its own code so "the resolver hung" is distinguishable from "the name does not
 * resolve".
 */
export const DNS_LOOKUP_TIMEOUT_MS = 3_000;

/**
 * `dns.lookup` accepts no AbortSignal, so the lookup is bounded by racing it against a timer.
 * The timer is cleared in `finally`, so a fast lookup leaves no pending handle behind — and a
 * timer that outlived its race would keep the process alive for no reason.
 */
const lookupWithTimeout = async (hostname, ms) => {
  let timer;
  try {
    return await Promise.race([
      dns.lookup(hostname, { all: true }),
      new Promise((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new SpotlightImageError('IMAGE_URL_DNS_TIMEOUT', `DNS lookup exceeded ${ms}ms`)),
          ms
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Validate a curator-supplied image URL.
 * HTTPS only; no embedded credentials; every resolved address must be publicly routable.
 *
 * `dnsTimeoutMs` is injectable so the bound can be tested without waiting the real budget out.
 * It defaults to the production value, so every existing caller is unaffected.
 *
 * @param {string} rawUrl
 * @param {{ dnsTimeoutMs?: number }} [opts]
 * @returns {Promise<URL>} the parsed URL
 * @throws {SpotlightImageError}
 */
export async function validateSpotlightImageUrl(rawUrl, { dnsTimeoutMs = DNS_LOOKUP_TIMEOUT_MS } = {}) {
  let incoming;
  try {
    incoming = new URL(String(rawUrl));
  } catch {
    throw new SpotlightImageError('IMAGE_URL_MALFORMED', 'not a parseable URL');
  }

  // HTTPS only. `http:` was previously accepted, which allowed plaintext internal probes.
  if (incoming.protocol !== 'https:') {
    throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `protocol must be https, got ${incoming.protocol}`);
  }

  // `https://allowed@evil.com` — the userinfo section is not part of the host, so a
  // check that only inspects hostname would read this as evil.com with credentials.
  if (incoming.username || incoming.password) {
    throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', 'credentials in URL not allowed');
  }

  // Resolve first, then reject. A name that resolves to 127.0.0.1 / 169.254.169.254 / 10.x
  // is refused before any socket is opened, which closes direct internal targeting.
  //
  // NOTE — this is a check-time validation only, NOT a complete DNS-rebinding defence:
  // the fetch() below re-resolves the hostname, so a name that flips to a private address
  // between this lookup and the fetch would still be reached (TOCTOU). That residual gap is
  // accepted because every caller of this path is gated behind a valid HMAC signature — and the
  // HMAC authenticates the SENDER, not the remote image server it names. Documented as an open
  // residual risk in `04-build-order.md#rehostImage` rather than claimed as closed
  // (hostile review D4 / F08).
  let addrs;
  try {
    addrs = await lookupWithTimeout(incoming.hostname, dnsTimeoutMs);
  } catch (err) {
    // A timeout keeps its own code: "the resolver hung" and "the name does not resolve" are
    // different operational facts, and collapsing them would hide a hanging resolver.
    if (err?.code === 'IMAGE_URL_DNS_TIMEOUT') throw err;
    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', `DNS lookup failed: ${err.message}`);
  }
  if (!Array.isArray(addrs) || addrs.length === 0) {
    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'DNS lookup returned no addresses');
  }
  for (const { address } of addrs) {
    if (isPrivateOrLocalAddress(address)) {
      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host resolves to private/local address ${address}`);
    }
  }

  return incoming;
}
