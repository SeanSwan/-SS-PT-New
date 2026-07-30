/**
 * RunnerEngine — the contract every Runner Style skin consumes.
 * v1 is deliberately narrow: skins are CHROME around the proven exercise
 * card (behavior — keypad, ghost prefill, logging, supersets — stays in
 * one place). The engine object is assembled inside WorkoutLogger from
 * existing state; skins never own workout data, so switching styles
 * mid-session loses nothing. Contract v2 (drafts/undo/focus/announce)
 * lands with the Sheet Stack slice — see RUNNER-STYLES-FINAL-10 §engine.
 */
import type { ReactNode } from 'react';
import type { ExerciseEntry } from '../../../services/nasmApiService';

export interface RunnerRestControls {
  isRunning: boolean;
  secondsLeft: number;
  stop: () => void;
  /** Restart the countdown with extra seconds (engine-owned clamp). */
  extend: (seconds: number) => void;
}

export interface RunnerSessionStats {
  completedSets: number;
  totalSets: number;
}

export interface RunnerEngine {
  exercises: ExerciseEntry[];
  /** Renders the full proven exercise card (all logging behavior included). */
  renderExerciseCard: (exerciseIndex: number) => ReactNode;
  stats: RunnerSessionStats;
  rest: RunnerRestControls;
  /** Opens the exercise Rolodex (search & add). */
  openRolodex: () => void;
}

/**
 * A set counts as logged when real work happened (reps > 0) — the SAME
 * contract useSessionStats and the server-side proof loader use, so the
 * rail, the sticky bar, and the save receipt never disagree.
 */
export const isSetLogged = (set: ExerciseEntry['sets'][number]): boolean => set.reps > 0;

/** True when every set of the exercise is logged. */
export const isExerciseComplete = (exercise: ExerciseEntry): boolean =>
  exercise.sets.length > 0 && exercise.sets.every(isSetLogged);

/** Sets completed / total for one exercise. */
export const exerciseSetProgress = (exercise: ExerciseEntry): { done: number; total: number } => ({
  done: exercise.sets.filter(isSetLogged).length,
  total: exercise.sets.length,
});
