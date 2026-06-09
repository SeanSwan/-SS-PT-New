/**
 * Workout Read Dispatchers
 * ========================
 *
 * Swan Coach workout history and recommendation read commands. These keep
 * workout context close to workout services while returning scalar summaries.
 */

import workoutService from '../../workoutService.mjs';
import { getAllModels } from '../../../models/index.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const limitFrom = ({ params = {}, defaultLimit = 5, max = 20 }) => (
  Math.min(max, Math.max(1, Number(params.limit) || defaultLimit))
);

const workoutHistoryResult = (rows) => {
  const last = rows[0];
  return {
    count: rows.length,
    lastSessionDate: last?.completedAt?.toISOString().slice(0, 10) ?? null,
    recentTitle: last?.title ?? null,
    totalSets: rows.reduce((sum, row) => sum + (row.totalSets || 0), 0),
    totalReps: rows.reduce((sum, row) => sum + (row.totalReps || 0), 0),
  };
};

const ARRAY_OPTION_KEYS = [
  'equipment',
  'muscleGroups',
  'muscleGroupNames',
  'bodyRegions',
  'excludeExercises',
];

const arrayParam = (value) => (Array.isArray(value) ? value : []);

const arrayOptionsFrom = (params = {}) => (
  Object.fromEntries(ARRAY_OPTION_KEYS.map((key) => [key, arrayParam(params[key])]))
);

const recommendationOptionsFor = ({ params, limit }) => ({
  goal: params.goal || 'general',
  difficulty: params.difficulty,
  ...arrayOptionsFrom(params),
  limit,
  rehabFocus: Boolean(params.rehabFocus),
  optPhase: params.optPhase,
});

export const dispatchViewWorkoutHistory = async (params = {}, ctx = {}, defaultLimit = 5) => {
  const { WorkoutSession, WorkoutLog } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const limit = limitFrom({ params, defaultLimit });
  const rows = await WorkoutSession.findAll({
    where: { userId: clientId },
    include: [{ model: WorkoutLog, as: 'logs' }],
    order: [['completedAt', 'DESC']],
    limit,
  });

  return workoutHistoryResult(rows);
};

export const dispatchViewLastWorkout = (params = {}, ctx = {}) => (
  dispatchViewWorkoutHistory({ ...params, limit: 1 }, ctx, 1)
);

export const dispatchViewExerciseRecommendations = async (params = {}, ctx = {}) => {
  const clientId = resolveCommandClientId(params, ctx);
  const limit = limitFrom({ params, max: 10 });
  const options = recommendationOptionsFor({ params, limit });
  const exercises = await workoutService.getExerciseRecommendations(clientId, options);
  const names = exercises
    .map((exercise) => String(exercise?.name || '').trim())
    .filter(Boolean)
    .slice(0, limit);

  return {
    recommendationCount: exercises.length,
    firstRecommendation: names[0] || null,
    topRecommendations: names.length ? names.join(', ') : null,
  };
};
