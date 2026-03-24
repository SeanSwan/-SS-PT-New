/**
 * ============================================================================
 * FILE: workoutAnalyticsUtils.ts
 * PURPOSE: Pure derivation functions for NASM workout analytics
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Computes derived analytics (1RM progression, muscle group
 * volume, RPE trends) from raw workout session data using NASM OPT formulas.
 *
 * HOW IT FITS: useWorkoutAnalytics hook → these utils → Victory chart data
 */

import type { WorkoutSession, WorkoutLogEntry } from './useWorkoutAnalytics';

// ─────────────────────────────────────────────────────────────
// SECTION: New NASM Analytics Types
// ─────────────────────────────────────────────────────────────

export interface OneRMProgression {
  exercise: string;
  date: string;
  estimated1RM: number;
}

export interface MuscleGroupVolume {
  group: string;
  volume: number;
}

export interface RPEPoint {
  date: string;
  avgRPE: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Brzycki 1RM Formula (NASM Standard)
// estimated1RM = weight / (1.0278 - 0.0278 × reps)
// Valid for 2-10 rep range
// ─────────────────────────────────────────────────────────────

export function calcBrzycki1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 10) return weight * (1 + reps / 30); // Epley fallback for 10+ reps
  return Math.round(weight / (1.0278 - 0.0278 * reps));
}

// ─────────────────────────────────────────────────────────────
// SECTION: Muscle Group Mapping
// Maps exercise name keywords to NASM muscle groups for radar chart
// ─────────────────────────────────────────────────────────────

const MUSCLE_GROUP_KEYWORDS: Record<string, string[]> = {
  Chest: ['bench', 'chest', 'fly', 'push-up', 'pushup', 'press', 'pec', 'dip'],
  Back: ['row', 'pull', 'lat', 'back', 'deadlift', 'chin-up', 'pulldown'],
  Shoulders: ['shoulder', 'delt', 'overhead', 'lateral raise', 'military', 'arnold'],
  Arms: ['bicep', 'tricep', 'curl', 'extension', 'hammer', 'preacher', 'skull'],
  Legs: ['squat', 'leg', 'lunge', 'calf', 'hamstring', 'quad', 'hip', 'glute', 'step-up'],
  Core: ['plank', 'crunch', 'ab', 'core', 'oblique', 'russian twist', 'sit-up', 'hollow'],
};

export function classifyMuscleGroup(exerciseName: string): string {
  const lower = exerciseName.toLowerCase();
  for (const [group, keywords] of Object.entries(MUSCLE_GROUP_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return group;
  }
  return 'Other';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Derivation Functions
// ─────────────────────────────────────────────────────────────

/** Derive 1RM progression over time for top exercises */
export function derive1RMProgression(sessions: WorkoutSession[]): OneRMProgression[] {
  const points: OneRMProgression[] = [];
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const s of sorted) {
    // Track best 1RM per exercise per session
    const bestPerExercise = new Map<string, number>();
    for (const log of s.logs) {
      if (log.weight <= 0) continue;
      const est = calcBrzycki1RM(log.weight, log.reps);
      const current = bestPerExercise.get(log.exerciseName) || 0;
      if (est > current) bestPerExercise.set(log.exerciseName, est);
    }
    for (const [exercise, estimated1RM] of bestPerExercise) {
      points.push({ exercise, date: s.date, estimated1RM });
    }
  }

  return points;
}

/** Aggregate volume by muscle group for radar chart */
export function deriveMuscleGroupVolume(sessions: WorkoutSession[]): MuscleGroupVolume[] {
  const groupVolume = new Map<string, number>();

  for (const s of sessions) {
    for (const log of s.logs) {
      const group = classifyMuscleGroup(log.exerciseName);
      const vol = log.weight * log.reps;
      groupVolume.set(group, (groupVolume.get(group) || 0) + vol);
    }
  }

  return Array.from(groupVolume.entries())
    .map(([group, volume]) => ({ group, volume }))
    .filter(g => g.group !== 'Other' || g.volume > 0)
    .sort((a, b) => b.volume - a.volume);
}

/** Derive average RPE per session over time */
export function deriveRPETrend(sessions: WorkoutSession[]): RPEPoint[] {
  return [...sessions]
    .filter(s => s.logs.some(l => l.rpe && l.rpe > 0))
    .map(s => {
      const rpeEntries = s.logs.filter(l => l.rpe && l.rpe > 0);
      const avg = rpeEntries.reduce((sum, l) => sum + (l.rpe || 0), 0) / rpeEntries.length;
      return { date: s.date, avgRPE: Math.round(avg * 10) / 10 };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Calculate longest workout streak from calendar data */
export function calcLongestStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(
    sessions.map(s => new Date(s.date).toISOString().split('T')[0])
  );
  const sortedDates = Array.from(dates).sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}
