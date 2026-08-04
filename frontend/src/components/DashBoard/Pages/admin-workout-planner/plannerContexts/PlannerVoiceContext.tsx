/**
 * CONTEXT: PlannerVoiceContext (S15 — JARVIS blueprint §4.7)
 * Owns the Coach/voice surface: today that is the Coach dock props bag.
 * The voiceState/transcript/pendingDecodedRows/clarifyQuestion fields are
 * the S6-S10 seam — they stay in their idle defaults until the VOICE_MODE_V2
 * pipeline (FINISHER slices) populates them. A voice crash must never take
 * down the builder, so voice state is isolated in its own context.
 */
import { createContext, useContext } from 'react';
import type { PlannerVoiceValue } from './WorkoutPlannerProvider';

export const PlannerVoiceContext = createContext<PlannerVoiceValue | null>(null);

export const usePlannerVoice = (): PlannerVoiceValue => {
  const value = useContext(PlannerVoiceContext);
  if (!value) throw new Error('usePlannerVoice must be used inside WorkoutPlannerProvider');
  return value;
};
