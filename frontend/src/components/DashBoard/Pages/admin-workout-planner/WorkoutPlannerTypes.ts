/**
 * ============================================================================
 * FILE: WorkoutPlannerTypes.ts
 * PURPOSE: Shared types for the NASM Workout Planner page
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 */

import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';

// ─────────────────────────────────────────────────────────────
// SECTION: OPT Phase Definitions
// ─────────────────────────────────────────────────────────────
export interface OPTPhaseParams {
  phase: number;
  name: string;
  focus: string;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  intensity: string;
}

export const OPT_PHASES: OPTPhaseParams[] = [
  { phase: 1, name: 'Stabilization Endurance', focus: 'Neuromuscular efficiency & postural control', sets: '1-3', reps: '12-20', tempo: '4/2/1', rest: '0-90s', intensity: '50-70%' },
  { phase: 2, name: 'Strength Endurance', focus: 'Muscular endurance with strength foundation', sets: '2-4', reps: '8-12', tempo: '2/0/2', rest: '0-60s', intensity: '70-80%' },
  { phase: 3, name: 'Hypertrophy', focus: 'Maximal muscle growth', sets: '3-5', reps: '6-12', tempo: '2/0/2', rest: '0-60s', intensity: '75-85%' },
  { phase: 4, name: 'Maximal Strength', focus: 'Peak force production', sets: '4-6', reps: '1-5', tempo: 'X/0/X', rest: '3-5min', intensity: '85-100%' },
  { phase: 5, name: 'Power', focus: 'Maximum rate of force production', sets: '3-6', reps: '1-5 / 8-10', tempo: 'X/0/X', rest: '3-5min', intensity: '30-45% / 85-100%' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Plan Exercise Entry
// ─────────────────────────────────────────────────────────────
export interface PlanExercise {
  id: string;
  exerciseSlim: ExerciseSlim;
  sets: number;
  reps: string;
  tempo: string;
  restSeconds: number;
  intensityPercent: number;
  notes: string;
  supersetGroup?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Generated Workout (from backend)
// ─────────────────────────────────────────────────────────────
export interface GeneratedWorkout {
  clientId: number;
  trainerId: number;
  clientName: string;
  sessionType: 'build' | 'switch';
  category: string;
  nasmPhase: number;
  phaseParams: { name: string; focus: string; intensity: string; tempo: string };
  warmup: { name: string; duration?: string; sets?: number; reps?: number; type: string; reason?: string }[];
  exercises: {
    exerciseKey: string;
    exerciseName: string;
    muscles: string[];
    category: string;
    equipment: string[];
    sets: number;
    reps: number;
    tempo: string;
    rest: number;
    intensity: number;
  }[];
  swapSuggestions: { original: string; replacements: string[] }[];
  cooldown: { name: string; duration?: string; sets?: number; reps?: number }[];
  explanations: { type: string; message: string; details?: string }[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Generated Plan (from backend)
// ─────────────────────────────────────────────────────────────
export interface GeneratedPlan {
  clientId: number;
  clientName: string;
  planSummary: {
    durationWeeks: number;
    sessionsPerWeek: number;
    totalSessions: number;
    primaryGoal: string;
    startingPhase: number;
  };
  mesocycles: {
    mesocycle: number;
    weeks: number;
    nasmPhase: number;
    phaseName: string;
    focus: string;
    params: { sets: string; reps: string; intensity: string; tempo: string; rest: string };
    overloadStrategy: string;
    deloadWeek: number | null;
  }[];
  weeklySchedule: {
    dayNumber: number;
    focus: string;
    category: string;
  }[];
  recommendations: string[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Client (for selector)
// ─────────────────────────────────────────────────────────────
export interface PlannerClient {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
}

// L2.A (2026-05-02): annual option is 48 weeks (12 × 4-week mesocycles),
// not 52 calendar weeks. NASM OPT periodization runs in 4-week blocks,
// so 12 months of programming = 12 mesocycles = 48 weeks. The backend
// validator still caps at 52 to leave slack for non-mesocycle plans
// (see backend/services/ai/outputValidator.mjs:80).
export type PlanDuration = 'single' | '1' | '4' | '8' | '12' | '16' | '24' | '36' | '48';
export type PlanGoal = 'general_fitness' | 'hypertrophy' | 'strength' | 'fat_loss' | 'athletic_performance' | 'golf_performance';
export type WorkoutCategory = 'full_body' | 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';

export const PLAN_DURATIONS: { value: PlanDuration; label: string; description: string }[] = [
  { value: 'single', label: 'Single Session', description: 'One workout' },
  { value: '1', label: '1 Week (Trial)', description: 'Intro/deload week' },
  { value: '4', label: '1 Month (4 weeks)', description: 'Standard mesocycle' },
  { value: '8', label: '2 Months (8 weeks)', description: 'Training block' },
  { value: '12', label: '3 Months (12 weeks)', description: 'Quarter plan' },
  { value: '16', label: '4 Months (16 weeks)', description: 'Contest/event prep' },
  { value: '24', label: '6 Months (24 weeks)', description: 'Long-horizon periodization' },
  { value: '36', label: '9 Months (36 weeks)', description: 'Seasonal athlete plan' },
  { value: '48', label: '12 Months (48 weeks)', description: 'Annual periodization (12 × 4-week mesocycles)' },
];

export const PLAN_GOALS: { value: PlanGoal; label: string }[] = [
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'hypertrophy', label: 'Muscle Growth' },
  { value: 'strength', label: 'Strength' },
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'athletic_performance', label: 'Athletic Performance' },
  { value: 'golf_performance', label: 'Golf Performance' },
];

export const WORKOUT_CATEGORIES: { value: WorkoutCategory; label: string }[] = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'legs', label: 'Legs' },
  { value: 'core', label: 'Core' },
];
