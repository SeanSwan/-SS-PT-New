/**
 * bind.mjs — the loopback refusal. INV9 / `AC8.1` / `T-U-10`.
 *
 * THE CONSOLE IS UNAUTHENTICATED BY DESIGN. It renders the operator's own briefs
 * and the brain's reasoning, with no login, no TLS, and no session. That is a
 * completely reasonable design for a local tool and a catastrophic one for a
 * reachable service — so the bind address is not a preference, it is a refusal.
 *
 * WHY `localhost` IS REJECTED, WHICH LOOKS WRONG AT FIRST. `localhost` is a NAME,
 * not an address: it resolves through the hosts file (and on some stacks through
 * NSS/DNS), so a machine whose hosts file maps it to `0.0.0.0` or a LAN address
 * would pass a naive `host === 'localhost'` check and then serve the console to
 * the network. The guard accepts literal loopback ADDRESSES only. A name that
 * USUALLY means loopback is exactly the kind of check that reads as a check and
 * isn't one.
 *
 * `0.0.0.0` is the dangerous value this exists to catch: it means "every
 * interface", and it is the default a developer reaches for when the port looks
 * busy.
 */

import { DEFAULT_PORT, LOOPBACK_HOST } from './paths.mjs';

/**
 * Literal loopback addresses, and nothing else.
 *
 * `::1` is included because it is the IPv6 loopback ADDRESS — the same guarantee
 * as `127.0.0.1`, expressed in the other family. The whole `127.0.0.0/8` block is
 * loopback on every platform Node supports, but only `127.0.0.1` is listed: a
 * wider range would be a claim about routing tables this module cannot verify.
 */
export const LOOPBACK_HOSTS = Object.freeze(['127.0.0.1', '::1']);

export function isLoopback(host) {
  return typeof host === 'string' && LOOPBACK_HOSTS.includes(host.trim());
}

/**
 * Refuse anything that is not a literal loopback address.
 *
 * Throws rather than returning a boolean on purpose: a guard whose failure mode
 * is a return value can be ignored by a caller that forgets to check, and this is
 * the one guard in Astra where being ignored is a network exposure.
 *
 * @param {string} host
 * @returns {string} the accepted host
 * @throws {Error} `E_NOT_LOOPBACK`
 */
export function assertLoopback(host) {
  if (isLoopback(host)) return host.trim();
  const err = new Error(
    `E_NOT_LOOPBACK: refusing to bind ${JSON.stringify(host ?? null)} — Astra serves `
    + `${LOOPBACK_HOSTS.join(' or ')} only. It has no authentication, so any other address `
    + 'would expose the operator\'s briefs and the brain\'s reasoning to the network.',
  );
  err.code = 'E_NOT_LOOPBACK';
  throw err;
}

/**
 * Resolve a bind address, or refuse.
 *
 * @param {{host?: string, port?: number}} [opts]
 * @returns {{host: string, port: number, url: string}}
 */
export function bindAddress(opts = {}) {
  const host = assertLoopback(opts.host ?? LOOPBACK_HOST);
  const port = opts.port ?? DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const err = new Error(`E_BAD_PORT: ${JSON.stringify(port)} is not a TCP port`);
    err.code = 'E_BAD_PORT';
    throw err;
  }
  // `::1` is bracketed in a URL; `127.0.0.1` is not.
  const literal = host.includes(':') ? `[${host}]` : host;
  return { host, port, url: `http://${literal}:${port}/` };
}
