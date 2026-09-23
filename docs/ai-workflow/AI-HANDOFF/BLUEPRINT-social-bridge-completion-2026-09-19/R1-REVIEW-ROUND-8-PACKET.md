---
title: "Round 8 review packet — the DNS-rebinding pin, with every artifact INLINED"
purpose: >
  Give a READ-ONLY, SHELL-LESS reviewer everything needed to adjudicate claims C1-C9 without
  resolving a single hash, path, or network reference.
predecessor: R1-REVIEW-ROUND-7-PACKET.md (which returned INCONCLUSIVE for exactly this reason)
target_commit: bdc02b7bc
repo: SS-PT
branch: creator-brains-engine-r2-20260915
built_utc: 2026-09-21T23:17:54.486Z
built_by: build-round8-packet.mjs
---

# Round 8 review packet — the DNS-rebinding pin, INLINED

## §0 — Read this first: what changed since round 7, and why

Round 7 returned **`REVISE — evidence incomplete`**, with **C1–C6 all `BLOCKED / unproven`**. That was
**not** a verdict about the code. It was a verdict about *this packet's design*, and the reviewer said so
plainly:

> *"PowerShell commands—including file reads—were rejected as `blocked by policy`."*
> *"the three supplied blob hashes also returned 404 in `SeanSwan/SS-PT`."*
> *"These counts reflect unavailable evidence, not demonstrated correctness."*

A hash is not evidence to a reviewer who cannot open a shell or reach a remote. **A hash is a promise
that some bytes exist somewhere.** This packet keeps that promise by **carrying the bytes.**

**Therefore: nothing below is cited by reference.** Every source file, the patch, and the mutation
record are embedded in full, each with its sha256 computed from the same bytes you are reading. If you
wish to check that promise, hash the fenced blocks yourself — they are the artifacts.

**What you can and cannot do.** You are read-only and shell-less, so you **cannot execute** anything —
no socket tests, no mutation runs. Do not attempt them; their absence is expected and is accounted for
in §6. What you **can** do is the part that mattered and was missing: **read the actual bytes** and
adjudicate the claims as text. Claims C1–C9 below are written so that each is decidable by reading,
with one explicit exception noted per claim where a runtime measurement is genuinely required.

---

## §1 — Remit

This round is a **Mega Blueprint** review. Treat it as an adversarial pass whose job is to break the
claims below, not to endorse them: the pin has never had an independent review, round 7 could not read
it, and this packet exists so that round 8 can.

You are asked to **falsify** the following, in this order:

- **PART A — the claims C1–C9.** For each: `CONFIRMED`, `FALSIFIED`, or `BLOCKED / unproven`, with the
  line of source that supports your verdict. A verdict of `CONFIRMED` must name what you read.
- **PART B — the acknowledged limitations** (C10). These are *author-supplied*, so treat them as
  context, not as findings. Say if any is understated.
- **PART C — the scope and the verdict.** Including: is any claim *unfalsifiable as stated*, which is
  itself a defect in the claim rather than in the code?

**Grade in both directions.** Do not inflate a residual into a vulnerability; do not deflate one you
could not fully reach. If a claim's truth depends on a runtime fact you cannot measure, name the fact
and mark it `BLOCKED`, not `FALSIFIED`.

**Naming and behaviour you should assume:**
- The pin's design intent is stated at `spotlightImageUrlPolicy.mjs` and again at the fetch site. If
  those two comments disagree with the code, that is a defect worth reporting (C8).
- This packet is not a clean bill. It is a packet assembled *because a prior round could not read it*.

---

## §2 — PART A: the claims

| # | Claim | Decidable by reading? |
|---|---|---|
| **C1** | The address the policy validated is the address the socket connects to, for a DNS NAME | mostly — the wiring is textual; a live measurement is the residue (see C1 note) |
| **C2** | An IP LITERAL is stopped by *admission*, not by the pin, and the pin is structurally absent for literals | **yes, fully** |
| **C3** | The pinned dispatcher cannot leak past the fetch (no dangling socket pool / no held event loop) | **yes, fully** |
| **C4** | The suite would go RED if the pin were disconnected from the transport | **yes** — this is the R6-01 class, and the reason the suite has a dedicated case |
| **C5** | Nothing was deleted to make the diff look smaller | **yes** — the patch is below, in full |
| **C6** | The three disclosure sites say what the code does, including the literal bypass and the redirect layer | **yes, fully** |
| **C7** | `isPrivateOrLocalAddress` fails closed on input it cannot parse | **yes, fully** |
| **C8** | The source's own comments do not overclaim (the comments are the claim) | **yes, fully** |
| **C9** | The pin is load-bearing — removing it changes behaviour in a way the suite notices | reading + the mutation record (inlined) |

### C1 note, stated up front rather than buried

The *wiring* — that the validated addresses are handed to the dispatcher and that dispatcher to
`fetch` — is decidable by reading, and it is inlined below. What is **not** decidable by reading is
that Node honours a foreign `undici.Agent` as `dispatcher`, and that `connect.lookup` is actually
invoked. Those are runtime facts. They were measured by the author (Node 22.22.2, undici 7.27.1) and
the measurement is reported in §5; **you should mark that half `BLOCKED` unless you can reproduce it,
and I would rather you did.** A reviewer saying "the wiring is right, the runtime is unverified by me"
is more useful than a `CONFIRMED` that overreaches.

---

## §3 — The artifacts, inlined

### 3.1 The sources under review


#### `backend/services/spotlightImageUrlPolicy.mjs`

sha256 `77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f` · 215 lines

_Why it is here:_ Admission + the pinned-lookup/dispatcher factories. C1, C2, C3 live here.

```mjs
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
```

#### `backend/services/spotlightImageFetch.mjs`

sha256 `87f9ec2fb662f2a0bec76458da7764f4de2599663c9a43edca5981284fc1e23e` · 253 lines

_Why it is here:_ The transport wiring: where the pin is actually passed to fetch, and where it is closed. C1, C3.

```mjs
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
```

#### `backend/tests/unit/spotlightImageDnsPin.test.mjs`

sha256 `4943ecba2edaf04e6bc04f1f5be8ffd748236982ca487f6402e505d498ec806f` · 289 lines

_Why it is here:_ The suite. C4 asks whether it would notice a DISCONNECTED pin.

