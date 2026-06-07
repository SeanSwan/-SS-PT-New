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

interface ExerciseLedgerAccumulator {
  sessionIds: Set<string>;
  setCount: number;
  totalReps: number;
  totalVolume: number;
  maxWeight: number;
  lastDate: string;
}

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

export function addStringToSet(previous: Set<string>, id: string): Set<string> {
  if (previous.has(id)) return previous;
  const next = new Set(previous);
  next.add(id);
  return next;
}

export function toggleStringSet(previous: Set<string>, id: string): Set<string> {
  const next = new Set(previous);
  if (next.has(id)) {
    next.delete(id);
    return next;
  }
  next.add(id);
  return next;
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

const createLedgerAccumulator = (): ExerciseLedgerAccumulator => ({
  sessionIds: new Set<string>(),
  setCount: 0,
  totalReps: 0,
  totalVolume: 0,
  maxWeight: 0,
  lastDate: '',
});

const getLedgerAccumulator = (
  rows: Map<string, ExerciseLedgerAccumulator>,
  exerciseName: string,
): ExerciseLedgerAccumulator => {
  const existing = rows.get(exerciseName);
  if (existing) return existing;
  const created = createLedgerAccumulator();
  rows.set(exerciseName, created);
  return created;
};

const getMostRecentDate = (currentDate: string, nextDate: string): string => {
  if (!currentDate) return nextDate;
  return new Date(nextDate).getTime() > new Date(currentDate).getTime()
    ? nextDate
    : currentDate;
};

const applyLedgerLog = (
  rows: Map<string, ExerciseLedgerAccumulator>,
  session: WorkoutSession,
  log: WorkoutLogEntry,
): void => {
  const exerciseName = log.exerciseName?.trim();
  if (!exerciseName) return;

  const row = getLedgerAccumulator(rows, exerciseName);
  const reps = Number(log.reps) || 0;
  const weight = Number(log.weight) || 0;
  row.sessionIds.add(session.id);
  row.setCount += 1;
  row.totalReps += reps;
  row.totalVolume += weight * reps;
  row.maxWeight = Math.max(row.maxWeight, weight);
  row.lastDate = getMostRecentDate(row.lastDate, session.date);
};

const toExerciseLedgerRow = (
  [exerciseName, row]: [string, ExerciseLedgerAccumulator],
): ExerciseLedgerRow => ({
  exerciseName,
  sessionCount: row.sessionIds.size,
  setCount: row.setCount,
  totalReps: row.totalReps,
  totalVolume: row.totalVolume,
  maxWeight: row.maxWeight,
  lastDate: row.lastDate,
});

const sortExerciseLedgerRows = (rows: ExerciseLedgerRow[]): ExerciseLedgerRow[] => (
  rows.sort((a, b) =>
    b.sessionCount - a.sessionCount ||
    b.setCount - a.setCount ||
    b.totalVolume - a.totalVolume ||
    a.exerciseName.localeCompare(b.exerciseName))
);

export function buildExerciseLedger(sessions: WorkoutSession[]): ExerciseLedgerRow[] {
  const rows = new Map<string, ExerciseLedgerAccumulator>();

  for (const session of sessions) {
    for (const log of session.logs) {
      applyLedgerLog(rows, session, log);
    }
  }

  return sortExerciseLedgerRows(Array.from(rows.entries()).map(toExerciseLedgerRow));
}
