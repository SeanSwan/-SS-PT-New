/**
 * scrubErrorText — strip identity out of a database error message before it is logged.
 *
 * Postgres and Sequelize quote the OFFENDING VALUE inside their messages:
 * `invalid input syntax for type uuid: "sean@example.com"`, `Key (email)=(a@b.c)
 * already exists`. Any route that logs `error.message` to diagnose a failure is
 * therefore one malformed request away from writing a member's email, a token,
 * or a raw id into the log — while every review of the LOGGER passes, because
 * the logger never names a PII field. The PII is in the error TEXT.
 *
 * Rule 8 is IDs and roles only. This scrubs, rather than drops, because the
 * message is the whole diagnostic: what survives is the error's SHAPE — which
 * constraint, which type, which column — which is what distinguishes one root
 * cause from another.
 *
 * @module utils/scrubErrorText
 */

/** Max length kept; a stack-sized message adds noise, not diagnosis. */
export const SCRUB_MAX_LENGTH = 400;

/**
 * @param {unknown} text
 * @returns {string|null} scrubbed text, or null when there was nothing to scrub
 */
export function scrubErrorText(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<redacted-email>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<redacted-uuid>')
    // Quoted literals in a PG error are the offending user value.
    .replace(/"[^"]{0,200}"/g, '"<redacted>"')
    // `Key (col)=(value)` — the value half only; the column name is diagnosis.
    .replace(/=\([^)]{0,200}\)/g, '=(<redacted>)')
    // Long digit runs: ids, phone numbers, card-ish sequences.
    .replace(/\b\d{7,}\b/g, '<redacted-num>')
    .slice(0, SCRUB_MAX_LENGTH);
}

export default scrubErrorText;
