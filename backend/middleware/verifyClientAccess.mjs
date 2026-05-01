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

import sequelize from '../database.mjs';
import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

/**
 * Core helper - returns boolean. Used by both middleware variants and exposed
 * for direct test use.
 *
 * @param {number} userId - requester id (req.user.id)
 * @param {string} userRole - requester role ('admin' | 'trainer' | 'client')
 * @param {number} clientId - target client id to verify access against
 * @returns {Promise<boolean>}
 */
export async function assertAssignmentOrAdmin(userId, userRole, clientId) {
  if (userRole === 'admin') return true;
  if (userRole === 'client') {
    return Number(userId) === Number(clientId);
  }
  if (userRole !== 'trainer') return false;
  // Trainer: query ClientTrainerAssignments
  try {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM "ClientTrainerAssignments"
       WHERE "trainerId" = :trainerId AND "clientId" = :clientId AND "isActive" = true
       LIMIT 1`,
      { replacements: { trainerId: userId, clientId }, type: sequelize.QueryTypes.SELECT }
    );
    return !!rows;
  } catch (err) {
    // Table missing OR query error: fail closed.
    logger.warn('[verifyClientAccess] ClientTrainerAssignment check failed - denying access', {
      userId, clientId, error: err?.message,
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
    const clientId = parseInt(raw, 10);
    if (!Number.isInteger(clientId) || clientId < 1) {
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
  if (userRole === 'client') {
    return plans.filter((p) => Number(p.userId) === Number(userId));
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
