/**
 * Presence-state priority contract for the Aurora Bridge line.
 * speaking > listening > thinking > idle — all from real controller state.
 */
import { describe, expect, it } from 'vitest';
import { resolveCoachPresenceState } from './coachPresenceState';

describe('resolveCoachPresenceState', () => {
  it('maps each single state', () => {
    expect(
      resolveCoachPresenceState({ voiceActive: false, commandBusy: false, voiceReplySpeaking: false }),
    ).toBe('idle');
    expect(
      resolveCoachPresenceState({ voiceActive: true, commandBusy: false, voiceReplySpeaking: false }),
    ).toBe('listening');
    expect(
      resolveCoachPresenceState({ voiceActive: false, commandBusy: true, voiceReplySpeaking: false }),
    ).toBe('thinking');
    expect(
      resolveCoachPresenceState({ voiceActive: false, commandBusy: false, voiceReplySpeaking: true }),
    ).toBe('speaking');
  });

  it('prioritizes speaking > listening > thinking when states overlap', () => {
    expect(
      resolveCoachPresenceState({ voiceActive: true, commandBusy: true, voiceReplySpeaking: true }),
    ).toBe('speaking');
    expect(
      resolveCoachPresenceState({ voiceActive: true, commandBusy: true, voiceReplySpeaking: false }),
    ).toBe('listening');
  });
});
