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
 * A Postgres object name, recognised by its CONVENTION SUFFIX.
 *
 * The suffix requirement is load-bearing. An earlier version accepted any
 * identifier-shaped token, which silently re-admitted the exact user values the
 * module exists to remove: `"sean-connor"` and `"bobby_o_shea"` are
 * identifier-shaped, and they are the shape members actually pick for usernames.
 * Requiring `_key`/`_idx`/`_pkey`/`_fkey`/`_unique`/`_excl`/`_check` keeps the
 * metadata (which constraint fired) and redacts the value.
 */
const PG_OBJECT_NAME = /^[A-Za-z_][A-Za-z0-9_$]*_(key|idx|pkey|fkey|unique|excl|check|seq)$/;

/** An opaque secret-ish blob: JWT segments, base64 keys, long hex. */
const OPAQUE_TOKEN = /\b[A-Za-z0-9_\-+/=]{40,}\b/g;

/** ISO-ish dates are diagnosis (`invalid date 2024-01-15`), not identity. */
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?\b/g;

/**
 * A digit run, tolerating the separators humans and card forms use:
 * `4111 1111 1111 1111`, `4111-1111-1111-1111`, `+1 (415) 555-2671`.
 * Requires 7+ digits total so ports, status codes and PG error codes survive.
 */
const SEPARATED_DIGITS = /(?:\+?\d[\d\s().-]{5,}\d)/g;

const digitCount = (text) => (text.match(/\d/g) || []).length;

/**
 * Sentinels carry no characters the later rules can match.
 *
 * Written as ESCAPES, deliberately. As literal control characters they were
 * invisible in every diff and review, and if any tool stripped them the
 * restore pattern below would collapse to a bare digit match and rewrite
 * every number in the message — an error code silently replaced by a
 * preserved span. The escape form cannot be lost silently.
 */
const OPEN = '\u0001';
const CLOSE = '\u0002';

/**
 * @param {unknown} text
 * @returns {string|null} scrubbed text, or null when there was nothing to scrub
 */
export function scrubErrorText(text) {
  if (typeof text !== 'string' || text.length === 0) return null;

  // PASS 1 — lift out the spans that must SURVIVE, replacing them with sentinels.
  //
  // Order matters and this is why: the opaque-token rule below eats any 40-char
  // run, and real composite constraint names are longer than that
  // (`workout_sessions_user_id_completed_at_unique` is 44). Redacting the quoted
  // name would undo the whole point of preserving it — one rule silently
  // cancelling another. Lifting them out first makes the two rules independent.
  const preserved = [];
  let working = text.replace(/"([^"]{0,200})"/g, (match, inner) => {
    if (!PG_OBJECT_NAME.test(inner)) return '"<redacted>"';
    preserved.push(match);
    return `${OPEN}${preserved.length - 1}${CLOSE}`;
  });

  working = working.replace(ISO_DATE, (match) => {
    preserved.push(match);
    return `${OPEN}${preserved.length - 1}${CLOSE}`;
  });

  // PASS 2 — redact.
  working = working
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<redacted-email>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<redacted-uuid>')
    // `Key (col)=(value)` — the value half only; the column name is diagnosis.
    .replace(/=\([^)]{0,200}\)/g, '=(<redacted>)')
    .replace(OPAQUE_TOKEN, '<redacted-token>')
    .replace(SEPARATED_DIGITS, (match) =>
      (digitCount(match) >= 7 ? '<redacted-num>' : match));

  // PASS 3 — restore, then cap. Capping AFTER restoration keeps a preserved
  // name intact; capping before could cut a sentinel and leave a raw control
  // character in the log.
  working = working.replace(
    new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g'),
    (_, index) => preserved[Number(index)] ?? '',
  );

  if (working.length <= SCRUB_MAX_LENGTH) return working;
  // Never cut a redaction marker in half (`…<redacted-to`): trim back to the
  // last boundary before the cap.
  const cut = working.slice(0, SCRUB_MAX_LENGTH);
  const lastMarker = cut.lastIndexOf('<redacted');
  return lastMarker > -1 && !cut.slice(lastMarker).includes('>')
    ? cut.slice(0, lastMarker)
    : cut;
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
 * the free TEXT that carries identity. Errors and Dates are converted rather
 * than walked, because their useful content lives in non-enumerable properties
 * and a plain walk returns `{}` — losing a message and stack with no signal.
 *
 * @param {unknown} meta
 * @returns {unknown}
 */
export function scrubLogMeta(meta) {
  if (typeof meta === 'string') return scrubErrorText(meta);
  if (!meta || typeof meta !== 'object') return meta;
  // An invalid Date throws on toISOString, and this runs INSIDE error
  // logging: a scrubber that can throw turns one failure into two.
  if (meta instanceof Date) {
    return Number.isNaN(meta.getTime()) ? '<invalid-date>' : meta.toISOString();
  }
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: scrubErrorText(meta.message),
      stack: scrubErrorText(meta.stack),
    };
  }
  if (meta instanceof Map) return scrubLogMeta(Object.fromEntries(meta));
  if (meta instanceof Set) return [...meta].map(scrubLogMeta);
  if (Array.isArray(meta)) return meta.map(scrubLogMeta);

  const out = {};
  for (const [key, value] of Object.entries(meta)) out[key] = scrubLogMeta(value);
  return out;
}

export default scrubErrorText;
