/**
 * Coach Command feature flag keys for staged rollout of the unified admin flow.
 *
 * These constants keep the PLAUD, approval, voice, and real-conversation slices
 * addressable without implying that any backend write happens automatically.
 */
export const COACH_COMMAND_FEATURE_FLAGS = {
  REAL_CONVERSATIONS: 'coach-command-real-conversations',
  PLAUD_INTAKE: 'coach-command-plaud-intake',
  APPROVAL_WORKFLOW: 'coach-command-approval-workflow',
  VOICE_INTAKE: 'coach-command-voice-intake',
} as const;

export type CoachCommandFeatureFlag =
  typeof COACH_COMMAND_FEATURE_FLAGS[keyof typeof COACH_COMMAND_FEATURE_FLAGS];

export const ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS: CoachCommandFeatureFlag[] =
  Object.values(COACH_COMMAND_FEATURE_FLAGS);
