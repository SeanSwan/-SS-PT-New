/**
 * Workout Log Source Policy
 * =========================
 * Centralizes source strings and server-derived safety flags for workout-log
 * writes so manual logger, Coach approvals, and history import do not drift.
 */

export const WORKOUT_LOG_SOURCES = Object.freeze({
  LIVE: 'live',
  HISTORICAL_IMPORT: 'historical_import',
  MOVE_FITNESS_HISTORICAL_IMPORT: 'move_fitness_historical_import',
  AI_GENERATED_BACKFILL: 'ai_generated_backfill',
});

export const HISTORICAL_WORKOUT_LOG_SOURCES = new Set([
  WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT,
  WORKOUT_LOG_SOURCES.MOVE_FITNESS_HISTORICAL_IMPORT,
  WORKOUT_LOG_SOURCES.AI_GENERATED_BACKFILL,
]);

const SOURCE_ALIASES = new Map([
  ['live', WORKOUT_LOG_SOURCES.LIVE],
  ['current', WORKOUT_LOG_SOURCES.LIVE],
  ['logger', WORKOUT_LOG_SOURCES.LIVE],
  ['workout_logger', WORKOUT_LOG_SOURCES.LIVE],
  ['historical', WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT],
  ['history', WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT],
  ['historical_import', WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT],
  ['history_import', WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT],
  ['ai_backfill', WORKOUT_LOG_SOURCES.AI_GENERATED_BACKFILL],
  ['ai_generated_backfill', WORKOUT_LOG_SOURCES.AI_GENERATED_BACKFILL],
  ['move_fitness_history', WORKOUT_LOG_SOURCES.MOVE_FITNESS_HISTORICAL_IMPORT],
  ['move_fitness_historical_import', WORKOUT_LOG_SOURCES.MOVE_FITNESS_HISTORICAL_IMPORT],
  ['movefitness_historical_import', WORKOUT_LOG_SOURCES.MOVE_FITNESS_HISTORICAL_IMPORT],
]);

export function normalizeWorkoutLogSource(source) {
  if (typeof source !== 'string') return WORKOUT_LOG_SOURCES.LIVE;
  const normalized = source.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return SOURCE_ALIASES.get(normalized) || WORKOUT_LOG_SOURCES.LIVE;
}

export function isHistoricalWorkoutLogSource(source) {
  return HISTORICAL_WORKOUT_LOG_SOURCES.has(normalizeWorkoutLogSource(source));
}

export function deriveWorkoutLogSourcePolicy(source) {
  const normalizedSource = normalizeWorkoutLogSource(source);
  const isHistorical = HISTORICAL_WORKOUT_LOG_SOURCES.has(normalizedSource);

  return {
    source: normalizedSource,
    isHistoricalImport: isHistorical,
    suppressPaidSessionDeduction: isHistorical,
    suppressPlanAdvancement: isHistorical,
    suppressEngagementSideEffects: isHistorical,
  };
}
