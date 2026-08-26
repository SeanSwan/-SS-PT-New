/**
 * ============================================================================
 * FILE: verifyClientAccess.mjs
 * PURPOSE: Trainer-client assignment guard middleware. Admins bypass; trainers
 *          must have an active ClientTrainerAssignment row to the resolved
 *          target client; clients can only access their own data.
 * AUTHOR:  Claude Opus 4.7 | LAST MODIFIED: 2026-04-30 (Phase B)
 * ============================================================================
 *
 * WHAT THIS FILE DOES
 * Extracts the inline `verifyClientAccess` helper that has lived in
 * workoutBuilderRoutes.mjs since Phase A and exposes it as Express middleware
 * variants for reuse. The Village-flagged IDOR on workoutPlanRoutes.mjs
 * (`GET /:id` etc.) is closed by applying these middlewares to all 7 endpoints
 * that accept :id or :userId or body.userId.
 *
 * EXPORTS
 * - verifyClientAccessByUserId({ paramName, bodyField })
 *     Resolve clientId from req.params[paramName] then req.body[bodyField].
 *     Returns 400 if neither present. For routes that target a user explicitly.
 * - verifyClientAccessByPlanId({ paramName, modelName })
 *     Look up plan by req.params[paramName] from `WorkoutPlan` (configurable),
 *     then verify trainer assignment to plan.userId. Returns 404 if plan
 *     missing OR trainer not assigned (404-not-403 per receipt to avoid
 *     leaking resource existence). Attaches `req.workoutPlan` so handlers
 *     don't need to re-fetch.
 * - filterPlansByTrainerAssignment(req, plans)
 *     Utility for the GET / list endpoint. Filters in-memory plan results to
 *     trainer-assigned clients only. Returns plans unchanged for admin role.
 * - assertAssignmentOrAdmin(userId, role, clientId)
 *     Exposed for testing + callers that need direct boolean access.
 *
 * SECURITY DESIGN
 * - Admin role bypasses (admins are dashboard operators by design).
 * - Trainer role: require active ClientTrainerAssignment row.
 * - Client role: require clientId === req.user.id; otherwise 404.
 * - 404-not-403 on cross-user access: prevents leaking resource existence
 *   (an attacker iterating IDs can't distinguish "exists but not yours" from
 *   "doesn't exist").
 * - Fail-closed semantics: if the ClientTrainerAssignments table is missing
 *   or the query throws, returns false (deny access). Mirrors the existing
 *   workoutBuilderRoutes.mjs:27-40 pattern.
 *
 * RULES OBSERVED: rule 17 (dual-pass), rule 26 (canonical surface receipt),
 *                 rule 31 (backend route ownership), Phase A receipt section 2.3
 *                 (IDOR finding), Phase B receipt section 5.1 (middleware shape).
 * ============================================================================
 */

import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

/**
 * Core helper - returns boolean. Used by both middleware variants and exposed
 * for direct test use.
 *
 * REVISION 2026-04-30 (Codex BLOCKER post-Phase-B-merge): replaced obsolete raw
 * SQL against `"ClientTrainerAssignments"."isActive"` with the real model
 * contract `client_trainer_assignments.status = 'active'`. The original SQL
 * was inherited from workoutBuilderRoutes.mjs Phase A and was broken there
 * too - both call sites query a non-existent table name + non-existent column,
 * causing fail-closed denials for every trainer with a valid assignment. The
 * bug never surfaced in admin-driven testing because admins bypass.
 *
 * @param {number} userId - requester id (req.user.id)
 * @param {string} userRole - requester role ('admin' | 'trainer' | 'client' | 'user')
 * @param {number} clientId - target client id to verify access against
 * @returns {Promise<boolean>}
 */
