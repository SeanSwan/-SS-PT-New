import { describe, expect, it } from 'vitest';
import { shouldBlockWorkoutSubmitForSessionBalance } from './WorkoutLogger.submitGuard';

describe('shouldBlockWorkoutSubmitForSessionBalance', () => {
  it('blocks unscheduled SwanStudios paid-session clients with no available sessions', () => {
    expect(shouldBlockWorkoutSubmitForSessionBalance({
      availableSessions: 0,
      userRole: 'trainer',
      clientSource: 'swanstudios',
      scheduledSessionId: null,
    })).toBe(true);
  });

  it('does not block admins from submitting a zero-balance paid-session client', () => {
    expect(shouldBlockWorkoutSubmitForSessionBalance({
      availableSessions: 0,
      userRole: 'admin',
      clientSource: 'swanstudios',
      scheduledSessionId: null,
    })).toBe(false);
  });

  it('does not block no-session-required clients', () => {
    expect(shouldBlockWorkoutSubmitForSessionBalance({
      availableSessions: 0,
      userRole: 'trainer',
      clientSource: 'move_fitness',
      scheduledSessionId: null,
    })).toBe(false);
  });

  it('lets linked scheduled sessions reach backend billing validation when visible balance is zero', () => {
    expect(shouldBlockWorkoutSubmitForSessionBalance({
      availableSessions: 0,
      userRole: 'trainer',
      clientSource: 'swanstudios',
      scheduledSessionId: '314',
    })).toBe(false);
  });

  it('keeps unknown balances submit-capable so the backend remains the source of truth', () => {
    expect(shouldBlockWorkoutSubmitForSessionBalance({
      availableSessions: null,
      userRole: 'trainer',
      clientSource: 'swanstudios',
      scheduledSessionId: null,
    })).toBe(false);
  });
});