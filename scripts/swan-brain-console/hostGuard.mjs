/**
 * hostGuard — the console's Host-header allowlist.
 * @module scripts/swan-brain-console/hostGuard
 *
 * WHY THIS IS ITS OWN MODULE
 * This predicate is the console's entire defence against DNS rebinding, and it is the one
 * check whose whole value is being unskippable. It lived inline in the request handler, where
 * the only way to exercise it was to open a socket — so the malformed-authority cases below
 * were never exercised at all. Separated, the decision is a pure function with its own suite,
 * and `server-contract.test.mjs` keeps proving the handler genuinely calls it FIRST.
 *
 * THE ROUND-12 FINDING (Astra F21, [low]). The predicate used to be
 *
 *     ALLOWED_HOSTS.some((h) => hostHeader === h || hostHeader.startsWith(`${h}:`))
 *
 * and `startsWith(`${h}:`)` accepts ANY text after the colon: `Host: localhost:bad-port`
 * returned 200. Astra graded this explicitly **not** a reachable browser bypass — a browser
 * cannot emit that authority from a normal URL — but the guard's PREDICATE was broader than
 * its NAME, which is the defect class this whole round is about. A check named "host
 * allowlist" has to compare a host, not a prefix.
 *
 * WHAT IS AND IS NOT ACCEPTED
 *   localhost · 127.0.0.1 · [::1]              the three bindable authorities
 *   localhost:4599 · [::1]:4599                the same, with an optional numeric port
 *   localhost:bad-port · localhost: · localhost:0
 *   localhost:99999 · "localhost:80 " · 127.0.0.1.evil.com · [::1        all refused
 *
 * The port, when present, must be digits only and in 1–65535. Port 0 is refused because it is
 * not a destination, and the 5-digit cap keeps `Number()` from ever seeing anything exotic.
 *
 * NO DEPENDENCIES. `server.mjs` imports this; nothing here reads a file, a clock or a global.
 */

/** The authorities this server answers to. A rebound request carries the attacker's. */
export const ALLOWED_HOSTS = Object.freeze(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Is this `Host` header value one this server answers to?
 *
 * Pure, so the malformed cases can be asserted directly rather than through a socket — the
 * reason none of them were covered before. `server-contract.test.mjs` still proves the
 * handler calls it before any route work.
 */
export function hostAllowed(hostHeader) {
  const raw = String(hostHeader ?? '');
  if (raw === '') return false;

  let host = raw;
  let port = null;

  if (raw.startsWith('[')) {
    /*
     * An IPv6 literal is bracketed, and the brackets are PART of the host: `[::1]`. Splitting
     * on the first colon would yield `[`, so the closing bracket is located first and only
     * what follows it may be a port. An unterminated bracket is refused rather than repaired.
     */
    const close = raw.indexOf(']');
    if (close === -1) return false;
    host = raw.slice(0, close + 1);
    const rest = raw.slice(close + 1);
    if (rest !== '') {
      if (!rest.startsWith(':')) return false;
      port = rest.slice(1);
    }
  } else {
    const colon = raw.indexOf(':');
    if (colon !== -1) {
      host = raw.slice(0, colon);
      port = raw.slice(colon + 1);
    }
  }

  if (!ALLOWED_HOSTS.includes(host)) return false;
  if (port === null) return true;

  // Digits only — this rejects `bad-port`, `-1`, `80 `, `+80` and `8.0` in one predicate.
  if (!/^\d{1,5}$/.test(port)) return false;
  const n = Number(port);
  return n >= 1 && n <= 65535;
}
