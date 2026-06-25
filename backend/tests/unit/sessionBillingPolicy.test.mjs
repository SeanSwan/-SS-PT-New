import { describe, expect, it } from 'vitest';
import {
  buildWorkoutSessionBillingDecision,
  CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES,
  isNonDeductingClient,
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
      creditsToDeduct: 0,
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
      creditsToDeduct: 0,
      message: 'Client has no available sessions remaining',
    });
  });

  it('lets SwanStudios no-session-required clients train without paid credit depletion', () => {
    const client = {
      clientSource: 'swanstudios',
      sessionBillingMode: 'no_session_required',
      availableSessions: 0,
    };

    expect(isNonDeductingClient(client)).toBe(true);
    expect(buildWorkoutSessionBillingDecision(client)).toEqual({
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      creditsToDeduct: 0,
      message: 'Workout logged successfully without session deduction',
    });
  });
  it('fails closed when a paid client session balance is malformed or below one full session', () => {
    for (const availableSessions of ['unknown', Number.NaN, 0.5]) {
      expect(buildWorkoutSessionBillingDecision({
        clientSource: 'swanstudios',
        availableSessions,
      })).toMatchObject({
        shouldDeduct: true,
        canLogWorkout: false,
        sessionDeducted: false,
      });
    }
  });

  it('deducts one session for paid SwanStudios clients with a positive balance', () => {
    expect(buildWorkoutSessionBillingDecision({
      clientSource: 'swanstudios',
      availableSessions: 2,
    })).toEqual({
      shouldDeduct: true,
      canLogWorkout: true,
      sessionDeducted: true,
      creditsToDeduct: 1,
      message: 'Workout logged successfully and session deducted',
    });
  });

  it('requires enough credits for extended scheduled sessions', () => {
    expect(buildWorkoutSessionBillingDecision(
      {
        clientSource: 'swanstudios',
        availableSessions: 1,
      },
      { creditsRequired: 2 }
    )).toEqual({
      shouldDeduct: true,
      canLogWorkout: false,
      sessionDeducted: false,
      creditsToDeduct: 0,
      message: 'Client needs 2 available session credits',
    });

    expect(buildWorkoutSessionBillingDecision(
      {
        clientSource: 'swanstudios',
        availableSessions: 3,
      },
      { creditsRequired: 2 }
    )).toEqual({
      shouldDeduct: true,
      canLogWorkout: true,
      sessionDeducted: true,
      creditsToDeduct: 2,
      message: 'Workout logged successfully and session deducted',
    });
  });

  it('allows zero-credit assessment sessions without consuming paid credits', () => {
    expect(buildWorkoutSessionBillingDecision(
      {
        clientSource: 'swanstudios',
        availableSessions: 0,
      },
      { creditsRequired: 0 }
    )).toEqual({
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      creditsToDeduct: 0,
      message: 'Workout logged successfully without session deduction',
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
      creditsToDeduct: 0,
      message: 'Workout logged successfully using the previously deducted scheduled session',
    });
  });

  it('allows verified non-billable workout-plan homework without consuming paid sessions', () => {
    expect(buildWorkoutSessionBillingDecision(
      {
        clientSource: 'swanstudios',
        availableSessions: 0,
      },
      { nonBillablePlannedAssignment: true }
    )).toEqual({
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      creditsToDeduct: 0,
      message: 'Workout assignment logged successfully without session deduction',
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
      creditsToDeduct: 0,
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

  it('centralizes future non-terminal session statuses for client deactivation', () => {
    expect(CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES).toEqual([
      'available',
      'assigned',
      'requested',
      'scheduled',
      'confirmed',
    ]);
    expect(CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES).not.toContain('completed');
    expect(CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES).not.toContain('cancelled');
    expect(CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES).not.toContain('blocked');
    expect(Object.isFrozen(CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES)).toBe(true);
  });
});