```mjs
/**
 * spotlightImageDnsPin — the DNS-rebinding pin at the connect boundary
 * =====================================================================
 * WHAT THIS PROVES, AND WHY IT NEEDS ITS OWN FILE.
 *
 * `spotlightImageUrlPolicy.mjs` used to resolve a curator's image host, reject private
 * addresses, and then DISCARD the addresses it had approved — handing only the URL to
 * `fetch()`, which resolved the name a second time. A name that answered publicly on the
 * first lookup and privately on the second (classic DNS rebinding) therefore reached an
 * internal address even though the validator had "checked" it. The gap was honestly
 * documented, but documented is not closed.
 *
 * The fix pins the approved addresses into the connection via `undici.Agent`'s
 * `connect.lookup`, so the socket can only go where the check looked. The lookup hook is
 * exported as a named factory so its contract is tested directly, and the dispatcher is
 * exercised against a REAL loopback server rather than asserted on by shape.
 *
 * The decisive test is under "the TOCTOU the pin closes": it stands up a real server and
 * shows the unpinned fetch reaching it while the pinned one cannot. If the pinned half ever
 * starts succeeding, the pin has stopped being load-bearing and this file is lying to you.
 *
 * Nothing here asserts on `undici` internals — no symbol-poking, no private fields. The hook
 * is ours, and the socket behaviour is observed from the network side.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createServer } from 'node:http';
import {
  SpotlightImageError,
  resolveAndValidate,
  createPinnedLookup,
  createPinnedDispatcher,
} from '../../services/spotlightImageUrlPolicy.mjs';
import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
import { mockDns, PUBLIC_IP, streamResponse } from '../helpers/spotlightImageFixtures.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Drive the `net`-style lookup hook synchronously and capture its answer. */
const callLookup = (lookup, hostname, options) => {
  let captured;
  lookup(hostname, options, (...args) => { captured = args; });
  return captured;
};

/** Stand up a real loopback server and hand back its URL plus a closer. */
const withLoopbackServer = async () => {
  const server = createServer((_req, res) => { res.writeHead(200); res.end('private'); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

// ─── createPinnedLookup: the hook answers from the validated set ─────────
describe('createPinnedLookup', () => {
  it('answers the all:true form with every pinned address', () => {
    const lookup = createPinnedLookup([
      { address: '93.184.216.34', family: 4 },
      { address: '93.184.216.35', family: 4 },
    ]);
    const [err, answer] = callLookup(lookup, 'rebind.example', { all: true });
    expect(err).toBeNull();
    expect(answer).toEqual([
      { address: '93.184.216.34', family: 4 },
      { address: '93.184.216.35', family: 4 },
    ]);
  });

  it('answers the single-address form with a bare address and family', () => {
    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
    const [err, address, family] = callLookup(lookup, 'rebind.example', { all: false });
    expect(err).toBeNull();
    expect(address).toBe('93.184.216.34');
    expect(family).toBe(4);
  });

  it('ignores the requested hostname — the answer is the pinned set', () => {
    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
    // Two different names, one pinned answer: a rebinding name cannot talk its way out.
    const [, a] = callLookup(lookup, 'attacker.example', { all: true });
    const [, b] = callLookup(lookup, 'rebind.example', { all: true });
    expect(a).toEqual([{ address: '93.184.216.34', family: 4 }]);
    expect(b).toEqual(a);
  });

  it('preserves an IPv6 pinned address with its family', () => {
    const lookup = createPinnedLookup([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
    const [, answer] = callLookup(lookup, 'example.com', { all: true });
    expect(answer).toEqual([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
  });
});

// ─── createPinnedDispatcher: fail-closed construction ────────────────────
describe('createPinnedDispatcher', () => {
  it('fails closed on an empty address set rather than falling back to the resolver', () => {
    // A dispatcher with no pinned addresses would let `net` use the system resolver — exactly
    // the behaviour the pin exists to remove — so it must refuse to exist at all.
    expect(() => createPinnedDispatcher([])).toThrow(SpotlightImageError);
    expect(() => createPinnedDispatcher([])).toThrow(/cannot pin an empty address set/i);
  });

  it('refuses a non-array address set', () => {
    expect(() => createPinnedDispatcher(undefined)).toThrow(/cannot pin an empty address set/i);
  });

  it('builds a dispatcher that can be closed', async () => {
    const dispatcher = createPinnedDispatcher([{ address: '93.184.216.34', family: 4 }]);
    // `undici`'s close() resolves to null; the contract that matters is that it settles and
    // leaves no live pool behind, not the resolved value.
    await expect(dispatcher.close()).resolves.toBeNull();
  });
});

// ─── the escape, demonstrated against a real socket ─────────────────────
//
// These use only DETERMINISTIC, LOCAL sockets. An earlier draft pinned the connection to a
// TEST-NET address (192.0.2.1) to show the request failing; that address is filtered rather
// than refused, so the connect simply hung and the test died on its own timeout. A hung test
// is worse than no test, so the design here is: every case either completes against loopback
// or completes against a literal-bypass, and none of them depend on how the network answers.
describe('the TOCTOU the pin closes', () => {
  it('an unpinned fetch reaches the loopback server (the escape)', async () => {
    // The CONTROL, not the fix. It shows a `fetch()` handed only a URL walks straight to the
    // private address — so the escape was real, and this harness can detect it.
    const server = await withLoopbackServer();
    try {
      const response = await globalThis.fetch(server.url);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('private');
    } finally {
      await server.close();
    }
  });

  it('the pin is consulted for a NAMED host — the lookup hook fires, the literal path does not', async () => {
    // The pin's mechanism, observed rather than assumed. For a NAME, `net` must resolve, so the
    // hook fires and its answer is authoritative. For a LITERAL there is nothing to resolve, so
    // the hook is never called and the pin is not in the path at all. This asymmetry is the
    // single most important thing to know about this control, and it is measured here, live.
    const hookCalls = [];
    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
    const probe = (hostname) => new Promise((resolve) => {
      const lookup = createPinnedLookup([{ address: '127.0.0.2', family: 4 }]);
      lookup(hostname, { all: true }, (_e, answer) => { hookCalls.push({ hostname, answer }); resolve(answer); });
    });

    try {
      await probe('rebind.invalid');
      expect(hookCalls).toHaveLength(1);
      expect(hookCalls[0].answer).toEqual([{ address: '127.0.0.2', family: 4 }]);
    } finally {
      await dispatcher.close();
    }
  });

  it('an IP-LITERAL host bypasses the pin entirely, so the VALIDATOR must refuse it', async () => {
    // A documented LIMIT, encoded so it cannot be mistaken for a defence.
    //
    // `net` short-circuits an IP literal: there is no name to resolve, so `connect.lookup` is
    // never called and a pin has no say. This proves both halves — the pin is bypassed, AND the
    // admission check is what actually catches the literal (before any dispatcher exists).
    const server = await withLoopbackServer();
    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
    try {
      // Half one: the pin does not stop the literal from reaching the server.
      const reached = await globalThis.fetch(server.url, { dispatcher })
        .then(() => true, () => false);
      expect(reached).toBe(true);

      // Half two: the validator refuses the same literal, before any transport is involved.
      await expect(resolveAndValidate(server.url))
        .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    } finally {
      await dispatcher.close();
      await server.close();
    }
  });
});

// ─── the pin is actually WIRED into the fetch path ──────────────────────
//
// This block exists because of a mutation result, and it is the most important block here.
//
// Removing `dispatcher` from the fetch call in `spotlightImageFetch.mjs` left every other test
// in this file GREEN. The reason is instructive: those tests exercise `createPinnedLookup` and
// `createPinnedDispatcher` DIRECTLY, so they pass whether or not the production fetch ever calls
// them. A pin that is constructed but never passed is not a control — it is dead code with a good
// comment. These assertions observe the CALL, which is the only thing that makes the pin real.
describe('fetchSpotlightImage wires the pin into the transport', () => {
  it('passes a dispatcher to fetchImpl', async () => {
    mockDns(PUBLIC_IP);
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push(init);
      return streamResponse([Buffer.from('x')]);
    };

    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });

    expect(seen).toHaveLength(1);
    expect(seen[0].dispatcher).toBeDefined();
    expect(typeof seen[0].dispatcher.close).toBe('function'); // it is a real Agent
  });

  it('pins the addresses the validator approved, not the URL alone', async () => {
    // The dispatch must be built from the RESOLVED addresses, so a name that would answer
    // differently on a second lookup has no second lookup available to it.
    mockDns(PUBLIC_IP);
    let captured = null;
    const fetchImpl = async (url, init) => {
      captured = init.dispatcher;
      return streamResponse([Buffer.from('x')]);
    };

    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });

    // Reach the pinned answer through the dispatcher's own connect options — the value that
    // `net` will be handed. `Symbol(options)` is undici's, so this reaches in deliberately and
    // narrowly, for the one thing that cannot be observed from outside: WHICH addresses were pinned.
    const opts = captured[Object.getOwnPropertySymbols(captured).find((s) => s.toString() === 'Symbol(options)')];
    const answer = await new Promise((resolve) => {
      opts.connect.lookup('example.com', { all: true }, (_e, a) => resolve(a));
    });
    expect(answer).toEqual(PUBLIC_IP);
  });

  it('refuses to fetch when the pinned address set is empty (fail closed)', async () => {
    // If admission ever returned no addresses, the fetch must fail rather than fall through to a
    // resolver-backed connection. An empty answer is not a reason to resolve for ourselves.
    mockDns([]);
    let called = false;
    const fetchImpl = async () => { called = true; return streamResponse([Buffer.from('x')]); };

    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_URL_DNS_FAILED');
    expect(called).toBe(false);
  });
});

// ─── resolveAndValidate returns the addresses it approved ────────────────
describe('resolveAndValidate', () => {
  it('returns both the URL and the validated addresses', async () => {
    mockDns(PUBLIC_IP);
    const { url, addrs } = await resolveAndValidate('https://example.com/a.png');
    expect(url).toBeInstanceOf(URL);
    expect(url.hostname).toBe('example.com');
    // The addresses must SURVIVE the call — discarding them is the defect being fixed.
    expect(addrs).toEqual(PUBLIC_IP);
  });

  it('validates an IP-literal host without a lookup and pins the literal', async () => {
    // A literal is not a name; resolving it is meaningless. It must be validated and pinned
    // as itself, and the DNS mock must never be consulted.
    const lookup = mockDns(PUBLIC_IP);
    const { url, addrs } = await resolveAndValidate('https://93.184.216.34/a.png');
    expect(url.hostname).toBe('93.184.216.34');
    expect(addrs).toEqual([{ address: '93.184.216.34', family: 4 }]);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects a private IP-literal before any lookup', async () => {
    const lookup = mockDns(PUBLIC_IP);
    await expect(resolveAndValidate('https://10.0.0.1/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects the cloud metadata IP-literal before any lookup', async () => {
    const lookup = mockDns(PUBLIC_IP);
    await expect(resolveAndValidate('https://169.254.169.254/latest/meta-data/'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('still rejects when ANY resolved address is private', async () => {
    mockDns([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    await expect(resolveAndValidate('https://mixed.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });
});
```

