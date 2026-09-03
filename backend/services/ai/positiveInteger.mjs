/**
 * positiveInteger.mjs — one coercion, for the places where disagreeing about a number
 * means disagreeing about who someone is.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * Two modules were parsing the same security-relevant input with different rules.
 * `commandExecutor` used a strict parse (digits only, safe-integer, positive);
 * `clientResolver` used `Number.parseInt`, which is lenient by design — it reads as far as
 * it can and ignores the rest. On the values that matter they disagree:
 *
 *     '12px'   strict -> null (deny)      parseInt -> 12    (scope to trainer 12)
 *     12.5     strict -> null (deny)      parseInt -> 12    (scope to trainer 12)
 *     '1e3'    strict -> null (deny)      parseInt -> 1     (scope to trainer 1)
 *
 * Nothing exploitable came of it, and only because the executor's guard happens to run
 * first — the safety was a property of the call ORDER, not of either function. Any new
 * entry point that reached the resolver directly would pick the lenient rule, and the
 * divergence would decide which trainer's clients a caller could see.
 *
 * It lives in a leaf module rather than being exported from either side because
 * `commandExecutor` imports `clientResolver`: sharing it from the executor would make the
 * resolver import its own importer, and a cycle in this path surfaces as an undefined
 * function at runtime, on an authorization check.
 *
 * Raised by GLM 5.3 Flash, 2026-08-26, rated low-exploitability and correct anyway: a rule
 * that holds because of the order two functions happen to run in is not a rule.
 */

/**
 * Strictly coerce a value to a positive safe integer.
 *
 * Deliberately refuses anything that is not already a whole positive number or the exact
 * decimal spelling of one. No trailing units, no exponent notation, no fractional part, no
 * leading zeros, no whitespace tolerance beyond trimming.
 *
 * @param {unknown} value
 * @returns {number|null} the integer, or null when the input is not unambiguously one
 */
export function toPositiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export default toPositiveInteger;
