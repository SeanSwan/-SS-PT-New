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
import { resolveClientTrainingDateContext } from '../clientTrainingDateService.mjs';
import { persistCoachIntentReceipt } from './coachIntentTransactionHook.mjs';

import { runAiWorkoutPostCommit } from './aiWorkoutPostCommitService.mjs';
import { buildAiWorkoutDailyFormResult } from './aiWorkoutDailyFormResult.mjs';

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
  beforeWrite = null,
  beforeCommit = null,
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

  const normalizedExercises = normalizeAiExercises(exercises, {
    policy: coachIntent?.proofVersion === 2 ? 'coach_verified_v1' : undefined,
  });
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
  let committedWorkout, postCommitContext;
  let commitStarted = false;

  try {
    const models = getAllModels();
    ensureWorkoutModels(models);
    const { User, DailyWorkoutForm, WorkoutSession, WorkoutLog, CoachIntent } = models;
    // Internal hooks share this transaction; proposal/intent locks precede domain locks.
    if (beforeWrite) await beforeWrite({ transaction, models });

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
    const persistedWorkoutLogs = await WorkoutLog.bulkCreate(workoutRows, { transaction, validate: true });

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
    committedWorkout = buildAiWorkoutDailyFormResult({
      dailyForm, workoutSession, parsedClientId, parsedTrainerId, sessionTitle,
      workoutDateIso, estimatedDuration, overallIntensity, normalizedExercises,
      totalSets, totalReps, totalWeight, sourcePolicy, billing, billingDecision,
      linkedScheduledSession, plannedAssignmentMetadata, planProgress,
    });
    if (beforeCommit) await beforeCommit({
      transaction, models, dailyForm, workoutSession, workoutLogs: persistedWorkoutLogs,
      normalizedExercises, workout: committedWorkout,
    });
    postCommitContext = { sequelize, models, parsedClientId, parsedTrainerId, dailyForm,
      workoutSession, workoutDateIso, workoutDate, estimatedDuration, normalizedExercises,
      linkedScheduledSession, sourcePolicy };
    commitStarted = true;
    await transaction.commit();
  } catch (error) {
    // Sequelize marks commit before sending COMMIT. An interrupted commit is
    // uncertain even if a best-effort rollback is possible; never advertise retry.
    if (!transaction.finished) {
      try { await transaction.rollback(); } catch { /* preserve original failure */ }
    }
    if (commitStarted) {
      throw new AiWorkoutDailyFormError('Save confirmation was interrupted', 'WORKOUT_COMMIT_UNKNOWN');
    }
    throw error;
  }
  // Deliberately outside the rollback catch: secondary failures cannot undo save.
  const secondary = await runAiWorkoutPostCommit(postCommitContext);
  return { ...committedWorkout, ...secondary };
}
