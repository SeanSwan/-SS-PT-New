/**
 * Workout Log Write Dispatcher
 * ============================
 *
 * Swan Coach write command for the workout-progress-first loop. Delegates to
 * the canonical AI daily workout form service and preserves billing evidence.
 */

import { submitAiWorkoutLogAsDailyForm } from '../../workout/aiWorkoutDailyFormService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

export const dispatchLogWorkout = async (params = {}, ctx = {}) => {
  const sequelize = ctx.options?.sequelize || ctx.sequelize;
  const clientId = resolveCommandClientId(params, ctx);

  return submitAiWorkoutLogAsDailyForm({
    clientId,
    exercises: params.exercises || [],
    date: params.date,
    notes: params.notes,
    title: params.title,
    duration: params.duration,
    intensity: params.intensity,
    plannedAssignment: params.plannedAssignment,
    scheduledSessionId: params.scheduledSessionId,
    trainerId: ctx.user.id,
    userRole: ctx.user.role,
    sequelize,
  });
};
