/**
 * workoutGenerationSchemas.mjs
 * ─────────────────────────────────────────────────────────────
 * Nested Zod schemas for AI-generated workout validation.
 *
 * CEO Ruling V2.0 Issue #3:
 *   - AI outputs targetIntensity as INTEGER percentage (30-100)
 *   - AI outputs exerciseKey linking to exercises.exercise_key
 *   - Backend calculates actual weight (never the LLM)
 *   - Tempo regex supports multi-digit values: /^\d+\/\d+\/\d+$|^[Xx]\/\d+\/[Xx]$/
 *
 * These schemas validate the structured JSON output from any AI provider
 * before it reaches the frontend or triggers any database writes.
 *
 * Usage:
 *   import { GeneratedWorkoutSchema, validateGeneratedWorkout } from './workoutGenerationSchemas.mjs';
 *   const result = validateGeneratedWorkout(aiOutput);
 *   if (!result.success) { /* handle validation errors */ }
 */

import { z } from 'zod';

// ─── Tempo Regex (CEO Ruling V2.0 Issue #6) ─────────────────
// Supports: "4/2/1", "X/0/X", "10/2/1" (multi-digit)
const TEMPO_REGEX = /^\d+\/\d+\/\d+$|^[Xx]\/\d+\/[Xx]$/;

// ─── Individual Exercise Schema ─────────────────────────────

export const WorkoutExerciseSchema = z.object({
  /** Display name of the exercise */
  exerciseName: z.string().min(1).max(200),

  /** Stable key linking to exercises.exercise_key in DB */
  exerciseKey: z.string().min(1).max(255),

  /** Superset group ID — 'A', 'B', etc. Null if not a superset. */
  supersetGroupId: z.string().max(5).nullable().optional(),

  /** Number of sets (1-10) */
  sets: z.number().int().min(1).max(10),

  /** Number of reps per set (1-100) */
  reps: z.number().int().min(1).max(100),

  /**
   * Target intensity as INTEGER percentage of 1RM (30-100).
   * CEO Ruling: AI outputs this. Backend calculates actual weight.
   * The LLM MUST NOT output a weight value — only intensity %.
   */
  targetIntensity: z.number().int().min(30).max(100),

  /** NASM tempo notation: "4/2/1", "X/0/X", "2/0/2" */
  tempo: z.string().regex(TEMPO_REGEX, {
    message: 'Tempo must match NASM format: "4/2/1", "X/0/X", or similar (eccentric/isometric/concentric)',
  }),

  /** Rest period in seconds between sets (0-600) */
  restSeconds: z.number().int().min(0).max(600),

  /** Optional notes from AI about form cues or modifications */
  notes: z.string().max(500).optional(),
});

// ─── Full Generated Workout Schema ──────────────────────────

export const GeneratedWorkoutSchema = z.object({
  /** NASM OPT phase name */
  phase: z.enum([
    'Stabilization Endurance',
    'Strength Endurance',
    'Hypertrophy',
    'Maximal Strength',
    'Power',
  ]),

  /** Array of exercises in the workout */
  exercises: z.array(WorkoutExerciseSchema).min(1).max(30),

  /** Estimated total workout duration in minutes */
  totalEstimatedMinutes: z.number().int().min(1).max(180),

  /** Optional AI reasoning for the workout selection */
  reasoning: z.string().max(1000).optional(),
});

// ─── Validation Helper ──────────────────────────────────────

/**
 * Validate AI-generated workout output against the V2.0 schema.
 *
 * @param {unknown} data - Raw parsed JSON from AI provider
 * @returns {{ success: boolean, data?: object, errors?: string[] }}
 */
export function validateGeneratedWorkout(data) {
  const result = GeneratedWorkoutSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Extract human-readable error messages
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });

  return { success: false, errors };
}

// ─── Single Exercise Validation ─────────────────────────────

/**
 * Validate a single exercise entry from AI output.
 *
 * @param {unknown} data - Single exercise object
 * @returns {{ success: boolean, data?: object, errors?: string[] }}
 */
export function validateWorkoutExercise(data) {
  const result = WorkoutExerciseSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });

  return { success: false, errors };
}

// ─── Phase Number ↔ Name Mapping ────────────────────────────

export const PHASE_NAMES = {
  1: 'Stabilization Endurance',
  2: 'Strength Endurance',
  3: 'Hypertrophy',
  4: 'Maximal Strength',
  5: 'Power',
};

export const PHASE_NUMBERS = {
  'Stabilization Endurance': 1,
  'Strength Endurance': 2,
  'Hypertrophy': 3,
  'Maximal Strength': 4,
  'Power': 5,
};
