/**
 * AI Workout Scheduled Session Service
 * ====================================
 * Mirrors the manual DailyWorkoutForm scheduled-session contract for Swan
 * Coach workout-log writes: lock the booked session, verify ownership, read
 * session credits, build WorkoutSession linkage, and stamp attendance.
 */
import { AiWorkoutDailyFormError, parsePositiveInteger, toIsoDateOnly } from './aiWorkoutDailyFormPayloadService.mjs';

const sameId = (a, b) => String(a) === String(b);

export function parseOptionalScheduledSessionId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parsePositiveInteger(value);
  if (!parsed) throw new AiWorkoutDailyFormError('scheduledSessionId must be a positive integer');
  return parsed;
}

export async function resolveAiScheduledSessionForLog({
  Session,
  SessionType,
  scheduledSessionId,
  clientId,
  trainerId,
  userRole = 'trainer',
  transaction,
}) {
  const parsedScheduledSessionId = parseOptionalScheduledSessionId(scheduledSessionId);
  if (!parsedScheduledSessionId) return { linkedScheduledSession: null, creditsRequired: undefined };
  if (!Session?.findByPk) {
    throw new AiWorkoutDailyFormError('Scheduled session verification is unavailable', 'WORKOUT_APPLY_FAILED');
  }

  const query = { transaction };
  if (transaction?.LOCK?.UPDATE) query.lock = transaction.LOCK.UPDATE;
  const linkedScheduledSession = await Session.findByPk(parsedScheduledSessionId, query);
  if (!linkedScheduledSession) {
    throw new AiWorkoutDailyFormError('Scheduled session not found', 'VALIDATION_ERROR');
  }
  if (!sameId(linkedScheduledSession.userId, clientId)) {
    throw new AiWorkoutDailyFormError('Scheduled session does not belong to this client');
  }
  if (
    userRole === 'trainer'
    && linkedScheduledSession.trainerId
    && !sameId(linkedScheduledSession.trainerId, trainerId)
  ) {
    throw new AiWorkoutDailyFormError('You are not assigned to this scheduled session');
  }
  if (linkedScheduledSession.status === 'cancelled' || linkedScheduledSession.status === 'blocked') {
    throw new AiWorkoutDailyFormError('Scheduled session cannot be logged');
  }
  if (linkedScheduledSession.attendanceStatus === 'no_show') {
    throw new AiWorkoutDailyFormError('No-show scheduled sessions cannot be logged as workouts');
  }

  let creditsRequired;
  if (linkedScheduledSession.sessionTypeId && SessionType?.findByPk) {
    const sessionType = await SessionType.findByPk(linkedScheduledSession.sessionTypeId, {
      attributes: ['id', 'creditsRequired'],
      transaction,
    });
    if (sessionType && sessionType.creditsRequired !== undefined) {
      creditsRequired = sessionType.creditsRequired;
    }
  }

  return { linkedScheduledSession, creditsRequired };
}

export function scheduledWorkoutDate(linkedScheduledSession, fallbackDate) {
  if (linkedScheduledSession?.sessionDate) return toIsoDateOnly(linkedScheduledSession.sessionDate);
  return toIsoDateOnly(fallbackDate);
}

export function scheduledWorkoutSessionFields(linkedScheduledSession, trainerId) {
  if (!linkedScheduledSession) return {};
  return {
    sessionId: linkedScheduledSession.id,
    sessionType: 'trainer-led',
    trainerId: linkedScheduledSession.trainerId || trainerId,
  };
}

export async function completeAiLinkedScheduledSession({
  linkedScheduledSession,
  billingDecision,
  trainerId,
  userRole = 'trainer',
  transaction,
}) {
  if (!linkedScheduledSession) return;
  const completedAt = new Date();
  const shouldStampDeduction = billingDecision.shouldDeduct && billingDecision.sessionDeducted;
  const attendanceRecorderId = userRole === 'client'
    ? (linkedScheduledSession.markedPresentBy || null)
    : trainerId;
  await linkedScheduledSession.update({
    status: 'completed',
    attendanceStatus: 'present',
    checkInTime: linkedScheduledSession.checkInTime || completedAt,
    markedPresentBy: attendanceRecorderId,
    attendanceRecordedAt: linkedScheduledSession.attendanceRecordedAt || completedAt,
    noShowReason: null,
    sessionDeducted: billingDecision.sessionDeducted,
    creditsDeducted: billingDecision.shouldDeduct
      ? billingDecision.creditsToDeduct
      : linkedScheduledSession.creditsDeducted,
    deductionDate: shouldStampDeduction ? completedAt : linkedScheduledSession.deductionDate,
  }, { transaction });
}
