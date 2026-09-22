/**
 * spotlightImageFetch.mjs
 * =======================
 * SSRF-hardened fetch + decode for the SwanGuard → SwanStudios Spotlight image.
 *
 * WHY THIS EXISTS. `rehostImage()` in routes/bridge/bridgeIngestRoutes.mjs used to
 * validate the URL by checking the protocol and calling fetch with defaults. That
 * check constrains the URL you PASS, not the URL you CONNECT to: `fetch` follows
 * redirects by default, so any host returning `302 → http://169.254.169.254/...`
 * defeated it. The 8 MiB cap was also applied AFTER `arrayBuffer()` had buffered the
 * whole response, so it bounded what was STORED, not what was CONSUMED.
 *
 * THE PRECEDENT. `applaudAudioFetcher.mjs` already solves this threat model for the
 * PLAUD audio path (Codex CR-4: exact host, HTTPS, no credentials, DNS-resolved
 * private-IP rejection, `redirect:'error'`, streamed caps). This module reuses its
 * `isPrivateOrLocalAddress` rather than growing a second, drifting copy — two copies
 * of a private-range table is the failure mode, not the fix.
 *
 * WHAT IS DELIBERATELY DIFFERENT FROM THE AUDIO PRECEDENT. The audio path can demand
 * an EXACT hostname match because it only ever fetches one vendor. A Spotlight image
 * URL is chosen by the curator in SwanGuard and points at an arbitrary publisher, so
 * an exact-host allowlist is not available. The controls below are therefore the ones
 * that survive an arbitrary host: HTTPS, no credentials, DNS-resolved private-range
 * rejection, no redirect following, a streamed byte cap, byte-sniffed type, and a
 * re-encode that strips metadata and normalises the stored artefact.
 *
 * FAILURE IS ALWAYS NON-FATAL TO THE CALLER. Every export returns a result object or
 * throws SpotlightImageError; the caller maps any failure to `imageUrl = null`. A
 * dropped Spotlight is worse than an imageless one (blueprint ban #4).
 */
import logger from '../utils/logger.mjs';
import {
  SpotlightImageError,
  DNS_LOOKUP_TIMEOUT_MS,
  validateSpotlightImageUrl,
  resolveAndValidate,
  createPinnedDispatcher,
} from './spotlightImageUrlPolicy.mjs';
import { decodeSpotlightImage, MAX_IMAGE_PIXELS, MAX_STORED_EDGE } from './spotlightImageDecode.mjs';

// RE-EXPORTED, so every existing importer keeps working after the extractions. Both splits were
// forced by `06-bans.md` #50 ("no source file reaches 300 lines"), not by design: URL admission
// lives in `spotlightImageUrlPolicy.mjs`, the byte-level decode in `spotlightImageDecode.mjs`,
// and TRANSPORT — the pinned socket and the read caps — is what remains here.
export { SpotlightImageError, DNS_LOOKUP_TIMEOUT_MS, validateSpotlightImageUrl };
export { decodeSpotlightImage, MAX_IMAGE_PIXELS, MAX_STORED_EDGE };

/** 5 MiB compressed input — the ceiling on what we will read off the wire. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Total budget for connect + headers + body. */
export const IMAGE_FETCH_TIMEOUT_MS = 5_000;

/**
 * Fetch an image with `redirect: 'error'`, a pinned connect, and a streamed byte cap.
 * Returns { ok: true, bytes, contentType } or { ok: false, code, message } — never throws.
 */
export async function fetchSpotlightImage(rawUrl, opts = {}) {
  const {
    maxBytes = MAX_IMAGE_BYTES,
    timeoutMs = IMAGE_FETCH_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    // Injectable so a test can OBSERVE the dispatcher's lifetime rather than infer it. The
    // D1 defect (hostile review round 8) was an ordering bug — the pool was closed before
    // the body was settled — and ordering is only visible to a caller that holds the object.
    // Defaults to the real factory, so every production caller is unaffected.
    dispatcherFactory = createPinnedDispatcher,
  } = opts;

  // Admission returns the addresses it approved, not merely a verdict. Passing a bare URL onward
  // would let the transport resolve the name a second time — the TOCTOU this pin exists to close.
  let url;
  let addrs;
  try {
    ({ url, addrs } = await resolveAndValidate(rawUrl));
  } catch (err) {
    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
  }

  // The socket may only go where the check looked.
  let dispatcher;
  try {
    dispatcher = dispatcherFactory(addrs);
  } catch (err) {
    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
  }

  // THE AGENT IS A LIVE SOCKET POOL, AND ITS LIFETIME IS THE WHOLE OPERATION — NOT JUST THE HEADERS.
  //
  // WHAT WAS WRONG (hostile review round 8, D1 — graded HIGH). This used to be a `finally` that
  // awaited `dispatcher.close()` the moment `fetch()` returned, i.e. as soon as the RESPONSE HEADERS
  // had arrived. But `fetch()` resolves while the BODY may still be streaming, and every path below
  // — the 4xx/5xx cancel, the declared-size cancel, the streamed read — was therefore reached only
  // AFTER the pool had been asked to shut down. `close()` drains idle sockets "once in-flight
  // requests settle", and a body still being read IS an in-flight request, so the order made the
  // shutdown wait on the very body this function was about to cancel. Wrong by construction:
  // settlement first, then closure.
  //
  // WHAT REPLACES IT. The close now happens in the `finally` of a block that wraps the ENTIRE
  // fetch-and-body operation, and the body is settled explicitly on every path (`settleBody`)
  // before that `finally` runs. So the pool closes over a body that has already been consumed,
  // cancelled, or abandoned by an aborted signal.
  const closeDispatcher = async () => {
    try { await dispatcher.close(); } catch { /* close is best-effort */ }
  };

  let response;
  try {
    try {
      response = await fetchImpl(url.toString(), {
        method: 'GET',
        // THE FIRST-HOP FIX. Following a redirect re-enters the network with a URL that was never
        // validated — the protocol/host/DNS checks above only ever saw the first hop.
        redirect: 'error',
        // THE CONNECT FIX. The agent answers `connect.lookup` from the validated addresses, so the
        // name is not resolved a second time and cannot flip to a private address between the check
        // and the socket. `redirect: 'error'` above is what keeps the connected host the validated
        // host — together they mean there is no unvalidated hop (DNS-rebinding TOCTOU, closed).
        dispatcher,
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: 'image/*' },
      });
    } catch (err) {
      const msg = err?.message || '';
      if (err?.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS' || /redirect/i.test(msg)) {
        return { ok: false, code: 'IMAGE_URL_REDIRECT_REJECTED', message: msg || 'redirect rejected' };
      }
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || /timeout|aborted/i.test(msg)) {
        return { ok: false, code: 'IMAGE_FETCH_TIMEOUT', message: 'image fetch timed out' };
      }
      return { ok: false, code: 'IMAGE_FETCH_FAILED', message: msg || 'image fetch failed' };
    }

    return await readImageBody(response, { maxBytes });
  } finally {
    // Runs after `readImageBody` has settled the body on every path — consumed, cancelled, or
    // aborted. This is the ordering the old code had backwards.
    await closeDispatcher();
  }
}

