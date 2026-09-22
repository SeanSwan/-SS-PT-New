/**
 * http.mjs — the HTTP primitives. Four functions, no routing, no state.
 *
 * Split out of `server.mjs` for rule 4, and the seam is real: nothing here knows about
 * jobs, quotes, providers or money. It knows about a bearer header, a byte limit, and a
 * JSON response envelope. `server.mjs` composes these; a test can exercise them
 * directly without a store or a GPU.
 */

import { timingSafeEqual } from 'node:crypto';

/** The request-body ceiling. A generation request is a prompt and a few enums. */
export const MAX_BODY_BYTES = 256 * 1024;

/**
 * Constant-time string comparison.
 *
 * Length is compared out of band because `timingSafeEqual` THROWS on a length
 * mismatch — and a throw inside the auth check is an unhandled rejection, not a 401.
 */
export function safeEqual(a, b) {
  // TWO ABSENT VALUES ARE NOT A MATCH. `Buffer.from(String(undefined))` is the
  // nine-character string "undefined" on both sides, so `safeEqual(undefined, undefined)`
  // was TRUE — and `(null, null)` and `("", "")` with it. "Neither side supplied a value"
  // read as "the values agree". Unreachable through `authorized` today because that
  // function validates `token` first, which is exactly the reasoning the guard below
  // already gives: a guard that only holds because of a caller's precondition is not a
  // guard. `safeEqual` is exported, so it does not get to rely on one.
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * `Authorization: Bearer <token>`, scheme case-insensitive per RFC 7235.
 *
 * Surrounding whitespace is trimmed, which is ordinary OWS handling and is recorded
 * rather than treated as a hole: trimming can only ever make a CORRECT token match,
 * never a wrong one, because the comparison below is still constant-time with a length
 * check. A hostile probe asserted 401 here and was wrong about the code.
 */
export function authorized(req, token) {
  // A configured token that is not a non-empty string is NOT a token, and it must fail
  // closed. `safeEqual` stringifies both sides, so an `undefined` token becomes the
  // nine-character string "undefined" — and a caller who sends exactly
  // `Authorization: Bearer undefined` then matches it. An authentication bypass wearing
  // the costume of a type coercion. Unreachable through `server.mjs`, which refuses to
  // start without a 16+ character token; fixed here because this helper is exported and
  // a guard that only holds because of a caller's precondition is not a guard.
  if (typeof token !== 'string' || token.length === 0) return false;
  // THE SAME PRINCIPLE, APPLIED TO THE REQUEST. `req.headers.authorization` threw a
  // TypeError when `req.headers` was absent, and an auth check that throws is not a
  // refusal — it is an exception, which `server.mjs` answers with a 500 and a stderr line
  // instead of a 401. "I cannot tell" and "the gateway broke" are different answers and
  // must not share a status. A request that carries no headers presented no credential.
  if (!req || typeof req.headers !== 'object' || req.headers === null) return false;
  const m = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return Boolean(m) && safeEqual(m[1].trim(), token);
}

/**
 * Read and parse a JSON body, refusing anything over the cap.
 *
 * ONCE OVER THE LIMIT WE STOP BUFFERING BUT KEEP DRAINING.
 *
 * This used to call `req.destroy()` the moment the cap was crossed, and that made the
 * 413 UNREACHABLE: destroying the socket resets the connection while the client's body
 * write is still in flight, so `fetch` threw a socket error and the caller never saw the
 * status at all. The limit worked; the refusal could not be delivered. Found by sending
 * a 300 KB body from the hostile probe — the function looks correct on the page.
 *
 * Draining costs nothing because the chunks are discarded, so memory stays bounded at
 * the cap no matter how much the client sends.
 */
export function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    let done = false;
    const chunks = [];
    // Settle EXACTLY ONCE, whichever event gets there first.
    const finish = (fn, arg) => { if (done) return; done = true; fn(arg); };

    // A client that promises 1 MB, sends 10 bytes and resets the socket never reaches
    // 'end' and never emits 'error' — so without this the promise stayed PENDING
    // forever, and the `await readBody(req)` in the request handler never returned. The
    // handler, its request and its response were retained for the life of the process.
    // Abort N requests and the gateway leaks N handlers, with nothing in any log.
    // 'close' fires after a normal 'end' too, which is why `done` guards it.
    const aborted = () => finish(reject, Object.assign(
      new Error('The client closed the connection before the body was complete.'),
      { code: 'E_CLIENT_ABORTED' }));

    req.on('data', (c) => {
      if (tooLarge || done) return;   // discard the rest; the refusal is already on its way
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        finish(reject, Object.assign(new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes.`), { code: 'E_BODY_TOO_LARGE' }));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (tooLarge || done) return;   // already answered; `end` is not a second answer
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return finish(resolve, {});
      let parsed;
      try { parsed = JSON.parse(raw); } catch (err) {
        return finish(reject, Object.assign(new Error(`Body is not valid JSON: ${err.message}`), { code: 'E_BAD_JSON' }));
      }
      // A BODY THIS GATEWAY CAN USE IS A JSON OBJECT. `null`, a number, a string, a
      // boolean and an array all PARSE, so the old code resolved them as success — and
      // `null` is the one that bites: `server.mjs` hands it to a route, the route reads
      // `body.provider`, and the TypeError surfaces to the caller as a **500** where a
      // body this gateway cannot use is a **400**. A parse layer that reports success on
      // input its own consumer cannot dereference has not finished its job.
      //
      // Arrays are refused with the scalars rather than let through: `typeof []` is
      // `'object'`, so a bare `typeof` check would wave past the one non-object that
      // looks like an object — and no route in this gateway takes a list.
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return finish(reject, Object.assign(
          new Error('Body must be a JSON object; received '
            + `${Array.isArray(parsed) ? 'an array' : parsed === null ? 'null' : `a ${typeof parsed}`}.`),
          { code: 'E_BAD_JSON' }));
      }
      finish(resolve, parsed);
    });
    req.on('error', (err) => finish(reject, err));
    req.on('aborted', aborted);
    req.on('close', aborted);
  });
}

/** One response envelope for every route, so no route invents its own. */
export function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  // THE ENVELOPE IS IMPOSED, NOT OFFERED. The docstring above says this function exists
  // so that no route invents its own envelope — and `...extraHeaders` sat LAST, so a
  // caller passing `content-type` or `content-length` replaced both. Measured: a
  // content-length of 999 on an 8-byte payload, which either truncates the body or
  // desynchronises the next response on a keep-alive socket.
  //
  // Caller headers are applied FIRST and the invariants overwrite them, so an extra
  // header still works (`server.mjs` sends `connection: close` on a 413) while the two
  // fields this function owns cannot be taken away from it.
  const headers = { ...extraHeaders };
  headers['content-type'] = 'application/json; charset=utf-8';
  headers['content-length'] = Buffer.byteLength(payload);
  res.writeHead(status, headers);
  res.end(payload);
}
