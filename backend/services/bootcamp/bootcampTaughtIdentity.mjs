/**
 * ============================================================================
 * FILE: backend/services/bootcamp/bootcampTaughtIdentity.mjs
 *
 * PURPOSE: H29 / R-H04 — one stable operation identity per taught log, so a retried
 *   write collapses onto the SAME class log instead of appending a second one.
 *
 * Contract §5 line 218:
 *   "Use deterministic operationKey `sprint-slot:<slotId>`, scoped by trainerId, for
 *    that log. Ordinary taught logs use `run:<stable-run-UUID>` persisted by the caller
 *    before its first POST. … New write endpoints require an operation key; do not
 *    backfill imaginary run identity into historical logs."
 *
 * WHY IT MATTERS END-TO-END (the evidence doc says it plainly): a retried `/log` creates
 * a DISTINCT class identity, and attendance idempotency is keyed per class-log id — so a
 * retry can defeat end-to-end attendance deduplication even when each attendance
 * transaction is itself correct.
 *
 * The uniqueness itself is enforced by the DATABASE (unique index on
 * trainerId+operationKey, proven in the fixture — see
 * `scripts/h29-apply-fixture-migration.mjs`); this module only names the identity and
 * hashes the payload so a changed body can be told apart from an honest retry.
 * ============================================================================
 */

import { createHash } from 'node:crypto';

/** Matches models/BootcampClassLog.mjs's STRING(128). */
export const OPERATION_KEY_MAX = 128;

export const SPRINT_SLOT_PREFIX = 'sprint-slot:';
export const RUN_PREFIX = 'run:';

/**
 * Deterministic key for a Sprint confirmation — the owned SLOT is its operation
 * identity (§5 line 218, and the reason a duplicate Sprint confirmation cannot count
 * twice).
 */
export const sprintSlotOperationKey = (slotId) => `${SPRINT_SLOT_PREFIX}${slotId}`;

/**
 * Key for an ordinary class run. The UUID is MINTED BY THE CALLER and persisted before
 * its first POST — the server must never invent one, because a server-minted identity
 * cannot recognize the retry it is supposed to collapse.
 */
export const runOperationKey = (runId) => `${RUN_PREFIX}${runId}`;

/**
 * Stable JSON with sorted keys, so an unchanged retry hashes identically regardless of
 * property order (a plain `JSON.stringify` depends on insertion order, which differs
 * between a fresh object and one rebuilt from the database).
 */
function canonicalJson(value) {
  // A Date has no enumerable own keys, so the object branch below would serialize it as `{}`
  // and two DIFFERENT instants would hash identically. No caller puts one in a taught-log
  // payload today (the route passes strings), so this is a latent hazard rather than a live
  // one — closed here instead of documented (external review, round 99, LOW-4).
  if (value instanceof Date) return JSON.stringify(Number.isNaN(value.getTime()) ? null : value.toISOString());
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

/**
 * §5 line 220 — "computed AFTER SCHEMA NORMALIZATION". The DATEONLY column re-formats its
 * value at write time (`Sequelize DATEONLY._stringify` → `YYYY-MM-DD`), so `'2026-9-13'` and
 * `'2026-09-13'` persist to the IDENTICAL row. Hashing them differently made an honest retry a
 * 409 for a body the database cannot tell apart (external review, round 99, MED-4).
 *
 * Only a full date is normalized: a non-date string is left EXACTLY as submitted, because this
 * function must not start accepting or rewriting values the column would reject.
 */
const DATE_ONLY = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export function normalizeClassDate(value) {
  if (typeof value !== 'string') return value;
  const match = DATE_ONLY.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * The taught date as the ROW must carry it, or a client-safe 400.
 *
 * A DATEONLY column stringifies anything unparseable as `'Invalid date'`, so an unvalidated
 * value becomes a driver error reported to the trainer as a 500. A hostile verification
 * (round 108) measured exactly that on the ordinary `/log` path, which checked only truthiness:
 * `"not-a-date"`, `"2026-02-30"` and `"2026-13-01"` each produced 500 "Failed to log class".
 * Validation lives here, at the write, so every caller inherits it — §9 line 323 asks for
 * explicit validation errors rather than generic faults.
 */
export function requireClassDate(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest('classDate must be a real YYYY-MM-DD date');
  }
  const canonical = normalizeClassDate(value.trim());
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(canonical);
  if (!match) throw badRequest('classDate must be a real YYYY-MM-DD date');
  const [, year, month, day] = match;
  const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const real = utc.getUTCFullYear() === Number(year)
    && utc.getUTCMonth() === Number(month) - 1
    && utc.getUTCDate() === Number(day);
  if (!real) throw badRequest('classDate must be a real YYYY-MM-DD date');
  return canonical;
}

/**
 * SHA-256 of the submitted payload, hex (64 chars — matches the STRING(64) column).
 *
 * `operationKey` and `payloadHash` are excluded: the key is the identity, not part of
 * the body, and a hash can never include itself.
 */
export function hashTaughtPayload(payload) {
  const { operationKey, payloadHash, ...body } = payload ?? {};
  return createHash('sha256').update(canonicalJson(body)).digest('hex');
}

/**
 * The identity fields to persist alongside a log. Returns `null` when no key was
 * supplied, so a caller that has not adopted operation keys yet keeps its existing
 * append behaviour — enforcement lives at the write ENDPOINT (§5 line 218: "New write
 * endpoints require an operation key"), not silently inside the storage helper.
 */
export function taughtIdentityFields(payload) {
  if (payload?.operationKey === undefined || payload?.operationKey === null) return null;
  return {
    operationKey: requireOperationKey(payload.operationKey),
    payloadHash: hashTaughtPayload(payload),
  };
}

/** Validate a caller-supplied key. Throws a 400-shaped error, like the other contracts. */
export function requireOperationKey(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest('operationKey must be a non-empty string');
  }
  const key = value.trim();
  if (key.length > OPERATION_KEY_MAX) {
    throw badRequest(`operationKey exceeds ${OPERATION_KEY_MAX} characters`);
  }
  return key;
}

/**
 * A client-safe 400.
 *
 * `exposeToClient` is required, not decorative: `getBootcampRouteErrorResponse`
 * (`bootcampRoutes.mjs:59-78`) surfaces a service message only when BOTH `exposeToClient` is
 * true AND `status` is in {400,403,404,409}. Without it an oversized or empty operation key
 * answered **500 "Failed to log class"** — a validation failure reported as a server fault.
 * An external review caught this (round 99, MED-5); no test had covered key length.
 */
function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  error.statusCode = 400;
  error.exposeToClient = true;
  return error;
}
