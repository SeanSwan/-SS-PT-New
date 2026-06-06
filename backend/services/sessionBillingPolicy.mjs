/**
 * Session Billing Policy
 * ======================
 *
 * Centralizes SwanStudios client-source billing rules so workout logging,
 * scheduling, and future Swan Coach actions do not drift apart.
 */

export const NON_DEDUCTING_CLIENT_SOURCES = new Set(['move_fitness', 'external']);

export const normalizePaidSessionCount = (value) => {
  const sessions = Number(value ?? 0);
  if (!Number.isFinite(sessions)) return 0;
  return Math.max(0, Math.floor(sessions));
};

export function buildWorkoutSessionBillingDecision(client, options = {}) {
  const source = typeof client?.clientSource === 'string' ? client.clientSource : 'swanstudios';
  const shouldDeduct = !NON_DEDUCTING_CLIENT_SOURCES.has(source);
  const availableSessions = normalizePaidSessionCount(client?.availableSessions);

  if (!shouldDeduct) {
    return {
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      message: 'Workout logged successfully without session deduction',
    };
  }

  if (options.scheduledSessionAlreadyDeducted === true) {
    return {
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: true,
      message: 'Workout logged successfully using the previously deducted scheduled session',
    };
  }

  if (options.nonBillablePlannedAssignment === true) {
    return {
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      message: 'Workout assignment logged successfully without session deduction',
    };
  }

  if (availableSessions < 1) {
    return {
      shouldDeduct: true,
      canLogWorkout: false,
      sessionDeducted: false,
      message: 'Client has no available sessions remaining',
    };
  }

  return {
    shouldDeduct: true,
    canLogWorkout: true,
    sessionDeducted: true,
    message: 'Workout logged successfully and session deducted',
  };
}
