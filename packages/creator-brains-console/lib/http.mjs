/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/http.mjs
 * PURPOSE: HTTP plumbing — the error envelope, body reading, and static file
 *          resolution. No routing knowledge lives here.
 * PART OF: Creator Brains Console (blueprint 05 §2)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THE ENVELOPE IS IN ONE PLACE. Blueprint 05 §2 promises that every failure
 * is `{error:{code,message}}` with the ENGINE'S OWN wording as `message`. If each
 * handler built its own error response, one of them would eventually leak a
 * stack trace and the contract would be a lie. There is exactly one function
 * that turns a thrown thing into bytes (`sendError`), and one function that maps
 * a code to a status (`statusFor`).
 *
 * WHY `readBody` HAS A CEILING. A loopback server with no body limit is a
 * self-inflicted denial of service: a runaway client can exhaust memory with one
 * request. 64 KB is orders of magnitude more than any route here needs (the
 * largest body is a creator reference).
 *
 * WHY STATIC RESOLUTION REFUSES TRAVERSAL. The static handler serves the web
 * build; the store sits beside the repo. Without a containment check,
 * `/../registry.json` reads the store through the file server. The check is
 * "the resolved target must be inside WEB_DIST", which is the only formulation
 * that survives symlinks and Windows path separators.
 *
 * @module creator-brains-console/lib/http
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname, resolve, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, CODE, LIMITS } from './errors.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The web build's output dir. Absent until slice S1 — handled, not assumed. */
export const WEB_DIST = join(HERE, '..', 'web', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

/** Map an ApiError's code to HTTP status (blueprint 05 §2). */
export function statusFor(code) {
  switch (code) {
    case CODE.VALIDATION: return 400;
    case CODE.STORE_DAMAGED:
    case CODE.RUN_LOCKED: return 409;
    case CODE.REFUSED: return 422;
    case CODE.NOT_FOUND: return 404;
    default: return 500;
  }
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    // The bridge is single-operator and local; caching a store view would let
    // the console show a stale roster after a write.
    'cache-control': 'no-store',
  });
  res.end(body);
}

/**
 * The ONLY place a thrown value becomes a response body.
 * An `ApiError` carries a code the client can branch on; anything else becomes a
 * generic 500 whose stack never travels.
 *
 * S1-H8: WRITING THE ERROR MUST NEVER ITSELF THROW. An uncaught throw from
 * inside a request handler becomes an `uncaughtException`, and Node's default
 * for that is to terminate the process — which is exactly how `GET //` killed
 * the bridge (the `new URL` throw escaped the handler). So the last line of
 * defence is built to be incapable of raising: if the response was already
 * partially written, `writeHead` raises `ERR_HTTP_HEADERS_SENT`, and that must
 * cost one connection rather than the whole bridge.
 */
export function sendError(res, err, log = null) {
  let status = 500;
  let payload;
  if (err instanceof ApiError) {
    status = statusFor(err.code);
    payload = { error: { code: err.code, message: err.message, ...err.extra } };
  } else {
    if (log) log(`bridge internal error: ${err?.stack || err}`);
    payload = { error: { code: 'INTERNAL', message: err?.message || 'unexpected bridge failure' } };
  }
  try {
    return sendJson(res, status, payload);
  } catch {
    try { res.destroy(); } catch { /* the socket is already gone */ }
    return undefined;
  }
}