/**
 * Turn an already-headed response into bytes, settling its body before this returns.
 *
 * Split out of `fetchSpotlightImage` so the dispatcher's `finally` can wrap this whole unit: the
 * pool must not be closed while a body is still being read (hostile review round 8, D1).
 * Every exit path either consumes the stream to completion or cancels it, and `cancel` on an
 * already-errored stream is itself best-effort.
 *
 * @param {Response} response
 * @param {{ maxBytes: number }} opts
 * @returns {Promise<{ ok: true, bytes: Buffer, contentType: string } | { ok: false, code: string, message: string }>}
 */
async function readImageBody(response, { maxBytes }) {
  if (!response.ok) {
    // RELEASE THE SOCKET. Returning here without draining or cancelling leaves the response body
    // open until GC, so an upstream that answers 4xx/5xx with a large body holds one connection
    // per request for an unbounded time (hostile review D8 / R2-03).
    try { await response.body?.cancel('upstream not ok'); } catch { /* release is best-effort */ }
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `upstream returned ${response.status}` };
  }

  // Optional early exit. The streamed cap below is the authoritative gate, because a
  // declared Content-Length is a claim, not a fact.
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    // Same release as above: an over-cap declaration is a reason to stop reading, and stopping
    // means cancelling the stream rather than walking away from an open one.
    try { await response.body?.cancel('declared length over cap'); } catch { /* release is best-effort */ }
    return { ok: false, code: 'IMAGE_TOO_LARGE', message: `Content-Length ${declared} > cap ${maxBytes}` };
  }

  if (!response.body) {
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: 'response has no body' };
  }

  const chunks = [];
  let total = 0;
  // Declared OUTSIDE the try so the catch can reach it. The correct release for a stream that
  // threw mid-read is the READER's cancel, not the body's — see the catch.
  let reader;
  try {
    reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      // Cap enforced WHILE reading. The previous code buffered the entire body with
      // arrayBuffer() and only then compared its length — so a multi-gigabyte response
      // was fully materialised before being rejected.
      if (total > maxBytes) {
        try { await reader.cancel('size cap exceeded'); } catch { /* release is best-effort */ }
        return { ok: false, code: 'IMAGE_TOO_LARGE', message: `streamed ${total} bytes > cap ${maxBytes}` };
      }
      chunks.push(chunk);
    }
  } catch (err) {
    // RELEASE THE READER, NOT THE BODY (hostile review round 9, finding 2 — corrected).
    //
    // The first version of this fix called `response.body.cancel(...)`. It looked right and it
    // NEVER WORKED: once `getReader()` has been called the body is LOCKED, so `body.cancel()`
    // throws `Invalid state: ReadableStream is locked` and the empty catch swallowed it. The
    // socket stayed open, and — worse — the empty catch made the release look handled. A test
    // that recorded "cancel was attempted" passed; only recording "cancel SETTLED" exposed it.
    //
    // `reader.cancel()` is the call that actually releases a locked stream, and `reader` is in
    // scope here because it is declared outside the try. This also matches the over-cap path
    // above, which cancels through the reader for the same reason.
    try { await reader?.cancel('stream read failed'); } catch { /* release is best-effort */ }
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `stream read failed: ${err.message}` };
  }

  return {
    ok: true,
    bytes: Buffer.concat(chunks),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
}


/**
 * One call for the route: validate → fetch → decode.
 * Any failure is a value, never an exception, so the ingest path cannot be broken by an image.
 */
export async function fetchAndDecodeSpotlightImage(rawUrl, opts = {}) {
  const fetched = await fetchSpotlightImage(rawUrl, opts);
  if (!fetched.ok) return fetched;

  try {
    const decoded = await decodeSpotlightImage(fetched.bytes, opts);
    return { ok: true, ...decoded, sourceContentType: fetched.contentType };
  } catch (err) {
    if (err instanceof SpotlightImageError) return { ok: false, code: err.code, message: err.message };
    logger.warn(`Spotlight image decode failed unexpectedly: ${err.message}`);
    return { ok: false, code: 'IMAGE_DECODE_FAILED', message: err.message };
  }
}
