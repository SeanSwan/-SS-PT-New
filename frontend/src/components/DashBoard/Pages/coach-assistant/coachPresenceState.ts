/**
 * FILE: coachPresenceState.ts
 * PURPOSE: Pure mapping from real controller state to the Bridge's
 * voice-presence choreography state. Priority: speaking wins over
 * listening (TTS reply plays after capture ends), listening wins over
 * thinking (the user is mid-utterance), thinking covers command/chat
 * round-trips, idle otherwise.
 */

export type CoachPresenceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface CoachPresenceInputs {
  voiceActive: boolean;
  commandBusy: boolean;
  voiceReplySpeaking: boolean;
}

export const resolveCoachPresenceState = ({
  voiceActive,
  commandBusy,
  voiceReplySpeaking,
}: CoachPresenceInputs): CoachPresenceState => {
  if (voiceReplySpeaking) return 'speaking';
  if (voiceActive) return 'listening';
  if (commandBusy) return 'thinking';
  return 'idle';
};
