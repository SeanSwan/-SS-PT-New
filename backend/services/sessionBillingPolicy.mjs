/**
 * Session Billing Policy
 * ======================
 *
 * Centralizes SwanStudios client-source billing rules so workout logging,
 * scheduling, and future Swan Coach actions do not drift apart.
 */

export const CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external']);
export const parseClientSource = (clientSource) => {
  if (typeof clientSource !== 'string') return null;

  const normalized = clientSource
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'move_fitness' || normalized === 'movefitness') return 'move_fitness';
  if (normalized === 'external') return 'external';
  if (normalized === 'swanstudios' || normalized === 'swan_studios') return 'swanstudios';
  return null;
};

class NormalizedClientSourceSet extends Set {
  has(clientSource) {
    const source = parseClientSource(clientSource);
    return source ? super.has(source) : false;
  }
}

export const NON_DEDUCTING_CLIENT_SOURCES = new NormalizedClientSourceSet(['move_fitness', 'external']);

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

export const normalizeClientSource = (clientSource, fallback = 'swanstudios') => (
  parseClientSource(clientSource) || fallback
);

export const isNonDeductingClientSource = (clientSource) => (
  NON_DEDUCTING_CLIENT_SOURCES.has(clientSource)
);

export function buildClientSourcePolicy(clientSource) {
  const normalizedSource = normalizeClientSource(clientSource);
  const isFreeTracking = isNonDeductingClientSource(normalizedSource);

  return {
    clientSource: normalizedSource,
    isFreeTracking,
    shouldDeductPaidSessions: !isFreeTracking,
    sessionBalancePolicy: isFreeTracking
      ? 'free_tracking_no_session_deduction'
      : 'paid_sessions_deduct_on_billable_training',
  };
}

const normalizeCreditsRequired = (value) => {
  if (value === undefined || value === null) return 1;

  const credits = Number(value);
  if (!Number.isFinite(credits) || credits < 0) return 1;
  return Math.floor(credits);
};

export function buildWorkoutSessionBillingDecision(client, options = {}) {
  const shouldDeduct = !isNonDeductingClientSource(client?.clientSource);
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
