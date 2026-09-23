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
import sharp from 'sharp';
import logger from '../utils/logger.mjs';
import { sniffFileType } from './photoStorageService.mjs';
import {
  SpotlightImageError,
  DNS_LOOKUP_TIMEOUT_MS,
  validateSpotlightImageUrl,
  resolveAndValidate,
  createPinnedDispatcher,
} from './spotlightImageUrlPolicy.mjs';

// RE-EXPORTED, so every existing importer keeps working after the extraction. The split was forced
// by `06-bans.md` #50 ("no source file reaches 300 lines"), not by design: URL admission lives in
// `spotlightImageUrlPolicy.mjs`, transport and decode live here.
export { SpotlightImageError, DNS_LOOKUP_TIMEOUT_MS, validateSpotlightImageUrl };

/** 5 MiB compressed input — the ceiling on what we will read off the wire. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** 16 MP decoded — a decompression bomb is cheap to send and expensive to decode. */
export const MAX_IMAGE_PIXELS = 16_000_000;
/** Total budget for connect + headers + body. */
export const IMAGE_FETCH_TIMEOUT_MS = 5_000;
/** Longest edge of the stored artefact. */
export const MAX_STORED_EDGE = 1600;

/** Types `sniffFileType` may return that are acceptable as a Spotlight image. */
const RASTER_EXT = new Set(['jpg', 'png', 'gif', 'webp', 'heic']);

/**
 * Fetch an image with `redirect: 'error'`, a pinned connect, and a streamed byte cap.
 * Returns { ok: true, bytes, contentType } or { ok: false, code, message } — never throws.
 */
export async function fetchSpotlightImage(rawUrl, opts = {}) {
  const {
    maxBytes = MAX_IMAGE_BYTES,
    timeoutMs = IMAGE_FETCH_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
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
    dispatcher = createPinnedDispatcher(addrs);
  } catch (err) {
    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
  }

  let response;
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
  } finally {
    // THE AGENT IS A LIVE SOCKET POOL. Not closing it leaves idle sockets (and their timers) alive,
    // which holds the event loop open for the life of the process. `close()` drains idle sockets
    // once in-flight requests settle; a request in flight here is already over, because `await`
    // above completed or threw. Best-effort: a close failure must not mask the fetch result.
    try { await dispatcher.close(); } catch { /* close is best-effort */ }
  }

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
  try {
    const reader = response.body.getReader();
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
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `stream read failed: ${err.message}` };
  }

  return {
    ok: true,
    bytes: Buffer.concat(chunks),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
}

/**
 * Prove the bytes really are a single-frame raster image, then re-encode them.
 *
 * Three things happen here, and each is a control rather than a tidy-up:
 *   1. `sniffFileType` reads the magic bytes. The declared Content-Type is
 *      attacker-controlled and is not consulted. SVG is not in the signature table, so
 *      it is rejected here — an SVG served from our own R2 domain is stored XSS.
 *   2. `sharp` decodes it. A file that sniffs as PNG but does not decode is a polyglot,
 *      and this is where it dies. `limitInputPixels` makes the decode itself bounded.
 *   3. Re-encode. Strips EXIF (including GPS — this is a fitness app), normalises the
 *      stored artefact, and guarantees the bytes we serve are bytes we produced.
 *
 * @returns {Promise<{buffer: Buffer, contentType: string, ext: string}>}
 * @throws {SpotlightImageError}
 */
export async function decodeSpotlightImage(buffer, opts = {}) {
  const { maxPixels = MAX_IMAGE_PIXELS, maxEdge = MAX_STORED_EDGE } = opts;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new SpotlightImageError('IMAGE_EMPTY', 'no bytes to decode');
  }

  const sniffed = sniffFileType(buffer);
  if (!sniffed) {
    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', 'bytes match no accepted image signature');
  }
  if (!RASTER_EXT.has(sniffed.ext)) {
    // sniffFileType also recognises mp4/webm/avi/pdf — valid uploads elsewhere, not here.
    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', `not a raster image: ${sniffed.ext}`);
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: maxPixels }).metadata();
  } catch (err) {
    throw new SpotlightImageError('IMAGE_DECODE_FAILED', err.message);
  }

  if (!metadata?.width || !metadata?.height) {
    throw new SpotlightImageError('IMAGE_DECODE_FAILED', 'no dimensions');
  }
  if (metadata.width * metadata.height > maxPixels) {
    throw new SpotlightImageError('IMAGE_TOO_LARGE', `${metadata.width}x${metadata.height} exceeds ${maxPixels} px`);
  }
  // An animated image is a frame budget, not an image. `pages` is 1 for stills.
  if (Number(metadata.pages) > 1) {
    throw new SpotlightImageError('IMAGE_ANIMATION_REJECTED', `${metadata.pages} frames`);
  }

  // Preserve alpha by choosing PNG; otherwise JPEG, which is far smaller for photographs.
  const pipeline = sharp(buffer, { limitInputPixels: maxPixels })
    .rotate() // bake EXIF orientation in before the metadata that carries it is dropped
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });

  const keepAlpha = Boolean(metadata.hasAlpha);
  const outBuffer = keepAlpha
    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
    : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();

  return {
    buffer: outBuffer,
    contentType: keepAlpha ? 'image/png' : 'image/jpeg',
    ext: keepAlpha ? 'png' : 'jpg',
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
