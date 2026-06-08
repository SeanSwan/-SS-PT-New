import { describe, expect, it } from 'vitest';

import {
  buildWorkoutSessionBillingDecision,
  isNonDeductingClientSource,
  normalizeClientSource,
} from '../services/sessionBillingPolicy.mjs';

describe('sessionBillingPolicy client source normalization', () => {
  it('normalizes human-formatted Move Fitness and external source values', () => {
    expect(normalizeClientSource(' Move Fitness ')).toBe('move_fitness');
    expect(normalizeClientSource('move-fitness')).toBe('move_fitness');
    expect(normalizeClientSource('MOVEFITNESS')).toBe('move_fitness');
    expect(normalizeClientSource(' External ')).toBe('external');
    expect(normalizeClientSource('unknown')).toBe('swanstudios');
  });

  it('treats non-deducting client source variants as no-paid-session clients', () => {
    expect(isNonDeductingClientSource(' Move Fitness ')).toBe(true);
    expect(isNonDeductingClientSource('move-fitness')).toBe(true);
    expect(isNonDeductingClientSource(' External ')).toBe(true);
    expect(isNonDeductingClientSource('swanstudios')).toBe(false);
  });

  it('does not deduct paid credits for human-formatted Move Fitness workout logs', () => {
    const decision = buildWorkoutSessionBillingDecision({
      clientSource: ' Move Fitness ',
      availableSessions: 4,
    });

    expect(decision).toMatchObject({
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      creditsToDeduct: 0,
    });
  });
});
