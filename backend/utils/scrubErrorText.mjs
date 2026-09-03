/**
 * scrubErrorText — strip identity out of an error message before it is logged.
 *
 * Postgres and Sequelize quote the OFFENDING VALUE inside their messages:
 * `invalid input syntax for type uuid: "someone@example.com"`, `Key (email)=(...)
 * already exists`. Any route that logs `error.message` to diagnose a failure is
 * one malformed request away from writing a member's email, a token, or a raw id
 * into the log — while every review of the LOGGER passes, because the logger
 * never names a PII field. The PII is in the error TEXT.
 *
 * Rule 8 is IDs and roles only. This scrubs rather than drops, because the
 * message is the whole diagnostic: what survives is the error's SHAPE — which
 * constraint, which type, which column — which is what distinguishes one root
 * cause from another.
 *
 * @module utils/scrubErrorText
 */

/** Max length kept; a stack-sized message adds noise, not diagnosis. */
export const SCRUB_MAX_LENGTH = 400;

/**
 * Quoted SQL identifiers are diagnosis, not identity: `"users_email_key"` names
 * the constraint that fired. Redacting it destroys the exact fact this module
 * exists to preserve. Identifier shape = snake/kebab/dotted lowercase, no spaces.
 */
const SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_.$-]*$/;

/** An opaque secret-ish blob: JWT segments, base64 keys, long hex. */
const OPAQUE_TOKEN = /\b[A-Za-z0-9_\-+/=]{40,}\b/g;

/**
 * A digit run, tolerating the separators humans and card forms use:
 * `4111 1111 1111 1111`, `4111-1111-1111-1111`, `+1 (415) 555-2671`.
 * Requires 7+ digits total so ports, status codes and PG error codes survive.
 */
const SEPARATED_DIGITS = /(?:\+?\d[\d\s().-]{5,}\d)/g;

const digitCount = (text) => (text.match(/\d/g) || []).length;

/**
 * @param {unknown} text
 * @returns {string|null} scrubbed text, or null when there was nothing to scrub
 */
export function scrubErrorText(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<redacted-email>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<redacted-uuid>')
    // Quoted literal: a VALUE gets redacted, an IDENTIFIER is kept.
    .replace(/"([^"]{0,200})"/g, (match, inner) =>
      (SQL_IDENTIFIER.test(inner) ? match : '"<redacted>"'))
    // `Key (col)=(value)` — the value half only; the column name is diagnosis.
    .replace(/=\([^)]{0,200}\)/g, '=(<redacted>)')
    .replace(OPAQUE_TOKEN, '<redacted-token>')
    .replace(SEPARATED_DIGITS, (match) =>
      (digitCount(match) >= 7 ? '<redacted-num>' : match))
    .slice(0, SCRUB_MAX_LENGTH);
}

/**
 * Scrub every string in a log-metadata object, by construction.
 *
 * The per-field wiring this replaces was opt-in at one call site, which is
 * exactly how the raw-message defect shipped in the first place and exactly how
 * it would ship again at the next call site. Anything routed through here is
 * scrubbed whether the caller remembered or not.
 *
 * Numbers, booleans and null pass through untouched — an id is allowed; it is
 * the free TEXT that carries identity.
 *
 * @param {Record<string, unknown>} meta
 * @returns {Record<string, unknown>}
 */
export function scrubLogMeta(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const out = Array.isArray(meta) ? [] : {};
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === 'string') out[key] = scrubErrorText(value);
    else if (value && typeof value === 'object') out[key] = scrubLogMeta(value);
    else out[key] = value;
  }
  return out;
}

export default scrubErrorText;
