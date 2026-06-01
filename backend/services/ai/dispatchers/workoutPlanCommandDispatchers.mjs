/**
 * ============================================================================
 * FILE: dispatchers/workoutPlanCommandDispatchers.mjs
 * PURPOSE: Workout-plan write dispatchers for Swan Coach command execution
 * OWNER: Codex | CREATED: 2026-06-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Mirrors canonical workout-plan route behavior for command-lane writes.
 */

import { getAllModels } from '../../../models/index.mjs';

/**
 * Dispatcher for delete_workout_plan.
 *
 * Canonical DELETE /api/workout-plans/:id archives plans by setting
 * WorkoutPlan.status to completed; it does not hard-delete rows.
 *
 * @param {{ planId: string|number }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchDeleteWorkoutPlan(params = {}) {
  const { WorkoutPlan } = getAllModels();
  const planId = params.planId;
  const plan = await WorkoutPlan.findByPk(planId);

  if (!plan) {
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

  const previousStatus = plan.status ?? null;
  await plan.update({ status: 'completed' });

  return {
    planId: plan.id ?? planId,
    planFound: true,
    archived: previousStatus !== 'completed',
    previousStatus,
    status: 'completed',
    clientId: plan.userId ?? null,
    trainerId: plan.trainerId ?? null,
  };
}