/**
 * Read and parse a JSON body, bounded.
 *
 * S1-H10: THE RETURNED VALUE IS ALWAYS AN OBJECT. `JSON.parse` returns whatever
 * the bytes said, and a literal `null` is valid JSON — so `readBody` used to
 * return `null`, and the write routes then dereferenced `body.ref` /
 * `body.enabled` on it. That raised a TypeError INSIDE the handler, which the
 * catch turned into a 500 INTERNAL for what is plainly a client error: the
 * operator sees "unexpected bridge failure" for sending the four characters
 * `null`. `42`, `"x"`, `true` and `[1,2]` survived only by luck (reading a
 * property off them yields `undefined`, which the validators then refuse).
 *
 * The contract is enforced HERE rather than at each dereference site, because
 * this is the one function that owns "what a body may be" — a rule spread over
 * call sites is a rule the next route will forget.
 *
 * S1-H19 — MEASURED LIMITATION, ACCEPTED DELIBERATELY (round-5 pass 4). The
 * ceiling above is a MEMORY bound and it holds, but it is not a delivery
 * guarantee: the `throw` inside `for await` destroys the request stream, so if
 * the client is still writing when the limit trips, the kernel answers it with
 * RST and the 400 never arrives. Measured against a live bridge over raw
 * sockets: 65 537 B, 128 KB, 192 KB, 256 KB and 512 KB all answer a clean
 * `400 {"error":{"code":"VALIDATION","message":"request body too large"}}`, while
 * 1 MB and 4 MB give the client `ECONNRESET` with no response at all. The
 * threshold tracks the socket buffer, which is what identifies the mechanism.
 * The process always survives and keeps serving.
 *
 * NOT FIXED, and the reason is a trade rather than a shrug. Delivering the
 * envelope to a client mid-write requires DRAINING the remainder (measured: a
 * minimal server that drains up to a cap answers 400 at both 1 MB and 4 MB,
 * whereas responding early without draining still resets at 4 MB, and responding
 * then destroying resets at 1 MB). Draining means the bridge reads an arbitrary
 * volume from a hostile client and discards it — trading a real hardening
 * property for a better error message on a path the console cannot reach. The
 * UI's largest body is a creator reference. An up-front `content-length` check
 * was also measured and REJECTED: it only moves the threshold to 4 MB, leaving
 * the class intact, and it would put a second enforcement site beside this one,
 * contradicting the paragraph above. Recorded so the next seat does not
 * re-litigate it — and so nobody mistakes this for an oversight.
 */
export async function readBody(req, limit = LIMITS.BODY_MAX) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new ApiError(CODE.VALIDATION, 'request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  // A1-15 (2026-09-20): DECODE WITH FATAL VALIDATION.
  //
  // `toString('utf8')` substitutes U+FFFD for malformed bytes instead of
  // failing, so invalid UTF-8 reached JSON.parse — and the guarantee asserted in
  // `16` §17 ("replacement necessarily makes the JSON invalid") was never the
  // real one, because replacement INSIDE a quoted string leaves the syntax
  // perfectly valid. Measured on this tree: the bytes
  // `7b 22 72 65 66 22 3a 22 ff 22 7d` (`{"ref":"<0xff>"}`) decode to
  // `{"ref":"\uFFFD"}` and **JSON.parse succeeds**, so a malformed body became a
  // silently corrupted value rather than a refusal. A fatal decoder makes the
  // malformed case fail at the decode step, which is where it belongs.
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new ApiError(CODE.VALIDATION, 'request body is not valid UTF-8');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(CODE.VALIDATION, 'request body is not valid JSON');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ApiError(CODE.VALIDATION, 'request body must be a JSON object');
  }
  return parsed;
}

/**
 * DNS-REBINDING DEFENCE (added 2026-09-17 after HY4's P2 finding).
 *
 * The reason the bridge has no authentication is sound for READS: any local
 * process that can reach 127.0.0.1 can already read the store files directly, so
 * a token would add ceremony without adding protection.
 *
 * That argument does NOT cover WRITES, and HY4 was right to say so. A remote web
 * page can make Sean's own browser the attacker's client via DNS rebinding: the
 * page resolves its hostname to 127.0.0.1 *after* the initial load, then POSTs to
 * `/api/creators` from same-origin script. The browser sends it to the loopback
 * bridge — no CORS preflight is triggered for a simple request — and the bridge
 * would faithfully enable or disable creators. "A local process could already do
 * it" is irrelevant: the attacker is not a local process, it is remote content
 * using the browser as a proxy.
 *
 * The defence is the standard one and it is sufficient here: **the Host header
 * must name the loopback address.** A rebound request carries the attacker's
 * hostname in Host, so it is refused. This blocks the whole class without
 * inventing a token scheme, and it costs nothing on the legitimate path because
 * the launcher always navigates to `http://127.0.0.1:<port>`.
 *
 * Applied to ALL routes, not only writes. Reads leak the creator catalog and
 * coverage; there is no reason to serve those cross-origin either, and a
 * uniform rule is harder to regress than a rule applied to two handlers.
 */
