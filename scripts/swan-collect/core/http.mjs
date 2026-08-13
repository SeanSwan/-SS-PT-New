/**
 * http.mjs — bounded response reading.
 * ============================================================================
 * Split out of item.mjs so that file stays the PURE data contract (and under the
 * 300-line cap). Reading a body is an I/O concern; normalizing a record is not.
 *
 * @module swan-collect/core/http
 */

import { CollectError } from './item.mjs';

/**
 * Read a response body with a HARD byte ceiling, aborting the stream the moment
 * the cap is crossed.
 *
 * Kimi K3 packet-7 M1: checking `.length` after `await res.text()` bounds CPU but
 * NOT memory — a hostile endpoint streaming 2 GB is fully buffered before the
 * check ever runs. Reading incrementally and cancelling makes the cap real.
 *
 * Falls back to `.text()` when the response exposes no readable body (test stubs,
 * older runtimes); the post-hoc length check still applies on that path.
 */
export async function readCapped(res, maxBytes, label = 'response') {
  const body = res && res.body;
  if (!body || typeof body.getReader !== 'function') {
    const text = await res.text();
    if (text.length > maxBytes) throw new CollectError(`${label}: exceeds ${maxBytes} bytes — refusing to parse`);
    return text;
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new CollectError(`${label}: exceeds ${maxBytes} bytes — stream aborted`);
    }
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}
