/**
 * workoutPlannerAsyncEditReceiver (plan 58 — extracted from
 * useWorkoutPlannerAiEvents to keep both modules inside the 300-line cap).
 * The P58 ADD/SWAP receiver's PURE pieces: the two draft transitions, the day
 * lookup they read through, and the publication gate. A transition is computed
 * against the OWNER's current snapshot, never against a captured copy, and a
 * result is published only when the owner says that exact applied revision is
 * still the live one. No React, no event wiring, no transport.
 */
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import {
  addHorizonExercise, applyHorizonSwap, isDuplicateInHorizonDay, type HorizonSwapTarget,
} from './workoutPlannerHorizonSwap.helpers';
import type { GeneratedPlan, GeneratedPlanWeekDay, PlanExercise } from './WorkoutPlannerTypes';
import type {
  PlannerAsyncEditResult, PlannerAsyncEditToken, PlannerDayScope,
  PlannerDraftOwner, PlannerDraftSnapshot, PlannerDraftTransition,
} from './plannerContexts/useWorkoutPlannerDraftMutation';

export type HorizonExercise = GeneratedPlanWeekDay['exercises'][number];
export type DayScope = Pick<HorizonSwapTarget, 'weekNumber' | 'dayIndex'>;
export interface EditProgramming {
  sets: number; reps: string | number; tempo: string; restSeconds: number; intensityPercent: number;
}
export interface EditOutcome {
  result: PlannerAsyncEditResult; applied: string; duplicate: string;
}
/** Just the two owner/receipt members publication needs — no hook-args import. */
export interface EditPublication {
  pushReceipt: (r: { ok: boolean; text: string }) => void;
  draftMutation: PlannerDraftOwner;
}

export const display = (x: HorizonExercise) => x.exerciseName || x.name || '';

/** Terminal library results must be a non-empty array with a usable row. */
export const pickSlim = (results: ExerciseSlim[], name: string, singular: string): ExerciseSlim | null => {
  if (!Array.isArray(results) || !results.length) return null;
  const q = name.toLowerCase().replace(/\s+/g, ' ').trim();
  const qs = singular.toLowerCase().replace(/\s+/g, ' ').trim();
  const hit = results.find((r) => r.name.toLowerCase().replace(/\s+/g, ' ').trim() === q
    || r.name.toLowerCase().replace(/\s+/g, ' ').trim() === qs) ?? results[0];
  return hit && hit.id && hit.name ? hit : null;
};

export const dayExercisesAt = (plan: GeneratedPlan | null, scope: DayScope): HorizonExercise[] => {
  const week = plan?.weeks?.find((w) => w.weekNumber === scope.weekNumber);
  const days = (week?.days?.length ? week.days : week?.sessions) ?? [];
  return days[scope.dayIndex]?.exercises ?? [];
};

/** P58 pure transition: computed against the OWNER's current content. */
export const addTransition = (day: PlannerDayScope, slim: ExerciseSlim, p: EditProgramming) => (
  current: PlannerDraftSnapshot,
): PlannerDraftTransition => {
  if (day.kind === 'horizon') {
    if (!current.generatedPlan) return { kind: 'declined', reason: 'missing' };
    const probe: HorizonSwapTarget = { ...day, exerciseIndex: -1, exerciseName: slim.name };
    if (isDuplicateInHorizonDay(current.generatedPlan, probe, slim)) return { kind: 'declined', reason: 'duplicate' };
    return { kind: 'applied', next: { planExercises: current.planExercises, generatedPlan: addHorizonExercise(current.generatedPlan, day, slim, p) } };
  }
  if (current.planExercises.some((r) => r.exerciseSlim.id === slim.id)) return { kind: 'declined', reason: 'duplicate' };
  const row: PlanExercise = {
    id: `${slim.id}-${Date.now()}`, exerciseSlim: slim, sets: p.sets, reps: String(p.reps),
    tempo: p.tempo, restSeconds: p.restSeconds, intensityPercent: p.intensityPercent, notes: '',
  };
  return { kind: 'applied', next: { planExercises: [...current.planExercises, row], generatedPlan: current.generatedPlan } };
};

/** P58 pure transition: never lets the immutable horizon helper fake an apply. */
export const swapTransition = (scope: DayScope | null, slim: ExerciseSlim, index: number, fromRaw: string) => (
  current: PlannerDraftSnapshot,
): PlannerDraftTransition => {
  if (scope) {
    if (!current.generatedPlan) return { kind: 'declined', reason: 'missing' };
    const existing = dayExercisesAt(current.generatedPlan, scope)[index];
    if (existing && (existing.exerciseId === slim.id || display(existing) === slim.name)) return { kind: 'unchanged' };
    const target: HorizonSwapTarget = { kind: 'horizon', ...scope, exerciseIndex: index, exerciseName: fromRaw };
    if (isDuplicateInHorizonDay(current.generatedPlan, target, slim)) return { kind: 'declined', reason: 'duplicate' };
    return { kind: 'applied', next: { planExercises: current.planExercises, generatedPlan: applyHorizonSwap(current.generatedPlan, target, slim) } };
  }
  const row = current.planExercises[index];
  if (!row) return { kind: 'declined', reason: 'missing' };
  if (row.exerciseSlim.id === slim.id) return { kind: 'unchanged' };
  if (current.planExercises.some((r) => r.exerciseSlim.id === slim.id && r.id !== row.id)) return { kind: 'declined', reason: 'duplicate' };
  const rows = current.planExercises.map((r) => (r.id === row.id ? { ...r, exerciseSlim: slim } : r));
  return { kind: 'applied', next: { planExercises: rows, generatedPlan: current.generatedPlan } };
};

/** Publish ONLY what the owner applied; retired and unchanged stay silent. */
export const publishEdit = (publication: EditPublication, token: PlannerAsyncEditToken, outcome: EditOutcome): void => {
  if (outcome.result.kind === 'applied') {
    if (publication.draftMutation.canPublishResult(token, outcome.result.appliedRevision)) {
      publication.pushReceipt({ ok: true, text: outcome.applied });
    }
    return;
  }
  if (outcome.result.kind === 'declined' && outcome.result.reason === 'duplicate') {
    publication.pushReceipt({ ok: false, text: outcome.duplicate });
  }
};
