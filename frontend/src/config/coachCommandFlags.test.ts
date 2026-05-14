import { describe, expect, it } from 'vitest';
import {
  ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS,
  COACH_COMMAND_FEATURE_FLAGS,
} from './coachCommandFlags';

describe('coach command feature flags', () => {
  it('defines stable flags for the unified coach workflow slices', () => {
    expect(COACH_COMMAND_FEATURE_FLAGS).toEqual({
      REAL_CONVERSATIONS: 'coach-command-real-conversations',
      PLAUD_INTAKE: 'coach-command-plaud-intake',
      APPROVAL_WORKFLOW: 'coach-command-approval-workflow',
      VOICE_INTAKE: 'coach-command-voice-intake',
    });
  });

  it('keeps admin defaults complete and unique', () => {
    expect(ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS).toEqual(
      Object.values(COACH_COMMAND_FEATURE_FLAGS),
    );
    expect(new Set(ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS).size).toBe(
      ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS.length,
    );
  });
});
