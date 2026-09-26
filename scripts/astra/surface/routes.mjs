/**
 * routes.mjs — THE ROUTE POLICY: which API routes mutate, and which are POST-only.
 *
 * SPLIT FROM `server.mjs` for Rule 4, at the seam the file already had: route POLICY
 * versus HTTP PLUMBING. `server.mjs` decides how a request is read, parsed, gated and
 * answered; this file decides only what KIND of route each one is.
 *
 * ONE LIST, NOT TWO. `POST_ONLY` used to be written out by hand beside
 * `MUTATION_ROUTES`, and the two had to be kept in step by eye. A mutation is POST-only
 * by nature, so the relationship is now DERIVED: a route added to `MUTATION_ROUTES` is
 * POST-only automatically, and there is no second list to forget. The remaining
 * difference — `directions`, a free READ that is a POST by shape because it carries a
 * brief body — is the only entry that has to be stated, and it is stated once.
 */

/**
 * Routes that WRITE. The mutation token is required for these, and the check runs
 * BEFORE the handler, so an unauthenticated write never reaches the brain.
 *
 * `compile` is here even though it spends nothing and writes no file: it registers a
 * compile in the session registry, and a session is server state. `preview` is here
 * because it is the ONE billing endpoint — it is refused, and the refusal is the point.
 */
export const MUTATION_ROUTES = Object.freeze([
  'compile', 'reject', 'preview', 'overrides-stage',
  'tuning-stage', 'tuning-commit', 'tuning-revert',
]);

/**
 * Routes that answer 405 to a GET. A GET on one of these is a METHOD error, not a
 * 404 — the route exists, the verb is wrong, and the difference is actionable.
 */
export const POST_ONLY = Object.freeze(['directions', ...MUTATION_ROUTES]);