export async function assertAssignmentOrAdmin(userId, userRole, clientId) {
  const requesterId = parseStrictPositiveInteger(userId);
  const targetClientId = parseStrictPositiveInteger(clientId);

  if (!targetClientId || (userRole !== 'admin' && !requesterId)) return false;
  if (userRole === 'admin') return true;
  if (userRole === 'client' || userRole === 'user') {
    return requesterId === targetClientId;
  }
  if (userRole !== 'trainer') return false;
  // Trainer: look up via the ClientTrainerAssignment model (real schema:
  // table=client_trainer_assignments, column=status with 'active'/'inactive'/'pending').
  //
  // NOTE: getModel() THROWS when the model isn't in the cache (it does not
  // return null). The try/catch below wraps both the lookup AND the findOne
  // call so that ANY failure - missing model, query throw, malformed cache -
  // routes through the fail-closed branch. Hostile-review fix 2026-04-30.
  try {
    const Model = getModel('ClientTrainerAssignment');
    const assignment = await Model.findOne({
      where: { trainerId: requesterId, clientId: targetClientId, status: 'active' },
    });
    if (!assignment) return false;
    // Re-assert what the WHERE was supposed to guarantee, on the row that came back.
    //
    // Hostile-review finding 2026-08-26: every test of this function proves the QUERY
    // carries the right predicates, never that the DATABASE applied them. A fail-open
    // construct — `WHERE (... OR :trainerId IS NULL)` is the classic — satisfies every
    // string-level check and returns a foreign row anyway. Three comparisons convert that
    // class from a silent leak into a denial, and cost nothing on the hot path. Mirrors the
    // `isActive` double-check `clientResolver` already does for the same reason.
    //
    // Fields ABSENT from the row are not treated as mismatches, and that narrowing is
    // deliberate rather than sloppy. A real SELECT on this table always returns these
    // columns, so the threat — a row whose `trainerId` is somebody else's — always carries
    // the field and is always caught. What omits them is an under-specified test stub, and
    // ~56 such stubs exist across ten suites written before this guard. Rewriting other
    // people's security fixtures in passing is how a hardening becomes a regression; that
    // migration is a slice of its own, and the newer suites already model rows fully.
    const mismatched = (actual, expected) => actual !== undefined && actual !== null
      && Number(actual) !== expected;
    if (mismatched(assignment.trainerId, requesterId)) return false;
    if (mismatched(assignment.clientId, targetClientId)) return false;
    if (assignment.status !== undefined && assignment.status !== 'active') return false;
    return true;
  } catch (err) {
    logger.warn('[verifyClientAccess] ClientTrainerAssignment check failed - denying access', {
      userId, clientId, error: err?.message,
    });
    return false;
  }
}

/**
 * List the client ids a trainer is currently assigned to.
 *
 * The single-subject sibling of assertAssignmentOrAdmin, for the LIST case:
 * a queue or roster that must be narrowed to a trainer's own clients cannot use
 * a per-id check without an N+1. Added for SWA-192 P0-1 (the unscoped challenge
 * moderation queue). It lives here, on the canonical boundary, deliberately —
 * the repo already carries three different shapes of this clamp and a fourth
 * one written inline in a service would be the actual architectural problem.
 *
 * Fail-closed, matching assertAssignmentOrAdmin: any failure returns NO ids.
 *
 * It THROWS on infrastructure failure rather than returning []. A roster of []
 * and "the assignment table is down" are the same value but opposite meanings:
 * the first is "this trainer has no clients", the second is "we cannot tell".
 * Collapsing them turns an outage into a queue that renders "no work today",
 * so the one person who should act never learns there is anything to act on.
 * Three review seats independently flagged that collapse. Callers must catch
 * and surface unavailability — they must NOT treat the throw as an empty roster.
 *
 * @param {number|string} trainerId
 * @returns {Promise<number[]>} active assigned client ids; [] means genuinely none
 * @throws {Error} with code 'ASSIGNMENT_LOOKUP_UNAVAILABLE' when the lookup fails
 */
export async function listAssignedClientIds(trainerId) {
  const requesterId = parseStrictPositiveInteger(trainerId);
  if (!requesterId) return [];

  try {
    const Model = getModel('ClientTrainerAssignment');
    const rows = await Model.findAll({
      where: { trainerId: requesterId, status: 'active' },
      attributes: ['clientId'],
    });
    return rows
      .map((row) => parseStrictPositiveInteger(row?.clientId ?? row?.get?.('clientId')))
      .filter(Boolean);
  } catch (err) {
    logger.warn('[verifyClientAccess] listAssignedClientIds failed - signalling unavailable', {
      trainerId, error: err?.message,
    });
    const unavailable = new Error('Assignment lookup unavailable');
    unavailable.code = 'ASSIGNMENT_LOOKUP_UNAVAILABLE';
    throw unavailable;
  }
}

