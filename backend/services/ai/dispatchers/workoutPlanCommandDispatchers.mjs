/**
 * ============================================================================
 * FILE: dispatchers/workoutPlanCommandDispatchers.mjs
 * PURPOSE: Workout-plan write dispatchers for Swan Coach command execution
 * OWNER: Codex | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Routes Swan Coach archive commands through the same
 * audited lifecycle boundary as the protected REST API, under the same access
 * check that route's middleware applies.
 * HOW IT FITS IN THE APP: Confirmed command -> dispatcher -> access check ->
 * lifecycle service -> locked plan transition plus immutable receipt.
 * KEY DECISIONS: Archived is explicit and terminal; command results expose only
 * bounded identifiers/status, never plan content or client PII.
 *
 * THE ACCESS CHECK IS NOT OPTIONAL, AND WAS ONCE ABSENT: this header claimed
 * parity with the protected REST route while performing no authorization at
 * all. `DELETE /api/workout-plans/:id` is guarded by
 * `verifyClientAccessByPlanId`; commands never travel over routes, so no
 * middleware runs for this lane and the guard has to be called here. Sharing a
 * boundary with a protected caller is not the same as being protected.
 */

import sequelize from '../../../database.mjs';
import { getAllModels } from '../../../models/index.mjs';
import { transitionWorkoutPlanLifecycle } from '../../workoutPlanLifecycleService.mjs';
import { assertAssignmentOrAdmin } from '../../../middleware/verifyClientAccess.mjs';

/**
 * Denial and absence are the same answer on purpose.
 *
 * `verifyClientAccessByPlanId` — the middleware guarding the REST route to this same
 * operation — answers cross-tenant access with 404 rather than 403 so that an attacker
 * walking ids cannot tell "exists but not yours" from "does not exist". This lane already
 * had a not-found shape, so denial reuses it rather than inventing a distinguishable one.
 */
const planNotAvailable = (planId) => ({
  planId,
  planFound: false,
  archived: false,
  previousStatus: null,
  status: null,
  clientId: null,
  trainerId: null,
});

/**
 * Archive a workout plan through the canonical lifecycle boundary.
 * @param {{ planId: string|number }} params
 * @param {{ user?: { id?: number } }} ctx
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
  const { WorkoutPlan } = getAllModels();
  const planId = params.planId;

  // `delete_workout_plan` declares `requiresClientRef: false`, so the pipeline resolves no
  // client and applies no scope — the caller-supplied planId arrives unexamined. The
  // lifecycle service does not close that: it validates `actorId` as a positive integer
  // and records it for audit, which is why its own comment says it applies one ALREADY
  // authorized action. Authorizing it is this caller's job, exactly as it is the REST
  // route's, and through the same helper that route's middleware uses.
  const plan = await WorkoutPlan.findByPk(planId);
  if (!plan) return planNotAvailable(planId);
  const permitted = await assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, plan.userId);
  if (!permitted) return planNotAvailable(planId);

  try {
    const result = await transitionWorkoutPlanLifecycle({
      sequelize,
      WorkoutPlan,
      planId,
      action: 'archive',
      actorId: ctx.user?.id,
    });
    const plan = result.plan;
    const receipt = result.lifecycleReceipt;

    return {
      planId: plan.id ?? planId,
      planFound: true,
      archived: receipt?.fromStatus !== 'archived',
      previousStatus: receipt?.fromStatus ?? null,
      status: plan.status ?? 'archived',
      lifecycleReceiptId: receipt?.id ?? null,
      clientId: plan.userId ?? null,
      trainerId: plan.trainerId ?? null,
    };
  } catch (error) {
    if (error?.code !== 'WORKOUT_PLAN_NOT_FOUND') throw error;
    return {
      planId,
      planFound: false,
      archived: false,
      previousStatus: null,
      status: null,
      clientId: null,
      trainerId: null,
    };
  }
}