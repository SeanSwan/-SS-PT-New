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
  normalizePaidSessionCount,
} from '../sessionBillingPolicy.mjs';
import {
  AiWorkoutDailyFormError,
  buildWorkoutRows,
  normalizeAiExercises,
  normalizeIntensity,
  normalizeText,
  parseNonNegativeInteger,
  parsePositiveInteger,
  toIsoDateOnly,
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
import { applyAiWorkoutChallengeProgress } from './aiWorkoutChallengeProgressBridge.mjs';

export { AiWorkoutDailyFormError } from './aiWorkoutDailyFormPayloadService.mjs';

function ensureWorkoutModels(models) {
  const missing = ['User', 'DailyWorkoutForm', 'WorkoutSession', 'WorkoutLog']
    .filter((name) => !models?.[name]);
  if (missing.length > 0) throw new AiWorkoutDailyFormError(
    `Missing workout persistence model: ${missing.join(', ')}`,
    'WORKOUT_APPLY_FAILED',
  );
}

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
    const { User, DailyWorkoutForm, WorkoutSession, WorkoutLog } = models;

    const client = await User.findByPk(parsedClientId, { transaction, lock: transaction.LOCK?.UPDATE });
    if (!client) throw new AiWorkoutDailyFormError('Client not found', 'VALIDATION_ERROR');

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

    const workoutDate = new Date(`${workoutDateIso}T00:00:00.000Z`);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (workoutDate > today) throw new AiWorkoutDailyFormError('Workout date cannot be in the future');

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

    const billingStatus = billingDecision.sessionDeducted
      ? (billingDecision.creditsToDeduct > 0 ? 'deducted' : 'previously_deducted')
      : 'not_deducted';
    const billingCreditsRequired = sourcePolicy.suppressPaidSessionDeduction
      ? 0
      : billingDecision.creditsToDeduct > 0
        ? billingDecision.creditsToDeduct
        : normalizePaidSessionCount(scheduledCreditsRequired === undefined ? 1 : scheduledCreditsRequired);
    const billing = {
      status: billingStatus,
      shouldDeduct: billingDecision.shouldDeduct,
      sessionDeducted: billingDecision.sessionDeducted,
      creditsDeducted: billingDecision.creditsToDeduct,
      creditsRequired: billingCreditsRequired,
      remainingSessions: Math.max(0, availableSessionsBeforeSave - billingDecision.creditsToDeduct),
    };
    await transaction.commit();
    const challengeProgress = await applyAiWorkoutChallengeProgress({
      sequelize, models, userId: parsedClientId, dailyForm, workoutSession,
      workoutDateIso, estimatedDuration, exercises: normalizedExercises,
    });

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
      xpAwarded: null,
      streakDays: null,
      xp: null,
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
