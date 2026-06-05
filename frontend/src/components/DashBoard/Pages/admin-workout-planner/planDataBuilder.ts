/**
 * planDataBuilder.ts
 * ===================
 *
 * Builds the `planData` JSONB payload posted to `/api/workout-plans` and
 * `/api/workout-plans/:id`. Two modes:
 *
 *   - 'manual': single-week one-day shape from the lower Plan Builder
 *     panel's `planExercises` array. Pre-existing behavior.
 *
 *   - 'generated': full multi-month shape from `generatedPlan` produced
 *     by POST `/api/workout-builder/plan`. ALL L1 additive fields are
 *     carried through verbatim (weeks[], mesocycles, weeklySchedule,
 *     recommendations, recommendationDetails, rationale, planSummary).
 *
 * Why this module exists (extracted 2026-05-02 in response to AI Village
 * CRITICAL-4 finding): the prior in-component `buildPlanData` produced
 * ONLY the manual-mode shape. Trainers could generate a 12-month plan,
 * see it render in the UI, click Save, and silently persist only the
 * first week — the long-horizon weeks[] / mesocycles / recommendations
 * never reached the database. Fixing the bug + extracting it makes the
 * persistence contract Tier-A testable.
 */

import type { GeneratedPlan, PlanExercise, PlanGoal, WorkoutCategory } from './WorkoutPlannerTypes';

interface ManualBuildInputs {
  mode: 'manual';
  phaseName: string;
  phaseNumber: number;
  category: WorkoutCategory;
  categoryLabel: string;
  goal: PlanGoal;
  planExercises: PlanExercise[];
}

interface GeneratedBuildInputs {
  mode: 'generated';
  generatedPlan: GeneratedPlan;
  category: WorkoutCategory;
  goal: PlanGoal;
}

export type BuildPlanDataInputs = ManualBuildInputs | GeneratedBuildInputs;

/**
 * Produces the JSONB payload expected by the workout-plans backend route.
 * Backend stores whatever JSONB is sent and the L1 contract is strictly
 * additive, so extra fields round-trip fine.
 */
export function buildPlanData(inputs: BuildPlanDataInputs): Record<string, unknown> {
  if (inputs.mode === 'generated') {
    const { generatedPlan, goal } = inputs;
    // V3a (2026-05-03) Codex Diff #7 — multi-week plans are ALWAYS full-body
    // by definition (a 12-month plan covers every body part across the
    // mesocycles). Sean's L4: "if I'm picking full body and I'm doing a three
    // month plan a one week plan a 12 month plan … all of those are going
    // to have to be full body because they're going to be a plan for not
    // just one day". Force category='full_body' regardless of UI state so
    // misleading metadata can never reach the database via this path.
    const generatedCategory = 'full_body';
    // Carry through every L1 additive field exactly as the generator emitted
    // it. Optional fields are included only when present so V1 / pre-L1
    // plan loaders that don't recognize them are unaffected.
    const payload: Record<string, unknown> = {
      weeks: Array.isArray(generatedPlan.weeks) ? generatedPlan.weeks : [],
      mesocycles: generatedPlan.mesocycles ?? [],
      weeklySchedule: generatedPlan.weeklySchedule ?? [],
      recommendations: generatedPlan.recommendations ?? [],
      // Phase A backend emits a structured rationale[] string array
      // describing how goal+phase shaped THIS plan. Carry it through.
      // Codex 2026-05-03 round-2 finding: was being silently dropped.
      rationale: generatedPlan.rationale ?? [],
      planSummary: generatedPlan.planSummary,
      goal,
      category: generatedCategory,
    };
    if (generatedPlan.recommendationDetails) {
      payload.recommendationDetails = generatedPlan.recommendationDetails;
    }
    if (generatedPlan.equipmentContext !== undefined) {
      payload.equipmentContext = generatedPlan.equipmentContext;
    }
    return payload;
  }

  // Manual mode — pre-existing one-week, one-day shape.
  const { phaseName, phaseNumber, category, categoryLabel, goal, planExercises } = inputs;
  const phaseToOpt: Record<number, string> = {
    1: 'stabilization_endurance', 2: 'strength_endurance',
    3: 'hypertrophy', 4: 'maximal_strength', 5: 'power',
  };
  return {
    weeks: [{
      weekNumber: 1,
      days: [{
        dayNumber: 1,
        name: `${phaseName} Workout`,
        focus: categoryLabel,
        dayType: 'training',
        optPhase: phaseToOpt[phaseNumber] || 'strength_endurance',
        exercises: planExercises.map((p, i) => ({
          exerciseId: p.exerciseSlim.id,
          exerciseName: p.exerciseSlim.name,
          orderInWorkout: i + 1,
          sets: p.sets,
          reps: p.reps,
          setScheme: `${p.sets}x${p.reps}`,
          repGoal: p.reps,
          restPeriod: typeof p.restSeconds === 'number'
            ? p.restSeconds
            : parseInt(String(p.restSeconds), 10) || 60,
          tempo: p.tempo,
          intensityGuideline: `${p.intensityPercent}% 1RM`,
          notes: p.notes || '',
        })),
      }],
    }],
    goal,
    category,
  };
}

/**
 * Stable signature of the buildable content for dirty-state tracking.
 * Manual: serializes the planExercises slice that round-trips through
 * save/load. Generated: serializes the planSummary + a deterministic
 * digest of weeks/days/exercises so changes to the generated plan cause
 * the Update Plan button to light up.
 */
export function buildContentSignature(inputs: BuildPlanDataInputs): string {
  if (inputs.mode === 'generated') {
    const { generatedPlan } = inputs;
    return JSON.stringify({
      mode: 'generated',
      summary: generatedPlan.planSummary,
      weeks: (generatedPlan.weeks ?? []).map((w) => ({
        n: w.weekNumber,
        days: (w.days ?? w.sessions ?? []).map((d) => ({
          n: d.dayNumber,
          name: d.name || d.dayName || '',
          ex: (d.exercises ?? []).map((e) => ({
            id: e.exerciseId || '',
            sets: e.sets,
            r: e.targetReps ?? e.reps ?? '',
          })),
        })),
      })),
    });
  }
  const { planExercises } = inputs;
  return JSON.stringify({
    mode: 'manual',
    list: planExercises.map((p) => ({
      e: p.exerciseSlim?.id || '',
      s: p.sets,
      r: p.reps,
      t: p.tempo || '',
      rest: p.restSeconds,
      i: p.intensityPercent,
      n: p.notes || '',
    })),
  });
}
