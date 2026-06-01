/**
 * UTILITY: CoachMessageWorkoutImportIdentity
 * PURPOSE: Builds stable keys for legacy workout import result rows.
 */

import type { CoachMessageData } from './SwanCoachTypes';

type WorkoutImportResult = NonNullable<NonNullable<CoachMessageData['metadata']>['workoutImportResults']>[number];

function workoutImportKeyPart(value: unknown): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'none';
}

function workoutImportMetric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function workoutImportItemKey(workout: WorkoutImportResult): string {
  if (workout.sessionId) {
    return `workout-import-session-${workoutImportKeyPart(workout.sessionId)}`;
  }

  return [
    'workout-import',
    workoutImportKeyPart(workout.date || 'undated'),
    workout.success ? 'success' : 'failed',
    `${workoutImportMetric(workout.exerciseCount)}-exercises`,
    `${workoutImportMetric(workout.totalSets)}-sets`,
    `${workoutImportMetric(workout.totalReps)}-reps`,
    `${workoutImportMetric(workout.totalWeight)}-lbs`,
  ].join('-');
}

export function workoutImportItems(workouts: readonly WorkoutImportResult[] = []) {
  const occurrences = new Map<string, number>();

  return workouts.map((workout, index) => {
    const baseKey = workoutImportItemKey(workout);
    const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
    occurrences.set(baseKey, occurrence);

    return {
      key: `${baseKey}-${occurrence}`,
      label: workout.date || `Workout ${index + 1}`,
      workout,
    };
  });
}
