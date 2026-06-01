import { describe, expect, it } from 'vitest';
import {
  buildWorkoutSessionBillingDecision,
  NON_DEDUCTING_CLIENT_SOURCES,
} from '../../services/sessionBillingPolicy.mjs';

describe('sessionBillingPolicy — workout logging client source rules', () => {
  it('keeps Move Fitness and external clients out of paid-session deduction', () => {
    expect(NON_DEDUCTING_CLIENT_SOURCES.has('move_fitness')).toBe(true);
    expect(NON_DEDUCTING_CLIENT_SOURCES.has('external')).toBe(true);

    expect(buildWorkoutSessionBillingDecision({
      clientSource: 'move_fitness',
      availableSessions: 0,
    })).toEqual({
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      message: 'Workout logged successfully without session deduction',
    });
  });

  it('requires paid SwanStudios clients to have an available session before logging', () => {
    expect(buildWorkoutSessionBillingDecision({
      clientSource: 'swanstudios',
      availableSessions: 0,
    })).toEqual({
      shouldDeduct: true,
      canLogWorkout: false,
      sessionDeducted: false,
      message: 'Client has no available sessions remaining',
    });
  });

  it('deducts one session for paid SwanStudios clients with a positive balance', () => {
    expect(buildWorkoutSessionBillingDecision({
      clientSource: 'swanstudios',
      availableSessions: 2,
    })).toEqual({
      shouldDeduct: true,
      canLogWorkout: true,
      sessionDeducted: true,
      message: 'Workout logged successfully and session deducted',
    });
  });

  it('does not require or deduct another credit when the linked schedule session was already deducted', () => {
    expect(buildWorkoutSessionBillingDecision(
      {
        clientSource: 'swanstudios',
        availableSessions: 0,
      },
      { scheduledSessionAlreadyDeducted: true }
    )).toEqual({
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: true,
      message: 'Workout logged successfully using the previously deducted scheduled session',
    });
  });

  it('ignores stale scheduled-session deduction state for non-deducting client sources', () => {
    expect(buildWorkoutSessionBillingDecision(
      {
        clientSource: 'move_fitness',
        availableSessions: 0,
      },
      { scheduledSessionAlreadyDeducted: true }
    )).toEqual({
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      message: 'Workout logged successfully without session deduction',
    });
  });

  it('treats missing or unknown clientSource as paid until classified', () => {
    expect(buildWorkoutSessionBillingDecision({ availableSessions: 0 })).toMatchObject({
      shouldDeduct: true,
      canLogWorkout: false,
    });

    expect(buildWorkoutSessionBillingDecision({
      clientSource: 'unknown_source',
      availableSessions: 0,
    })).toMatchObject({
      shouldDeduct: true,
      canLogWorkout: false,
    });
  });
});
