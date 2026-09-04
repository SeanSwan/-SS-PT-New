/**
 * AI Workout Daily Form Service
 * =============================
 * Canonical write adapter for Swan Coach workout-log commands.
 *
 * The older AI command lane wrote only WorkoutSession and WorkoutLog rows.
 * This adapter writes the same diary/billing truth that the trainer-facing
 * daily workout form route depends on: DailyWorkoutForm, WorkoutSession,
 * WorkoutLog, and paid-session deduction policy.
 */
import { randomUUID } from 'node:crypto';
import logger from '../../utils/logger.mjs';
import { getAllModels } from '../../models/index.mjs';
import {
  buildWorkoutSessionBillingDecision,
  buildWorkoutBillingSummary,
  normalizePaidSessionCount,
} from '../sessionBillingPolicy.mjs';
import {
  AiWorkoutDailyFormError,
  buildWorkoutRows,
  ensureWorkoutModels,
  normalizeAiExercises,
  normalizeIntensity,
  normalizeText,
  parseNonNegativeInteger,
  parsePositiveInteger,
} from './aiWorkoutDailyFormPayloadService.mjs';
import { runWorkoutXpAwardStep } from './workoutXpAwardStep.mjs';
import { detectAndRecordPersonalRecords } from './workoutPrDetectionService.mjs';
import {
  advanceAiPlannedAssignmentAfterLog,
  isAiNonBillablePlannedAssignment,
  resolveAiPlannedAssignmentForLog,
} from './aiWorkoutPlannedAssignmentService.mjs';
import {
  completeAiLinkedScheduledSession,
  resolveAiScheduledSessionForLog,
  scheduledWorkoutDate,
  scheduledWorkoutSessionFields,
} from './aiWorkoutScheduledSessionService.mjs';
import { deriveWorkoutLogSourcePolicy } from './workoutLogSourcePolicy.mjs';
import { applyAiWorkoutChallengeProgress } from './aiWorkoutChallengeProgressBridge.mjs';
import { accrueFlatSessionEarning } from '../trainerSessionEarningService.mjs';
import { resolveClientTrainingDateContext } from '../clientTrainingDateService.mjs';
import { persistCoachIntentReceipt } from './coachIntentTransactionHook.mjs';

export { AiWorkoutDailyFormError } from './aiWorkoutDailyFormPayloadService.mjs';

