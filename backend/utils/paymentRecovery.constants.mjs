/**
 * Payment Recovery Constants & Utilities
 * =======================================
 * Shared by service and route layers. No HTTP or ORM imports — pure logic only.
 */

// ── Payment method constants ────────────────────────────────────
export const VALID_PAYMENT_METHODS = ['cash', 'venmo', 'zelle', 'check'];
export const METHODS_REQUIRING_REFERENCE = ['venmo', 'zelle', 'check'];

// ── Field length limits ─────────────────────────────────────────
export const MAX_REFERENCE_LENGTH = 200;
export const MAX_NOTES_LENGTH = 1000;
export const MIN_FORCE_REASON_LENGTH = 10;
export const MAX_FORCE_REASON_LENGTH = 500;

// ── Idempotency ─────────────────────────────────────────────────
export const IDEMPOTENCY_INDEX_NAME = 'idx_orders_idempotency_key';
export const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Error code → HTTP status map (canonical source of truth) ────
export const ERROR_CODE_MAP = {
  DUPLICATE_PAYMENT_WINDOW: 409,
  DUPLICATE_IDEMPOTENCY_KEY: 409,
  CLIENT_NOT_FOUND: 404,
  PACKAGE_NOT_FOUND: 404,
  PACKAGE_INACTIVE: 422,
  INVALID_ROLE: 422,
  NO_SESSIONS_IN_PACKAGE: 422,
  INVALID_PAYMENT_METHOD: 422,
  MISSING_PAYMENT_REFERENCE: 422,
  INVALID_IDEMPOTENCY_TOKEN: 422,
  MISSING_FORCE_REASON: 422,
  PAYMENT_REFERENCE_TOO_LONG: 422,
  ADMIN_NOTES_TOO_LONG: 422,
  FORCE_REASON_TOO_LONG: 422,
  INVALID_CLIENT_ID: 422,
  INVALID_STOREFRONT_ITEM_ID: 422,
  MODELS_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500
};

// ── Control character regexes ───────────────────────────────────
const CTRL_CHAR_ALL = /[\x00-\x1F\x7F]/g;           // strips everything including \n \r \t
const CTRL_CHAR_KEEP_NEWLINES = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g; // keeps \n(\x0A) \r(\x0D) \t(\x09)

/**
 * Sanitize a string value: trim, strip control chars, check length.
 * Never throws — returns { value, error }.
 *
 * @param {string} value - Raw input
 * @param {number} maxLength - Maximum allowed length after trim
 * @param {boolean} [preserveNewlines=false] - Keep newlines and tabs
 * @returns {{ value: string, error: string | null }}
 */
export function sanitizeString(value, maxLength, preserveNewlines = false) {
  if (value == null) return { value: '', error: null };
  const trimmed = String(value).trim();
  const cleaned = trimmed.replace(
    preserveNewlines ? CTRL_CHAR_KEEP_NEWLINES : CTRL_CHAR_ALL,
    ''
  );
  if (cleaned.length > maxLength) {
    return { value: cleaned, error: `Must be ${maxLength} characters or fewer` };
  }
  return { value: cleaned, error: null };
}

/**
 * Validate UUID v4 format.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidUUID(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.length > 36) return false;
  return UUID_V4_REGEX.test(value);
}

/**
 * Mask a payment reference for logging (show last 4 chars only).
 * @param {string} ref
 * @returns {string}
 */
export function maskReference(ref) {
  if (!ref || typeof ref !== 'string') return '***';
  if (ref.length <= 4) return '***';
  return '***' + ref.slice(-4);
}

/**
 * Check if a SequelizeUniqueConstraintError is specifically an idempotency key violation.
 * Used by both service and route helpers to prevent misclassification.
 *
 * @param {Error} error
 * @returns {boolean}
 */
export function isIdempotencyViolation(error) {
  if (error.name !== 'SequelizeUniqueConstraintError') return false;
  // Primary: check constraint name from Postgres driver
  if (error.original?.constraint === IDEMPOTENCY_INDEX_NAME) return true;
  if (error.parent?.constraint === IDEMPOTENCY_INDEX_NAME) return true;
  // Secondary fallback: check field path
  if (error.errors?.some(e => e.path === 'idempotencyKey')) return true;
  return false;
}