export function hostAllowed(hostHeader, port) {
  if (typeof hostHeader !== 'string' || !hostHeader) return false;
  // Strip the port; IPv6 literals would arrive bracketed, which this bridge
  // never binds, so only host:port and bare host are accepted.
  const host = hostHeader.replace(/:\d+$/, '').toLowerCase();
  if (host === '127.0.0.1' || host === 'localhost' || host === '[::1]') {
    // When the caller knows the bound port, require it too — this closes the
    // case where another loopback service on a different port is targeted.
    if (typeof port !== 'number') return true;
    const claimed = Number((hostHeader.match(/:(\d+)$/) || [])[1]);
    // AN OMITTED PORT MEANS THE SCHEME DEFAULT, 80 (R4-03). `http://127.0.0.1/`
    // is the origin `http://127.0.0.1:80`, so a Host of `127.0.0.1` must be
    // compared against 80 rather than refused outright. `Number(undefined)` is
    // NaN, which is why the default is applied explicitly instead of left to
    // coercion. The rule only ever ADMITS when the bound port really is 80, so
    // the direction of the change is a corrected comparison, not a relaxation:
    // every other bound port still refuses a portless Host exactly as before.
    return (Number.isNaN(claimed) ? 80 : claimed) === port;
  }
  return false;
}

/**
 * Parse a request target into a URL, or throw a VALIDATION ApiError.
 *
 * S1-H8. `new URL(raw, base)` is NOT total: `//`, `///`, `//@`, `//:80`,
 * `http://`, `http:///` and `https://` all raise `TypeError ERR_INVALID_URL`,
 * because they are protocol-relative or scheme-only forms with no host. The
 * caller used to run this parse OUTSIDE its try block, so the throw escaped the
 * request handler — and Node turns an uncaught throw there into a process
 * exit. Measured 2026-09-18: `GET // HTTP/1.1` killed the bridge (exit code 1)
 * and the client saw only a reset connection.
 *
 * A malformed request target is a CLIENT error, so it is mapped to the
 * documented envelope (`05 §2`: VALIDATION → 400) rather than a 500. The
 * echoed target is truncated: it is attacker-controlled and unbounded.
 */
export function parseRequestUrl(rawUrl, base = `http://127.0.0.1`) {
  try {
    return new URL(rawUrl, base);
  } catch {
    throw new ApiError(CODE.VALIDATION, `unparseable request target: ${String(rawUrl).slice(0, 120)}`);
  }
}

/**
 * Resolve a URL path to a file inside WEB_DIST, or null.
 *
 * Containment is checked on the RESOLVED absolute path, not on the raw string —
 * string-prefix checks on the request URL are defeated by encodings and by
 * Windows separator handling. Anything that escapes resolves to null, so the
 * caller falls through to the status page rather than the filesystem.
 */
export function resolveStatic(urlPath, dist = WEB_DIST) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null; // malformed percent-encoding
  }
  const clean = normalize(decoded).replace(/^([.][.][/\\])+/, '');
  const base = resolve(dist);
  const target = resolve(join(base, clean === '/' || clean === '\\' ? 'index.html' : clean));

  if (target !== base && !target.startsWith(base + sep)) return null;
  if (!existsSync(target)) return null;
  return target;
}

export function contentTypeFor(file) {
  return MIME[extname(file)] || 'application/octet-stream';
}

export function readStatic(file) {
  return readFileSync(file);
}
