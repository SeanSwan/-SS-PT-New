/**
 * Session Billing Policy
 * ======================
 *
 * Centralizes SwanStudios client-source and per-account billing rules so workout
 * logging, scheduling, and future Swan Coach actions do not drift apart.
 */

export const CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external']);
export const SESSION_BILLING_MODES = new Set(['paid_sessions', 'no_session_required']);

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

export const parseSessionBillingMode = (sessionBillingMode) => {
  if (typeof sessionBillingMode !== 'string') return 'paid_sessions';

  const normalized = sessionBillingMode
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'paid' || normalized === 'paid_session' || normalized === 'paid_sessions') {
    return 'paid_sessions';
  }

  if (
    normalized === 'no_pay'
    || normalized === 'nopay'
    || normalized === 'free_session'
    || normalized === 'free_sessions'
    || normalized === 'free_training'
    || normalized === 'no_session'
    || normalized === 'no_sessions'
    || normalized === 'no_session_required'
  ) {
    return 'no_session_required';
  }

  return 'paid_sessions';
};

class NormalizedClientSourceSet extends Set {
  has(clientSource) {
    const source = parseClientSource(clientSource);
    return source ? super.has(source) : false;
  }
}

class NormalizedSessionBillingModeSet extends Set {
  has(sessionBillingMode) {
    return super.has(parseSessionBillingMode(sessionBillingMode));
  }
}

export const NON_DEDUCTING_CLIENT_SOURCES = new NormalizedClientSourceSet(['move_fitness', 'external']);
export const NO_SESSION_REQUIRED_BILLING_MODES = new NormalizedSessionBillingModeSet(['no_session_required']);

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

export const isNoSessionRequiredBillingMode = (sessionBillingMode) => (
  NO_SESSION_REQUIRED_BILLING_MODES.has(sessionBillingMode)
);

export const isNonDeductingClient = (clientOrSource, sessionBillingMode) => {
  const clientSource = typeof clientOrSource === 'object' && clientOrSource !== null
    ? clientOrSource.clientSource
    : clientOrSource;
  const billingMode = typeof clientOrSource === 'object' && clientOrSource !== null
    ? clientOrSource.sessionBillingMode
    : sessionBillingMode;

  return isNonDeductingClientSource(clientSource) || isNoSessionRequiredBillingMode(billingMode);
};

export function buildClientSourcePolicy(clientSource, sessionBillingMode) {
  const normalizedSource = normalizeClientSource(clientSource);
  const normalizedBillingMode = parseSessionBillingMode(sessionBillingMode) || 'paid_sessions';
  const isSourceNonDeducting = isNonDeductingClientSource(normalizedSource);
  const isNoSessionRequired = isNoSessionRequiredBillingMode(normalizedBillingMode);
  const isFreeTracking = isSourceNonDeducting || isNoSessionRequired;

  return {
    clientSource: normalizedSource,
    sessionBillingMode: normalizedBillingMode,
    isFreeTracking,
    isNoSessionRequired,
    shouldDeductPaidSessions: !isFreeTracking,
    sessionBalancePolicy: isNoSessionRequired
      ? 'no_session_required_no_paid_session_deduction'
      : isSourceNonDeducting
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
  const shouldDeduct = !isNonDeductingClient(client);
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