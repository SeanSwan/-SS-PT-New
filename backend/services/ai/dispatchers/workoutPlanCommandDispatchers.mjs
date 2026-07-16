/**
 * ============================================================================
 * FILE: dispatchers/workoutPlanCommandDispatchers.mjs
 * PURPOSE: Workout-plan write dispatchers for Swan Coach command execution
 * OWNER: Codex | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Routes Swan Coach archive commands through the same
 * audited lifecycle boundary as the protected REST API.
 * HOW IT FITS IN THE APP: Confirmed command -> dispatcher -> lifecycle service
 * -> locked plan transition plus immutable receipt.
 * KEY DECISIONS: Archived is explicit and terminal; command results expose only
 * bounded identifiers/status, never plan content or client PII.
 */

import sequelize from '../../../database.mjs';
import { getAllModels } from '../../../models/index.mjs';
import { transitionWorkoutPlanLifecycle } from '../../workoutPlanLifecycleService.mjs';

/**
 * Archive a workout plan through the canonical lifecycle boundary.
 * @param {{ planId: string|number }} params
 * @param {{ user?: { id?: number } }} ctx
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
  const { WorkoutPlan } = getAllModels();
  const planId = params.planId;

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