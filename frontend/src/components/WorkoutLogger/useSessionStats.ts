/**
 * ┌─── HOOK: useSessionStats ─────────────────────────────────┐
 * │ PURPOSE: Calculate live session statistics as sets are      │
 * │ logged — total volume, set count, PR detection.             │
 * │                                                              │
 * │ Returns: { totalVolume, completedSets, totalSets,           │
 * │            prs, estimatedCalories }                          │
 * └──────────────────────────────────────────────────────────────┘
 */

import { useMemo } from 'react';
import type { ExerciseEntry } from '../../services/nasmApiService';

export interface PersonalRecord {
  exerciseName: string;
  type: 'weight' | 'volume';
  value: number;
  label: string;
}

export interface SessionStats {
  /** Sum of (weight × reps) across all sets */
  totalVolume: number;
  /** Number of sets with reps > 0 — bodyweight sets (weight 0) are REAL completed work (~24% of prod sets) */
  completedSets: number;
  /** Total set slots */
  totalSets: number;
  /** Unique exercises */
  exerciseCount: number;
  /** Estimated calories (rough: 1 cal per 15 lbs volume) */
  estimatedCalories: number;
  /** Detected PRs this session */
  prs: PersonalRecord[];
  /** Formatted volume string (e.g., "12,450 lbs") */
  formattedVolume: string;
}

/**
 * Calculate session stats from the current exercise list.
 * Memoized — only recalculates when exercises array changes.
 */
export function useSessionStats(exercises: ExerciseEntry[]): SessionStats {
  return useMemo(() => {
    let totalVolume = 0;
    let completedSets = 0;
    let totalSets = 0;
    const prs: PersonalRecord[] = [];

    // Track max weight per exercise for PR detection within session
    const maxWeightPerExercise = new Map<string, number>();

    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        totalSets++;

        // A set is COMPLETED when real work happened (reps > 0) — bodyweight sets (weight 0, e.g.
        // pull-ups/push-ups) count. Mirrors the server-side proof loader's contract so the SaveSuccess
        // "N sets" and the handoff's exercise count never disagree about the same session.
        if (set.reps > 0) {
          completedSets++;
        }

        // Volume + PR math stay LOAD-gated: bodyweight adds no external load.
        if (set.weight > 0 && set.reps > 0) {
          const setVolume = set.weight * set.reps;
          totalVolume += setVolume;

          // Track max weight for this exercise
          const currentMax = maxWeightPerExercise.get(exercise.exerciseName) || 0;
          if (set.weight > currentMax) {
            maxWeightPerExercise.set(exercise.exerciseName, set.weight);
          }
        }
      }
    }

    // Rough calorie estimate: ~1 cal per 15 lbs of volume lifted
    // This is a simplified model — actual depends on many factors
    const estimatedCalories = Math.round(totalVolume / 15);

    const formattedVolume = totalVolume.toLocaleString() + ' lbs';

    return {
      totalVolume,
      completedSets,
      totalSets,
      exerciseCount: exercises.length,
      estimatedCalories,
      prs,
      formattedVolume,
    };
  }, [exercises]);
}