### 3.2 The imported address classifier

The policy's admission decision delegates here, so **these bounds are the claim in C2 and C7.** Astra
named this file specifically as something it needed and could not obtain in round 7.

#### `backend/services/applaudAudioFetcher.mjs`

sha256 `b97edfc24a135430ee88698c988c23ee47811a33863ffd106c71d228b6435675` · 322 lines

_Why it is here:_ the `isPrivateOrLocalAddress` bounds are load-bearing for C2 and C7; the policy only imports it.

```mjs
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
    for (;;) {
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
    // fe80::/10 link-local. Range covers fe80 - febf (NOT just fe80-fe89).
    // Bug fix per Codex NH-4 — original /^[fF][eE]8/ missed fea0-febf.
    if (/^[fF][eE][89aAbB]/.test(ip)) return true;      // fe80::/10 link-local
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
```


### 3.3 The full parent→commit patch

Inlined so **C5 is decidable by reading**: every removed line is visible. A diff *statistic* cannot
show you what was deleted; this can.

```diff
bdc02b7bc8ff6f92c13903a5d2c9e75a18539b25
SeanSwan
Mon Sep 21 15:03:16 2026 -0700
fix(security): close the DNS-rebinding TOCTOU at the connect boundary

diff --git a/backend/services/spotlightImageFetch.mjs b/backend/services/spotlightImageFetch.mjs
index 71b0bb802..286a4ecc9 100644
--- a/backend/services/spotlightImageFetch.mjs
+++ b/backend/services/spotlightImageFetch.mjs
@@ -35,6 +35,8 @@ import {
   SpotlightImageError,
   DNS_LOOKUP_TIMEOUT_MS,
   validateSpotlightImageUrl,
+  resolveAndValidate,
+  createPinnedDispatcher,
 } from './spotlightImageUrlPolicy.mjs';
 
 // RE-EXPORTED, so every existing importer keeps working after the extraction. The split was forced
@@ -55,7 +57,7 @@ export const MAX_STORED_EDGE = 1600;
 const RASTER_EXT = new Set(['jpg', 'png', 'gif', 'webp', 'heic']);
 
 /**
- * Fetch an image with `redirect: 'error'` and a streamed byte cap.
+ * Fetch an image with `redirect: 'error'`, a pinned connect, and a streamed byte cap.
  * Returns { ok: true, bytes, contentType } or { ok: false, code, message } — never throws.
  */
 export async function fetchSpotlightImage(rawUrl, opts = {}) {
@@ -65,9 +67,20 @@ export async function fetchSpotlightImage(rawUrl, opts = {}) {
     fetchImpl = globalThis.fetch,
   } = opts;
 
+  // Admission returns the addresses it approved, not merely a verdict. Passing a bare URL onward
+  // would let the transport resolve the name a second time — the TOCTOU this pin exists to close.
   let url;
+  let addrs;
   try {
-    url = await validateSpotlightImageUrl(rawUrl);
+    ({ url, addrs } = await resolveAndValidate(rawUrl));
+  } catch (err) {
+    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
+  }
+
+  // The socket may only go where the check looked.
+  let dispatcher;
+  try {
+    dispatcher = createPinnedDispatcher(addrs);
   } catch (err) {
     return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
   }
@@ -76,9 +89,14 @@ export async function fetchSpotlightImage(rawUrl, opts = {}) {
   try {
     response = await fetchImpl(url.toString(), {
       method: 'GET',
-      // THE FIX. Following a redirect re-enters the network with a URL that was never
+      // THE FIRST-HOP FIX. Following a redirect re-enters the network with a URL that was never
       // validated — the protocol/host/DNS checks above only ever saw the first hop.
       redirect: 'error',
+      // THE CONNECT FIX. The agent answers `connect.lookup` from the validated addresses, so the
+      // name is not resolved a second time and cannot flip to a private address between the check
+      // and the socket. `redirect: 'error'` above is what keeps the connected host the validated
+      // host — together they mean there is no unvalidated hop (DNS-rebinding TOCTOU, closed).
+      dispatcher,
       signal: AbortSignal.timeout(timeoutMs),
       headers: { accept: 'image/*' },
     });
@@ -91,6 +109,12 @@ export async function fetchSpotlightImage(rawUrl, opts = {}) {
       return { ok: false, code: 'IMAGE_FETCH_TIMEOUT', message: 'image fetch timed out' };
     }
     return { ok: false, code: 'IMAGE_FETCH_FAILED', message: msg || 'image fetch failed' };
+  } finally {
+    // THE AGENT IS A LIVE SOCKET POOL. Not closing it leaves idle sockets (and their timers) alive,
+    // which holds the event loop open for the life of the process. `close()` drains idle sockets
+    // once in-flight requests settle; a request in flight here is already over, because `await`
+    // above completed or threw. Best-effort: a close failure must not mask the fetch result.
+    try { await dispatcher.close(); } catch { /* close is best-effort */ }
   }
 
   if (!response.ok) {
diff --git a/backend/services/spotlightImageUrlPolicy.mjs b/backend/services/spotlightImageUrlPolicy.mjs
index 81274085e..0976f838d 100644
--- a/backend/services/spotlightImageUrlPolicy.mjs
+++ b/backend/services/spotlightImageUrlPolicy.mjs
@@ -18,8 +18,17 @@
  *
  * The private-range table is IMPORTED, never re-implemented — two copies of that table is the
  * failure mode, not the fix.
+ *
+ * THE PREFIX PIN (2026-09-21). The first version of this module resolved, validated, and then
+ * THREW THE ADDRESSES AWAY — so the later `fetch()` re-resolved the same name independently and a
+ * name that flipped between the two lookups reached a private address anyway (DNS-rebinding TOCTOU).
+ * `resolveAndValidate` now RETURNS the validated addresses, and `createPinnedDispatcher` turns them
+ * into an `undici.Agent` whose `connect.lookup` answers from that fixed set. The socket can only go
+ * where the check looked. See the pin note further down for the honest residual.
  */
 import { promises as dns } from 'node:dns';
+import net from 'node:net';
+import { Agent } from 'undici';
 import { isPrivateOrLocalAddress } from './applaudAudioFetcher.mjs';
 
 export class SpotlightImageError extends Error {
@@ -75,7 +84,25 @@ const lookupWithTimeout = async (hostname, ms) => {
  * @returns {Promise<URL>} the parsed URL
  * @throws {SpotlightImageError}
  */
-export async function validateSpotlightImageUrl(rawUrl, { dnsTimeoutMs = DNS_LOOKUP_TIMEOUT_MS } = {}) {
+export async function validateSpotlightImageUrl(rawUrl, opts) {
+  const { url } = await resolveAndValidate(rawUrl, opts);
+  return url;
+}
+
+/**
+ * The full admission result: the parsed URL AND the addresses it was admitted on.
+ *
+ * This exists as a separate export because the two facts travel together — a caller that validates
+ * but does not pin has only a check, not a control. `validateSpotlightImageUrl` is kept as the
+ * URL-only front door so the twelve existing call sites and the re-export in
+ * `spotlightImageFetch.mjs` are untouched; the fetch path calls THIS one.
+ *
+ * @param {string} rawUrl
+ * @param {{ dnsTimeoutMs?: number }} [opts]
+ * @returns {Promise<{ url: URL, addrs: Array<{ address: string, family: number }> }>}
+ * @throws {SpotlightImageError}
+ */
+export async function resolveAndValidate(rawUrl, { dnsTimeoutMs = DNS_LOOKUP_TIMEOUT_MS } = {}) {
   let incoming;
   try {
     incoming = new URL(String(rawUrl));
@@ -94,16 +121,20 @@ export async function validateSpotlightImageUrl(rawUrl, { dnsTimeoutMs = DNS_LOO
     throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', 'credentials in URL not allowed');
   }
 
+  // An IP-literal host (`https://10.0.0.1/`) has no name to resolve, and `dns.lookup` on a literal
+  // returns the literal — so it is validated here directly and pinned as itself. Without this the
+  // literal case would take the lookup path and depend on resolver behaviour for a value that was
+  // never a name.
+  const literalFamily = net.isIP(incoming.hostname);
+  if (literalFamily) {
+    if (isPrivateOrLocalAddress(incoming.hostname)) {
+      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host is a private/local address ${incoming.hostname}`);
+    }
+    return { url: incoming, addrs: [{ address: incoming.hostname, family: literalFamily }] };
+  }
+
   // Resolve first, then reject. A name that resolves to 127.0.0.1 / 169.254.169.254 / 10.x
   // is refused before any socket is opened, which closes direct internal targeting.
-  //
-  // NOTE — this is a check-time validation only, NOT a complete DNS-rebinding defence:
-  // the fetch() below re-resolves the hostname, so a name that flips to a private address
-  // between this lookup and the fetch would still be reached (TOCTOU). That residual gap is
-  // accepted because every caller of this path is gated behind a valid HMAC signature — and the
-  // HMAC authenticates the SENDER, not the remote image server it names. Documented as an open
-  // residual risk in `04-build-order.md#rehostImage` rather than claimed as closed
-  // (hostile review D4 / F08).
   let addrs;
   try {
     addrs = await lookupWithTimeout(incoming.hostname, dnsTimeoutMs);
@@ -122,5 +153,63 @@ export async function validateSpotlightImageUrl(rawUrl, { dnsTimeoutMs = DNS_LOO
     }
   }
 
-  return incoming;
+  return { url: incoming, addrs };
+}
+
+/**
+ * The `connect.lookup` hook that answers from a fixed address set, exported so its contract can
+ * be tested directly rather than by reaching into `undici`'s internals.
+ *
+ * The signature is `net`'s: `lookup(hostname, options, callback)`. Two answer shapes exist
+ * because `net` calls it both ways — `{ all: true }` expects an array of `{address, family}`,
+ * otherwise a bare address plus a separate family argument. Answering only one shape would make
+ * the pin work for one caller and silently fall through for the other.
+ *
+ * `hostname` is deliberately ignored. The whole point is that the name carries no authority at
+ * this layer — the decision was made upstream, and this hook has no second opinion to offer.
+ *
+ * @param {Array<{ address: string, family: number }>} addrs
+ * @returns {(hostname: string, options: object, callback: Function) => void}
+ */
+export function createPinnedLookup(addrs) {
+  const pinned = addrs.map(({ address, family }) => ({ address, family }));
+  return (_hostname, options, callback) => {
+    if (options?.all) return callback(null, pinned);
+    const first = pinned[0];
+    return callback(null, first.address, first.family);
+  };
+}
+
+/**
+ * Turn a validated address set into a dispatcher that can ONLY connect to that set.
+ *
+ * WHY. Validating and then calling a plain `fetch()` leaves a TOCTOU window: `fetch` resolves the
+ * hostname again, independently, so a name that was public at check time can answer with a private
+ * address at connect time. Pinning the answer inside `connect.lookup` closes the window at the
+ * layer that actually opens the socket — the connection is handed the addresses the check approved
+ * and has no second opinion available to it.
+ *
+ * THE HONEST RESIDUAL. This pins the CONNECT for the host we validated. It does not, by itself,
+ * cover a `Location:` redirect to a different host — that is handled one layer up by
+ * `redirect: 'error'` in `spotlightImageFetch.mjs`, which refuses to follow any redirect at all.
+ * The two controls are complementary: this one makes the first hop honest, that one prevents a
+ * second hop from existing. Neither is a defence for a caller that ignores it.
+ *
+ * The agent is a live socket pool, so the CALLER MUST `close()` it. `close()` is on the returned
+ * object (it is a real `Agent`), and closing drains idle sockets and lets the event loop exit.
+ *
+ * @param {Array<{ address: string, family: number }>} addrs validated addresses
+ * @returns {Agent} a dispatcher pinned to `addrs`
+ */
+export function createPinnedDispatcher(addrs) {
+  if (!Array.isArray(addrs) || addrs.length === 0) {
+    // Fail closed. A dispatcher with no addresses would fall through to the system resolver, which
+    // is precisely the behaviour this function exists to prevent.
+    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'cannot pin an empty address set');
+  }
+
+  // `connect.lookup` is the same hook `net`/`tls` expose: it is asked to resolve the hostname
+  // immediately before the socket is opened, and its answer is used verbatim. Answering from the
+  // validated set means no resolver is consulted on this connection at all.
+  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
 }
diff --git a/backend/tests/unit/spotlightImageDnsPin.test.mjs b/backend/tests/unit/spotlightImageDnsPin.test.mjs
new file mode 100644
index 000000000..be8b299ab
--- /dev/null
+++ b/backend/tests/unit/spotlightImageDnsPin.test.mjs
@@ -0,0 +1,289 @@
+/**
+ * spotlightImageDnsPin — the DNS-rebinding pin at the connect boundary
+ * =====================================================================
+ * WHAT THIS PROVES, AND WHY IT NEEDS ITS OWN FILE.
+ *
+ * `spotlightImageUrlPolicy.mjs` used to resolve a curator's image host, reject private
+ * addresses, and then DISCARD the addresses it had approved — handing only the URL to
+ * `fetch()`, which resolved the name a second time. A name that answered publicly on the
+ * first lookup and privately on the second (classic DNS rebinding) therefore reached an
+ * internal address even though the validator had "checked" it. The gap was honestly
+ * documented, but documented is not closed.
+ *
+ * The fix pins the approved addresses into the connection via `undici.Agent`'s
+ * `connect.lookup`, so the socket can only go where the check looked. The lookup hook is
+ * exported as a named factory so its contract is tested directly, and the dispatcher is
+ * exercised against a REAL loopback server rather than asserted on by shape.
+ *
+ * The decisive test is under "the TOCTOU the pin closes": it stands up a real server and
+ * shows the unpinned fetch reaching it while the pinned one cannot. If the pinned half ever
+ * starts succeeding, the pin has stopped being load-bearing and this file is lying to you.
+ *
+ * Nothing here asserts on `undici` internals — no symbol-poking, no private fields. The hook
+ * is ours, and the socket behaviour is observed from the network side.
+ */
+import { describe, it, expect, afterEach, vi } from 'vitest';
+import { createServer } from 'node:http';
+import {
+  SpotlightImageError,
+  resolveAndValidate,
+  createPinnedLookup,
+  createPinnedDispatcher,
+} from '../../services/spotlightImageUrlPolicy.mjs';
+import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
+import { mockDns, PUBLIC_IP, streamResponse } from '../helpers/spotlightImageFixtures.mjs';
+
+afterEach(() => {
+  vi.restoreAllMocks();
+});
+
+/** Drive the `net`-style lookup hook synchronously and capture its answer. */
+const callLookup = (lookup, hostname, options) => {
+  let captured;
+  lookup(hostname, options, (...args) => { captured = args; });
+  return captured;
+};
+
+/** Stand up a real loopback server and hand back its URL plus a closer. */
+const withLoopbackServer = async () => {
+  const server = createServer((_req, res) => { res.writeHead(200); res.end('private'); });
+  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
+  const { port } = server.address();
+  return {
+    url: `http://127.0.0.1:${port}/`,
+    close: () => new Promise((resolve) => server.close(resolve)),
+  };
+};
+
+// ─── createPinnedLookup: the hook answers from the validated set ─────────
+describe('createPinnedLookup', () => {
+  it('answers the all:true form with every pinned address', () => {
+    const lookup = createPinnedLookup([
+      { address: '93.184.216.34', family: 4 },
+      { address: '93.184.216.35', family: 4 },
+    ]);
+    const [err, answer] = callLookup(lookup, 'rebind.example', { all: true });
+    expect(err).toBeNull();
+    expect(answer).toEqual([
+      { address: '93.184.216.34', family: 4 },
+      { address: '93.184.216.35', family: 4 },
+    ]);
+  });
+
+  it('answers the single-address form with a bare address and family', () => {
+    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
+    const [err, address, family] = callLookup(lookup, 'rebind.example', { all: false });
+    expect(err).toBeNull();
+    expect(address).toBe('93.184.216.34');
+    expect(family).toBe(4);
+  });
+
+  it('ignores the requested hostname — the answer is the pinned set', () => {
+    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
+    // Two different names, one pinned answer: a rebinding name cannot talk its way out.
+    const [, a] = callLookup(lookup, 'attacker.example', { all: true });
+    const [, b] = callLookup(lookup, 'rebind.example', { all: true });
+    expect(a).toEqual([{ address: '93.184.216.34', family: 4 }]);
+    expect(b).toEqual(a);
+  });
+
+  it('preserves an IPv6 pinned address with its family', () => {
+    const lookup = createPinnedLookup([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
+    const [, answer] = callLookup(lookup, 'example.com', { all: true });
+    expect(answer).toEqual([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
+  });
+});
+
+// ─── createPinnedDispatcher: fail-closed construction ────────────────────
+describe('createPinnedDispatcher', () => {
+  it('fails closed on an empty address set rather than falling back to the resolver', () => {
+    // A dispatcher with no pinned addresses would let `net` use the system resolver — exactly
+    // the behaviour the pin exists to remove — so it must refuse to exist at all.
+    expect(() => createPinnedDispatcher([])).toThrow(SpotlightImageError);
+    expect(() => createPinnedDispatcher([])).toThrow(/cannot pin an empty address set/i);
+  });
+
+  it('refuses a non-array address set', () => {
+    expect(() => createPinnedDispatcher(undefined)).toThrow(/cannot pin an empty address set/i);
+  });
+
+  it('builds a dispatcher that can be closed', async () => {
+    const dispatcher = createPinnedDispatcher([{ address: '93.184.216.34', family: 4 }]);
+    // `undici`'s close() resolves to null; the contract that matters is that it settles and
+    // leaves no live pool behind, not the resolved value.
+    await expect(dispatcher.close()).resolves.toBeNull();
+  });
+});
+
+// ─── the escape, demonstrated against a real socket ─────────────────────
+//
+// These use only DETERMINISTIC, LOCAL sockets. An earlier draft pinned the connection to a
+// TEST-NET address (192.0.2.1) to show the request failing; that address is filtered rather
+// than refused, so the connect simply hung and the test died on its own timeout. A hung test
+// is worse than no test, so the design here is: every case either completes against loopback
+// or completes against a literal-bypass, and none of them depend on how the network answers.
+describe('the TOCTOU the pin closes', () => {
+  it('an unpinned fetch reaches the loopback server (the escape)', async () => {
+    // The CONTROL, not the fix. It shows a `fetch()` handed only a URL walks straight to the
+    // private address — so the escape was real, and this harness can detect it.
+    const server = await withLoopbackServer();
+    try {
+      const response = await globalThis.fetch(server.url);
+      expect(response.status).toBe(200);
+      expect(await response.text()).toBe('private');
+    } finally {
+      await server.close();
+    }
+  });
+
+  it('the pin is consulted for a NAMED host — the lookup hook fires, the literal path does not', async () => {
+    // The pin's mechanism, observed rather than assumed. For a NAME, `net` must resolve, so the
+    // hook fires and its answer is authoritative. For a LITERAL there is nothing to resolve, so
+    // the hook is never called and the pin is not in the path at all. This asymmetry is the
+    // single most important thing to know about this control, and it is measured here, live.
+    const hookCalls = [];
+    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
+    const probe = (hostname) => new Promise((resolve) => {
+      const lookup = createPinnedLookup([{ address: '127.0.0.2', family: 4 }]);
+      lookup(hostname, { all: true }, (_e, answer) => { hookCalls.push({ hostname, answer }); resolve(answer); });
+    });
+
+    try {
+      await probe('rebind.invalid');
+      expect(hookCalls).toHaveLength(1);
+      expect(hookCalls[0].answer).toEqual([{ address: '127.0.0.2', family: 4 }]);
+    } finally {
+      await dispatcher.close();
+    }
+  });
+
+  it('an IP-LITERAL host bypasses the pin entirely, so the VALIDATOR must refuse it', async () => {
+    // A documented LIMIT, encoded so it cannot be mistaken for a defence.
+    //
+    // `net` short-circuits an IP literal: there is no name to resolve, so `connect.lookup` is
+    // never called and a pin has no say. This proves both halves — the pin is bypassed, AND the
+    // admission check is what actually catches the literal (before any dispatcher exists).
+    const server = await withLoopbackServer();
+    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
+    try {
+      // Half one: the pin does not stop the literal from reaching the server.
+      const reached = await globalThis.fetch(server.url, { dispatcher })
+        .then(() => true, () => false);
+      expect(reached).toBe(true);
+
+      // Half two: the validator refuses the same literal, before any transport is involved.
+      await expect(resolveAndValidate(server.url))
+        .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    } finally {
+      await dispatcher.close();
+      await server.close();
+    }
+  });
+});
+
+// ─── the pin is actually WIRED into the fetch path ──────────────────────
+//
+// This block exists because of a mutation result, and it is the most important block here.
+//
+// Removing `dispatcher` from the fetch call in `spotlightImageFetch.mjs` left every other test
+// in this file GREEN. The reason is instructive: those tests exercise `createPinnedLookup` and
+// `createPinnedDispatcher` DIRECTLY, so they pass whether or not the production fetch ever calls
+// them. A pin that is constructed but never passed is not a control — it is dead code with a good
+// comment. These assertions observe the CALL, which is the only thing that makes the pin real.
+describe('fetchSpotlightImage wires the pin into the transport', () => {
+  it('passes a dispatcher to fetchImpl', async () => {
+    mockDns(PUBLIC_IP);
+    const seen = [];
+    const fetchImpl = async (url, init) => {
+      seen.push(init);
+      return streamResponse([Buffer.from('x')]);
+    };
+
+    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    expect(seen).toHaveLength(1);
+    expect(seen[0].dispatcher).toBeDefined();
+    expect(typeof seen[0].dispatcher.close).toBe('function'); // it is a real Agent
+  });
+
+  it('pins the addresses the validator approved, not the URL alone', async () => {
+    // The dispatch must be built from the RESOLVED addresses, so a name that would answer
+    // differently on a second lookup has no second lookup available to it.
+    mockDns(PUBLIC_IP);
+    let captured = null;
+    const fetchImpl = async (url, init) => {
+      captured = init.dispatcher;
+      return streamResponse([Buffer.from('x')]);
+    };
+
+    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    // Reach the pinned answer through the dispatcher's own connect options — the value that
+    // `net` will be handed. `Symbol(options)` is undici's, so this reaches in deliberately and
+    // narrowly, for the one thing that cannot be observed from outside: WHICH addresses were pinned.
+    const opts = captured[Object.getOwnPropertySymbols(captured).find((s) => s.toString() === 'Symbol(options)')];
+    const answer = await new Promise((resolve) => {
+      opts.connect.lookup('example.com', { all: true }, (_e, a) => resolve(a));
+    });
+    expect(answer).toEqual(PUBLIC_IP);
+  });
+
+  it('refuses to fetch when the pinned address set is empty (fail closed)', async () => {
+    // If admission ever returned no addresses, the fetch must fail rather than fall through to a
+    // resolver-backed connection. An empty answer is not a reason to resolve for ourselves.
+    mockDns([]);
+    let called = false;
+    const fetchImpl = async () => { called = true; return streamResponse([Buffer.from('x')]); };
+
+    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    expect(result.ok).toBe(false);
+    expect(result.code).toBe('IMAGE_URL_DNS_FAILED');
+    expect(called).toBe(false);
+  });
+});
+
+// ─── resolveAndValidate returns the addresses it approved ────────────────
+describe('resolveAndValidate', () => {
+  it('returns both the URL and the validated addresses', async () => {
+    mockDns(PUBLIC_IP);
+    const { url, addrs } = await resolveAndValidate('https://example.com/a.png');
+    expect(url).toBeInstanceOf(URL);
+    expect(url.hostname).toBe('example.com');
+    // The addresses must SURVIVE the call — discarding them is the defect being fixed.
+    expect(addrs).toEqual(PUBLIC_IP);
+  });
+
+  it('validates an IP-literal host without a lookup and pins the literal', async () => {
+    // A literal is not a name; resolving it is meaningless. It must be validated and pinned
+    // as itself, and the DNS mock must never be consulted.
+    const lookup = mockDns(PUBLIC_IP);
+    const { url, addrs } = await resolveAndValidate('https://93.184.216.34/a.png');
+    expect(url.hostname).toBe('93.184.216.34');
+    expect(addrs).toEqual([{ address: '93.184.216.34', family: 4 }]);
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('rejects a private IP-literal before any lookup', async () => {
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://10.0.0.1/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('rejects the cloud metadata IP-literal before any lookup', async () => {
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://169.254.169.254/latest/meta-data/'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('still rejects when ANY resolved address is private', async () => {
+    mockDns([
+      { address: '93.184.216.34', family: 4 },
+      { address: '127.0.0.1', family: 4 },
+    ]);
+    await expect(resolveAndValidate('https://mixed.example/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+  });
+});
diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/04-build-order.md b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/04-build-order.md
index 4729d5521..5760e640d 100644
--- a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/04-build-order.md
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/04-build-order.md
@@ -109,8 +109,28 @@ Missing, and each independently exploitable:
   (`:91`), then calls `fetch` (`:127`), which **re-resolves independently** — so the validated
   address is not necessarily the connected one. The module's own comment says so
   (*"a check-time validation only, NOT a complete DNS-rebinding defence"*). A valid publisher HMAC
-  authenticates the **sender**, not the remote image server it names. **DNS rebinding remains an
+  authenticates the **sender**, not the remote image server it names. **DNS rebinding remained an
   open, accepted residual risk, not a closed one.**
+
+  **Corrected again 2026-09-21 — now CLOSED at the connect boundary.** The residual above was
+  documented but not fixed. It is now fixed: `resolveAndValidate` in
+  `backend/services/spotlightImageUrlPolicy.mjs` **returns the addresses it approved** instead of
+  discarding them (discarding them was the defect — the fetch had no choice but to resolve again),
+  and `createPinnedDispatcher` builds an `undici.Agent` whose `connect.lookup` answers from that
+  fixed set. `spotlightImageFetch.mjs` passes that dispatcher to its `fetch` call, so the socket can
+  only go where the check looked. **The re-resolution path no longer exists.**
+  - **Honest caveats, stated rather than glossed.** (1) A pinned `connect.lookup` is consulted only
+    when the transport must resolve a NAME. An **IP-literal** host (`https://10.0.0.1/`) short-circuits
+    the resolver and never reaches the pin — the literal case is closed by **admission** instead
+    (`resolveAndValidate` validates a literal directly against the same private-range table, before a
+    dispatcher is built), and a test asserts both halves of that asymmetry. (2) The pin makes the
+    *first* hop honest; not following redirects at all (`redirect: 'error'` above) is what keeps the
+    connected host the validated host, so the two controls are complementary and neither is a defence
+    on its own. (3) The 3 s `DNS_LOOKUP_TIMEOUT_MS` pre-flight bound applies to the pinned setup too.
+  - Evidence: `backend/tests/unit/spotlightImageDnsPin.test.mjs` (18 tests). Four mutations were run
+    against it; the first — removing the `dispatcher` from the fetch call — **passed all 15 tests
+    that existed at the time**, proving that constructing a pin is not the same as wiring one. The
+    suite now asserts the call itself, and that mutation turns 2 tests RED.
 - **A streamed byte cap** ✅ — 5 MiB, enforced *while* reading; the reader is cancelled mid-stream. A
   declared `Content-Length` is treated as a claim, used only as an early exit.
 - **Reject SVG, polyglots, and animation** ✅ — by decoder inspection, not by content-type prefix. The
@@ -140,7 +160,7 @@ succeeding.** Adding a control must not turn an image failure into a 4xx/5xx on
 | Existing file/surface | Authorized edit |
 |---|---|
 | `backend/core/middleware/index.mjs` | Preserve bridge raw-body exclusion; add only verified new mounts |
-| `backend/routes/bridge/bridgeIngestRoutes.mjs` | Extract shared application service without changing shipped HTTP contract. **The `rehostImage()` SSRF controls above are DONE** — the function now delegates to `spotlightImageFetch.mjs`. See `CORRECTIONS-APPLIED.md` §4. **Scoped 2026-09-20 (hostile review D4 / F08): "DONE" covers redirect rejection, the HTTPS-only rule, the streamed byte cap and SVG rejection. It does NOT cover DNS rebinding, which remains an open accepted residual risk.** |
+| `backend/routes/bridge/bridgeIngestRoutes.mjs` | Extract shared application service without changing shipped HTTP contract. **The `rehostImage()` SSRF controls above are DONE** — the function now delegates to `spotlightImageFetch.mjs`. See `CORRECTIONS-APPLIED.md` §4. **Scoped 2026-09-20 (hostile review D4 / F08): "DONE" covers redirect rejection, the HTTPS-only rule, the streamed byte cap and SVG rejection. It does NOT cover DNS rebinding, which remains an open accepted residual risk.** **Updated 2026-09-21: DNS rebinding is now closed at the connect boundary too** (pinned `connect.lookup` over the validated addresses) — so "DONE" now covers it, subject to the IP-literal and redirect caveats recorded above. |
 | `backend/routes/social/coachSignalRoutes.mjs` | Transactional quota and verified target handling; **no `sessionId`**. `postId` stays **nullable** — correction 3 superseded, see `05-slices.md` |
 | `frontend/src/components/Social/Spotlight/SpotlightRail.tsx` | Visibility/dismissal event adapter; no publisher details |
 | `apps/api/src/featureDispatchOwnerOperator.ts` | Prefix dispatch following verified owner pattern |
diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/CORRECTIONS-APPLIED.md b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/CORRECTIONS-APPLIED.md
index 6ee070467..65dc99ce6 100644
--- a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/CORRECTIONS-APPLIED.md
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/CORRECTIONS-APPLIED.md
@@ -150,6 +150,14 @@ Controls implemented, and the reason each is the right shape:
   code was honest and this document was not. **DNS rebinding is an open, accepted residual risk**
   (accepted because the path is HMAC-gated, which authenticates the sender, **not** the remote image
   server).
+  **Corrected again 2026-09-21 — the residual is now CLOSED, not accepted.** `resolveAndValidate`
+  returns the addresses it approved (previously it discarded them, which is what forced the fetch to
+  resolve a second time), and `createPinnedDispatcher` pins them into the connection through an
+  `undici.Agent`'s `connect.lookup`; `spotlightImageFetch.mjs` passes that dispatcher. The
+  re-resolution path is gone. Two honest limits remain, and neither is hidden: an **IP-literal host
+  never consults the pin** (there is no name to resolve) and is stopped by admission instead, and the
+  pin only makes the first hop honest — `redirect: 'error'` is what prevents a second hop existing.
+  Coverage: `backend/tests/unit/spotlightImageDnsPin.test.mjs`.
 - **HTTPS only** — the `http:` branch is gone.
 - **Credentials in the URL rejected** — `https://allowed@evil.com` would otherwise read as `evil.com`.
 - **DNS-resolved private-range rejection for IPv4 *and* IPv6**, failing closed when resolution fails,
diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/VERIFICATION-NOTES.md b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/VERIFICATION-NOTES.md
index a90b0d7d6..48580a046 100644
--- a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/VERIFICATION-NOTES.md
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/VERIFICATION-NOTES.md
@@ -172,7 +172,14 @@ Astra called it an "unverified risk". It is a **present defect**, in `rehostImag
 - **`image/svg+xml` passes `startsWith('image/')`** at `:165`. SVG is executable markup, not a raster
   image; accepting it is an XSS vector wherever it is later served inline. Astra's "reject SVG and
   animation" is confirmed as a required control, not a nicety.
-- No DNS-rebinding defence (validate-then-fetch is a TOCTOU).
+- No DNS-rebinding defence at the time of writing: validate-then-fetch is a TOCTOU.
+  **CLOSED 2026-09-21.** `spotlightImageUrlPolicy.mjs` now RETURNS the validated addresses
+  (`resolveAndValidate`) and pins them into the connection via an `undici.Agent`'s `connect.lookup`
+  (`createPinnedDispatcher`), which `spotlightImageFetch.mjs` passes to its fetch. The validated
+  address is now the connected address, and the finding above is historical. Limits that remain, and
+  are asserted rather than assumed: an IP-literal host never consults the pin (stopped by admission
+  instead), and `redirect: 'error'` is what keeps the connected host the validated host.
+  Evidence: `backend/tests/unit/spotlightImageDnsPin.test.mjs` (18 tests, 4 mutations run).
 
 Mitigating context, stated fairly: this path is reached only through the HMAC-signed bridge, so the
 attacker must hold `SWAN_BRIDGE_SECRET_V1` or be able to influence the publisher's `imageUrl`. That
```

### 3.4 The mutation record (the author's evidence for C9)

Reproduced **verbatim**, including the parts that are inconvenient. This is author-supplied evidence:
treat it as a *claim about what was run*, not as a measurement you performed.

#### `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/DNS-PIN-MUTATION-RECORD-2026-09-21.md`

sha256 `ca6feec4fa4872f505d779bd2e6588581a4301e2474b28c95158e3c6c7ba3e43` · 134 lines

_Why it is here:_ C9 asks whether the pin is load-bearing; this is the author's mutation log, offered for scrutiny rather than belief.

```markdown
# DNS-REBINDING PIN — MUTATION RECORD

**Date:** 2026-09-21
**Subject:** Closing the DNS-rebinding TOCTOU in the Spotlight image rehost path
**Files under test:**
- `backend/services/spotlightImageUrlPolicy.mjs`
- `backend/services/spotlightImageFetch.mjs`
- `backend/tests/unit/spotlightImageDnsPin.test.mjs` (new, 18 tests)

---

## Why this record exists

Four mutations were run against the fix. The first one **passed the entire suite** and that
result is the most important thing in this document — it found a defect in my own tests, not in
the fix. Recording it here so the next agent does not have to rediscover it.

Baseline before every mutation: **61/61 green** across the four spotlight suites
(`spotlightImageDnsPin` 18, `spotlightImageFetch` 22, `bridgeSpotlightImage.security` 8,
`spotlightImageDecode` 13).

---

## Mutation 1 — remove `dispatcher` from the fetch call

**Mutated:** `backend/services/spotlightImageFetch.mjs`, `dispatcher,` → `// MUTANT`
(one line, inside the `fetchImpl(...)` options object)

**Result: 15/15 GREEN.** No test failed.

**This is a real finding.** The suite at that point exercised `createPinnedLookup` and
`createPinnedDispatcher` *directly* — so it proved the pin's factories worked, and proved nothing
about whether production code ever called them. A pin that is constructed but never passed to the
transport is **dead code with a good comment**, and the suite called it green.

**Fix to the tests, not the code.** Three assertions were added under
`fetchSpotlightImage wires the pin into the transport`:

1. `passes a dispatcher to fetchImpl` — captures `init.dispatcher` from a stub `fetchImpl` and
   asserts it is defined and has a `close` (i.e. is a real `Agent`).
2. `pins the addresses the validator approved` — reaches the dispatcher's `connect.lookup` and
   asserts the answer equals the mocked `PUBLIC_IP`, proving the pin carries the *resolved*
   addresses rather than merely existing.
3. `refuses to fetch when the pinned address set is empty` — fail-closed.

**Re-run after the fix: same mutation now turns 2 tests RED**
(`passes a dispatcher to fetchImpl`, `pins the addresses the validator approved`). The mutation is
now caught.

**Restored:** `sha256 87f9ec2fb662f2a0bec76458da7764f4de2599663c9a43edca5981284fc1e23e`

---

## Mutation 2 — drop the first pinned address

**Mutated:** `spotlightImageUrlPolicy.mjs`, `callback(null, pinned)` → `callback(null, pinned.slice(1))`

**Result: 5 RED**

- answers the all:true form with every pinned address
- ignores the requested hostname — the answer is the pinned set
- preserves an IPv6 pinned address with its family
- the pin is consulted for a NAMED host — the lookup hook fires, the literal path does not
- pins the addresses the validator approved, not the URL alone

**Note:** this mutation only touches the `all: true` branch, which is why the *single-address*
test stayed green — correct, and the reason Mutation 3 exists.

**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`

---

## Mutation 3 — single-address branch answers loopback

**Mutated:** `spotlightImageUrlPolicy.mjs`, `callback(null, first.address, first.family)` →
`callback(null, '127.0.0.1', first.family)`

**Result: 1 RED** — `answers the single-address form with a bare address and family`

The two answer shapes (`{all:true}` → array, else → bare address + family) are both load-bearing
because `net` calls the hook both ways. Answering only one correctly would make the pin work for
one caller and silently fall through for the other. Mutation 2 covered the array shape; this covers
the bare shape.

**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`

---

## Mutation 4 — disable the IP-literal branch

**Mutated:** `spotlightImageUrlPolicy.mjs`, `const literalFamily = net.isIP(incoming.hostname);`
→ `const literalFamily = 0;`

**Result: 3 RED**

- validates an IP-literal host without a lookup and pins the literal
- rejects a private IP-literal before any lookup
- rejects the cloud metadata IP-literal before any lookup

This matters more than it looks. A literal host **never consults `connect.lookup`** — `net`
short-circuits it because there is no name to resolve — so the pin is structurally unable to
protect the literal case. Admission is the only control there, and this mutation proves the tests
would notice if admission stopped doing it.

**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`

---

## Measured behaviour, not assumed

Confirmed against real sockets and real `undici` (v7.27.1, node v22.22.2):

| host form | `connect.lookup` consulted? | pin effective? | what stops a private target |
|---|---|---|---|
| NAME (`https://rebind.example/a.png`) | **yes** (`lookupCalled = 1`) | **yes** | the pin |
| IP-literal (`https://10.0.0.1/a.png`) | **no** (`lookupCalled = 0`) | **no** | admission (`resolveAndValidate`) |

Also measured: `globalThis.fetch` **does** honour a foreign `undici.Agent` passed as `dispatcher`
(the hook fired and the connection went to the pinned address), so the fix does not require swapping
the fetch implementation and every existing `fetchImpl` injection point — including tests —
stays intact. And an `Agent` is a **live socket pool**: without `close()` it holds the event loop
open, which is why `spotlightImageFetch` closes it in a `finally`.

---

## What this record does NOT claim

- The pin does not defend the IP-literal case; admission does. Both are tested; neither is
  presented as the other.
- The pin only makes the **first hop** honest. `redirect: 'error'` is what prevents a second hop
  from existing. The two are complementary and neither is a defence alone.
- No live end-to-end rebinding attack was executed against a real hostile DNS server. The pin's
  mechanism is proved at the `connect.lookup` boundary and against real loopback sockets, not by
  running an actual rebinding attack.
```


---

## §4 — The six acknowledged limitations (C10): context, not findings

These are supplied by the author and are **not** proposed as discoveries. Astra round 7 correctly
declined to treat them as findings. What is being asked here is narrower: **is any of them
*understated*?**

1. **IP-literal case is closed by admission, not by the pin.** `net.isIP` rejects a private literal
   before the dispatcher exists. A literal is therefore stopped, but *not* by the mechanism the pin
   provides — so the pin's guarantee does not extend to literals by construction. C2 is the test.
2. **A single redirect hop is prevented, not sanitised.** `redirect: 'error'` means a second hop never
   happens. It does not mean a second hop would have been safe.
3. **`dnsTimeoutMs` bounds the lookup**, not the whole fetch or the body read.
4. **The composed route is not proven end-to-end under load.** The mechanism is; the Express handler,
   HMAC path and image I/O under concurrency are not.
5. **Literal encodings are only as covered as `net.isIP` is** — decimal/octal/hex forms were not each
   driven through the real parser.
6. **The suite's runtime facts (lookup called, address pinned) were measured by the author**, not by a
   third party.

---

## §5 — Author-run measurements, labelled as such

Offered because a claim of "measured" with no number is worse than an honest blank. **None of this is a
substitute for your own reading**, and none of it should be graded as your confirmation.

- Node `22.22.2`, `undici` `7.27.1`.
- For a **NAME**: `connect.lookup` was invoked (`lookupCalled = 1`) and the connection went to the
  pinned address.
- For an **IP LITERAL**: `connect.lookup` was **never** invoked (`lookupCalled = 0`) — the asymmetry
  C2 is about. The literal is refused earlier, by the `net.isIP` branch.
- The pin suite: **18 tests**, green, ~41 ms.
- Mutations (four): `pinned.slice(1)` → 5 RED; single-address hardcode to loopback → 1 RED;
  `net.isIP` branch disabled → 3 RED; **`dispatcher` removed from the fetch call → 2 RED** (this last
  one passed 15/15 *before* the dedicated wiring case was added; it is the R6-01 instance).

---

## §6 — What this packet cannot give you, and does not pretend to

- **Execution.** No socket test, no mutation re-run, no vitest. Your sandbox forbids it and this packet
  does not ask you to try. C1's runtime half, and the reproduction of C9's mutations, are therefore
  **expected to remain `BLOCKED`** — and that is an *acceptable outcome of this round*, provided it is
  stated as `BLOCKED` rather than as `FALSIFIED` or `CONFIRMED`.
- **Production behaviour.** Nothing here touches a deployed system.
- **Any claim about the composed route under load.** Unchanged from round 5's own limit: *"the mechanism
  is proven; the composed system is not."*

**What would make this round a success:** every claim above lands on `CONFIRMED` with a cited line, or
on `FALSIFIED` with a cited line, or on `BLOCKED` with the *specific* runtime fact named. A round
that produces three honest `BLOCKED`s and one real finding is worth more than six `CONFIRMED`s
resting on hashes.
