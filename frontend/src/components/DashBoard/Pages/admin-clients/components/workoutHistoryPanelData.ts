/**
 * COMPONENT: workoutHistoryPanelData
 * PURPOSE: Pure data helpers for the canonical WorkoutHistoryPanel surface.
 */

import type {
  PersonalRecord,
  WorkoutLogEntry,
  WorkoutSession,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { calcBrzycki1RM } from '../../../../../hooks/analytics/workoutAnalyticsUtils';

export interface GroupedWorkoutSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  tempo?: string;
  rest?: number;
  est1RM: number;
}

export type GroupedWorkoutLogs = Array<[string, { sets: GroupedWorkoutSet[] }]>;

export function sortPersonalRecords(records: PersonalRecord[]): PersonalRecord[] {
  return [...records].sort((a, b) =>
    b.weight - a.weight ||
    b.reps - a.reps ||
    a.exercise.localeCompare(b.exercise) ||
    a.date.localeCompare(b.date));
}

export function getPersonalRecordKey(pr: PersonalRecord): string {
  return ['pr', pr.exercise, pr.date, pr.weight, pr.reps, pr.estimated1RM ?? ''].join('|');
}

export function groupSessionLogs(session: Pick<WorkoutSession, 'logs'>): GroupedWorkoutLogs {
  const groups: Record<string, { sets: GroupedWorkoutSet[] }> = {};

  for (const log of session.logs as WorkoutLogEntry[]) {
    if (!groups[log.exerciseName]) {
      groups[log.exerciseName] = { sets: [] };
    }

    groups[log.exerciseName].sets.push({
      setNumber: log.setNumber,
      reps: log.reps,
      weight: log.weight,
      rpe: log.rpe,
      tempo: log.tempo,
      rest: log.rest,
      est1RM: calcBrzycki1RM(log.weight, log.reps),
    });
  }

  return Object.entries(groups);
}
