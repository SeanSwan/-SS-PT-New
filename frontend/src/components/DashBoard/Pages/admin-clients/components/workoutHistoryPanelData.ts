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

export interface ExerciseLedgerRow {
  exerciseName: string;
  sessionCount: number;
  setCount: number;
  totalReps: number;
  totalVolume: number;
  maxWeight: number;
  lastDate: string;
}

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

export function buildExerciseLedger(sessions: WorkoutSession[]): ExerciseLedgerRow[] {
  const rows = new Map<string, {
    sessionIds: Set<string>;
    setCount: number;
    totalReps: number;
    totalVolume: number;
    maxWeight: number;
    lastDate: string;
  }>();

  for (const session of sessions) {
    for (const log of session.logs) {
      const exerciseName = log.exerciseName?.trim();
      if (!exerciseName) continue;

      const existing = rows.get(exerciseName) || {
        sessionIds: new Set<string>(),
        setCount: 0,
        totalReps: 0,
        totalVolume: 0,
        maxWeight: 0,
        lastDate: '',
      };
      existing.sessionIds.add(session.id);
      existing.setCount += 1;
      existing.totalReps += Number(log.reps) || 0;
      existing.totalVolume += (Number(log.weight) || 0) * (Number(log.reps) || 0);
      existing.maxWeight = Math.max(existing.maxWeight, Number(log.weight) || 0);
      if (!existing.lastDate || new Date(session.date).getTime() > new Date(existing.lastDate).getTime()) {
        existing.lastDate = session.date;
      }
      rows.set(exerciseName, existing);
    }
  }

  return Array.from(rows.entries())
    .map(([exerciseName, row]) => ({
      exerciseName,
      sessionCount: row.sessionIds.size,
      setCount: row.setCount,
      totalReps: row.totalReps,
      totalVolume: row.totalVolume,
      maxWeight: row.maxWeight,
      lastDate: row.lastDate,
    }))
    .sort((a, b) =>
      b.sessionCount - a.sessionCount ||
      b.setCount - a.setCount ||
      b.totalVolume - a.totalVolume ||
      a.exerciseName.localeCompare(b.exerciseName));
}
