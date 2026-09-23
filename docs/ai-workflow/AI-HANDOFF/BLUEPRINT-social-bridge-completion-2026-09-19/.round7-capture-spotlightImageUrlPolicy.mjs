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
 *
 * THE PREFIX PIN (2026-09-21). The first version of this module resolved, validated, and then
 * THREW THE ADDRESSES AWAY — so the later `fetch()` re-resolved the same name independently and a
 * name that flipped between the two lookups reached a private address anyway (DNS-rebinding TOCTOU).
 * `resolveAndValidate` now RETURNS the validated addresses, and `createPinnedDispatcher` turns them
 * into an `undici.Agent` whose `connect.lookup` answers from that fixed set. The socket can only go
 * where the check looked. See the pin note further down for the honest residual.
 */
import { promises as dns } from 'node:dns';
import net from 'node:net';
import { Agent } from 'undici';
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
export async function validateSpotlightImageUrl(rawUrl, opts) {
  const { url } = await resolveAndValidate(rawUrl, opts);
  return url;
}

/**
 * The full admission result: the parsed URL AND the addresses it was admitted on.
 *
 * This exists as a separate export because the two facts travel together — a caller that validates
 * but does not pin has only a check, not a control. `validateSpotlightImageUrl` is kept as the
 * URL-only front door so the twelve existing call sites and the re-export in
 * `spotlightImageFetch.mjs` are untouched; the fetch path calls THIS one.
 *
 * @param {string} rawUrl
 * @param {{ dnsTimeoutMs?: number }} [opts]
 * @returns {Promise<{ url: URL, addrs: Array<{ address: string, family: number }> }>}
 * @throws {SpotlightImageError}
 */
export async function resolveAndValidate(rawUrl, { dnsTimeoutMs = DNS_LOOKUP_TIMEOUT_MS } = {}) {
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

  // An IP-literal host (`https://10.0.0.1/`) has no name to resolve, and `dns.lookup` on a literal
  // returns the literal — so it is validated here directly and pinned as itself. Without this the
  // literal case would take the lookup path and depend on resolver behaviour for a value that was
  // never a name.
  const literalFamily = net.isIP(incoming.hostname);
  if (literalFamily) {
    if (isPrivateOrLocalAddress(incoming.hostname)) {
      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host is a private/local address ${incoming.hostname}`);
    }
    return { url: incoming, addrs: [{ address: incoming.hostname, family: literalFamily }] };
  }

  // Resolve first, then reject. A name that resolves to 127.0.0.1 / 169.254.169.254 / 10.x
  // is refused before any socket is opened, which closes direct internal targeting.
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

  return { url: incoming, addrs };
}

/**
 * The `connect.lookup` hook that answers from a fixed address set, exported so its contract can
 * be tested directly rather than by reaching into `undici`'s internals.
 *
 * The signature is `net`'s: `lookup(hostname, options, callback)`. Two answer shapes exist
 * because `net` calls it both ways — `{ all: true }` expects an array of `{address, family}`,
 * otherwise a bare address plus a separate family argument. Answering only one shape would make
 * the pin work for one caller and silently fall through for the other.
 *
 * `hostname` is deliberately ignored. The whole point is that the name carries no authority at
 * this layer — the decision was made upstream, and this hook has no second opinion to offer.
 *
 * @param {Array<{ address: string, family: number }>} addrs
 * @returns {(hostname: string, options: object, callback: Function) => void}
 */
export function createPinnedLookup(addrs) {
  const pinned = addrs.map(({ address, family }) => ({ address, family }));
  return (_hostname, options, callback) => {
    if (options?.all) return callback(null, pinned);
    const first = pinned[0];
    return callback(null, first.address, first.family);
  };
}

/**
 * Turn a validated address set into a dispatcher that can ONLY connect to that set.
 *
 * WHY. Validating and then calling a plain `fetch()` leaves a TOCTOU window: `fetch` resolves the
 * hostname again, independently, so a name that was public at check time can answer with a private
 * address at connect time. Pinning the answer inside `connect.lookup` closes the window at the
 * layer that actually opens the socket — the connection is handed the addresses the check approved
 * and has no second opinion available to it.
 *
 * THE HONEST RESIDUAL. This pins the CONNECT for the host we validated. It does not, by itself,
 * cover a `Location:` redirect to a different host — that is handled one layer up by
 * `redirect: 'error'` in `spotlightImageFetch.mjs`, which refuses to follow any redirect at all.
 * The two controls are complementary: this one makes the first hop honest, that one prevents a
 * second hop from existing. Neither is a defence for a caller that ignores it.
 *
 * The agent is a live socket pool, so the CALLER MUST `close()` it. `close()` is on the returned
 * object (it is a real `Agent`), and closing drains idle sockets and lets the event loop exit.
 *
 * @param {Array<{ address: string, family: number }>} addrs validated addresses
 * @returns {Agent} a dispatcher pinned to `addrs`
 */
export function createPinnedDispatcher(addrs) {
  if (!Array.isArray(addrs) || addrs.length === 0) {
    // Fail closed. A dispatcher with no addresses would fall through to the system resolver, which
    // is precisely the behaviour this function exists to prevent.
    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'cannot pin an empty address set');
  }

  // `connect.lookup` is the same hook `net`/`tls` expose: it is asked to resolve the hostname
  // immediately before the socket is opened, and its answer is used verbatim. Answering from the
  // validated set means no resolver is consulted on this connection at all.
  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
}
