/**
 * commandFallbackPolicy.test.mjs
 * ==============================
 * Locks which unwired legacy commands re-enter the Coach chat/proposal lane.
 */
import { describe, expect, it } from 'vitest';
import { shouldFallbackNotWiredCommandToChat } from '../../services/ai/commandFallbackPolicy.mjs';

describe('commandFallbackPolicy', () => {
  it('falls back for unwired client/workout draft commands', () => {
    expect(shouldFallbackNotWiredCommandToChat('create_client')).toBe(true);
    expect(shouldFallbackNotWiredCommandToChat('add_exercise_to_form')).toBe(true);
    expect(shouldFallbackNotWiredCommandToChat('submit_workout_form')).toBe(true);
  });

  it('does not fallback generic read or destructive commands', () => {
    expect(shouldFallbackNotWiredCommandToChat('view_workout_history')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('delete_workout_plan')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('unknown_command')).toBe(false);
  });
});