export async function submitAiWorkoutLogAsDailyForm({
  clientId,
  exercises,
  date,
  notes,
  title,
  duration,
  intensity,
  plannedAssignment,
  scheduledSessionId,
  trainerId,
  userRole = 'trainer',
  source,
  coachIntent = null,
  sequelize,
}) {
  const parsedClientId = parsePositiveInteger(clientId);
  const parsedTrainerId = parsePositiveInteger(trainerId);
  if (!parsedClientId || !parsedTrainerId) {
    throw new AiWorkoutDailyFormError('Valid client and trainer IDs are required');
  }
  if (!sequelize?.transaction) throw new AiWorkoutDailyFormError(
    'Sequelize transaction boundary is required',
    'WORKOUT_APPLY_FAILED',
  );

  const sourcePolicy = deriveWorkoutLogSourcePolicy(source);
  if (
    sourcePolicy.isHistoricalImport
    && scheduledSessionId !== undefined
    && scheduledSessionId !== null
    && scheduledSessionId !== ''
  ) {
    throw new AiWorkoutDailyFormError('Historical workout imports cannot be linked to scheduled sessions');
  }

  const normalizedExercises = normalizeAiExercises(exercises);
  const requestedDuration = parseNonNegativeInteger(duration, null);
  if (duration !== undefined && duration !== null && duration !== '' && requestedDuration === null) {
    throw new AiWorkoutDailyFormError('duration must be a non-negative integer');
  }
  const overallIntensity = normalizeIntensity(intensity);
  const pendingRows = buildWorkoutRows(normalizedExercises, null);
  const totalSets = pendingRows.length;
  const totalReps = pendingRows.reduce((sum, row) => sum + row.reps, 0);
  const totalWeight = pendingRows.reduce((sum, row) => sum + (row.reps * row.weight), 0);
  const estimatedDuration = requestedDuration ?? Math.min(totalSets * 3, 120);
  const sessionNotes = normalizeText(notes, '');
  const transaction = await sequelize.transaction();

  try {
    const models = getAllModels();
    ensureWorkoutModels(models);
    const { User, DailyWorkoutForm, WorkoutSession, WorkoutLog, CoachIntent } = models;

    const client = await User.findByPk(parsedClientId, { transaction, lock: transaction.LOCK?.UPDATE });
    if (!client) throw new AiWorkoutDailyFormError('Client not found', 'VALIDATION_ERROR');
    const trainingReferenceDate = new Date();
    const trainingDateContext = resolveClientTrainingDateContext({
      storedTimeZone: client.timeZone,
      storedTimeZoneConfigured: client.timeZoneConfigured,
      actorId: parsedTrainerId,
      targetClientId: parsedClientId,
      referenceDate: trainingReferenceDate,
    });

    const { linkedScheduledSession, creditsRequired: scheduledCreditsRequired } = await resolveAiScheduledSessionForLog({
      Session: models.Session,
      SessionType: models.SessionType,
      scheduledSessionId,
      clientId: parsedClientId,
      trainerId: parsedTrainerId,
      userRole,
      transaction,
    });
    const workoutDateIso = scheduledWorkoutDate(linkedScheduledSession, date);
    if (!workoutDateIso) throw new AiWorkoutDailyFormError('Valid workout date is required');

    if (workoutDateIso > trainingDateContext.localDate) {
      throw new AiWorkoutDailyFormError('Workout date cannot be in the future');
    }
    const workoutDate = new Date(workoutDateIso + 'T00:00:00.000Z');

    const existingForm = await DailyWorkoutForm.findOne({
      where: { clientId: parsedClientId, date: workoutDateIso },
      transaction,
    });
    if (existingForm) throw new AiWorkoutDailyFormError(
      'A workout form already exists for this client on this date',
      'DUPLICATE_DATE',
    );

    const plannedAssignmentMetadata = await resolveAiPlannedAssignmentForLog({
      WorkoutPlan: models.WorkoutPlan,
      rawAssignment: plannedAssignment,
      clientId: parsedClientId,
      workoutDateValue: workoutDateIso,
      hasScheduledSession: Boolean(linkedScheduledSession),
      clientTimeZone: client.timeZone,
      clientTimeZoneConfigured: client.timeZoneConfigured,
      actorId: parsedTrainerId,
      referenceDate: trainingReferenceDate,
      transaction,
    });
    const availableSessionsBeforeSave = normalizePaidSessionCount(client.availableSessions);
    const billingDecision = buildWorkoutSessionBillingDecision(client, {
      scheduledSessionAlreadyDeducted: linkedScheduledSession?.sessionDeducted === true,
      nonBillablePlannedAssignment: sourcePolicy.suppressPaidSessionDeduction
        || isAiNonBillablePlannedAssignment(plannedAssignmentMetadata),
      creditsRequired: scheduledCreditsRequired,
    });
    if (!billingDecision.canLogWorkout) {
      throw new AiWorkoutDailyFormError(billingDecision.message, 'VALIDATION_ERROR');
    }

    const sessionTitle = normalizeText(title, `Personal Training Session - ${workoutDateIso}`);
    const linkedSessionFields = scheduledWorkoutSessionFields(linkedScheduledSession, parsedTrainerId);
    const completionFields = {
      status: 'completed',
      completedAt: new Date(),
      duration: estimatedDuration,
      totalSets,
      totalReps,
      totalWeight,
      intensity: overallIntensity,
      notes: sessionNotes,
      sessionType: 'trainer-led',
      trainerId: parsedTrainerId,
      ...linkedSessionFields,
    };
    const [workoutSession, created] = await WorkoutSession.findOrCreate({
      where: { userId: parsedClientId, date: workoutDateIso },
      defaults: {
        id: randomUUID(),
        userId: parsedClientId,
        title: sessionTitle,
        date: workoutDateIso,
        ...completionFields,
      },
      transaction,
    });
    if (!created) await workoutSession.update(completionFields, { transaction });

    const workoutRows = buildWorkoutRows(normalizedExercises, workoutSession.id);
    await WorkoutLog.destroy({ where: { sessionId: workoutSession.id }, transaction });
    await WorkoutLog.bulkCreate(workoutRows, { transaction, validate: true });

    const formData = {
      exercises: normalizedExercises,
      sessionNotes,
      submittedBy: parsedTrainerId,
      submittedAt: new Date(),
      totalSets,
      estimatedDuration,
      source: sourcePolicy.source,
      historicalImport: sourcePolicy.isHistoricalImport,
    };
    if (overallIntensity !== null) formData.overallIntensity = overallIntensity;
    if (plannedAssignmentMetadata) formData.plannedAssignment = plannedAssignmentMetadata;
    if (linkedScheduledSession) formData.scheduledSessionId = linkedScheduledSession.id;

    const dailyForm = await DailyWorkoutForm.create({
      sessionId: workoutSession.id,
      clientId: parsedClientId,
      trainerId: parsedTrainerId,
      date: workoutDateIso,
      formData,
      sessionDeducted: false,
      mcpProcessed: false,
    }, { transaction });

    if (billingDecision.shouldDeduct && billingDecision.creditsToDeduct > 0) {
      await client.decrement('availableSessions', { by: billingDecision.creditsToDeduct, transaction });
    }
    if (billingDecision.sessionDeducted) {
      await dailyForm.update({ sessionDeducted: true }, { transaction });
    }
    const planProgress = sourcePolicy.suppressPlanAdvancement
      ? null
      : await advanceAiPlannedAssignmentAfterLog({
        WorkoutPlan: models.WorkoutPlan,
        WorkoutPlanCompletionReceipt: models.WorkoutPlanCompletionReceipt,
        assignment: plannedAssignmentMetadata,
        clientId: parsedClientId,
        dailyWorkoutFormId: dailyForm.id,
        workoutSessionId: workoutSession.id,
        completedAt: dailyForm.submittedAt || new Date().toISOString(),
        hasScheduledSession: Boolean(linkedScheduledSession),
        transaction,
      });

    await completeAiLinkedScheduledSession({
      linkedScheduledSession,
      billingDecision,
      trainerId: parsedTrainerId,
      userRole,
      transaction,
    });

    const billing = buildWorkoutBillingSummary({
      billingDecision,
      sourcePolicy,
      scheduledCreditsRequired,
      availableSessionsBeforeSave,
    });
    if (coachIntent?.intentId) {
      await persistCoachIntentReceipt({
        model: CoachIntent,
        intentId: coachIntent.intentId,
        result: coachIntent.result,
        transaction,
      });
    }
    await transaction.commit();

    // Employed-trainer pay (mode b): the AI workout log just completed the
    // linked scheduled session — accrue post-commit (self-filtering +
    // idempotent per session; revenue_share assignments accrue nothing).
    if (linkedScheduledSession?.trainerId) {
      await accrueFlatSessionEarning({ session: linkedScheduledSession });
    }

    // Charter v3 H rail: historical/backfilled sessions never move live
    // challenges — their events would stamp submittedAt (today), not the
    // backdated workout date, so a 60-session backfill would instantly
    // complete active challenges. PLAUD-applied live sessions keep
    // challenge progress (suppressEngagementSideEffects is false there).
    const challengeProgress = sourcePolicy.suppressEngagementSideEffects
      ? { status: 'suppressed_historical', updatedCount: 0, skippedCount: 0, headline: null, updates: [] }
      : await applyAiWorkoutChallengeProgress({
        sequelize, models, userId: parsedClientId, dailyForm, workoutSession,
        workoutDateIso, estimatedDuration, exercises: normalizedExercises,
      });
    // Phase 1.1a: every unified-lane write feeds streaks/levels identically.
    const xp = await runWorkoutXpAwardStep({
      sequelize,
      userId: parsedClientId,
      workoutId: dailyForm.id,
      sessionId: workoutSession.id,
      duration: estimatedDuration,
      exercisesCompleted: normalizedExercises.length,
      workoutDate,
      awardedBy: parsedTrainerId,
      suppress: sourcePolicy.suppressEngagementSideEffects,
    });

    // Launch charter 4a: PR detection = third post-commit step, same never-fail
    // contract as the XP step. REAL historical imports (plaud_merge etc.) still
    // record baselines/records; celebration is a caller concern.
    //
    // SYNTHETIC backfill is excluded entirely: its sets are fabricated (MAX weight paired
    // with an unrelated MAX reps), so they can out-score a client's real PR, overwrite it,
    // and repoint it at a filler session — which the backfill's own undo then DESTROYS,
    // erasing the client's real best for good. No PR may reference generated filler.
    let prEvents = [];
    if (sourcePolicy.suppressPersonalRecords) {
      logger.info('[aiWorkoutDailyForm] PR detection skipped for synthetic source', {
        userId: parsedClientId,
        source: sourcePolicy.source,
      });
    } else {
      try {
        const prResult = await detectAndRecordPersonalRecords({
          userId: parsedClientId,
          formId: dailyForm.id,
          sessionId: workoutSession.id,
          exercises: normalizedExercises,
          date: workoutDateIso,
          // Charter v3 H rails: historical sources record baselines at the WORKOUT
          // date but never earn points or celebration.
          awardPoints: !sourcePolicy.suppressEngagementSideEffects,
          achievedAt: workoutDateIso,
        });
        prEvents = prResult.prEvents || [];
      } catch (prErr) {
        logger.warn('[aiWorkoutDailyForm] PR detection failed (non-critical)', {
          userId: parsedClientId,
          formId: dailyForm.id,
          error: prErr?.message,
        });
      }
    }

    return {
      id: dailyForm.id,
      formId: dailyForm.id,
      workoutId: workoutSession.id,
      sessionId: workoutSession.id,
      userId: parsedClientId,
      title: workoutSession.title || sessionTitle,
      date: workoutDateIso,
      duration: estimatedDuration,
      intensity: overallIntensity,
      exerciseCount: normalizedExercises.length,
      totalSets,
      totalReps,
      totalWeight,
      xpAwarded: xp?.pointsAwarded ?? null,
      streakDays: xp?.streakDays ?? null,
      xp,
      prEvents,
      source: sourcePolicy.source,
      historicalImport: sourcePolicy.isHistoricalImport,
      billing,
      challengeProgress,
      form: {
        id: dailyForm.id,
        clientId: parsedClientId,
        trainerId: parsedTrainerId,
        date: workoutDateIso,
        totalSets,
        estimatedDuration,
        ...(linkedScheduledSession ? { scheduledSessionId: linkedScheduledSession.id } : {}),
        sessionDeducted: billingDecision.sessionDeducted,
        source: sourcePolicy.source,
        historicalImport: sourcePolicy.isHistoricalImport,
        ...(plannedAssignmentMetadata ? { plannedAssignment: plannedAssignmentMetadata } : {}),
        ...(planProgress?.advanced ? { planProgress } : {}),
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
