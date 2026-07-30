/**
 * ============================================================================
 * FILE: workoutSessionQuery.mjs
 * PURPOSE: Shared query-parameter validation for workout-session list endpoints.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-30 (SWA-75)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * These helpers lived inside routes/workoutSessionRoutes.mjs and guarded that
 * router's `GET /` — a route that was UNREACHABLE. `/api/workout` is mounted ahead
 * of `/api/workout/sessions`, so the list request was always answered by
 * workoutController.getWorkoutSessions, which had no input validation at all: no
 * cap on `limit`, no sort-field allowlist, no date parsing. The careful validation
 * was guarding a door nobody could walk through, while the door everyone used had
 * none.
 *
 * MOVED here rather than copied, so there is exactly one definition. The dead
 * routes were deleted in the same change; `parsePositiveInteger` is still needed by
 * the surviving `GET /statistics/:userId`, which is why this is a shared module and
 * not an inline paste into the controller.
 *
 * Every helper returns { ok, value } | { ok: false, message } rather than throwing,
 * so callers answer 400 with a specific message instead of surfacing a 500.
 */

/** Sort columns a caller may order by. Anything else is rejected, not silently ignored. */
export const SORT_FIELDS = new Set([
  'date',
  'createdAt',
  'updatedAt',
  'title',
  'duration',
  'intensity',
  'totalWeight',
  'totalReps',
  'totalSets',
  'status',
]);

/** Default page size when a caller omits `limit`. */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Upper bound on `limit`.
 *
 * The winning controller previously passed `limit` into the query uncapped —
 * `?limit=1000000` was a valid request. Authenticated and self-scoped, so a
 * hardening gap rather than a vulnerability, but free to close.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Strict positive-integer parse. Rejects '', '0', '-1', '1.5', '1e3', ' 1 ' with
 * embedded junk, and anything non-numeric — then clamps to `maxValue`.
 */
export const parsePositiveInteger = (value, label, maxValue = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || value === null || value === '') {
    return { ok: false, message: `Invalid ${label}` };
  }

  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    return { ok: false, message: `Invalid ${label}` };
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { ok: false, message: `Invalid ${label}` };
  }

  return { ok: true, value: Math.min(parsed, maxValue) };
};

/** An absent date is valid (no filter). A present-but-unparseable one is not. */
export const parseDateQuery = (value, label) => {
  if (!value) return { ok: true, value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: `Invalid ${label}` };
  }
  return { ok: true, value: date };
};

/**
 * Validate the shared list-query surface in one call.
 *
 * Accepts BOTH parameter vocabularies on purpose: the surviving contract uses
 * `sort`/`order`, the retired router used `sortBy`/`sortDirection`. Callers of the
 * retired shape now reach the live endpoint, so silently dropping their sort would
 * be a behaviour regression dressed up as a cleanup.
 *
 * @returns {{ok: true, value: object} | {ok: false, message: string}}
 */
export const parseSessionListQuery = (query = {}) => {
  const { limit, offset, page, startDate, endDate, sort, sortBy, order, sortDirection } = query;

  // `limit` stays UNDEFINED when the caller omits it, so the service keeps
  // ownership of the default — a pre-existing contract pinned by
  // tests/unit/workoutControllerGetSessions.test.mjs. Only the CAP is new.
  let parsedLimit;
  if (limit !== undefined) {
    const result = parsePositiveInteger(limit, 'limit', MAX_PAGE_SIZE);
    if (!result.ok) return result;
    parsedLimit = result.value;
  }

  // Explicit offset wins over page, and offset stays UNDEFINED when neither is
  // given — both pre-existing contracts, likewise pinned by that test file.
  //
  // page < 1 (and non-numeric page) CLAMPS to page 1 rather than 400ing. The
  // retired router rejected it, but this endpoint has always clamped, and a
  // caller sending page=0 today gets results — turning that into a 400 while
  // "porting validation" would be a silent breaking change smuggled in as
  // hardening. Caught by the existing test; behaviour preserved deliberately.
  let parsedOffset;
  if (offset !== undefined) {
    const normalized = String(offset).trim();
    if (!/^\d+$/.test(normalized)) return { ok: false, message: 'Invalid offset' };
    const asNumber = Number.parseInt(normalized, 10);
    if (!Number.isSafeInteger(asNumber)) return { ok: false, message: 'Invalid offset' };
    parsedOffset = asNumber; // 0 is a legitimate offset, not "missing"
  } else if (page !== undefined) {
    const asNumber = Number.parseInt(String(page), 10);
    const pageNum = Number.isFinite(asNumber) && asNumber >= 1 ? asNumber : 1;
    const effectiveLimit = parsedLimit || DEFAULT_PAGE_SIZE;
    parsedOffset = (pageNum - 1) * effectiveLimit;
  }

  const start = parseDateQuery(startDate, 'startDate');
  if (!start.ok) return start;
  const end = parseDateQuery(endDate, 'endDate');
  if (!end.ok) return end;

  const requestedSort = sort ?? sortBy;
  if (requestedSort !== undefined && !SORT_FIELDS.has(String(requestedSort))) {
    return { ok: false, message: 'Invalid sort' };
  }

  const requestedOrder = order ?? sortDirection;
  let parsedOrder;
  if (requestedOrder !== undefined) {
    const normalized = String(requestedOrder).toLowerCase();
    if (!['asc', 'desc'].includes(normalized)) {
      return { ok: false, message: 'Invalid order' };
    }
    parsedOrder = normalized.toUpperCase();
  }

  return {
    ok: true,
    value: {
      limit: parsedLimit,
      offset: parsedOffset,
      startDate: start.value,
      endDate: end.value,
      sort: requestedSort === undefined ? undefined : String(requestedSort),
      order: parsedOrder,
    },
  };
};

export default {
  SORT_FIELDS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePositiveInteger,
  parseDateQuery,
  parseSessionListQuery,
};
