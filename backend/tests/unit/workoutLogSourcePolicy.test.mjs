/**
 * workoutLogSourcePolicy tests
 * ============================
 * Locks shared historical-import source semantics for Coach and logger paths.
 */
import { describe, expect, it } from 'vitest';
import {
  WORKOUT_LOG_SOURCES,
  deriveWorkoutLogSourcePolicy,
  isHistoricalWorkoutLogSource,
  normalizeWorkoutLogSource,
} from '../../services/workout/workoutLogSourcePolicy.mjs';

describe('workoutLogSourcePolicy', () => {
  it('normalizes known live and historical source aliases', () => {
    expect(normalizeWorkoutLogSource('Live')).toBe(WORKOUT_LOG_SOURCES.LIVE);
    expect(normalizeWorkoutLogSource('history import')).toBe(WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT);
    expect(normalizeWorkoutLogSource('movefitness-historical-import')).toBe(WORKOUT_LOG_SOURCES.MOVE_FITNESS_HISTORICAL_IMPORT);
    expect(normalizeWorkoutLogSource('ai backfill')).toBe(WORKOUT_LOG_SOURCES.AI_GENERATED_BACKFILL);
    expect(normalizeWorkoutLogSource('unknown-client-supplied-flag')).toBe(WORKOUT_LOG_SOURCES.LIVE);
  });

  it('derives suppression flags only for whitelisted historical sources', () => {
    expect(deriveWorkoutLogSourcePolicy('historical_import')).toMatchObject({
      source: WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT,
      isHistoricalImport: true,
      suppressPaidSessionDeduction: true,
      suppressPlanAdvancement: true,
      suppressEngagementSideEffects: true,
    });

    expect(deriveWorkoutLogSourcePolicy('live')).toMatchObject({
      source: WORKOUT_LOG_SOURCES.LIVE,
      isHistoricalImport: false,
      suppressPaidSessionDeduction: false,
      suppressPlanAdvancement: false,
      suppressEngagementSideEffects: false,
    });

    expect(isHistoricalWorkoutLogSource('move_fitness_historical_import')).toBe(true);
    expect(isHistoricalWorkoutLogSource('live')).toBe(false);
  });
});
