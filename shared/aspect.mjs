/**
 * aspect.mjs — ratio arithmetic, and the honesty rules that go with it.
 *
 * Split out of `variantRun.mjs` when that file crossed the 300-line cap (rule 4).
 * The split also fixes a layering smell that was noted and then left alone: the
 * OpenRouter provider was importing the RUN-LEDGER module purely to get ratio
 * maths, so a provider adapter depended on the persistence layer for geometry.
 * Now both import this, and neither imports the other.
 *
 * THE RULE THIS FILE ENCODES: an unmeasurable value is `null`, never `0`. A zero
 * deviation means "measured, and it matched"; a null means "nobody looked". They
 * are different facts and collapsing them is how a system starts lying quietly.
 */

/**
 * Parse "16:9" into a number. Returns null for anything that is not a ratio,
 * rather than a plausible-looking wrong number — the lesson from a dimension
 * parser that read a JPEG at PNG offsets and reported 65536x4293722192 without
 * complaint. A confident wrong answer is worse than an admitted gap.
 */
export function ratioToNumber(ratio) {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(String(ratio ?? '').trim());
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return null;
  return w / h;
}

/**
 * Fractional difference between what was asked for and what came back.
 * Null when either side is unknown — an unmeasurable deviation must not
 * masquerade as a measured zero.
 */
export function aspectDeviation(requestedRatio, actualWidth, actualHeight) {
  const want = ratioToNumber(requestedRatio);
  if (!want || !actualWidth || !actualHeight) return null;
  const got = actualWidth / actualHeight;
  return Math.abs(got - want) / want;
}

/**
 * Deviation above this is worth telling a human about. Not an error.
 *
 * CALIBRATION, stated because it is not obvious: ordinary provider clamping sits
 * BELOW this line and is recorded rather than alarmed on. Gemini answering a
 * 16:9 request with 1376x768 is a measured 0.78% deviation — real, harmless, and
 * not worth a warning on every generation. What this flag is for is the
 * wrong-SHAPE case: a 1024x1024 square returned for a cinematic brief is 43.75%
 * off, and that went undetected for an entire session because nothing ever
 * compared the request to the response.
 */
export const ASPECT_TOLERANCE = 0.01;
