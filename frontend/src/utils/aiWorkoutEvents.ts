/**
 * ============================================================================
 * FILE: aiWorkoutEvents.ts
 * PURPOSE: Custom event types and dispatch helpers for AI-to-WorkoutLogger
 *          real-time form manipulation (dictation → execution bridge)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-21
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines typed custom events that the AI terminal
 * dispatches and the WorkoutLogger listens for. This is the bridge between
 * voice/text commands and form state changes.
 *
 * HOW IT FITS: AITerminalPanel parses AI responses → dispatches events here →
 * WorkoutLogger useEffect listeners catch them → update form state.
 */

// ─── Event Names ─────────────────────────────────────────────

export const AI_LOAD_TEMPLATE = 'AI_LOAD_TEMPLATE';
export const AI_ADD_EXERCISE = 'AI_ADD_EXERCISE';
export const AI_UPDATE_SET = 'AI_UPDATE_SET';
export const AI_TOGGLE_NASM_ITEM = 'AI_TOGGLE_NASM_ITEM';
export const AI_SUBMIT_WORKOUT = 'AI_SUBMIT_WORKOUT';

// ─── Event Payloads ──────────────────────────────────────────

export interface AILoadTemplatePayload {
  phase: number;
}

export interface AIAddExercisePayload {
  exerciseName: string;
  sets?: number;
  reps?: number;
  weight?: number;
  tempo?: string;
  restSeconds?: number;
  notes?: string;
}

export interface AIUpdateSetPayload {
  exerciseName: string;
  setNumber?: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  tempo?: string;
}

export interface AIToggleNASMItemPayload {
  section: 'warmup' | 'balance_core' | 'cooldown';
  itemName?: string;
  markAll?: boolean;
  completed?: boolean;
}

export interface AISubmitWorkoutPayload {
  intensity?: number;
  notes?: string;
}

// ─── Dispatch Helpers ────────────────────────────────────────

export function dispatchAILoadTemplate(payload: AILoadTemplatePayload): void {
  window.dispatchEvent(new CustomEvent(AI_LOAD_TEMPLATE, { detail: payload }));
}

export function dispatchAIAddExercise(payload: AIAddExercisePayload): void {
  window.dispatchEvent(new CustomEvent(AI_ADD_EXERCISE, { detail: payload }));
}

export function dispatchAIUpdateSet(payload: AIUpdateSetPayload): void {
  window.dispatchEvent(new CustomEvent(AI_UPDATE_SET, { detail: payload }));
}

export function dispatchAIToggleNASMItem(payload: AIToggleNASMItemPayload): void {
  window.dispatchEvent(new CustomEvent(AI_TOGGLE_NASM_ITEM, { detail: payload }));
}

export function dispatchAISubmitWorkout(payload: AISubmitWorkoutPayload): void {
  window.dispatchEvent(new CustomEvent(AI_SUBMIT_WORKOUT, { detail: payload }));
}

// ─── Dispatcher map (for generic AI response handling) ───────

type AIEventPayload =
  | AILoadTemplatePayload
  | AIAddExercisePayload
  | AIUpdateSetPayload
  | AIToggleNASMItemPayload
  | AISubmitWorkoutPayload;

const dispatchers: Record<string, (payload: AIEventPayload) => void> = {
  [AI_LOAD_TEMPLATE]: (p) => dispatchAILoadTemplate(p as AILoadTemplatePayload),
  [AI_ADD_EXERCISE]: (p) => dispatchAIAddExercise(p as AIAddExercisePayload),
  [AI_UPDATE_SET]: (p) => dispatchAIUpdateSet(p as AIUpdateSetPayload),
  [AI_TOGGLE_NASM_ITEM]: (p) => dispatchAIToggleNASMItem(p as AIToggleNASMItemPayload),
  [AI_SUBMIT_WORKOUT]: (p) => dispatchAISubmitWorkout(p as AISubmitWorkoutPayload),
};

/**
 * Dispatch an AI workout event by name. Used by the AI terminal
 * when it receives a frontend_dispatch command from the backend.
 */
export function dispatchAIWorkoutEvent(eventName: string, payload: AIEventPayload): boolean {
  const dispatch = dispatchers[eventName];
  if (!dispatch) return false;
  dispatch(payload);
  return true;
}
