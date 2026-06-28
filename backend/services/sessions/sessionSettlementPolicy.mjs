/**
 * Session Settlement Policy
 * =========================
 * Pure decision helpers for deciding when a scheduled session may be settled.
 */

export const SETTLEMENT_GRACE_HOURS = 24;
export const SETTLEMENT_GRACE_MS = SETTLEMENT_GRACE_HOURS * 60 * 60 * 1000;
export const DEFAULT_SESSION_DURATION_MINUTES = 60;

const AUTO_SETTLE_ATTENDANCE_STATUSES = new Set(['present', 'late']);

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDurationMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_SESSION_DURATION_MINUTES;
  }
  return minutes;
}

export function getSessionEndAt(session) {
  const explicitEnd = toValidDate(session?.endDate);
  if (explicitEnd) return explicitEnd;

  const start = toValidDate(session?.sessionDate);
  if (!start) return null;

  const durationMs = toDurationMinutes(session?.duration) * 60 * 1000;
  return new Date(start.getTime() + durationMs);
}

function buildDecision(session, overrides) {
  const sessionEndAt = getSessionEndAt(session);
  const settlementDueAt = sessionEndAt
    ? new Date(sessionEndAt.getTime() + SETTLEMENT_GRACE_MS)
    : null;

  return {
    sessionId: session?.id ?? null,
    sessionEndAt,
    settlementDueAt,
    shouldSettleNow: false,
    needsAttention: false,
    reason: 'settlement_not_due',
    recommendedAction: null,
    ...overrides
  };
}

export function getSessionSettlementDecision(session, options = {}) {
  const now = toValidDate(options.now) ?? new Date();
  const decision = buildDecision(session);

  if (!decision.sessionEndAt || !decision.settlementDueAt) {
    return {
      ...decision,
      needsAttention: true,
      reason: 'invalid_session_time',
      recommendedAction: 'repair_session_time'
    };
  }

  if (session?.sessionDeducted) {
    return {
      ...decision,
      reason: 'already_settled'
    };
  }

  if (session?.status === 'cancelled') {
    return {
      ...decision,
      needsAttention: true,
      reason: 'cancelled_session_review',
      recommendedAction: 'open_cancellation_review'
    };
  }

  if (now.getTime() < decision.settlementDueAt.getTime()) {
    return {
      ...decision,
      reason: 'settlement_not_due'
    };
  }

  if (AUTO_SETTLE_ATTENDANCE_STATUSES.has(session?.attendanceStatus)) {
    return {
      ...decision,
      shouldSettleNow: true,
      reason: 'attended_session_due'
    };
  }

  if (session?.attendanceStatus === 'no_show') {
    return {
      ...decision,
      needsAttention: true,
      reason: 'no_show_after_cutoff',
      recommendedAction: 'open_attendance_review'
    };
  }

  return {
    ...decision,
    needsAttention: true,
    reason: 'attendance_missing_after_cutoff',
    recommendedAction: 'open_attendance_review'
  };
}
