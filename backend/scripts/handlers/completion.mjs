/**
 * completion.mjs — how a finished job is reported to the queue.
 *
 * Extracted from `render-agent.mjs` for two reasons, in this order:
 *
 * 1. It was inline and untestable, and consequently WRONG. Both fields were hardcoded
 *    to mediasync's shape, so the first `generate` job recorded an mp4 in the queue as
 *    `mediasync.json` with mime `application/json` — the queue storing a confident lie
 *    about an artifact it had never inspected. Unit tests could not reach it; only
 *    driving the real agent against a stub server exposed it.
 * 2. `render-agent.mjs` is already over the 300-line cap (rule 4). Keeping these there
 *    made a pre-existing violation meaningfully worse.
 *
 * A handler that produces something other than a JSON measurement MUST declare its own
 * `r2Key`, `mime` and `summary`. The fallbacks reproduce mediasync's recorded behaviour
 * byte-for-byte, so adding handlers never changes what the existing one reports.
 *
 * ── ROUND 23 ────────────────────────────────────────────────────────────────
 * The ledger's file-table assertion exempted this module BY NAME, on the grounds that the
 * lane had never modified it. That is a fact about the patch, not about the lane's
 * dependency surface — `generateVideo.mjs` imports `mimeForFilename` from here, so the
 * queue's artifact pointer is built out of this file's output on every video job. It had
 * never been attacked in twenty-two rounds. Three defects, all measured before any fix:
 *
 *   1. `MIME_BY_EXT[ext]` resolved through `Object.prototype`. `mimeForFilename('out
 *      .constructor')` returned the **Object constructor — a function** — and
 *      `('out.__proto__')` returned `Object.prototype`. Both are truthy, so the `||`
 *      fallback below passed them through, and `JSON.stringify` then **dropped the key
 *      entirely**: the queue received a completion body with no `mime` at all. The same
 *      prototype-lookup class round 18 fixed three times in `comfyuiGraph.mjs`.
 *   2. `completionSummary`'s fallback printed `offset undefineds usable=undefined` for a
 *      handler that declares nothing — the exact string this file's own header calls
 *      "worse than silence". The `??` only helped callers that already declared a
 *      summary; the indicted string was left in place as the default.
 *   3. `completionBody` used `||`, which is an **absence** test, in the position where a
 *      **type** is required. A non-string truthy mime sailed straight through.
 *
 * The fix for all three is one predicate: a field that must be a non-empty string is
 * read as one, and anything else is treated as undeclared.
 */

/** A non-empty string, or null. `||` answers "is it absent", never "is it a string". */
const str = (v) => (typeof v === 'string' && v.trim() !== '' ? v : null);

/** Own-property test. `Object.hasOwn(null, k)` THROWS, so the null guard is load-bearing. */
const hasOwn = (obj, key) => obj != null && Object.hasOwn(obj, key);

/** The queue's artifact pointer for a finished job. */
export function completionBody(job, output = {}) {
  return {
    r2Key: str(output.r2Key) || `jobs/${job.id}/mediasync.json`,
    mime: str(output.mime) || 'application/json',
    output,
  };
}

/**
 * The one line the operator actually watches.
 *
 * Printed `offset undefineds usable=undefined` for every render — worse than silence,
 * because it reads as a measurement that ran and failed rather than a field that was
 * never meant to apply. The offset line is mediasync's and is now reached only when BOTH
 * of mediasync's fields are actually present; anything else says what is missing rather
 * than inventing a measurement.
 */
export function completionSummary(output = {}) {
  const declared = str(output.summary);
  if (declared) return declared;

  const hasOffsetLine =
    output.offsetSeconds !== undefined && output.usable !== undefined;
  if (!hasOffsetLine) return 'no summary declared by this handler';

  const offset =
    typeof output.offsetSeconds === 'number'
      ? output.offsetSeconds.toFixed(4)
      : String(output.offsetSeconds);
  return `offset ${offset}s usable=${output.usable}`;
}

/** Map a produced filename to the mime the queue should record. */
const MIME_BY_EXT = Object.freeze({
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mkv: 'video/x-matroska', gif: 'image/gif',
});

export function mimeForFilename(filename) {
  const ext = String(filename || '').match(/\.([^.]+)$/)?.[1]?.toLowerCase();
  // OWN properties only. `MIME_BY_EXT[ext]` resolves through Object.prototype, so an
  // artifact named `out.constructor` returned the Object CONSTRUCTOR and `out.__proto__`
  // returned Object.prototype. Only names that are ALREADY lowercase can reach the
  // prototype — `toString` lowercases to `tostring` and misses — which is exactly why
  // this looked safe. The type is asserted too, because the value goes into a JSON body
  // and an HTTP header, and a function is dropped by the first and stringified by the
  // second.
  const hit = hasOwn(MIME_BY_EXT, ext) ? MIME_BY_EXT[ext] : null;
  return str(hit) || 'application/octet-stream';
}
