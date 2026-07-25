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

import { recordCoachIntent } from './coachIntentRecorder';

// ─── Event Names ─────────────────────────────────────────────

export const AI_LOAD_TEMPLATE = 'AI_LOAD_TEMPLATE';
export const AI_ADD_EXERCISE = 'AI_ADD_EXERCISE';
export const AI_UPDATE_SET = 'AI_UPDATE_SET';
export const AI_TOGGLE_NASM_ITEM = 'AI_TOGGLE_NASM_ITEM';
export const AI_SUBMIT_WORKOUT = 'AI_SUBMIT_WORKOUT';

// Additive AI_PLANNER_* family (Workout Planner surface) — the logger AI_*
// events above are untouched; payload types live in
// admin-workout-planner/workoutPlannerAiEvents.types.ts.
export const AI_PLANNER_ADD_EXERCISE = 'AI_PLANNER_ADD_EXERCISE';
export const AI_PLANNER_SWAP_EXERCISE = 'AI_PLANNER_SWAP_EXERCISE';
export const AI_PLANNER_REMOVE_EXERCISE = 'AI_PLANNER_REMOVE_EXERCISE';
export const AI_PLANNER_UPDATE_EXERCISE = 'AI_PLANNER_UPDATE_EXERCISE';
export const AI_PLANNER_GENERATE = 'AI_PLANNER_GENERATE';
export const AI_PLANNER_REARRANGE = 'AI_PLANNER_REARRANGE';
export const AI_PLANNER_UNDO = 'AI_PLANNER_UNDO';

export const AI_PLANNER_EVENTS = [
  AI_PLANNER_ADD_EXERCISE,
  AI_PLANNER_SWAP_EXERCISE,
  AI_PLANNER_REMOVE_EXERCISE,
  AI_PLANNER_UPDATE_EXERCISE,
  AI_PLANNER_GENERATE,
  AI_PLANNER_REARRANGE,
  AI_PLANNER_UNDO,
] as const;

// Additive AI_BOOTCAMP_* family (Bootcamp Builder surface, CC-3) — same acknowledge
// contract; payload types below. Executed by useBootcampAiEvents in the builder.
export const AI_BOOTCAMP_SET_FORMAT = 'AI_BOOTCAMP_SET_FORMAT';
export const AI_BOOTCAMP_SET_STRUCTURE = 'AI_BOOTCAMP_SET_STRUCTURE';
export const AI_BOOTCAMP_SET_DURATION = 'AI_BOOTCAMP_SET_DURATION';
export const AI_BOOTCAMP_PLACE_EXERCISE = 'AI_BOOTCAMP_PLACE_EXERCISE';
export const AI_BOOTCAMP_LOAD_TEMPLATE = 'AI_BOOTCAMP_LOAD_TEMPLATE';

export const AI_BOOTCAMP_EVENTS = [
  AI_BOOTCAMP_SET_FORMAT,
  AI_BOOTCAMP_SET_STRUCTURE,
  AI_BOOTCAMP_SET_DURATION,
  AI_BOOTCAMP_PLACE_EXERCISE,
  AI_BOOTCAMP_LOAD_TEMPLATE,
] as const;

// Additive AI_PAINCHART_* family (Pain Chart surface, CC-4) — same acknowledge contract.
export const AI_PAINCHART_SELECT_REGION = 'AI_PAINCHART_SELECT_REGION';

export const AI_PAINCHART_EVENTS = [AI_PAINCHART_SELECT_REGION] as const;

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

export type AIWorkoutEventAck = {
  acknowledgeAIWorkoutEvent?: (handled?: boolean) => void;
};

export type AISubmitWorkoutEventDetail = AISubmitWorkoutPayload & AIWorkoutEventAck;
export type AIWorkoutEventDetail<T extends object> = T & AIWorkoutEventAck;

function dispatchWithAcknowledgement<T extends object>(eventName: string, payload: T): boolean {
  let handled = false;
  // Tracked separately from `handled` because the two falses are different
  // facts: nobody was listening, vs an effector looked and declined
  // (useWorkoutAiEvents.ts acks `next !== prev`). See coachEventLog.resolveOutcome.
  let acknowledged = false;
  const detail: AIWorkoutEventDetail<T> = {
    ...payload,
    acknowledgeAIWorkoutEvent: (didHandle = true) => {
      acknowledged = true;
      handled = didHandle !== false;
    },
  };
  // Synchronous by spec — listeners run inline, so both flags are settled here.
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
  recordCoachIntent(eventName, payload, acknowledged, handled);
  return handled;
}

