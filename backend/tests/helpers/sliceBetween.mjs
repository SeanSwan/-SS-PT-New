/**
 * sliceBetween — anchor-safe source windowing for contract/"truth" tests.
 *
 * Launch audit 2026-08-04. ~40 security and money contract tests in this repo
 * scope their assertions with `src.slice(src.indexOf(anchor), ...)`. That
 * pattern has TWO silent failure modes, both observed in-repo:
 *
 *   1. A missing START anchor yields `indexOf` === -1. `slice(-1 - 200, ...)`
 *      produces an EMPTY window, and every `not.toMatch(...)` negative
 *      assertion against it then passes VACUOUSLY — the test goes green while
 *      asserting nothing. (Observed as a latent risk on the Stripe
 *      double-submit guard.)
 *   2. A missing END anchor yields -1, and `slice(start, -1)` silently widens
 *      the window to the entire rest of the file. The assertion then measures
 *      the wrong function. (Observed live: the password-change refresh-token
 *      revocation guard was scanning ~16k chars of unrelated code and passed
 *      only because its target string happened to occur exactly once.)
 *
 * Both modes fail SILENTLY and in the safe-looking direction, which is the
 * worst property a security guard can have. This helper makes a drifted anchor
 * a loud, immediate failure instead.
 */

/**
 * Return the source between two anchors, throwing if either is absent.
 *
 * @param {string} source     Full file source.
 * @param {string} startAnchor Literal string marking the start of the window.
 * @param {string} [endAnchor] Literal string marking the end. Omit to run to EOF.
 * @param {{ padBefore?: number, padAfter?: number, label?: string }} [options]
 * @returns {string} The windowed source (never empty, never the whole file by accident).
 */
export function sliceBetween(source, startAnchor, endAnchor, options = {}) {
  const { padBefore = 0, padAfter = 0, label = 'source' } = options;

  if (typeof source !== 'string' || source.length === 0) {
    throw new Error(`[sliceBetween] ${label}: source is empty — nothing to assert against.`);
  }

  const start = source.indexOf(startAnchor);
  if (start === -1) {
    throw new Error(
      `[sliceBetween] ${label}: START anchor not found: ${JSON.stringify(startAnchor)}. `
      + 'The code moved or was renamed. Update the anchor — do NOT let this window '
      + 'silently become empty, which would make negative assertions pass vacuously.',
    );
  }

  let end;
  if (endAnchor === undefined || endAnchor === null) {
    end = source.length;
  } else {
    const found = source.indexOf(endAnchor, start + startAnchor.length);
    if (found === -1) {
      throw new Error(
        `[sliceBetween] ${label}: END anchor not found after the start anchor: `
        + `${JSON.stringify(endAnchor)}. Without it the window silently widens to the whole `
        + 'rest of the file and the assertion measures unrelated code.',
      );
    }
    end = found;
  }

  const window = source.slice(Math.max(0, start - padBefore), Math.min(source.length, end + padAfter));

  if (window.length === 0) {
    throw new Error(`[sliceBetween] ${label}: computed an EMPTY window — assertions would be vacuous.`);
  }

  return window;
}

export default sliceBetween;
