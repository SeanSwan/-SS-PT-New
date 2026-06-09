/**
 * Workout Statistics Read Dispatcher
 * ==================================
 *
 * Swan Coach read command for workout statistics derived from completed
 * workout sessions and their logged exercise rows.
 */

import { getAllModels } from '../../../models/index.mjs';
import { toDateOnly } from '../../clientTrainingSafeReadValueService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const numberOrZero = (value) => Number(value || 0);

const logsFor = (row) => (Array.isArray(row.logs) ? row.logs : []);

const exerciseNameFor = (log) => String(log.exerciseName || '').trim();

const repsFor = (log) => Number(log.reps || 0);

const workoutDateFor = (row) => toDateOnly(row?.completedAt || row?.date);

const rowSetCount = (row, logs) => logs.length || numberOrZero(row.totalSets);

const rowRepCount = (row, logs) => (
  logs.reduce((sum, log) => sum + repsFor(log), 0) || numberOrZero(row.totalReps)
);

const intensityFor = (row) => Number(row.intensity ?? row.intensityRating);

const averageIntensityFor = ({ intensityTotal, intensityCount }) => (
  intensityCount ? Number((intensityTotal / intensityCount).toFixed(1)) : null
);

const addExerciseCount = (exerciseCounts, log) => {
  const exerciseName = exerciseNameFor(log);
  if (!exerciseName) return;
  exerciseCounts.set(exerciseName, (exerciseCounts.get(exerciseName) || 0) + 1);
};

const addIntensity = (stats, row) => {
  const intensity = intensityFor(row);
  if (!Number.isFinite(intensity) || intensity <= 0) return;

  stats.intensityTotal += intensity;
  stats.intensityCount += 1;
};

const addWorkoutRow = (stats, row) => {
  const logs = logsFor(row);
  stats.totalDuration += numberOrZero(row.duration);
  stats.totalSets += rowSetCount(row, logs);
  stats.totalReps += rowRepCount(row, logs);
  addIntensity(stats, row);
  logs.forEach((log) => addExerciseCount(stats.exerciseCounts, log));
};

const summarizeRows = (rows) => {
  const stats = {
    totalDuration: 0,
    totalSets: 0,
    totalReps: 0,
    intensityTotal: 0,
    intensityCount: 0,
    exerciseCounts: new Map(),
  };

  rows.forEach((row) => addWorkoutRow(stats, row));
  return stats;
};

const topExerciseFrom = (exerciseCounts) => (
  [...exerciseCounts.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0]
);

const buildStatisticsResult = ({ rows, stats }) => {
  const [topExercise, topExerciseSets] = topExerciseFrom(stats.exerciseCounts);

  return {
    totalWorkouts: rows.length,
    totalDuration: stats.totalDuration,
    totalSets: stats.totalSets,
    totalReps: stats.totalReps,
    averageIntensity: averageIntensityFor(stats),
    lastWorkoutDate: workoutDateFor(rows[0]),
    topExercise,
    topExerciseSets,
  };
};

const findCompletedWorkoutRows = ({ WorkoutSession, WorkoutLog, clientId }) => (
  WorkoutSession.findAll({
    where: { userId: clientId, status: 'completed' },
    include: [{ model: WorkoutLog, as: 'logs' }],
    order: [['completedAt', 'DESC']],
    limit: 100,
  })
);

export const dispatchViewWorkoutStatistics = async (params = {}, ctx = {}) => {
  const { WorkoutSession, WorkoutLog } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const rows = await findCompletedWorkoutRows({ WorkoutSession, WorkoutLog, clientId });

  return buildStatisticsResult({
    rows,
    stats: summarizeRows(rows),
  });
};
