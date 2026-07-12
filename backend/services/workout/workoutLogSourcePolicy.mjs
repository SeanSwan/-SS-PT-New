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
  PLAUD_MERGE: 'plaud_merge',
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
  ['plaud_merge', WORKOUT_LOG_SOURCES.PLAUD_MERGE],
  ['plaud_merge_segment', WORKOUT_LOG_SOURCES.PLAUD_MERGE],
  ['plaud', WORKOUT_LOG_SOURCES.PLAUD_MERGE],
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
  const isPlaudMerge = normalizedSource === WORKOUT_LOG_SOURCES.PLAUD_MERGE;
  // ai_generated_backfill is SYNTHETIC — its sets are fabricated by the generator, not
  // performed by the client. plaud_merge is historical but REAL. Only the synthetic lane
  // is PR-suppressed.
  const isSyntheticBackfill = normalizedSource === WORKOUT_LOG_SOURCES.AI_GENERATED_BACKFILL;

  return {
    source: normalizedSource,
    isHistoricalImport: isHistorical,
    isSyntheticBackfill,
    /**
     * Synthetic filler must NEVER mint or beat a personal record.
     *
     * The backfill generator pairs MAX(weight) with MAX(reps) taken from INDEPENDENT
     * aggregates (analyticsExerciseHistoryService), so it can emit a set the client never
     * performed — e.g. real history of 225x1 and 135x15 yields a fabricated 225x12, whose
     * Brzycki est-1RM (~324) beats the client's real est-1RM PR (225). That overwrote the
     * PR row and repointed its sessionId at the filler session; undoing the backfill then
     * DESTROYED that row, permanently erasing the client's real best.
     *
     * Suppressing PR detection for this source fixes it at the root: no PR row ever points
     * at a generated session, so undo has nothing of the client's to destroy. Real historical
     * imports (plaud_merge) still record baselines — those are lifts that actually happened.
     */
    suppressPersonalRecords: isSyntheticBackfill,
    // PLAUD applies keep their pre-unification no-billing behavior (Phase
    // 1.1a, Fable Vision arc). Whether a live PLAUD-applied session should
    // deduct a paid credit is Sean's classification call — flipping this
    // one flag activates billing on that lane. Data-truth side effects
    // (diary form, XP, plan advance, challenges) stay ON for PLAUD.
    suppressPaidSessionDeduction: isHistorical || isPlaudMerge,
    suppressPlanAdvancement: isHistorical,
    suppressEngagementSideEffects: isHistorical,
  };
}
