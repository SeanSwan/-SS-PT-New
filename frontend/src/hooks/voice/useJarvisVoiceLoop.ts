/**
 * HOOK: useJarvisVoiceLoop (S9 — JARVIS blueprint §6.2)
 * PURPOSE: The voice-loop state machine — STATE ONLY, no UI, no network.
 * States map 1:1 to real async phases (no state text lies):
 *   idle · listening · transcribing · decoding · review · clarifying ·
 *   speaking · error
 * Laws encoded in the reducer (unit-fenced):
 * - `clarifying` is a SUB-STATE of review: it can only be entered from
 *   review, at most ONCE per loop — a second CLARIFY_ASK is impossible by
 *   construction (the reducer refuses it), so ≥2 questions cannot happen.
 * - Clarify no-answer (3s, timer owned by the caller) → best-effort resume
 *   into review with `needsReview: true`.
 * - Barge-in: LISTEN from `speaking` is legal (mic press cancels speech).
 * - "Type instead" is legal from EVERY state (EXIT_TO_TYPING → idle).
 */

import { useCallback, useReducer } from 'react';

export type JarvisVoiceState =
  | 'idle' | 'listening' | 'transcribing' | 'decoding'
  | 'review' | 'clarifying' | 'speaking' | 'error';

export interface JarvisLoopState {
  state: JarvisVoiceState;
  transcript: string;
  clarifyQuestion: string | null;
  /** True once a clarify question has been spent — a second is impossible. */
  clarifyAsked: boolean;
  needsReview: boolean;
  errorMessage: string | null;
}

export type JarvisLoopEvent =
  | { type: 'LISTEN' }
  | { type: 'CAPTURED' }
  | { type: 'TRANSCRIBED'; transcript: string }
  | { type: 'DECODED' }
  | { type: 'CLARIFY_ASK'; question: string }
  | { type: 'CLARIFY_ANSWERED' }
  | { type: 'CLARIFY_TIMEOUT' }
  | { type: 'SPEAK' }
  | { type: 'SPEECH_DONE' }
  | { type: 'FAIL'; message: string }
  | { type: 'EXIT_TO_TYPING' }
  | { type: 'RESET' };

export const INITIAL_JARVIS_STATE: JarvisLoopState = {
  state: 'idle', transcript: '', clarifyQuestion: null,
  clarifyAsked: false, needsReview: false, errorMessage: null,
};

export const CLARIFY_TIMEOUT_MS = 3000;

export function jarvisLoopReducer(state: JarvisLoopState, event: JarvisLoopEvent): JarvisLoopState {
  switch (event.type) {
    case 'LISTEN':
      // Legal from idle, error, review (re-take) and speaking (barge-in).
      if (!['idle', 'error', 'review', 'speaking'].includes(state.state)) return state;
      return { ...INITIAL_JARVIS_STATE, state: 'listening' };
    case 'CAPTURED':
      return state.state === 'listening' ? { ...state, state: 'transcribing' } : state;
    case 'TRANSCRIBED':
      return state.state === 'transcribing'
        ? { ...state, state: 'decoding', transcript: event.transcript }
        : state;
    case 'DECODED':
      return state.state === 'decoding' ? { ...state, state: 'review' } : state;
    case 'CLARIFY_ASK':
      // Sub-state of review; ONE question max — ever.
      if (state.state !== 'review' || state.clarifyAsked) return state;
      return { ...state, state: 'clarifying', clarifyQuestion: event.question, clarifyAsked: true };
    case 'CLARIFY_ANSWERED':
      return state.state === 'clarifying'
        ? { ...state, state: 'review', clarifyQuestion: null }
        : state;
    case 'CLARIFY_TIMEOUT':
      // Best-effort: back to review, flagged — never a second question.
      return state.state === 'clarifying'
        ? { ...state, state: 'review', clarifyQuestion: null, needsReview: true }
        : state;
    case 'SPEAK':
      return state.state === 'review' ? { ...state, state: 'speaking' } : state;
    case 'SPEECH_DONE':
      return state.state === 'speaking' ? { ...state, state: 'review' } : state;
    case 'FAIL':
      return { ...state, state: 'error', errorMessage: event.message };
    case 'EXIT_TO_TYPING':
    case 'RESET':
      return INITIAL_JARVIS_STATE;
    default:
      return state;
  }
}

export function useJarvisVoiceLoop() {
  const [loop, dispatch] = useReducer(jarvisLoopReducer, INITIAL_JARVIS_STATE);
  const send = useCallback((event: JarvisLoopEvent) => dispatch(event), []);
  return { loop, send };
}
