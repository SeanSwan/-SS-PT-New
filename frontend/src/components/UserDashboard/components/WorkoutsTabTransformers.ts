/**
 * Data transformation helpers for the active UserDashboard V3 workout panel.
 */

import { classifyMuscleGroup } from '../../../hooks/analytics/workoutAnalyticsUtils';
import { CATEGORY_META, type CategoryData } from './WorkoutsTabData';

export interface LogEntry {
  exerciseName?: string;
}

export interface RawSession {
  logs?: LogEntry[];
  WorkoutLogs?: LogEntry[];
  completedAt?: string;
  workoutDate?: string;
  date?: string;
}

const GROUP_TO_CATEGORY: Record<string, string> = {
  Chest: 'Chest',
  Back: 'Back',
  Shoulders: 'Shoulders',
  Arms: 'Arms',
  Legs: 'Legs',
  Core: 'Core',
  Cardio: 'Cardio',
  'Full Body': 'Full Body',
  Other: 'Other',
};

export function extractWorkoutSessions(payload: unknown): RawSession[] {
  if (Array.isArray(payload)) return payload as RawSession[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { workouts?: unknown }).workouts)) {
    return (payload as { workouts: RawSession[] }).workouts;
  }
  return [];
}

export function transformWorkoutLogs(sessions: RawSession[]): CategoryData[] {
  const counts: Record<string, Record<string, number>> = {};

  for (const session of sessions) {
    const exercisesInSession = new Set<string>();
    for (const log of session.logs || session.WorkoutLogs || []) {
      if (log.exerciseName) exercisesInSession.add(log.exerciseName);
    }

    for (const name of exercisesInSession) {
      const category = GROUP_TO_CATEGORY[classifyMuscleGroup(name)] || 'Other';
      counts[category] = counts[category] || {};
      counts[category][name] = (counts[category][name] || 0) + 1;
    }
  }

  return Object.entries(CATEGORY_META)
    .map(([key, meta]) => ({
      key,
      label: key,
      icon: meta.icon,
      color: meta.color,
      exercises: Object.entries(counts[key] || {})
        .map(([name, count]) => ({ name, count }))
        .sort((left, right) => right.count - left.count),
    }))
    .filter((category) => category.exercises.length > 0);
}

export function calcStreak(sessions: RawSession[]): number {
  const dates = new Set<string>();

  for (const session of sessions) {
    const raw = session.completedAt || session.workoutDate || session.date;
    const normalized = normalizeDate(raw);
    if (normalized) dates.add(normalized);
  }

  if (dates.size === 0) return 0;

  const sorted = Array.from(dates).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const diffFromToday = Math.round((new Date(today).getTime() - new Date(sorted[0]).getTime()) / 86400000);
  if (diffFromToday > 1) return 0;

  let streak = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(sorted[index - 1]);
    const current = new Date(sorted[index]);
    const diff = Math.round((previous.getTime() - current.getTime()) / 86400000);
    if (diff !== 1) break;
    streak += 1;
  }

  return streak;
}

function normalizeDate(raw?: string): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}
