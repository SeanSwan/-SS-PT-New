/**
 * read-capped.mjs — read at most N bytes (plus at most one in-flight chunk) from a fetch Response,
 * cancelling rather than draining.
 * ================================================================================================
 * Extracted from check-mcp-health.mjs when that file crossed the 300-line cap (Rule 4 prescribes
 * extraction over comment-shaving). It is a general HTTP utility with no MCP knowledge, it is
 * independently tested, and any future caller that talks to an untrusted endpoint wants it.
 *
 * WHY IT EXISTS: `await response.text()` buffers the ENTIRE body before you can slice it, so a
 * request timeout bounds TIME, not MEMORY — an endpoint streaming fast enough fills the heap inside
 * the timeout window. An earlier version of this logic claimed a bound it did not have, then kept a
 * `.text()` fallback branch that reintroduced the same defect one branch over.
 *
 * NULL BODIES ARE NOT AN ERROR. Per the fetch spec, null-body statuses (101/204/205/304) expose
 * `body === null`. A version of this that asserted "a Response ALWAYS has a stream" threw on those,
 * so a server answering 204 was reported UNREACHABLE despite having been reached. A null body is
 * zero bytes — trivially bounded — so it returns as such. Only a genuinely stream-less runtime
 * throws, which callers surface as an unreachable-class error rather than a crash.
 *
 * @module lib/read-capped
 */

/**
 * @param {Response} r    a fetch Response
 * @param {number}   cap  maximum bytes to retain
 * @returns {Promise<{text: string, bytes: number, truncated: boolean}>}
 *   `text`      decoded body, clamped to `cap` — safe to match against
 *   `bytes`     how many bytes were actually READ (may exceed `cap` when truncated)
 *   `truncated` whether more body remained when the cap was hit
 */
export async function readCapped(r, cap) {
  if (!r.body) return { text: '', bytes: 0, truncated: false };
  if (!r.body.getReader) throw new Error('runtime without web streams is unsupported');

  const reader = r.body.getReader();
  const chunks = [];
  let n = 0;
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      n += value.byteLength;
      // Check AFTER accumulating so a single over-cap chunk is still clamped, not dropped.
      if (n > cap) { truncated = true; break; }
    }
  } finally {
    // cancel(), never drain: draining an endless body defeats the whole point of a cap.
    await reader.cancel().catch(() => {});
  }
  return { text: Buffer.concat(chunks).subarray(0, cap).toString('utf8'), bytes: n, truncated };
}
