/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/errors.mjs
 * PURPOSE: The console's error vocabulary and its input validation rules.
 * PART OF: Creator Brains Console (blueprint 05 §2)
 * SLICE: S0
 * ============================================================================
 *
 * Extracted from api.mjs for the repo's 300-line cap (rule 4). These are the
 * two things the server, the handlers and the tests ALL need, and none of them
 * is allowed to invent its own version:
 *
 *   - the error CODES, because they map to HTTP statuses in exactly one place
 *     (server.mjs `statusFor`) and a second vocabulary would produce a 500 where
 *     the contract promises a 400;
 *   - the VALIDATORS, because client and server must agree on the same bounds.
 *     Duplicating `≤300 chars` in the UI is how a form starts accepting input
 *     the API then rejects.
 *
 * Note the deliberate split between `ApiError` and plain `Error`: an `ApiError`
 * carries a code the server can translate; an unexpected `Error` becomes a
 * generic 500 whose text never reaches the browser as a stack trace.
 *
 * @module creator-brains-console/lib/errors
 */

/** Uniform error codes (blueprint 05 §2, error envelope). */
export const CODE = Object.freeze({
  STORE_DAMAGED: 'STORE_DAMAGED',
  RUN_LOCKED: 'RUN_LOCKED',
  VALIDATION: 'VALIDATION',
  REFUSED: 'REFUSED',
  NOT_FOUND: 'NOT_FOUND',
});

/** Documented input bounds — the single source both client and server read. */
export const LIMITS = Object.freeze({
  REF_MAX: 200,
  QUERY_MAX: 300,
  PER_HOUR_MIN: 1,
  BODY_MAX: 64 * 1024,
});

/**
 * A refusal the bridge can name. `code` maps to an HTTP status in server.mjs;
 * `message` is the ENGINE'S OWN reason string, verbatim, never a rewrite — if
 * the engine says `registry.json is invalid: ...`, the operator sees that
 * sentence, because it names the file they need to look at.
 */
export class ApiError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.extra = extra;
  }
}

/** `validateRef`: non-empty, ≤200 chars. Returns the trimmed ref. */
export function validateRef(ref) {
  if (typeof ref !== 'string' || !ref.trim()) {
    throw new ApiError(CODE.VALIDATION, 'a creator reference is required');
  }
  const value = ref.trim();
  if (value.length > LIMITS.REF_MAX) {
    throw new ApiError(CODE.VALIDATION, `creator reference exceeds ${LIMITS.REF_MAX} characters`);
  }
  return value;
}

/** `validateQuery`: non-empty, ≤300 chars. */
export function validateQuery(q) {
  if (typeof q !== 'string' || !q.trim()) {
    throw new ApiError(
      CODE.VALIDATION,
      'a query is required — refusing to return every claim for an empty query',
    );
  }
  const value = q.trim();
  if (value.length > LIMITS.QUERY_MAX) {
    throw new ApiError(CODE.VALIDATION, `query exceeds ${LIMITS.QUERY_MAX} characters`);
  }
  return value;
}

/** `validatePerHour`: integer ≥ 1. Accepts a string from a query param. */
export function validatePerHour(raw) {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < LIMITS.PER_HOUR_MIN) {
    throw new ApiError(CODE.VALIDATION, `'${raw}' is not a positive whole number`);
  }
  return n;
}

/** An existing registry key, or the `UC…` shape. */
export function validateChannelId(channelId, creators = null) {
  if (typeof channelId !== 'string' || !channelId.trim()) {
    throw new ApiError(CODE.VALIDATION, 'a channel id is required');
  }
  const value = channelId.trim();
  // An existing registry key is authoritative even if it does not match the
  // UC… shape — the registry is the truth, the regex is only for candidates.
  if (creators && creators.some((c) => c.channelId === value)) return value;
  if (/^UC[A-Za-z0-9_-]+$/.test(value)) return value;
  throw new ApiError(CODE.VALIDATION, `'${value}' is not a channel id and is not in the registry`);
}
