/**
 * commandFallbackPolicy.test.mjs
 * ==============================
 * Locks which unwired legacy commands re-enter the Coach chat/proposal lane.
 */
import { describe, expect, it } from 'vitest';
import { shouldFallbackNotWiredCommandToChat } from '../../services/ai/commandFallbackPolicy.mjs';

describe('commandFallbackPolicy', () => {
  it('does not fallback client creation commands once they prepare approval proposals', () => {
    expect(shouldFallbackNotWiredCommandToChat('create_client')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('create_external_client')).toBe(false);
  });

  it('falls back for client conversational self-service requests', () => {
    expect(shouldFallbackNotWiredCommandToChat('nutrition_advice')).toBe(true);
    expect(shouldFallbackNotWiredCommandToChat('request_plan_adjustment')).toBe(false);
  });

  it('does not fall back for browser file-upload commands', () => {
    expect(shouldFallbackNotWiredCommandToChat('upload_client_photo')).toBe(false);
  });

  it('does not send workout-form browser events to chat fallback', () => {
    expect(shouldFallbackNotWiredCommandToChat('load_phase_template')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('add_exercise_to_form')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('update_set_data')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('toggle_nasm_item')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('submit_workout_form')).toBe(false);
  });

  it('does not fallback generic read or destructive commands', () => {
    expect(shouldFallbackNotWiredCommandToChat('create_workout_session')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('run_ai_village')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('update_nasm_level')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('view_workout_history')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('start_onboarding')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('onboarding_questions')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('submit_onboarding')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('fill_baseline_measurements')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('update_client')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('delete_workout_plan')).toBe(false);
    expect(shouldFallbackNotWiredCommandToChat('unknown_command')).toBe(false);
  });
});
