/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/write-gate.mjs
 * PURPOSE: The same-origin write gate — a pre-dispatch gate beside the Host
 *          check. Refuses browser-originated cross-site writes.
 * PART OF: Creator Brains Console (05 §4 trust boundary)
 * SLICE: S0 hardening (A1-09, Astra adjudication 2026-09-20)
 * ============================================================================
 *
 * THE DEFECT THIS CLOSES (A1-09). The packet treated "loopback + Host checking"
 * as the complete trust boundary. It is not. `hostAllowed` defends DNS
 * REBINDING — a remote page whose hostname resolves to 127.0.0.1 after load. It
 * does nothing about the simpler attack: a remote page that already knows the
 * bridge is on `127.0.0.1:<port>` and POSTs to it directly. The browser supplies
 * `Host: 127.0.0.1:<port>` itself, so the Host gate passes, and a
 * `Content-Type: text/plain` body is a CORS "simple request" that triggers no
 * preflight — so the write lands, and `POST /api/creators` / `PATCH` can change
 * which creators are fetched.
 *
 * THREE REQUIREMENTS:
 *
 * 1. A fixed custom header, on every write. Custom headers are never "simple",
 *    so this alone forces a preflight. It is the one requirement that applies
 *    uniformly to POST, PUT, PATCH and DELETE.
 * 2. `Content-Type: application/json` **whenever the request declares a body**.
 *    A form, or a `fetch` with a plain string body, cannot set this — so the
 *    request stops being simple. Kept in addition to (1) so the gate does not
 *    rest on one property; drop the header rule by accident and a hostile POST
 *    is still non-simple.
 * 3. `Origin`, when present, must name loopback. Browsers send `Origin` on every
 *    non-GET request, so a cross-site write is refused on the header itself.
 *    This is the only requirement that *refuses* rather than merely de-simplifies.
 *
 * WHY (2) IS SCOPED TO A DECLARED BODY. A bodyless `DELETE` has no natural media
 * type, and requiring one would make the gate unsatisfiable by a legitimate
 * client — a latent defect of exactly the kind this whole exercise hunts. The
 * header rule still applies to it, so it is not left unguarded.
 *
 * WHY `Origin` IS NOT *REQUIRED*. Demanding it would break every non-browser
 * client — curl, the e2e harness, a future CLI — for no gain. Such a client is
 * not a browser, so there is no cross-site browser attack to stop, and it has
 * already satisfied (1) and (2), which no cross-origin page can satisfy without
 * a preflight the bridge never approves.
 *
 * WHY THE ORIGIN MUST BE THE BRIDGE'S OWN ORIGIN, AND NOT MERELY LOOPBACK
 * (R2-05, Astra round 2, 2026-09-20). The first version accepted *any* loopback
 * origin, on any port. That is not "same-origin"; it is "same machine", and it
 * is the same defect the Host gate beside it had already been fixed for — see
 * the comment at `server.mjs:100`, which records that degrading to "any loopback
 * host" "silently weakened the DNS-rebinding defence". This gate then repeated
 * that mistake one round later, in the adjacent gate, which is exactly why the
 * two are now written to agree.
 *
 * The justification the first version gave was that a Vite dev server on :5173
 * is a legitimate local front-end and should be able to write. **That
 * justification does not survive contact with a browser, and it protected
 * nothing.** A write carries a custom header, so a cross-origin request triggers
 * a preflight; the bridge grants no CORS permission (see below), so the browser
 * blocks it before it is sent. So the dev server could never have written
 * through this gate. And it does not need to: `vite.config.ts` has no proxy, so
 * a dev-server write does not reach the bridge at all — it 404s against Vite.
 * The rule was refusing nobody legitimate while admitting every local origin.
 *
 * `LocalEngineAdapter.ts:46` defaults `baseUrl` to `window.location.origin` —
 * "the bridge serves the app" — so in the only supported configuration the
 * Origin IS the serving origin and exact equality holds. **A rule that only
 * refuses friends is not a guard**, and this one now refuses every origin that
 * is not this bridge: a hostile local page on :5173, a rebound page, and a
 * remote page are all refused, because none of them is served by this port.
 *
 * WHY `localhost` AND `127.0.0.1` ARE BOTH ACCEPTED AT THE SAME PORT. They
 * resolve to the same loopback socket on every platform this console runs on, so
 * a user who types `http://localhost:<port>` loads *our* page and the browser
 * sends that spelling as the Origin. Refusing it would break the app for a
 * spelling, which is the failure mode the old rule was invented to avoid — and
 * accepting it admits nothing, because no other process can serve that name on
 * the port the bridge holds. `[::1]` is deliberately NOT accepted: the bridge
 * binds `127.0.0.1` only (`server.mjs` constraint 2), so `[::1]:<port>` is a
 * different socket and therefore a different server.
 *
 * WHY A MISSING SERVING ORIGIN REFUSES RATHER THAN ALLOWS. The gate cannot
 * evaluate a rule whose right-hand side it does not have. Failing open there
 * would silently restore the defect for any future call site that forgot the
 * argument, so it fails closed with a message that names the misconfiguration —
 * a loud broken write, never a quiet hole.
 *
 * WHY THE HEADER IS NAMED `x-console-write` AND NOT AFTER THE PROJECT. The
 * client must send the same string, and the client lives under `web/src`, which
 * `web/src/test/no-engine-import.test.ts` scans for any quoted literal
 * containing `creator-brains` (pattern 1, T-W2). A header named
 * `x-creator-brains-console` would therefore fail the boundary guard the moment
 * the adapter sent it — forcing either an exemption in that guard or a
 * string-splicing evasion. Both are worse than picking a neutral name, so the
 * name is neutral. `bridge.writegate.test.mjs` asserts the two sides agree.
 *
 * NO CORS PERMISSION IS EVER GRANTED. Nothing here, and nothing in `http.mjs`,
 * emits `Access-Control-Allow-Origin` — so a preflight fails and the browser
 * blocks the request before it is sent. That is what lets this gate stay simple:
 * it does not have to recognise every hostile shape, only to stop the request
 * being *simple* in the first place.
 *
 * READS ARE DELIBERATELY UNAFFECTED. `hostAllowed` already refuses cross-origin
 * reads by host, a read cannot mutate consent state, and applying a media-type
 * rule to GET would break the address bar.
 *
 * @module creator-brains-console/lib/write-gate
 */