/**
 * L5 (2026-05-02) - Fresh DB read of the per-client `canGenerateWorkoutPlans`
 * flag. JWT-based reads are explicitly NOT acceptable here: an admin who
 * revokes a client's flag in the middle of an active session must take
 * effect immediately on the NEXT request. Reading from the JWT (which is
 * frozen at issue time) would let the client keep generating plans until
 * their token rotates.
 *
 * Fail-closed semantics:
 *   - missing User model → false (deny)
 *   - missing user row   → false (deny)
 *   - query throws       → false (deny)
 *
 * Codex 2026-05-02 round-2 (L5 pre-impl review) prescribed this exact
 * fresh-DB-read shape and explicit fail-closed behavior.
 *
 * @param {number} userId - the requester's user id (req.user.id)
 * @returns {Promise<boolean>}
 */
export async function loadFreshCanGenerateFlag(userId) {
  const id = parseStrictPositiveInteger(userId);
  if (!id) return false;
  try {
    const User = getModel('User');
    const user = await User.findByPk(id, { attributes: ['id', 'canGenerateWorkoutPlans'] });
    return !!user?.canGenerateWorkoutPlans;
  } catch (err) {
    logger.warn('[verifyClientAccess] canGenerateWorkoutPlans read failed - denying access', {
      userId: id, error: err?.message,
    });
    return false;
  }
}

/**
 * Middleware factory: resolve clientId from request, verify access, allow next.
 *
 * @param {Object} options
 * @param {string} [options.paramName='userId'] - path param name to look up
 * @param {string} [options.bodyField='userId'] - body field name as fallback
 * @returns {(req, res, next) => void}
 */
export function verifyClientAccessByUserId({ paramName = 'userId', bodyField = 'userId' } = {}) {
  return async (req, res, next) => {
    const raw = req.params?.[paramName] ?? req.body?.[bodyField];
    const clientId = parseStrictPositiveInteger(raw);
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Valid clientId is required' });
    }
    const allowed = await assertAssignmentOrAdmin(req.user?.id, req.user?.role, clientId);
    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    next();
  };
}

/**
 * Middleware factory: look up plan by id, verify trainer assigned to plan.userId,
 * attach plan to req.workoutPlan so handlers don't refetch.
 *
 * @param {Object} options
 * @param {string} [options.paramName='id'] - path param name for plan id
 * @param {string} [options.modelName='WorkoutPlan'] - Sequelize model name
 * @returns {(req, res, next) => void}
 */
export function verifyClientAccessByPlanId({ paramName = 'id', modelName = 'WorkoutPlan' } = {}) {
  return async (req, res, next) => {
    const planId = req.params?.[paramName];
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Missing plan id' });
    }
    const Model = getModel(modelName);
    if (!Model) {
      logger.error(`[verifyClientAccess] ${modelName} model not loaded`);
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    let plan;
    try {
      plan = await Model.findByPk(planId);
    } catch (err) {
      logger.error('[verifyClientAccess] findByPk failed', { planId, error: err?.message });
      return res.status(500).json({ success: false, message: 'Failed to fetch plan' });
    }
    if (!plan) {
      // Genuine 404 - plan does not exist
      return res.status(404).json({ success: false, message: 'Workout plan not found' });
    }
    const allowed = await assertAssignmentOrAdmin(req.user?.id, req.user?.role, plan.userId);
    if (!allowed) {
      // Cross-trainer access attempt: 404 (not 403) to prevent existence leak
      return res.status(404).json({ success: false, message: 'Workout plan not found' });
    }
    // Attach so handlers can re-use without refetching
    req.workoutPlan = plan;
    next();
  };
}

/**
 * Filter a list of plans to those the requester can access.
 * Admin: returns plans unchanged. Trainer: filters to assigned clients.
 * Client: filters to plans where userId === req.user.id.
 *
 * @param {Object} req - Express request with req.user populated
 * @param {Array} plans - Sequelize WorkoutPlan instances or POJOs
 * @returns {Promise<Array>} filtered plans
 */
export async function filterPlansByTrainerAssignment(req, plans) {
  if (!Array.isArray(plans)) return plans;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (userRole === 'admin') return plans;
  if (userRole === 'client' || userRole === 'user') {
    const requesterId = parseStrictPositiveInteger(userId);
    if (!requesterId) return [];
    return plans.filter((p) => parseStrictPositiveInteger(p.userId) === requesterId);
  }
  if (userRole !== 'trainer') return [];
  // Trainer: keep plans the trainer is assigned to
  const allowed = [];
  for (const plan of plans) {
    if (await assertAssignmentOrAdmin(userId, userRole, plan.userId)) {
      allowed.push(plan);
    }
  }
  return allowed;
}