// ─── Dispatch Helpers ────────────────────────────────────────

export function dispatchAILoadTemplate(payload: AILoadTemplatePayload): boolean {
  return dispatchWithAcknowledgement(AI_LOAD_TEMPLATE, payload);
}

export function dispatchAIAddExercise(payload: AIAddExercisePayload): boolean {
  return dispatchWithAcknowledgement(AI_ADD_EXERCISE, payload);
}

export function dispatchAIUpdateSet(payload: AIUpdateSetPayload): boolean {
  return dispatchWithAcknowledgement(AI_UPDATE_SET, payload);
}

export function dispatchAIToggleNASMItem(payload: AIToggleNASMItemPayload): boolean {
  return dispatchWithAcknowledgement(AI_TOGGLE_NASM_ITEM, payload);
}

export function dispatchAISubmitWorkout(payload: AISubmitWorkoutPayload): boolean {
  return dispatchWithAcknowledgement(AI_SUBMIT_WORKOUT, payload);
}

// ─── Dispatcher map (for generic AI response handling) ───────

type AIEventPayload =
  | AILoadTemplatePayload
  | AIAddExercisePayload
  | AIUpdateSetPayload
  | AIToggleNASMItemPayload
  | AISubmitWorkoutPayload;

const dispatchers: Record<string, (payload: AIEventPayload) => boolean> = {
  [AI_LOAD_TEMPLATE]: (p) => dispatchAILoadTemplate(p as AILoadTemplatePayload),
  [AI_ADD_EXERCISE]: (p) => dispatchAIAddExercise(p as AIAddExercisePayload),
  [AI_UPDATE_SET]: (p) => dispatchAIUpdateSet(p as AIUpdateSetPayload),
  [AI_TOGGLE_NASM_ITEM]: (p) => dispatchAIToggleNASMItem(p as AIToggleNASMItemPayload),
  [AI_SUBMIT_WORKOUT]: (p) => dispatchAISubmitWorkout(p as AISubmitWorkoutPayload),
};

// Planner events share the acknowledge contract; payloads are validated by the
// backend command schema and re-checked by the planner hook's handlers.
for (const plannerEvent of AI_PLANNER_EVENTS) {
  dispatchers[plannerEvent] = (p) => dispatchWithAcknowledgement(plannerEvent, p as object);
}

// Bootcamp events (CC-3): same contract — the builder's useBootcampAiEvents handlers
// re-validate payloads against BootcampBuilderConstants option sets before applying.
for (const bootcampEvent of AI_BOOTCAMP_EVENTS) {
  dispatchers[bootcampEvent] = (p) => dispatchWithAcknowledgement(bootcampEvent, p as object);
}

// Pain-chart events (CC-4): handlers validate region ids against ALL_BODY_REGIONS.
for (const painChartEvent of AI_PAINCHART_EVENTS) {
  dispatchers[painChartEvent] = (p) => dispatchWithAcknowledgement(painChartEvent, p as object);
}

/**
 * Dispatch an AI workout event by name. Used by the AI terminal
 * when it receives a frontend_dispatch command from the backend.
 */
export function dispatchAIWorkoutEvent(eventName: string, payload: unknown): boolean {
  const dispatch = dispatchers[eventName];
  if (!dispatch) return false;
  return dispatch(payload as AIEventPayload);
}

// Rest-timer voice intents (Arc L / L3 — Kimi: existing command family, no parallel registry).
export const AI_REST_SKIP = 'AI_REST_SKIP';
export const AI_REST_ADJUST = 'AI_REST_ADJUST';
dispatchers[AI_REST_SKIP] = (p) => dispatchWithAcknowledgement(AI_REST_SKIP, p as object);
dispatchers[AI_REST_ADJUST] = (p) => dispatchWithAcknowledgement(AI_REST_ADJUST, p as object);