/** Methods that can mutate. Everything else is a read, for gate purposes. */
export const WRITE_METHODS = Object.freeze(new Set(['POST', 'PUT', 'PATCH', 'DELETE']));

/** The fixed custom header a write client must send. See the name note above. */
export const REQUIRED_HEADER = 'x-console-write';

/** The only media type accepted on a write that carries a body. */
export const REQUIRED_MEDIA_TYPE = 'application/json';

/** The only scheme this bridge serves. No TLS, so an `https:` Origin is never ours. */
const SCHEME = 'http:';

/**
 * Loopback names that reach the SAME socket as the bridge.
 *
 * The key is the host the bridge actually serves as; the value is every spelling
 * that resolves to it. See the `[::1]` note in the header — it is absent on
 * purpose, because the bridge binds `127.0.0.1` only.
 */
const SAME_SOCKET = Object.freeze({
  '127.0.0.1': Object.freeze(['127.0.0.1', 'localhost']),
  localhost: Object.freeze(['127.0.0.1', 'localhost']),
});

/**
 * Is this `Origin` the bridge's own origin?
 *
 * Two independent requirements, and both are needed: the host must be a spelling
 * of the socket the bridge holds, and the port must be the port it holds. The
 * port is the load-bearing half — a hostile local page on another port has a
 * loopback host and a different port, which is precisely the case the first
 * version admitted.
 *
 * TOTAL BY CONSTRUCTION. `new URL` throws on a malformed origin, and this runs
 * inside the request path, where an exception is a dead bridge — so every parse
 * is guarded and a malformed Origin is a refusal, never a throw.
 *
 * @param origin        the request's `Origin` header, if any
 * @param servingOrigin the bridge's own origin, `http://<host>:<boundPort>`
 */
export function originAllowed(origin, servingOrigin) {
  if (typeof origin !== 'string' || origin === '') return false;
  if (typeof servingOrigin !== 'string' || servingOrigin === '') return false;

  let claimed;
  let serving;
  try {
    claimed = new URL(origin);
    serving = new URL(servingOrigin);
  } catch {
    return false; // a malformed origin is refused, not thrown on — see above
  }

  if (claimed.protocol !== SCHEME || serving.protocol !== SCHEME) return false;
  // An origin with no explicit port is the scheme default (80), which is not the
  // bridge's port unless it happens to have bound 80. Comparing the normalised
  // `port` handles that without a special case.
  if (claimed.port !== serving.port) return false;

  const spellings = SAME_SOCKET[serving.hostname];
  return Array.isArray(spellings) && spellings.includes(claimed.hostname);
}

/**
 * Does the request declare a body? `content-length: 0` is not a body; a chunked
 * request is. `Number(undefined)` is `NaN`, so an absent length falls through.
 */
function declaresBody(headers) {
  const len = Number(headers['content-length']);
  if (Number.isFinite(len) && len > 0) return true;
  return headers['transfer-encoding'] !== undefined;
}

/**
 * Evaluate the gate.
 *
 * Returns `null` when the request may proceed, or `{code, message}` to answer
 * with a 403 — the same shape the Host gate uses, so the two security gates read
 * alike at the call site.
 *
 * @param req           the incoming request
 * @param servingOrigin the bridge's own origin, `http://<host>:<boundPort>`.
 *                      REQUIRED: omitting it refuses any request that carries an
 *                      `Origin`, rather than quietly allowing it (R2-05).
 */
export function writeGateFailure(req, servingOrigin) {
  if (!WRITE_METHODS.has(req.method)) return null;

  const headers = req.headers;

  if (headers[REQUIRED_HEADER] === undefined) {
    return {
      code: 'FORBIDDEN_WRITE',
      message: `writes must carry the ${REQUIRED_HEADER} header`,
    };
  }

  const media = String(headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (declaresBody(headers) && media !== REQUIRED_MEDIA_TYPE) {
    return {
      code: 'FORBIDDEN_WRITE',
      message: `a write body must be ${REQUIRED_MEDIA_TYPE}; '${media || '(absent)'}' is refused`,
    };
  }

  const origin = headers.origin;
  if (origin === undefined) return null; // a non-browser client — see the header

  if (typeof servingOrigin !== 'string' || servingOrigin === '') {
    return {
      code: 'FORBIDDEN_WRITE',
      message: 'the bridge could not evaluate the Origin rule: no serving origin was supplied',
    };
  }
  if (!originAllowed(origin, servingOrigin)) {
    return {
      code: 'FORBIDDEN_WRITE',
      message: `cross-origin write from '${String(origin).slice(0, 120)}' is refused; `
        + `this bridge serves '${servingOrigin.slice(0, 120)}'`,
    };
  }

  return null;
}
