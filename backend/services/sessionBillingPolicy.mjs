/**
 * Session Billing Policy
 * ======================
 *
 * Centralizes SwanStudios client-source billing rules so workout logging,
 * scheduling, and future Swan Coach actions do not drift apart.
 */

export const NON_DEDUCTING_CLIENT_SOURCES = new Set(['move_fitness', 'external']);

export const CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES = Object.freeze([
  'available',
  'assigned',
  'requested',
  'scheduled',
  'confirmed',
]);

export const normalizePaidSessionCount = (value) => {
  const sessions = Number(value ?? 0);
  if (!Number.isFinite(sessions)) return 0;
  return Math.max(0, Math.floor(sessions));
};

const normalizeCreditsRequired = (value) => {
  if (value === undefined || value === null) return 1;

  const credits = Number(value);
  if (!Number.isFinite(credits) || credits < 0) return 1;
  return Math.floor(credits);
};

export function buildWorkoutSessionBillingDecision(client, options = {}) {
  const source = typeof client?.clientSource === 'string' ? client.clientSource : 'swanstudios';
  const shouldDeduct = !NON_DEDUCTING_CLIENT_SOURCES.has(source);
  const availableSessions = normalizePaidSessionCount(client?.availableSessions);
  const creditsRequired = normalizeCreditsRequired(options.creditsRequired);

  if (!shouldDeduct) {
    return {
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      creditsToDeduct: 0,
      message: 'Workout logged successfully without session deduction',
    };
  }

  if (options.scheduledSessionAlreadyDeducted === true) {
    return {
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: true,
      creditsToDeduct: 0,
      message: 'Workout logged successfully using the previously deducted scheduled session',
    };
  }

  if (options.nonBillablePlannedAssignment === true) {
    return {
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      creditsToDeduct: 0,
      message: 'Workout assignment logged successfully without session deduction',
    };
  }

  if (creditsRequired < 1) {
    return {
      shouldDeduct: false,
      canLogWorkout: true,
      sessionDeducted: false,
      creditsToDeduct: 0,
      message: 'Workout logged successfully without session deduction',
    };
  }

  if (availableSessions < creditsRequired) {
    return {
      shouldDeduct: true,
      canLogWorkout: false,
      sessionDeducted: false,
      creditsToDeduct: 0,
      message: creditsRequired === 1
        ? 'Client has no available sessions remaining'
        : `Client needs ${creditsRequired} available session credits`,
    };
  }

  return {
    shouldDeduct: true,
    canLogWorkout: true,
    sessionDeducted: true,
    creditsToDeduct: creditsRequired,
    message: 'Workout logged successfully and session deducted',
  };
}
