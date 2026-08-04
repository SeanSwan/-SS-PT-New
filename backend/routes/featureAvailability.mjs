/**
 * ============================================================================
 * FILE: featureAvailability.mjs
 * PURPOSE: Tell "this feature has no table yet" apart from "something broke".
 * ADDED: 2026-08-04 (SWA-101)
 * ============================================================================
 *
 * WHY THIS EXISTS: several social surfaces are mounted and reachable from the dashboard while
 * their tables do not exist in production (SWA-101). Two failure shapes were both wrong:
 *
 *   1. UNGUARDED endpoints returned a bare 500. The page looked broken to a paying client.
 *   2. GUARDED endpoints caught EVERY error and answered `status: 'coming_soon'`. That is worse
 *      than a 500 in one specific way — a real outage (DB down, auth failure, a genuine bug) was
 *      reported to the user as "coming soon", which is false, and to the logs as a non-event.
 *      A catch-all that renames every failure "not built yet" makes real incidents invisible.
 *
 * This module keeps the honest half of that behaviour and drops the dishonest half: ONLY a
 * missing relation degrades to "coming soon"; everything else propagates as a real error.
 *
 * MODELLED ON `olympicRouteFallbacks.mjs`, which already did this correctly for one feature —
 * generalised here rather than copied a fourth time.
 *
 * Rule 75 (Trailhead-Truth): the message a user sees must describe what the code can actually do
 * right now. "Coming soon" is true for a feature with no table; it is a lie for a broken one.
 */

/**
 * Is this error Postgres telling us the relation does not exist?
 *
 * Checks the driver error code FIRST (`42P01` is undefined_table and is unambiguous) and falls
 * back to message matching, because Sequelize wraps the driver error at varying depths
 * (`error.parent`, `error.original`) depending on the call path.
 *
 * Deliberately NOT coupled to a table-name pattern: each caller already knows which feature it is
 * serving, and a name filter silently stops working the moment a model's tableName changes.
 */
export function isMissingTableError(error) {
  const code = error?.parent?.code || error?.original?.code || error?.code;
  if (code === '42P01') return true;

  const message = [
    error?.message,
    error?.parent?.message,
    error?.original?.message,
  ].filter(Boolean).join(' ');

  return /relation .* does not exist/i.test(message);
}

/**
 * A read endpoint whose table does not exist yet.
 *
 * Answers 200 with the caller's empty shape plus `status: 'coming_soon'`, so the UI renders an
 * honest empty state instead of an error banner. `emptyPayload` keeps the response shape identical
 * to the success case — a consumer destructuring `{ streams }` must not get `undefined`.
 */
export function respondComingSoon(res, emptyPayload, message) {
  return res.json({ ...emptyPayload, status: 'coming_soon', message });
}

/**
 * A write endpoint whose table does not exist yet.
 *
 * 503, never 200: the request did not succeed and must not be reported as if it had. `Retry-After`
 * is deliberately omitted — we cannot honestly predict when the feature ships.
 */
export function respondComingSoonWrite(res, message) {
  return res.status(503).json({ success: false, status: 'coming_soon', message });
}
