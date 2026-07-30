/**
 * RunnerEngine — the contract every Runner Style skin consumes.
 * v1 is deliberately narrow: skins are CHROME around the proven exercise
 * card (behavior — keypad, ghost prefill, logging, supersets — stays in
 * one place). The engine object is assembled inside WorkoutLogger from
 * existing state; skins never own workout data, so switching styles
 * mid-session loses nothing. Contract v2 (drafts/undo/focus/announce)
 * lands with the Sheet Stack slice — see RUNNER-STYLES-FINAL-10 §engine.
 */
import type { ComponentProps, ReactNode } from 'react';
import type ExerciseSetRowComponent from '../ExerciseSetRowComponent';
import type { ExerciseEntry, ExerciseSet } from '../../../services/nasmApiService';

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

/**
 * Set-row primitives for LEDGER-shell skins that compose the proven
 * ExerciseSetRowComponent directly (keypad, ghost prefill, logged colors
 * stay in ONE place — skins never re-implement input behavior).
 */
export interface RunnerRowActions {
  onUpdateSet: <K extends keyof ExerciseSet>(exerciseIndex: number, setIndex: number, field: K, value: ExerciseSet[K]) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  /** Starts the rest timer for the just-logged set. */
  onSetLogged: (exerciseIndex: number, setIndex: number) => void;
  getOverload?: ComponentProps<typeof ExerciseSetRowComponent>['getOverload'];
  getLastWeight?: ComponentProps<typeof ExerciseSetRowComponent>['getLastWeight'];
}

export interface RunnerEngine {
  exercises: ExerciseEntry[];
  /** Renders the full proven exercise card (all logging behavior included). */
  renderExerciseCard: (exerciseIndex: number) => ReactNode;
  stats: RunnerSessionStats;
  rest: RunnerRestControls;
  /** Opens the exercise Rolodex (search & add). */
  openRolodex: () => void;
  rows: RunnerRowActions;
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
